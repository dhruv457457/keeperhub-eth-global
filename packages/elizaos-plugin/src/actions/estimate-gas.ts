import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

function extractContractAddress(text: string): string | null {
  const match = text.match(/\b(0x[0-9a-fA-F]{40})\b/);
  return match ? match[1] : null;
}

function extractFunctionName(text: string): string | null {
  const patterns = [
    /(?:estimate.*?for|gas.*?for|cost.*?of)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
    /`([a-zA-Z_][a-zA-Z0-9_]*)`/,
    /function\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1] && m[1].length > 1) return m[1];
  }
  return null;
}

function extractNetwork(text: string): string {
  const map: Record<string, string> = {
    ethereum: "1", mainnet: "1", base: "8453",
    polygon: "137", arbitrum: "42161", optimism: "10",
  };
  const lower = text.toLowerCase();
  for (const [name, id] of Object.entries(map)) {
    if (lower.includes(name)) return id;
  }
  return "1";
}

export function createEstimateGasAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_ESTIMATE_GAS",
    similes: [
      "ESTIMATE_GAS", "GAS_ESTIMATE", "HOW_MUCH_GAS",
      "GAS_COST", "TRANSACTION_COST", "TX_COST",
    ],
    description:
      "Estimate the gas cost (ETH + USD) for a smart contract function call before executing it. " +
      "Provide the contract address and function name.",

    validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const hasGasKeyword = /gas|cost|estimate|fee/i.test(text);
      const hasAddress = /\b0x[0-9a-fA-F]{40}\b/.test(text);
      return hasGasKeyword && hasAddress;
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";

      const contract = extractContractAddress(text);
      if (!contract) {
        await callback?.({ text: "❌ Please provide a contract address (0x...)." });
        return false;
      }

      const fn = extractFunctionName(text);
      if (!fn) {
        await callback?.({ text: "❌ Please specify the function name (e.g. 'estimate gas for transfer')." });
        return false;
      }

      const network = extractNetwork(text);

      await callback?.({ text: `⛽ Estimating gas for \`${fn}\` on \`${contract}\`…` });

      try {
        const estimate = await kh.web3.estimateGas({ network, contract, function: fn });
        const e = estimate as Record<string, unknown>;

        const lines = [`⛽ Gas estimate for \`${fn}\`:`, `• Gas units: **${e["estimatedGas"] ?? "N/A"}**`];
        if (e["estimatedEth"]) lines.push(`• ETH cost: **${e["estimatedEth"]} ETH**`);
        if (e["estimatedUsd"]) lines.push(`• USD cost: **~$${e["estimatedUsd"]}**`);
        if (e["gasPrice"]) lines.push(`• Gas price: ${e["gasPrice"]} wei`);

        await callback?.({ text: lines.join("\n") });
        return true;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Gas estimate failed: ${err}`);
        await callback?.({ text: `❌ Gas estimate failed: ${err instanceof Error ? err.message : String(err)}` });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: { text: "Estimate gas for transfer on 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on Ethereum" },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "⛽ Estimating gas for `transfer` on `0xA0b8...eB48`…",
            action: "KEEPERHUB_ESTIMATE_GAS",
          },
        },
      ],
    ],
  };
}
