import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Atomically check an onchain condition and execute a transaction only if true.
 * Eliminates race conditions between the check and the action.
 *
 * Example: read Aave health factor → if below 1.2, trigger repayWithATokens.
 */
export function createCheckAndExecuteTool(
  kh: KeeperHub
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_check_and_execute",
    description:
      "Read an onchain condition and execute a transaction only if the condition is met. " +
      "Atomic — no race condition between the check and the action. " +
      "Example: read a health factor → if below 1.2, trigger a repay. " +
      "Returns execution_id if the condition was true and action was submitted.",
    schema: z.object({
      network: z.string().describe("Chain ID as string"),
      // Check params
      checkContract: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .describe("Contract address to read the condition from"),
      checkFunction: z
        .string()
        .describe("View function to call for the condition check"),
      checkArgs: z
        .array(z.unknown())
        .optional()
        .describe("Arguments for the check function"),
      checkAbi: z
        .string()
        .optional()
        .describe("ABI for the check contract (auto-fetched if omitted)"),
      // Condition
      conditionOperator: z
        .enum(["gt", "lt", "eq", "neq", "gte", "lte"])
        .describe("Comparison operator"),
      conditionValue: z
        .string()
        .describe("Value to compare against (as string)"),
      // Action params
      actionContract: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .describe("Contract to call if condition is true"),
      actionFunction: z
        .string()
        .describe("Function to execute if condition is true"),
      actionArgs: z
        .array(z.unknown())
        .optional()
        .describe("Arguments for the action function"),
      actionAbi: z.string().optional().describe("ABI for the action contract"),
      actionGasLimitMultiplier: z
        .string()
        .optional()
        .describe("Gas headroom e.g. '1.2'"),
    }),
    func: async ({
      network,
      checkContract,
      checkFunction,
      checkArgs,
      checkAbi,
      conditionOperator,
      conditionValue,
      actionContract,
      actionFunction,
      actionArgs,
      actionAbi,
      actionGasLimitMultiplier,
    }) => {
      try {
        const result = await kh.web3.checkAndExecute({
          network,
          check: {
            contract: checkContract,
            function: checkFunction,
            args: checkArgs as unknown[],
            abi: checkAbi,
            condition: { operator: conditionOperator, value: conditionValue },
          },
          action: {
            contract: actionContract,
            function: actionFunction,
            args: actionArgs as unknown[],
            abi: actionAbi,
            gasLimitMultiplier: actionGasLimitMultiplier,
          },
        });

        const r = result as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          condition_met: r["conditionMet"] ?? true,
          execution_id: r["executionId"],
          status: r["status"],
          hint: "Call check_keeperhub_execution with this execution_id to get the tx hash.",
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
