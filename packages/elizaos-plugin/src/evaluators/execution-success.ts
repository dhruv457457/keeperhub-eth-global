import type { Evaluator, IAgentRuntime, Memory } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

/**
 * KeeperHub Execution Success Evaluator
 *
 * After each conversation turn, scans recent agent messages for execution IDs
 * (exec_xxx or UUID format). If found, polls their status and stores the result
 * in agent memory — so follow-up questions like "did it work?" are answered
 * accurately even without the user explicitly asking for a status check.
 *
 * Stored as memory facts:
 *   "KeeperHub execution exec_abc completed successfully. TX: 0x..."
 *   "KeeperHub execution exec_xyz failed: insufficient funds"
 */

const EXEC_ID_PATTERN =
  /\b(exec_[a-zA-Z0-9_-]{1,64}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/g;

function extractExecutionIds(text: string): string[] {
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  EXEC_ID_PATTERN.lastIndex = 0;
  while ((m = EXEC_ID_PATTERN.exec(text)) !== null) {
    ids.add(m[1]);
  }
  return [...ids];
}

export function createExecutionSuccessEvaluator(kh: KeeperHub): Evaluator {
  return {
    name: "KEEPERHUB_EXECUTION_SUCCESS",
    description:
      "Evaluates whether KeeperHub execution IDs mentioned in this conversation have completed " +
      "and stores the outcome as agent memory for future reference.",
    similes: ["EXECUTION_EVALUATOR", "KEEPERHUB_STATUS_EVALUATOR"],
    alwaysRun: false,

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      EXEC_ID_PATTERN.lastIndex = 0;
      return EXEC_ID_PATTERN.test(text);
    },

    handler: async (
      runtime: IAgentRuntime,
      message: Memory
    ): Promise<string> => {
      const text = message.content?.text ?? "";
      const ids = extractExecutionIds(text);

      if (ids.length === 0) return "No execution IDs found.";

      const results: string[] = [];

      for (const id of ids.slice(0, 5)) {
        // cap at 5 to avoid rate-limiting
        try {
          const status = await kh.executions.getStatus(id);
          const s = status as Record<string, unknown>;
          const state = String(s["status"] ?? "unknown");
          const terminal = [
            "completed",
            "success",
            "failed",
            "error",
            "cancelled",
          ].includes(state);

          if (!terminal) {
            results.push(`Execution ${id} is still ${state}.`);
            continue;
          }

          const txHash =
            (s["transactionHash"] as string) ?? (s["txHash"] as string);
          const success = ["completed", "success"].includes(state);
          const fact = success
            ? `KeeperHub execution ${id} completed successfully.${txHash ? ` TX: ${txHash}` : ""}`
            : `KeeperHub execution ${id} failed with status '${state}'.${s["error"] ? ` Error: ${s["error"]}` : ""}`;

          // Store as a memory fragment so future turns can reference it
          await runtime.messageManager.createMemory({
            id: crypto.randomUUID() as `${string}-${string}-${string}-${string}-${string}`,
            userId: message.userId,
            agentId: message.agentId,
            roomId: message.roomId,
            content: { text: fact, source: "keeperhub-evaluator" },
            createdAt: Date.now(),
          });

          results.push(fact);
          elizaLogger.debug(`[KeeperHub Evaluator] ${fact}`);
        } catch (err) {
          results.push(
            `Could not check status for ${id}: ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      return results.join("\n");
    },

    examples: [],
  };
}
