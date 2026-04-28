import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";
import { KeeperHubAuthError, KeeperHubNotFoundError } from "keeperhub-sdk";

function extractExecutionId(text: string): string | null {
  const execMatch = text.match(/\bexec_[a-zA-Z0-9_-]+\b/);
  if (execMatch) return execMatch[0];
  const uuidMatch = text.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
  );
  return uuidMatch ? uuidMatch[0] : null;
}

function isStatusCheckRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("check execution") ||
    lower.includes("execution status") ||
    lower.includes("status of execution") ||
    lower.includes("what happened with") ||
    lower.includes("how is execution") ||
    lower.includes("get logs") ||
    lower.includes("show logs")
  );
}

export function createCheckExecutionAction(kh: KeeperHub): Action {
  return {
    name: "CHECK_KEEPERHUB_EXECUTION",
    similes: [
      "EXECUTION_STATUS",
      "GET_EXECUTION_STATUS",
      "CHECK_EXECUTION",
      "EXECUTION_LOGS",
      "GET_LOGS",
    ],
    description:
      "Check the status and logs of a KeeperHub workflow execution by execution ID.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      return isStatusCheckRequest(text) && extractExecutionId(text) !== null;
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const executionId = extractExecutionId(text);
      const wantsLogs = text.toLowerCase().includes("log");

      if (!executionId) {
        await callback?.({
          text: "I couldn't find an execution ID. Please include an execution ID (e.g. `exec_abc123`).",
        });
        return false;
      }

      try {
        const [status, logs] = await Promise.all([
          kh.executions.getStatus(executionId),
          wantsLogs
            ? kh.executions.getLogs(executionId)
            : Promise.resolve(undefined),
        ]);

        const statusEmoji: Record<string, string> = {
          completed: "✅",
          failed: "❌",
          error: "⛔",
          running: "🔄",
          pending: "⏳",
          cancelled: "🚫",
        };

        const lines: string[] = [
          `${statusEmoji[status.status] ?? "❓"} Execution \`${executionId}\` — **${status.status}**`,
        ];

        if (status.progress) {
          const p = status.progress;
          lines.push(
            `📊 Progress: ${p.completedSteps}/${p.totalSteps} steps (${p.percentage}%)`
          );
          if (p.currentNodeName) {
            lines.push(`🔧 Current step: ${p.currentNodeName}`);
          }
        }

        if (status.errorContext?.error) {
          lines.push(`⚠️ Error: ${status.errorContext.error}`);
        }

        if (logs && logs.length > 0) {
          lines.push("", "**Step logs:**");
          for (const log of logs.slice(0, 10)) {
            // ExecutionLog.status uses "success" for successful steps from the API
            const logStatus = log.status as string;
            const icon =
              logStatus === "success" || logStatus === "completed"
                ? "✅"
                : logStatus === "error" || logStatus === "failed"
                  ? "❌"
                  : "🔄";
            lines.push(
              `${icon} \`${log.step ?? log.nodeId}\` — ${log.status}${log.durationMs ? ` (${log.durationMs}ms)` : ""}`
            );
            if (log.txHash) {
              lines.push(`   🔗 tx: \`${log.txHash}\``);
            }
          }
        }

        await callback?.({ text: lines.join("\n") });
        return true;
      } catch (err) {
        elizaLogger.error(
          `[KeeperHub] Failed to fetch execution status: ${err instanceof Error ? err.message : String(err)}`
        );
        // Don't reveal whether an execution ID exists vs. access is denied —
        // return the same generic message for both 401 and 404 to prevent enumeration
        if (
          err instanceof KeeperHubAuthError ||
          err instanceof KeeperHubNotFoundError
        ) {
          await callback?.({
            text: "Execution not found or not accessible with your API key.",
          });
        } else {
          await callback?.({
            text: `❌ Failed to check execution: ${err instanceof Error ? err.message : "Unknown error"}`,
          });
        }
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: { text: "Check execution status exec_abc123" },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "✅ Execution `exec_abc123` — **completed**",
            action: "CHECK_KEEPERHUB_EXECUTION",
          },
        },
      ],
    ],
  };
}
