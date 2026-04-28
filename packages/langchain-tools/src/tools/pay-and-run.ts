import { DynamicStructuredTool } from "@langchain/core/tools";
import { KeeperHubPaymentRequiredError, type KeeperHub } from "keeperhub-sdk";
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
    schema: z
      .object({
        workflowId: z
          .string()
          .regex(/^(wf_[a-zA-Z0-9_-]{1,64}|[0-9a-z]{10,30})$/)
          .optional()
          .describe("Owned KeeperHub workflow ID from keeperhub_list_workflows"),
        listedSlug: z
          .string()
          .regex(/^[a-z0-9][a-z0-9-]{1,120}$/)
          .optional()
          .describe(
            "Public listed workflow slug from the x402/MPP catalog, e.g. 'microtip'."
          ),
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
          .describe(
            "Prefer MPP (Tempo USDC.e, cheaper) over x402 (Base USDC). Default true."
          ),
      })
      .refine((value) => value.workflowId || value.listedSlug, {
        message: "Provide workflowId or listedSlug",
      }),
    func: async ({ workflowId, listedSlug, input, maxBudgetUsd, preferMpp }) => {
      try {
        if (listedSlug) {
          const result = await kh.payments.execute(listedSlug, input ?? {});
          return JSON.stringify({
            ok: true,
            summary: `Listed workflow ${listedSlug} executed.`,
            execution_id: result.executionId,
            status: result.status,
            output: (result as unknown as Record<string, unknown>)["output"],
          });
        }

        const result = await kh
          .pipeline()
          .workflow(workflowId!)
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
          tx_hash: (r?.["execution"] as Record<string, unknown>)?.[
            "transactionHash"
          ],
          amount_paid_usd: maxBudgetUsd,
        });
      } catch (err) {
        if (err instanceof KeeperHubPaymentRequiredError) {
          const wwwAuthenticate =
            err.responseHeaders?.["www-authenticate"] ??
            err.responseHeaders?.["WWW-Authenticate"] ??
            "";
          const protocol = /method="?tempo"?|^mpp/i.test(wwwAuthenticate)
            ? "mpp"
            : "x402";
          return JSON.stringify({
            ok: false,
            payment_required: true,
            protocol,
            challenge: err.paymentRequirements,
            headers: {
              www_authenticate: err.responseHeaders?.["www-authenticate"],
              x_payment_requirements:
                err.responseHeaders?.["x-payment-requirements"],
            },
            hint:
              "Payment challenge received. Use an x402/MPP payment resolver to sign and retry.",
          });
        }
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
