import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Execute a payment-gated workflow via x402 (Base USDC) or MPP (Tempo USDC.e).
 * The pipeline handles payment automatically — agent never touches private keys.
 */
export function createPayAndRunTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_pay_and_run",
    description:
      "Execute a payment-gated KeeperHub workflow using x402 (Base USDC) or MPP (Tempo USDC.e). " +
      "Handles payment automatically — no manual signing needed. " +
      "Use for listed/paid workflows that return HTTP 402. " +
      "Set maxBudgetUsd to cap spending per call (default $1). " +
      "Returns ok, summary, execution_id, amount_paid, and tx hash.",
    schema: z.object({
      workflowId: z
        .string()
        .regex(/^(wf_[a-zA-Z0-9_-]{1,64}|[0-9a-z]{10,30})$/)
        .describe("Workflow ID (wf_xxx) from keeperhub_list_workflows"),
      input: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional()
        .describe("Runtime inputs for the workflow"),
      maxBudgetUsd: z
        .string()
        .regex(/^\d+(\.\d+)?$/)
        .default("1.00")
        .describe("Maximum USDC budget for this call (default $1.00)"),
      preferMpp: z
        .boolean()
        .default(true)
        .describe("Prefer MPP (Tempo USDC.e, cheaper) over x402 (Base USDC). Default true."),
    }),
    func: async ({ workflowId, input, maxBudgetUsd, preferMpp }) => {
      try {
        const result = await kh
          .pipeline()
          .workflow(workflowId)
          .pay({ budget: maxBudgetUsd, preferMpp })
          .safeWait();

        if (!result.ok) {
          return JSON.stringify({
            ok: false,
            summary: result.summary,
            error: result.error?.message,
            is_retryable: result.error?.isRetryable ?? false,
            suggestion: result.error?.suggestedAction,
          });
        }

        const r = result.result as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          summary: result.summary,
          execution_id: r?.["executionId"],
          status: r?.["status"],
          tx_hash: (r?.["execution"] as Record<string, unknown>)?.["transactionHash"],
          amount_paid_usd: maxBudgetUsd,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
