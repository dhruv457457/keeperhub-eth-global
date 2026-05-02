import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

const REGISTRY_CONTRACT = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

// ERC-8004 is deployed on these chains — Base is recommended (cheapest gas ~$0.01)
const CHAIN_INFO: Record<string, { label: string; symbol: string; explorer: string }> = {
  "8453":  { label: "Base",       symbol: "ETH",  explorer: "https://basescan.org" },
  "1":     { label: "Ethereum",   symbol: "ETH",  explorer: "https://etherscan.io" },
  "42161": { label: "Arbitrum",   symbol: "ETH",  explorer: "https://arbiscan.io" },
  "137":   { label: "Polygon",    symbol: "MATIC", explorer: "https://polygonscan.com" },
};

function isRegisterRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("register agent") ||
    lower.includes("register on chain") ||
    lower.includes("register onchain") ||
    lower.includes("onchain identity") ||
    lower.includes("erc-8004") ||
    lower.includes("agent registry") ||
    lower.includes("register myself") ||
    lower.includes("agent nft") ||
    lower.includes("mint agent")
  );
}

export function createRegisterAgentAction(kh: KeeperHub): Action {
  return {
    name: "REGISTER_KEEPERHUB_AGENT",
    similes: [
      "REGISTER_AGENT",
      "ONCHAIN_IDENTITY",
      "AGENT_REGISTRY",
      "ERC8004_REGISTER",
      "KEEPERHUB_REGISTER",
      "MINT_AGENT_NFT",
    ],
    description:
      "Register this AI agent on-chain as an ERC-8004 AgentIdentity NFT. " +
      "Mints a real NFT on Base (~$0.01 gas) or mainnet/Arbitrum/Polygon. " +
      "Requires tiny ETH in the KH managed wallet for gas.",

    validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
      return isRegisterRequest(message.content?.text ?? "");
    },

    handler: async (
      runtime: IAgentRuntime,
      _message: Memory,
      _state: State | undefined,
      options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const agentName = runtime.character?.name ?? "ElizaOS Agent";
      // Allow chainId override via options, default to Base
      const chainId = String(options?.chainId ?? "8453");
      const chain = CHAIN_INFO[chainId] ?? CHAIN_INFO["8453"];

      await callback?.({
        text: `🔗 Registering **${agentName}** on-chain (${chain.label} — ERC-8004 AgentIdentity NFT)…`,
      });

      try {
        // Call register() on the ERC-8004 registry contract
        // register() takes no args — mints NFT to msg.sender (KH managed wallet)
        const result = await kh.web3.write({
          network: chainId,
          contract: REGISTRY_CONTRACT,
          function: "register",
          args: [],
        }) as Record<string, unknown>;

        const txHash = String(result["transactionHash"] ?? result["tx_hash"] ?? "");
        const executionId = String(result["executionId"] ?? "");

        // If execution was submitted (202), poll for completion
        if (executionId && !txHash) {
          await callback?.({
            text: `⏳ Registration submitted. Execution ID: \`${executionId}\`\nCheck status with: *"Check execution ${executionId}"*`,
          });
          return true;
        }

        await callback?.({
          text: [
            `✅ **${agentName}** registered on-chain!`,
            `⛓ Network: **${chain.label}**`,
            `📜 Contract: \`${REGISTRY_CONTRACT}\``,
            txHash ? `🔗 Transaction: [View on ${chain.label}](${chain.explorer}/tx/${txHash})` : null,
            `🏷 NFT Standard: ERC-8004 AgentIdentity`,
            "",
            `Your agent now has a verifiable on-chain identity. Other agents can discover and interact with you via the registry.`,
          ].filter(Boolean).join("\n"),
        });

        return true;

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        elizaLogger.error(`[KeeperHub] Agent registration failed: ${msg}`);

        if (msg.includes("insufficient funds")) {
          // Get wallet address for funding instructions
          let walletAddr = "";
          try {
            const w = await (kh.web3 as unknown as { getWallet: () => Promise<Record<string, unknown>> }).getWallet();
            walletAddr = String(w["address"] ?? w["walletAddress"] ?? "");
          } catch { /* ignore */ }

          await callback?.({
            text: [
              `⛽ **Registration needs gas funding!**`,
              "",
              `The KH managed wallet has no ${chain.symbol} on ${chain.label} for gas.`,
              walletAddr ? `💳 Wallet address: \`${walletAddr}\`` : null,
              "",
              `**To fix:**`,
              `1. Send **0.001 ${chain.symbol}** to \`${walletAddr || "your KH wallet"}\` on **${chain.label}**`,
              `2. ${chainId === "8453" ? "Base gas is cheapest — ~$0.01 total cost" : `Use Base (chain 8453) for cheapest gas (~$0.01)`}`,
              `3. Then say *"Register my agent on ${chain.label}"* again`,
              "",
              walletAddr ? `🔍 Check wallet: [${chain.explorer}/address/${walletAddr}](${chain.explorer}/address/${walletAddr})` : null,
            ].filter(Boolean).join("\n"),
          });
          return false;
        }

        await callback?.({
          text: `❌ Registration failed on ${chain.label}: ${msg}`,
        });
        return false;
      }
    },

    examples: [
      [
        { user: "{{user1}}", content: { text: "Register this agent on-chain" } },
        {
          user: "{{agentName}}",
          content: {
            text: "🔗 Registering on Base (ERC-8004 AgentIdentity NFT)…",
            action: "REGISTER_KEEPERHUB_AGENT",
          },
        },
      ],
    ],
  };
}
