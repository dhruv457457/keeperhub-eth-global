import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

/** Extract a chain ID from text ("on Base", "on Ethereum", chain 8453, etc.) */
function extractNetwork(text: string): string | null {
  const networkMap: Record<string, string> = {
    ethereum: "1", mainnet: "1",
    base: "8453",
    polygon: "137", matic: "137",
    arbitrum: "42161",
    optimism: "10",
    avalanche: "43114", avax: "43114",
    bnb: "56", bsc: "56",
  };

  const lower = text.toLowerCase();
  for (const [name, id] of Object.entries(networkMap)) {
    if (lower.includes(name)) return id;
  }
  // Also accept explicit chain IDs
  const chainMatch = text.match(/\bchain(?:\s+id)?\s*[:=]?\s*(\d+)\b/i);
  if (chainMatch) return chainMatch[1];

  // Numeric ID in context
  const idMatch = text.match(/\bchainid[:\s]*(\d+)\b/i);
  return idMatch ? idMatch[1] : null;
}

/** Extract amount from text e.g. "0.01 ETH", "100 USDC" */
function extractAmount(text: string): { amount: string; symbol: string } | null {
  const match = text.match(/\b(\d+(?:\.\d+)?)\s*([A-Za-z]{2,8})\b/);
  if (!match) return null;
  return { amount: match[1], symbol: match[2].toUpperCase() };
}

/** Extract a 0x wallet address */
function extractAddress(text: string): string | null {
  const match = text.match(/\b(0x[0-9a-fA-F]{40})\b/);
  return match ? match[1] : null;
}

/** Extract an ERC-20 token address (second 0x address in text, or 'token:' prefix) */
function extractTokenAddress(text: string, recipientAddress: string): string | null {
  const tokenMatch = text.match(/token[:\s]+\s*(0x[0-9a-fA-F]{40})/i);
  if (tokenMatch) return tokenMatch[1];

  // If there are two distinct addresses and one is the recipient, the other may be token
  const allAddresses = [...text.matchAll(/\b(0x[0-9a-fA-F]{40})\b/g)].map((m) => m[1]);
  const others = allAddresses.filter((a) => a.toLowerCase() !== recipientAddress.toLowerCase());
  return others.length === 1 ? others[0] : null;
}

export function createTransferAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_TRANSFER",
    similes: [
      "SEND_ETH", "SEND_TOKENS", "TRANSFER_ETH", "TRANSFER_TOKENS",
      "TRANSFER_FUNDS", "SEND_FUNDS", "SEND_CRYPTO",
    ],
    description:
      "Transfer native tokens (ETH, MATIC) or ERC-20 tokens to a wallet address via KeeperHub. " +
      "Requires: amount, recipient address, and optionally a network name.",

    validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const hasAddress = /\b0x[0-9a-fA-F]{40}\b/.test(text);
      const hasAmount = /\b\d+(?:\.\d+)?\s*[A-Za-z]{2,8}\b/.test(text);
      return hasAddress && hasAmount;
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";

      const recipient = extractAddress(text);
      if (!recipient) {
        await callback?.({ text: "❌ I couldn't find a recipient address. Please include a 0x address." });
        return false;
      }

      const amountInfo = extractAmount(text);
      if (!amountInfo) {
        await callback?.({ text: "❌ I couldn't parse the amount. Please specify e.g. '0.01 ETH' or '100 USDC'." });
        return false;
      }

      const network = extractNetwork(text) ?? "8453"; // default to Base
      const tokenAddress = extractTokenAddress(text, recipient);

      const tokenDesc = tokenAddress ? `\`${tokenAddress}\`` : amountInfo.symbol;
      await callback?.({
        text: `💸 Sending **${amountInfo.amount} ${tokenDesc}** to \`${recipient}\` on chain ${network}…`,
      });

      try {
        const result = await kh.web3.transfer({
          network,
          to: recipient,
          amount: amountInfo.amount,
          token: tokenAddress ?? undefined,
        });

        const r = result as Record<string, unknown>;
        await callback?.({
          text: [
            `✅ Transfer submitted!`,
            `🔑 Execution ID: \`${r["executionId"]}\``,
            `📊 Status: ${r["status"]}`,
            `💡 Use \`check execution ${r["executionId"]}\` to get the tx hash.`,
          ].join("\n"),
        });
        return true;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Transfer failed: ${err}`);
        await callback?.({ text: `❌ Transfer failed: ${err instanceof Error ? err.message : String(err)}` });
        return false;
      }
    },

    examples: [
      [
        { user: "{{user1}}", content: { text: "Send 0.01 ETH to 0xAbCd1234567890AbCd1234567890AbCd12345678 on Base" } },
        {
          user: "{{agentName}}",
          content: {
            text: "💸 Sending **0.01 ETH** to `0xAbCd...5678` on chain 8453…",
            action: "KEEPERHUB_TRANSFER",
          },
        },
      ],
    ],
  };
}
