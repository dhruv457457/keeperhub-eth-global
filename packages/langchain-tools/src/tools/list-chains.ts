import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Lists all blockchain networks supported by KeeperHub.
 * Call this first to discover valid chain IDs before any web3 operation.
 */
export function createListChainsTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_list_chains",
    description:
      "List all blockchain networks that KeeperHub supports. " +
      "Returns chain IDs, names, symbols, and explorer URLs. " +
      "Call this first to discover valid network IDs before executing any web3 operation.",
    schema: z.object({}),
    func: async () => {
      try {
        const chains = await kh.chains.list();
        const summary = chains
          .filter(
            (c) =>
              !("isEnabled" in c) ||
              (c as Record<string, unknown>)["isEnabled"] !== false
          )
          .map((c) => ({
            chainId: (c as Record<string, unknown>)["chainId"],
            name: (c as Record<string, unknown>)["name"],
            symbol: (c as Record<string, unknown>)["symbol"],
            isTestnet: (c as Record<string, unknown>)["isTestnet"] ?? false,
            explorerUrl: (c as Record<string, unknown>)["explorerUrl"],
          }));
        return JSON.stringify(summary);
      } catch (err) {
        return JSON.stringify({ error: String(err) });
      }
    },
  });
}
