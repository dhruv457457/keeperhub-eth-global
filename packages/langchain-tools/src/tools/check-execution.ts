import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { KeeperHubAuthError, KeeperHubNotFoundError } from "keeperhub-sdk";
import { z } from "zod";

const CheckExecutionSchema = z.object({
  executionId: z
    .string()
    .regex(
      /^(exec_[a-zA-Z0-9_-]{1,64}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
      "Invalid execution ID — expected exec_xxx or a UUID"
    )
    .describe("The KeeperHub execution ID to check (e.g., exec_abc123 or UUID)"),
  includeLogs: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to include step-by-step execution logs"),
});

export function createCheckExecutionTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "check_keeperhub_execution",
    description:
      "Check the status and progress of a KeeperHub workflow execution. " +
      "Use this to monitor a running execution, diagnose failures, or confirm completion. " +
      "Optionally include step-by-step logs for debugging.",
    schema: CheckExecutionSchema,
    func: async ({ executionId, includeLogs }) => {
      try {
        const [status, logs] = await Promise.all([
          kh.executions.getStatus(executionId),
          includeLogs ? kh.executions.getLogs(executionId) : Promise.resolve(undefined),
        ]);

        return JSON.stringify({
          executionId,
          status: status.status,
          progress: status.progress,
          error: status.errorContext?.error,
          failedNodeId: status.errorContext?.failedNodeId,
          logs: logs?.map((log) => ({
            step: log.step,
            status: log.status,
            durationMs: log.durationMs,
            txHash: log.txHash,
            error: log.error,
          })),
        });
      } catch (err) {
        // Return a string (never throw) — LangChain tools surface errors as text
        // Don't reveal whether an ID exists vs. access is denied to prevent enumeration
        if (err instanceof KeeperHubAuthError || err instanceof KeeperHubNotFoundError) {
          return JSON.stringify({
            error: "Execution not found or not accessible with your API key.",
          });
        }
        return JSON.stringify({
          error: err instanceof Error ? err.message : "Failed to check execution status",
        });
      }
    },
  });
}
