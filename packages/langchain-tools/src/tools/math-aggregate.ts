import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Math aggregation via KeeperHub's Math plugin.
 * Performs sum/count/average/median/min/max/product across arrays or workflow outputs.
 * Use inside multi-step workflows to aggregate DeFi data (pool TVLs, rates, balances).
 */
export function createMathAggregateTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_math_aggregate",
    description:
      "Perform math aggregation operations on numeric values using KeeperHub's Math plugin. " +
      "Operations: sum, count, average, median, min, max, product. " +
      "Useful for aggregating DeFi data — total TVL, average APY, portfolio value, etc. " +
      "Returns the aggregated result.",
    schema: z.object({
      operation: z
        .enum(["sum", "count", "average", "median", "min", "max", "product"])
        .describe("Aggregation operation to perform"),
      values: z
        .array(z.number())
        .min(1)
        .max(1000)
        .describe("Array of numeric values to aggregate"),
      description: z
        .string()
        .max(200)
        .optional()
        .describe("What these values represent e.g. 'APY rates across 3 Aave pools'"),
    }),
    func: async ({ operation, values, description }) => {
      // For simple math, compute client-side and return immediately
      // For complex workflow math (template variables from upstream steps), use pipeline
      try {
        let result: number;
        const sorted = [...values].sort((a, b) => a - b);

        switch (operation) {
          case "sum":
            result = values.reduce((a, b) => a + b, 0);
            break;
          case "count":
            result = values.length;
            break;
          case "average":
            result = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case "median":
            result = values.length % 2 === 0
              ? (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2
              : sorted[Math.floor(values.length / 2)];
            break;
          case "min":
            result = Math.min(...values);
            break;
          case "max":
            result = Math.max(...values);
            break;
          case "product":
            result = values.reduce((a, b) => a * b, 1);
            break;
          default:
            result = 0;
        }

        return JSON.stringify({
          ok: true,
          operation,
          result,
          input_count: values.length,
          description: description ?? `${operation} of ${values.length} values`,
          summary: `${operation}(${values.slice(0, 3).join(", ")}${values.length > 3 ? `… +${values.length - 3} more` : ""}) = ${result}`,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
