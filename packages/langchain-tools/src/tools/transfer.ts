import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Transfer native token (ETH, MATIC, etc.) or any ERC-20 token to a recipient.
 * Returns an execution ID — the agent should follow up with check_keeperhub_execution.
 */
export function createTransferTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_transfer",
    description:
      "Transfer native tokens (ETH, MATIC, etc.) or ERC-20 tokens to an address. " +
      "Uses KeeperHub's managed wallet with retry logic and gas optimization. " +
      "Returns an execution_id — follow up with check_keeperhub_execution to get the tx hash.",
    schema: z.object({
      network: z.string().describe("Chain ID as string (e.g. '8453' for Base, '1' for Ethereum)"),
      to: z.string().regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid 0x address").describe("Recipient wallet address"),
      amount: z.string().regex(/^\d+(\.\d+)?$/, "Must be a decimal number string").describe("Amount as decimal string (e.g. '0.01' for 0.01 ETH)"),
      token: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .optional()
        .describe("ERC-20 token contract address. Omit to send native ETH/MATIC."),
    }),
    func: async ({ network, to, amount, token }) => {
      try {
        const result = await kh.web3.transfer({ network, to, amount, token });
        return JSON.stringify({
          ok: true,
          execution_id: (result as Record<string, unknown>)["executionId"],
          status: (result as Record<string, unknown>)["status"],
          hint: "Call check_keeperhub_execution with this execution_id to get the tx hash.",
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
