import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

const ExecuteWorkflowSchema = z.object({
  workflowId: z
    .string()
    .min(4)
    .max(80)
    .describe(
      "The KeeperHub workflow ID to execute. Get from keeperhub_list_workflows. Example: 3297ovip8fa4j7t9dxw2q"
    ),
  input: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .refine(
      (obj) => !obj || JSON.stringify(obj).length < 8192,
      "Input too large (max 8KB)"
    )
    .describe("Runtime key-value inputs to pass to the workflow"),
  wait: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      "Whether to wait for the workflow to complete before returning (default: true)"
    ),
  mode: z
    .enum(["safe", "fast"])
    .optional()
    .default("safe")
    .describe(
      "safe = retry on failure, fast = fire-and-forget (default: safe)"
    ),
});

/**
 * LangChain tool that executes a KeeperHub workflow.
 *
 * @example
 * const tool = createExecuteWorkflowTool(kh);
 * const agent = await createReactAgent({ llm, tools: [tool] });
 */
export function createExecuteWorkflowTool(
  kh: KeeperHub
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_execute_workflow",
    description:
      "Execute a KeeperHub onchain automation workflow. " +
      "Use this when you need to run a blockchain transaction, DeFi operation, " +
      "token transfer, or any other onchain action that has been configured as a KeeperHub workflow. " +
      "Pass the workflow ID and any required runtime inputs.",
    schema: ExecuteWorkflowSchema,
    func: async ({ workflowId, input }) => {
      try {
        // Direct execution — returns executionId immediately
        const handle = await kh.workflows.execute(workflowId, input ?? {});
        return JSON.stringify({
          ok: true,
          executionId: handle.id,
          workflowId,
          status: "running",
          hint: `Use keeperhub_check_execution with executionId="${handle.id}" to poll status`,
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          workflowId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  });
}
