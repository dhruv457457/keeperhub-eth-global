import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Ajna Protocol — permissionless lending on Base.
 * Liquidation, vault keeper, pool health monitoring.
 * No governance, no oracles — purely on-chain math.
 */
export function createAjnaTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_ajna",
    description:
      "Interact with the Ajna permissionless lending protocol on Base. " +
      "Monitor pool health, check borrower positions, query auction status, " +
      "and perform vault keeper operations. No oracles, no governance. " +
      "Actions: get-borrower-info, get-auction-status, get-pool-lup, get-pool-htp, " +
      "get-hpb-index, price-to-index, index-to-price, get-deposit-index, pool1-kicker-info.",
    schema: z.object({
      action: z
        .enum([
          "get-borrower-info",
          "get-auction-status",
          "get-pool-lup",
          "get-pool-htp",
          "get-hpb-index",
          "price-to-index",
          "index-to-price",
          "get-deposit-index",
          "pool1-kicker-info",
        ])
        .describe("Ajna action to perform"),
      params: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .default({})
        .describe(
          "Action parameters. For get-borrower-info: { pool, borrower }. " +
            "For get-auction-status: { pool, borrower }. " +
            "For price-to-index / index-to-price: { price } or { index }."
        ),
    }),
    func: async ({ action, params }) => {
      try {
        const result = await kh.protocols.execute(`ajna/${action}`, params);
        const r = result as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          action: `ajna/${action}`,
          result: r["result"] ?? result,
          execution_id: r["executionId"],
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          action: `ajna/${action}`,
          error: String(err),
        });
      }
    },
  });
}
