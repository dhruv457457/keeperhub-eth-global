import type {
  ListedWorkflowCatalogResponse,
  ListedWorkflowSearchInput,
  PaymentBalanceResult,
  PaymentChallenge,
  PaymentExecutionOptions,
  PaymentExecutionResult,
  PaymentHistoryOptions,
  PaymentHistoryResponse,
  PaymentPreflightResult,
  PaymentTransaction,
} from "../types/index.js";
import type { HttpClient } from "./client.js";
import {
  KeeperHubPaymentRequiredError,
  KeeperHubValidationError,
} from "./errors.js";

function normalizeChallenge(value: unknown): PaymentChallenge {
  if (value !== null && typeof value === "object") {
    return value as PaymentChallenge;
  }
  return {};
}

/** Generate a cryptographically strong idempotency key for payment calls */
function generatePaymentIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pay-${crypto.randomUUID()}`;
  }
  // Fallback for older environments
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** True for transient errors that are safe to retry without side effects */
function isTransientError(error: unknown): boolean {
  if (error instanceof KeeperHubPaymentRequiredError) return false; // already handled
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("timeout") ||
      msg.includes("econnreset") ||
      msg.includes("fetch")
    );
  }
  return false;
}

export class PaymentsModule {
  constructor(private readonly client: HttpClient) {}

  async catalog(
    input?: ListedWorkflowSearchInput
  ): Promise<ListedWorkflowCatalogResponse> {
    return this.client.request<ListedWorkflowCatalogResponse>(
      "GET",
      "/api/mcp/workflows",
      {
        query: {
          q: input?.q,
          category: input?.category,
          chain: input?.chain,
          page: input?.page,
          limit: input?.limit,
        },
      }
    );
  }

  /**
   * Execute a listed workflow, handling x402 payment challenges automatically.
   *
   * If the workflow requires payment and `strategy: "auto"` is set with a
   * `resolvePayment` callback, the SDK will:
   * 1. Attempt execution (receives 402)
   * 2. Call `resolvePayment()` to get signed payment headers
   * 3. Retry with those headers using the same idempotency key
   *
   * The idempotency key ensures the retry is safe even if the first response
   * was lost — the server deduplicates using the key.
   */
  async execute(
    slug: string,
    input: Record<string, unknown> = {},
    options: PaymentExecutionOptions = {}
  ): Promise<PaymentExecutionResult> {
    try {
      return await this.call(slug, input, options.paymentHeaders);
    } catch (error) {
      if (!(error instanceof KeeperHubPaymentRequiredError)) {
        throw error;
      }

      if (options.strategy === "auto" && options.resolvePayment) {
        const resolvedHeaders = await options.resolvePayment({
          slug,
          input,
          challenge: normalizeChallenge(error.paymentRequirements),
          headers: error.responseHeaders ?? {},
        });

        // Use caller-supplied key or generate a fresh one.
        // The same key is forwarded on retry so the server can deduplicate
        // in case the first response was lost in transit.
        const idempotencyKey = options.idempotencyKey ?? generatePaymentIdempotencyKey();

        try {
          return await this.call(slug, input, resolvedHeaders, idempotencyKey);
        } catch (retryError) {
          // One more attempt on transient failures — payment was already signed,
          // so this retry carries the same idempotency key and is safe.
          if (isTransientError(retryError)) {
            return await this.call(slug, input, resolvedHeaders, idempotencyKey);
          }
          throw retryError;
        }
      }

      throw error;
    }
  }

  /**
   * Retrieve the x402 payment challenge for a listed workflow without executing it.
   * Useful for pre-building a signed payment before calling `execute()`.
   */
  async prepare(
    slug: string,
    input: Record<string, unknown> = {}
  ): Promise<PaymentChallenge> {
    try {
      await this.call(slug, input);
      throw new KeeperHubValidationError("Workflow did not require payment");
    } catch (error) {
      if (error instanceof KeeperHubPaymentRequiredError) {
        return normalizeChallenge(error.paymentRequirements);
      }
      throw error;
    }
  }

  // ─── x402 Payment Infrastructure ──────────────────────────────────────────

  /**
   * Estimate the cost of executing a workflow before committing funds.
   *
   * @example
   * const estimate = await kh.payments.preflight("wf_abc123");
   * if (!estimate.feasible) {
   *   if (estimate.feasibilityCode === "insufficient_balance") {
   *     console.error("Top up your wallet — need", estimate.estimatedCost, "USDC");
   *   }
   * }
   */
  async preflight(workflowId: string): Promise<PaymentPreflightResult> {
    return this.client.request<PaymentPreflightResult>(
      "GET",
      `/api/workflows/${encodeURIComponent(workflowId)}/payment/preflight`
    );
  }

  /**
   * Get the current USDC balance of the KeeperHub execution wallet.
   *
   * @example
   * const { usdc, address } = await kh.payments.balance();
   * console.log(`Balance: ${usdc} USDC at ${address}`);
   */
  async balance(): Promise<PaymentBalanceResult> {
    return this.client.request<PaymentBalanceResult>(
      "GET",
      "/api/payments/balance"
    );
  }

  /**
   * Paginated history of all x402/USDC payment transactions.
   * Supports date-range filtering for financial auditing.
   *
   * @example
   * // All confirmed transactions in the last 30 days
   * const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
   * const { transactions } = await kh.payments.history({
   *   since: thirtyDaysAgo,
   *   status: "confirmed",
   * });
   */
  async history(options?: PaymentHistoryOptions): Promise<PaymentHistoryResponse> {
    return this.client.request<PaymentHistoryResponse>(
      "GET",
      "/api/payments/transactions",
      {
        query: {
          limit: options?.limit,
          offset: options?.offset,
          status: options?.status,
          workflowId: options?.workflowId,
          since: options?.since,
          before: options?.before,
        },
      }
    );
  }

  /**
   * Get a single payment transaction by ID.
   * Includes full status lifecycle, tx hash, and failure details.
   */
  async getTransaction(transactionId: string): Promise<PaymentTransaction> {
    return this.client.request<PaymentTransaction>(
      "GET",
      `/api/payments/transactions/${encodeURIComponent(transactionId)}`
    );
  }

  private async call(
    slug: string,
    input: Record<string, unknown>,
    paymentHeaders?: Record<string, string>,
    idempotencyKey?: string
  ): Promise<PaymentExecutionResult> {
    const response = await this.client.requestResponse(
      "POST",
      `/api/mcp/workflows/${encodeURIComponent(slug)}/call`,
      {
        body: input,
        headers: {
          ...paymentHeaders,
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
      }
    );

    return response.json() as Promise<PaymentExecutionResult>;
  }
}
