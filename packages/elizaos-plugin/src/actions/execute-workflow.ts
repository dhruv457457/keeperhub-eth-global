import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

// ─── Input safety helpers ─────────────────────────────────────────────────────

const MAX_INPUT_KEYS = 20;
const MAX_INPUT_VALUE_LEN = 512;
const MAX_TOTAL_INPUT_BYTES = 8_192;

/**
 * Sanitizes a parsed JSON object so it's safe to pass as workflow input.
 * - JSON round-trip strips __proto__ from ALL nesting levels (prototype pollution defense)
 * - Removes remaining prototype-polluting keys at top level
 * - Truncates string values over 512 chars (before serialization, not after)
 * - Limits to MAX_INPUT_KEYS keys
 * - Flattens non-primitive nested values to strings
 *
 * Returns null if the sanitized input exceeds MAX_TOTAL_INPUT_BYTES — callers
 * must treat null as a hard rejection (not as "empty input").
 */
function sanitizeInput(raw: unknown): Record<string, unknown> | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  // JSON round-trip removes __proto__ from nested objects — must happen first
  let cleaned: unknown;
  try {
    cleaned = JSON.parse(JSON.stringify(raw));
  } catch {
    return {};
  }
  if (cleaned === null || typeof cleaned !== "object" || Array.isArray(cleaned)) {
    return {};
  }

  const blocked = new Set(["__proto__", "constructor", "prototype"]);
  const result: Record<string, unknown> = {};
  let count = 0;

  for (const [key, value] of Object.entries(cleaned as Record<string, unknown>)) {
    if (blocked.has(key)) continue;
    if (count >= MAX_INPUT_KEYS) break;

    const strKey = String(key).slice(0, 64);
    // Truncate strings directly — never truncate serialized JSON mid-structure
    const strVal =
      typeof value === "string"
        ? value.slice(0, MAX_INPUT_VALUE_LEN)
        : typeof value === "number" || typeof value === "boolean" || value === null
          ? value
          : String(JSON.stringify(value)).slice(0, MAX_INPUT_VALUE_LEN);

    result[strKey] = strVal;
    count++;
  }

  // Final size guard — return null (not {}) so callers can distinguish
  // "no input provided" from "input was provided but rejected"
  const serialized = JSON.stringify(result);
  if (serialized.length > MAX_TOTAL_INPUT_BYTES) {
    elizaLogger.warn(
      `[KeeperHub] Workflow input too large (${serialized.length} bytes, max ${MAX_TOTAL_INPUT_BYTES})`
    );
    return null;
  }

  return result;
}

/**
 * Extracts a workflow ID from agent message text.
 * Only matches the wf_ prefix format — never arbitrary strings.
 */
function extractWorkflowId(text: string): string | null {
  const match = text.match(/\bwf_[a-zA-Z0-9_-]{1,64}\b/);
  return match ? match[0] : null;
}

/**
 * Parses JSON from message text — handles nested objects correctly.
 * Only extracts from explicit ```json blocks to avoid accidental matches.
 *
 * Returns:
 * - A sanitized Record if JSON was found and is within size limits
 * - `null` if JSON was found but exceeds MAX_TOTAL_INPUT_BYTES (hard rejection)
 * - `undefined` if no JSON block was found in the message
 */
function extractJsonInput(text: string): Record<string, unknown> | null | undefined {
  // Only extract from explicit code blocks — never from bare text
  // This prevents accidental extraction of non-input JSON from the message
  const jsonBlock = text.match(/```json\s*([\s\S]*?)\s*```/)?.[1];
  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock);
      return sanitizeInput(parsed); // may be null if too large
    } catch {
      return undefined;
    }
  }

  // Also support explicit input: {...} prefix pattern
  const labeledBlock = text.match(/input\s*:\s*(\{[\s\S]*\})/i)?.[1];
  if (labeledBlock) {
    try {
      const parsed = JSON.parse(labeledBlock);
      return sanitizeInput(parsed); // may be null if too large
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export interface ExecuteWorkflowActionOptions {
  /**
   * If provided, only workflow IDs in this set can be executed by the agent.
   * Prevents malicious users from running arbitrary workflows via chat.
   */
  allowedWorkflowIds?: Set<string> | string[];
}

export function createExecuteWorkflowAction(
  kh: KeeperHub,
  options: ExecuteWorkflowActionOptions = {}
): Action {
  const allowedIds = options.allowedWorkflowIds
    ? new Set(options.allowedWorkflowIds)
    : null;

  return {
    name: "EXECUTE_KEEPERHUB_WORKFLOW",
    similes: [
      "RUN_WORKFLOW",
      "TRIGGER_WORKFLOW",
      "EXECUTE_WORKFLOW",
      "START_WORKFLOW",
      "RUN_KEEPERHUB",
      "KEEPERHUB_EXECUTE",
    ],
    description:
      "Execute a KeeperHub onchain automation workflow. Provide the workflow ID (wf_xxx) and optional JSON input in a ```json block.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const workflowId = extractWorkflowId(text);
      if (!workflowId) return false;
      // If an allowlist is configured, enforce it at validate time
      if (allowedIds && !allowedIds.has(workflowId)) return false;
      return true;
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const workflowId = extractWorkflowId(text);

      if (!workflowId) {
        await callback?.({ text: "I couldn't find a workflow ID. Include a workflow ID like `wf_abc123`." });
        return false;
      }

      // Double-check allowlist in handler too (defense-in-depth)
      if (allowedIds && !allowedIds.has(workflowId)) {
        await callback?.({ text: `Workflow \`${workflowId}\` is not in the allowed list.` });
        return false;
      }

      const extracted = extractJsonInput(text);

      // null = JSON was provided but exceeded the size limit — reject rather than
      // silently proceeding with empty input which could break the workflow
      if (extracted === null) {
        await callback?.({
          text: `❌ Input too large. Maximum allowed input size is ${MAX_TOTAL_INPUT_BYTES} bytes. Please reduce the size of your JSON block.`,
        });
        return false;
      }

      const input = extracted; // undefined = no JSON block found (fine — workflow runs with no input)

      await callback?.({
        text: `⚙️ Executing KeeperHub workflow \`${workflowId}\`${input ? " with provided inputs" : ""}…`,
      });

      // tryRun never throws — always returns a structured AgentObservation.
      // onProgress fires intermediate callback messages so the user isn't left
      // staring at silence for up to 2 minutes during a long-running workflow.
      let lastProgressStep = "";
      const obs = await kh.tryRun(workflowId, {
        input,
        wait: true,
        verbose: true,
        mode: "safe",
        waitOptions: {
          timeout: 120_000,
          onProgress: (status) => {
            if (status.progress) {
              const { completedSteps, totalSteps, currentNodeName } = status.progress;
              const stepMsg = currentNodeName ?? `step ${completedSteps}`;
              if (stepMsg !== lastProgressStep) {
                lastProgressStep = stepMsg;
                void callback?.({
                  text: `🔄 ${completedSteps}/${totalSteps}: ${stepMsg}…`,
                });
              }
            }
          },
        },
      });

      if (!obs.ok) {
        elizaLogger.error(
          `[KeeperHub] Workflow execution failed: ${obs.error?.message ?? "unknown"}`
        );
        const retryHint = obs.error?.isRetryable ? " (retryable)" : "";
        await callback?.({
          text: `❌ ${obs.summary}${retryHint}`,
        });
        return false;
      }

      const result = obs.result!;
      const statusEmoji =
        result.status === "completed" ? "✅" : result.status === "failed" ? "❌" : "⚠️";

      const messageText = [
        `${statusEmoji} Workflow \`${workflowId}\` finished with status **${result.status}**.`,
        result.execution.transactionHash
          ? `🔗 Transaction: \`${result.execution.transactionHash}\``
          : null,
        result.execution.gasUsedWei
          ? `⛽ Gas used: ${result.execution.gasUsedWei} wei`
          : null,
        `🔁 Attempts: ${result.attempts}`,
      ]
        .filter(Boolean)
        .join("\n");

      await callback?.({ text: messageText });
      return result.status === "completed";
    },

    examples: [
      [
        { user: "{{user1}}", content: { text: "Run workflow wf_abc123" } },
        {
          user: "{{agentName}}",
          content: {
            text: "⚙️ Executing KeeperHub workflow `wf_abc123`…",
            action: "EXECUTE_KEEPERHUB_WORKFLOW",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: { text: "Execute wf_xyz\n```json\n{\"amount\": \"100\", \"token\": \"USDC\"}\n```" },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "⚙️ Executing KeeperHub workflow `wf_xyz` with provided inputs…",
            action: "EXECUTE_KEEPERHUB_WORKFLOW",
          },
        },
      ],
    ],
  };
}
