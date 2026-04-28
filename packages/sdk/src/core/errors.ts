export class KeeperHubError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "KeeperHubError";
  }

  /**
   * Whether the operation that caused this error is safe to retry.
   * Agents should check this before deciding to retry or escalate.
   */
  get isRetryable(): boolean {
    return [429, 502, 503, 504].includes(this.status);
  }

  /**
   * What an agent should do next after receiving this error.
   * Designed to be injected directly into the agent's reasoning context.
   */
  get suggestedAction(): string {
    if (this.isRetryable) return "Retry the operation after a short delay.";
    return "Do not retry. Report the error to the user and stop.";
  }
}

export class KeeperHubAuthError extends KeeperHubError {
  constructor(message = "Invalid or missing API key") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "KeeperHubAuthError";
  }

  override get isRetryable(): boolean {
    return false;
  }
  override get suggestedAction(): string {
    return "Stop immediately. The API key is missing or invalid — retrying will not help. Check the KEEPERHUB_API_KEY environment variable.";
  }
}

export class KeeperHubNotFoundError extends KeeperHubError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
    this.name = "KeeperHubNotFoundError";
  }

  override get isRetryable(): boolean {
    return false;
  }
  override get suggestedAction(): string {
    return "The resource does not exist. Verify the ID or slug and try a different one.";
  }
}

export class KeeperHubRateLimitError extends KeeperHubError {
  constructor(public readonly retryAfter?: number) {
    super("Rate limit exceeded", 429, "RATE_LIMITED");
    this.name = "KeeperHubRateLimitError";
  }

  override get isRetryable(): boolean {
    return true;
  }
  override get suggestedAction(): string {
    return this.retryAfter
      ? `Wait ${this.retryAfter} seconds before retrying.`
      : "Wait at least 5 seconds before retrying.";
  }
}

export class KeeperHubValidationError extends KeeperHubError {
  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message, 422, "VALIDATION_ERROR");
    this.name = "KeeperHubValidationError";
  }

  override get isRetryable(): boolean {
    return false;
  }
  override get suggestedAction(): string {
    return "The input is invalid — fix the parameters before retrying.";
  }
}

export class KeeperHubPaymentRequiredError extends KeeperHubError {
  constructor(
    public readonly paymentRequirements?: unknown,
    public readonly responseHeaders?: Record<string, string>
  ) {
    super("Payment required", 402, "PAYMENT_REQUIRED");
    this.name = "KeeperHubPaymentRequiredError";
  }

  override get isRetryable(): boolean {
    return false;
  }
  override get suggestedAction(): string {
    return "Payment is required to call this workflow. Use payments.execute() with a resolvePayment callback, or ask the user to authorize payment.";
  }
}

export class KeeperHubTimeoutError extends KeeperHubError {
  constructor(message = "Request timed out") {
    super(message, 408, "TIMEOUT");
    this.name = "KeeperHubTimeoutError";
  }

  override get isRetryable(): boolean {
    return true;
  }
  override get suggestedAction(): string {
    return "The request timed out. Retry once. If it keeps timing out, the service may be under load — wait 30 seconds and try again.";
  }
}

export class KeeperHubExecutionTimeoutError extends Error {
  constructor(
    public readonly executionId: string,
    timeoutMs: number
  ) {
    super(`Execution ${executionId} did not complete within ${timeoutMs}ms`);
    this.name = "KeeperHubExecutionTimeoutError";
  }

  readonly isRetryable = true;
  readonly suggestedAction =
    "The execution is still running — poll kh.executions.getStatus(executionId) to check progress, or re-run with a longer timeout.";
}

/**
 * Thrown when a payment policy guardrail blocks execution.
 * e.g. estimated cost > budget, or mode is "requireApproval".
 */
export class KeeperHubPaymentPolicyError extends KeeperHubError {
  constructor(
    message: string,
    public readonly estimatedCost?: string,
    public readonly approvalUrl?: string
  ) {
    super(message, 402, "PAYMENT_POLICY_BLOCKED");
    this.name = "KeeperHubPaymentPolicyError";
  }

  override get isRetryable(): boolean {
    return false;
  }
  override get suggestedAction(): string {
    if (this.approvalUrl) {
      return `Human approval is required. Direct the user to: ${this.approvalUrl}`;
    }
    if (this.message.includes("budget")) {
      return "The estimated cost exceeds the configured budget. Either increase the budget or choose a cheaper workflow.";
    }
    if (this.message.includes("balance") || this.message.includes("feasible")) {
      return "The KeeperHub wallet has insufficient balance. Ask the user to top up their USDC balance.";
    }
    return "Payment policy blocked execution. Review the policy configuration.";
  }
}

export class KeeperHubExecutionError extends KeeperHubError {
  constructor(
    public readonly executionId: string,
    public readonly workflowId: string,
    public readonly executionStatus: string,
    public readonly reason: string,
    public readonly step?: string,
    public readonly txHash?: string,
    public readonly details?: unknown
  ) {
    super(reason, 422, "EXECUTION_FAILED");
    this.name = "KeeperHubExecutionError";
  }

  override get isRetryable(): boolean {
    // Transient statuses may succeed on retry; terminal failures won't
    return this.executionStatus === "error";
  }
  override get suggestedAction(): string {
    const stepInfo = this.step ? ` at step "${this.step}"` : "";
    if (this.isRetryable) {
      return `The execution failed${stepInfo} with a transient error. Retry once. Reason: ${this.reason}`;
    }
    return `The execution failed permanently${stepInfo}. Do not retry. Reason: ${this.reason}`;
  }
}
