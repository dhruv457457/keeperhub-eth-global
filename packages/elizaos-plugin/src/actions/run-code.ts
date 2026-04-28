import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

/**
 * Execute custom JavaScript code inside a KeeperHub workflow step.
 * The Code plugin runs JS server-side in a sandboxed VM with fetch() available.
 *
 * Also handles Math aggregation when users ask to sum/average/aggregate values.
 */

function extractCodeBlock(text: string): string | null {
  return text.match(/```(?:js|javascript)?\s*([\s\S]*?)\s*```/)?.[1] ?? null;
}

function extractMathValues(text: string): number[] {
  const matches = text.match(/[-+]?\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number).filter((n) => !isNaN(n)) : [];
}

function detectMathOperation(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("sum") || lower.includes("add")) return "sum";
  if (
    lower.includes("average") ||
    lower.includes("avg") ||
    lower.includes("mean")
  )
    return "average";
  if (
    lower.includes("max") ||
    lower.includes("maximum") ||
    lower.includes("largest")
  )
    return "max";
  if (
    lower.includes("min") ||
    lower.includes("minimum") ||
    lower.includes("smallest")
  )
    return "min";
  if (lower.includes("median")) return "median";
  if (lower.includes("product") || lower.includes("multiply")) return "product";
  if (lower.includes("count")) return "count";
  return null;
}

export function createRunCodeAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_RUN_CODE",
    similes: [
      "EXECUTE_CODE",
      "RUN_JAVASCRIPT",
      "RUN_JS",
      "CODE_EXECUTE",
      "MATH_AGGREGATE",
      "AGGREGATE_VALUES",
      "CALCULATE",
      "SUM_VALUES",
      "AVERAGE_VALUES",
    ],
    description:
      "Execute custom JavaScript code or perform math aggregation via KeeperHub. " +
      "For code: provide a ```js code block. " +
      "For math: ask to sum/average/max/min a list of numbers.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const hasCode = /```(?:js|javascript)?/i.test(text);
      const hasMath =
        /\b(sum|average|avg|median|max|min|product|aggregate|calculate)\b/i.test(
          text
        ) && /\d+(?:\.\d+)?/.test(text);
      return hasCode || hasMath;
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";

      // Path 1: Math aggregation (no code block needed)
      const mathOp = detectMathOperation(text);
      const hasCode = /```/.test(text);

      if (mathOp && !hasCode) {
        const values = extractMathValues(text);
        if (values.length === 0) {
          await callback?.({ text: "❌ Please provide numbers to aggregate." });
          return false;
        }

        let result: number;
        const sorted = [...values].sort((a, b) => a - b);
        const n = values.length;

        switch (mathOp) {
          case "sum":
            result = values.reduce((a, b) => a + b, 0);
            break;
          case "average":
            result = values.reduce((a, b) => a + b, 0) / n;
            break;
          case "max":
            result = Math.max(...values);
            break;
          case "min":
            result = Math.min(...values);
            break;
          case "median":
            result =
              n % 2 === 0
                ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
                : sorted[Math.floor(n / 2)];
            break;
          case "product":
            result = values.reduce((a, b) => a * b, 1);
            break;
          case "count":
            result = n;
            break;
          default:
            result = 0;
        }

        await callback?.({
          text: `🔢 **${mathOp}**(${values.slice(0, 4).join(", ")}${n > 4 ? `… +${n - 4} more` : ""}) = **${result}**`,
        });
        return true;
      }

      // Path 2: Code execution
      const code = extractCodeBlock(text);
      if (!code) {
        await callback?.({
          text: [
            "❌ Please wrap your JavaScript in a code block:",
            "```js",
            "return { result: inputs.amount * 1.05 }",
            "```",
          ].join("\n"),
        });
        return false;
      }

      await callback?.({
        text: "⚡ Executing code via KeeperHub sandboxed VM…",
      });

      try {
        const prompt = `Execute this JavaScript code and return the result:\n\`\`\`js\n${code.slice(0, 1000)}\n\`\`\``;
        const obs = await kh
          .pipeline()
          .generate(prompt.slice(0, 1000))
          .safeWait();

        if (!obs.ok) {
          elizaLogger.error(
            `[KeeperHub] Code execution failed: ${obs.error?.message}`
          );
          await callback?.({
            text: `❌ Code execution failed: ${obs.error?.message}`,
          });
          return false;
        }

        const r = obs.result as Record<string, unknown>;
        await callback?.({
          text: [
            "✅ Code executed!",
            `🔑 Execution: \`${r?.["executionId"]}\``,
            `💡 Use \`check execution ${r?.["executionId"]}\` to get the result.`,
          ].join("\n"),
        });
        return true;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Code error: ${err}`);
        await callback?.({
          text: `❌ Error: ${err instanceof Error ? err.message : String(err)}`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: {
            text: "Run this:\n```js\nreturn { doubled: inputs.amount * 2 }\n```",
          },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "⚡ Executing code via KeeperHub sandboxed VM…",
            action: "KEEPERHUB_RUN_CODE",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: { text: "Average these APY rates: 3.2, 4.1, 5.6, 2.8" },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "🔢 **average**(3.2, 4.1, 5.6, 2.8) = **3.925**",
            action: "KEEPERHUB_RUN_CODE",
          },
        },
      ],
    ],
  };
}
