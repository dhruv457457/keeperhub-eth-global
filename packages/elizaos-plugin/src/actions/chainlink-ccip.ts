import type { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

/**
 * Chainlink CCIP action for ElizaOS agents.
 * Handles cross-chain token transfers via Chainlink's CCIP protocol.
 *
 * Full flow:
 * 1. ccip-get-fee   → quote the fee
 * 2. ccip-approve-bridge-token → approve token for bridging
 * 3. ccip-approve-fee-token    → approve LINK for fees
 * 4. ccip-send                 → execute the transfer
 *
 * Or use the AI pipeline to auto-generate a complete CCIP workflow.
 */

type CcipAction =
  | "ccip-send"
  | "ccip-get-fee"
  | "ccip-approve-bridge-token"
  | "ccip-approve-fee-token"
  | "ccip-check-bridge-balance"
  | "ccip-check-fee-balance";

const CHAIN_SELECTORS: Record<string, string> = {
  ethereum: "5009297550715157269",
  base: "15971525489660198786",
  arbitrum: "4949039107694359620",
  optimism: "3734403246176062136",
  polygon: "4051577828743386545",
  avalanche: "6433500567565415381",
  bnb: "11344663589394136015",
};

function detectCcipAction(text: string): CcipAction {
  const lower = text.toLowerCase();
  if (lower.includes("fee") || lower.includes("quote") || lower.includes("cost")) return "ccip-get-fee";
  if (lower.includes("approve") && lower.includes("bridge")) return "ccip-approve-bridge-token";
  if (lower.includes("approve") && lower.includes("fee")) return "ccip-approve-fee-token";
  if (lower.includes("balance")) return "ccip-check-bridge-balance";
  return "ccip-send";
}

function detectDestinationChain(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [name, selector] of Object.entries(CHAIN_SELECTORS)) {
    if (lower.includes(name)) return selector;
  }
  return null;
}

function extractAddress(text: string): string | null {
  const match = text.match(/\b(0x[0-9a-fA-F]{40})\b/);
  return match ? match[1] : null;
}

function extractAmount(text: string): string | null {
  const match = text.match(/\b(\d+(?:\.\d+)?)\s*(?:eth|usdc|link|token|tokens)?/i);
  return match ? match[1] : null;
}

export function createChainlinkCcipAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_CHAINLINK_CCIP",
    similes: [
      "CCIP_SEND", "CROSS_CHAIN_TRANSFER", "BRIDGE_TOKENS",
      "CHAINLINK_BRIDGE", "CCIP_TRANSFER", "BRIDGE_CROSS_CHAIN",
    ],
    description:
      "Send tokens cross-chain using Chainlink CCIP. " +
      "Supports Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, BNB. " +
      "Provide destination chain, recipient address, and amount.",

    validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
      const text = (message.content?.text ?? "").toLowerCase();
      return (
        (text.includes("ccip") || text.includes("chainlink") || text.includes("cross-chain") ||
          text.includes("bridge")) &&
        (text.includes("send") || text.includes("transfer") || text.includes("bridge") ||
          text.includes("fee") || text.includes("quote"))
      );
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const ccipAction = detectCcipAction(text);

      if (ccipAction === "ccip-send") {
        const destChain = detectDestinationChain(text);
        const receiver = extractAddress(text);
        const amount = extractAmount(text);

        if (!destChain || !receiver) {
          await callback?.({
            text: [
              "❌ For CCIP transfer I need: **destination chain**, **recipient address**, and **amount**.",
              "",
              "Example: *Bridge 10 USDC to Base, send to 0xRecipient...*",
              "",
              "Supported chains: Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, BNB",
            ].join("\n"),
          });
          return false;
        }

        await callback?.({
          text: `🌉 Initiating Chainlink CCIP transfer to chain selector \`${destChain}\`…`,
        });

        // Use AI pipeline to generate the full CCIP workflow (approve + send)
        const prompt = `Bridge ${amount ?? ""} tokens cross-chain using Chainlink CCIP to chain selector ${destChain}, recipient ${receiver}. Include approve-bridge-token and approve-fee-token steps before ccipSend.`;

        try {
          const obs = await kh.pipeline().generate(prompt.slice(0, 1000)).safeWait();
          if (!obs.ok) {
            await callback?.({ text: `❌ CCIP workflow failed: ${obs.error?.message}` });
            return false;
          }
          const r = obs.result as Record<string, unknown>;
          await callback?.({
            text: [
              `✅ Chainlink CCIP transfer initiated!`,
              `🔑 Execution ID: \`${r?.["executionId"]}\``,
              `🌉 Destination: chain selector ${destChain}`,
              `📬 Recipient: \`${receiver}\``,
              `💡 Track with: \`check execution ${r?.["executionId"]}\``,
            ].join("\n"),
          });
          return true;
        } catch (err) {
          elizaLogger.error(`[KeeperHub] CCIP send failed: ${err}`);
          await callback?.({ text: `❌ CCIP failed: ${err instanceof Error ? err.message : String(err)}` });
          return false;
        }
      }

      // For fee quotes and checks, use protocols.execute directly
      await callback?.({ text: `📊 Querying Chainlink CCIP (${ccipAction})…` });

      try {
        const result = await kh.protocols.execute(`chainlink/${ccipAction}`, {});
        const r = result as Record<string, unknown>;
        await callback?.({
          text: `✅ CCIP ${ccipAction}: \`${JSON.stringify(r["result"] ?? result).slice(0, 200)}\``,
        });
        return true;
      } catch (err) {
        await callback?.({ text: `❌ Failed: ${err instanceof Error ? err.message : String(err)}` });
        return false;
      }
    },

    examples: [
      [
        { user: "{{user1}}", content: { text: "Bridge 10 USDC to Base, send to 0xRecipient1234567890123456789012345678" } },
        {
          user: "{{agentName}}",
          content: { text: "🌉 Initiating Chainlink CCIP transfer to Base…", action: "KEEPERHUB_CHAINLINK_CCIP" },
        },
      ],
    ],
  };
}
