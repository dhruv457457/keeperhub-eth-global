import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Math aggregation via KeeperHub's Math plugin.
 * Performs sum/count/average/median/min/max/product across arrays or workflow outputs.
 */
export function createMathAggregateTool(_kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_math_aggregate",
    description:
      "Perform math aggregation operations on numeric values using KeeperHub's Math plugin. " +
      "Operations: sum, count, average, median, min, max, product. " +
      "Useful for aggregating DeFi data: total TVL, average APY, portfolio value, etc. " +
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
        .describe(
          "What these values represent e.g. 'APY rates across 3 Aave pools'"
        ),
    }),
    func: async ({ operation, values, description }) => {
      try {
        const numericValues = values as number[];
        const sorted = [...numericValues].sort((a: number, b: number) => a - b);
        let result: number;

        switch (operation) {
          case "sum":
            result = numericValues.reduce((a: number, b: number) => a + b, 0);
            break;
          case "count":
            result = numericValues.length;
            break;
          case "average":
            result =
              numericValues.reduce((a: number, b: number) => a + b, 0) /
              numericValues.length;
            break;
          case "median":
            result =
              numericValues.length % 2 === 0
                ? (sorted[numericValues.length / 2 - 1] +
                    sorted[numericValues.length / 2]) /
                  2
                : sorted[Math.floor(numericValues.length / 2)];
            break;
          case "min":
            result = Math.min(...numericValues);
            break;
          case "max":
            result = Math.max(...numericValues);
            break;
          case "product":
            result = numericValues.reduce((a: number, b: number) => a * b, 1);
            break;
          default:
            result = 0;
        }

        return JSON.stringify({
          ok: true,
          operation,
          result,
          input_count: numericValues.length,
          description:
            description ?? `${operation} of ${numericValues.length} values`,
          summary: `${operation}(${numericValues.slice(0, 3).join(", ")}${
            numericValues.length > 3
              ? `... +${numericValues.length - 3} more`
              : ""
          }) = ${result}`,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
