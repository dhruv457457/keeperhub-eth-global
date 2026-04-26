import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

const ExecuteWorkflowSchema = z.object({
  workflowId: z
    .string()
    .regex(
      /^(wf_[a-zA-Z0-9_-]{1,64}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
      "Invalid workflow ID — expected wf_xxx or a UUID"
    )
    .describe(
      "The KeeperHub workflow ID to execute (format: wf_xxx or a UUID)"
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
export function createExecuteWorkflowTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "execute_keeperhub_workflow",
    description:
      "Execute a KeeperHub onchain automation workflow. " +
      "Use this when you need to run a blockchain transaction, DeFi operation, " +
      "token transfer, or any other onchain action that has been configured as a KeeperHub workflow. " +
      "Pass the workflow ID and any required runtime inputs.",
    schema: ExecuteWorkflowSchema,
    func: async ({ workflowId, input, wait, mode }) => {
      // tryRun never throws — returns a structured AgentObservation with an
      // LLM-ready summary field so the agent can reason about success or failure
      const obs = await kh.tryRun(workflowId, {
        input,
        wait,
        mode: mode ?? "safe",
        verbose: true,
      });

      if (!obs.ok) {
        return JSON.stringify({
          ok: false,
          summary: obs.summary,
          error: obs.error?.message,
          isRetryable: obs.error?.isRetryable,
          suggestion: obs.error?.suggestedAction,
        });
      }

      const result = obs.result!;
      return JSON.stringify({
        ok: true,
        summary: obs.summary,
        executionId: result.executionId,
        status: result.status,
        attempts: result.attempts,
        transactionHash: result.execution.transactionHash,
        gasUsedWei: result.execution.gasUsedWei,
        output: result.execution.output,
      });
    },
  });
}
