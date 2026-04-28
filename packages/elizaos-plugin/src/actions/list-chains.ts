import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

export function createListChainsAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_LIST_CHAINS",
    similes: [
      "LIST_CHAINS",
      "SUPPORTED_CHAINS",
      "WHAT_CHAINS",
      "WHICH_NETWORKS",
      "SUPPORTED_NETWORKS",
      "LIST_NETWORKS",
    ],
    description:
      "List all blockchain networks that KeeperHub supports with their chain IDs and symbols.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = (message.content?.text ?? "").toLowerCase();
      return (
        (text.includes("chain") ||
          text.includes("network") ||
          text.includes("blockchain")) &&
        (text.includes("list") ||
          text.includes("support") ||
          text.includes("which") ||
          text.includes("what") ||
          text.includes("available"))
      );
    },

    handler: async (
      _runtime: IAgentRuntime,
      _message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      try {
        const chains = await kh.chains.list();
        const enabled = chains.filter(
          (c) =>
            !("isEnabled" in c) ||
            (c as Record<string, unknown>)["isEnabled"] !== false
        );

        const mainnets = enabled.filter(
          (c) => !(c as Record<string, unknown>)["isTestnet"]
        );
        const testnets = enabled.filter(
          (c) => (c as Record<string, unknown>)["isTestnet"]
        );

        const formatChain = (c: unknown): string => {
          const r = c as Record<string, unknown>;
          return `• **${r["name"]}** (${r["symbol"]}) — Chain ID: \`${r["chainId"]}\``;
        };

        const lines = [
          "🌐 **Supported Networks:**",
          "",
          "**Mainnets:**",
          ...mainnets.map(formatChain),
        ];
        if (testnets.length > 0) {
          lines.push("", "**Testnets:**", ...testnets.map(formatChain));
        }

        await callback?.({ text: lines.join("\n") });
        return true;
      } catch (err) {
        await callback?.({
          text: `❌ Failed to fetch chains: ${err instanceof Error ? err.message : String(err)}`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: { text: "What chains does KeeperHub support?" },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "🌐 **Supported Networks:**\n\n**Mainnets:**\n• **Ethereum** (ETH) — Chain ID: `1`\n...",
            action: "KEEPERHUB_LIST_CHAINS",
          },
        },
      ],
    ],
  };
}
