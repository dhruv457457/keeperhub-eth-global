import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Register this agent on-chain via ERC-8004.
 * Mints an NFT identity on Ethereum Mainnet — idempotent, safe to call on startup.
 */
export function createRegisterAgentTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_register_agent",
    description:
      "Register this AI agent on-chain as an ERC-8004 identity. " +
      "Mints an NFT on Ethereum Mainnet representing the agent. " +
      "Idempotent — safe to call on every startup, will not create duplicates. " +
      "Returns the on-chain registration with NFT token ID and registry address.",
    schema: z.object({
      name: z.string().max(64).optional().describe("Agent name (e.g. 'My DeFi Agent')"),
      description: z.string().max(256).optional().describe("What this agent does"),
      capabilities: z
        .array(z.string())
        .max(20)
        .optional()
        .describe("List of capability slugs e.g. ['aave-v3/supply', 'uniswap/swap-exact-input']"),
    }),
    func: async ({ name, description, capabilities }) => {
      try {
        const registration = await kh.agent.ensureRegistered({
          name,
          description,
          capabilities,
        });
        const r = registration as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          agent_id: r["id"],
          name: r["name"],
          token_id: r["tokenId"],
          registry_address: r["registryAddress"],
          tx_hash: r["transactionHash"],
          summary: `Agent registered on-chain. Token ID: ${r["tokenId"]}. Registry: ${r["registryAddress"]}`,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
