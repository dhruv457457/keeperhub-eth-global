import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Read or write any smart contract function.
 *
 * Read (view/pure): returns the function return value immediately with no gas cost.
 * Write (state-changing): submits a transaction and returns execution_id for polling.
 */
export function createContractCallTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_contract_call",
    description:
      "Read or write any smart contract function. " +
      "Set callType='read' for view/pure functions — returns value immediately, no gas cost. " +
      "Set callType='write' for state-changing functions — returns execution_id, costs gas. " +
      "For write calls, follow up with check_keeperhub_execution to get the tx hash.",
    schema: z.object({
      network: z.string().describe("Chain ID as string (e.g. '8453' for Base)"),
      contract: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .describe("Smart contract address (0x...)"),
      function: z
        .string()
        .min(1)
        .max(128)
        .describe("Function name to call (e.g. 'balanceOf', 'transfer')"),
      args: z
        .array(z.unknown())
        .optional()
        .describe(
          "Function arguments as a JSON array (e.g. ['0xABC...', '1000000'])"
        ),
      abi: z
        .string()
        .optional()
        .describe("Contract ABI JSON string. Auto-fetched if omitted."),
      callType: z
        .enum(["read", "write"])
        .default("read")
        .describe(
          "'read' for view/pure (no gas), 'write' for state-changing (costs gas)"
        ),
      gasLimitMultiplier: z
        .string()
        .regex(/^\d+(\.\d+)?$/)
        .optional()
        .describe(
          "Gas headroom multiplier e.g. '1.2' adds 20%. Write calls only."
        ),
    }),
    func: async ({
      network,
      contract,
      function: fn,
      args,
      abi,
      callType,
      gasLimitMultiplier,
    }) => {
      try {
        if (callType === "read") {
          const result = await kh.web3.read({
            network,
            contract,
            function: fn,
            args,
            abi,
          });
          return JSON.stringify({ ok: true, result });
        }
        const result = await kh.web3.write({
          network,
          contract,
          function: fn,
          args,
          abi,
          gasLimitMultiplier,
        });
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
