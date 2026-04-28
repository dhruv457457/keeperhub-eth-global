import type {
  AgentObservation,
  PaymentExecutionOptions,
  PaymentPolicy,
  PaymentPreflightResult,
  PipelinePaymentResult,
  PipelineResult,
  PipelineRetryOptions,
  UpdateWorkflowInput,
  WaitForCompletionOptions,
  Workflow,
} from "../types/index.js";
import {
  KeeperHubAuthError,
  KeeperHubError,
  KeeperHubPaymentPolicyError,
  KeeperHubRateLimitError,
  KeeperHubValidationError,
} from "./errors.js";
import type { ExecutionsModule } from "./executions.js";
import type { PaymentsModule } from "./payments.js";
import type { WorkflowsModule } from "./workflows.js";

// ─── Money helpers ─────────────────────────────────────────────────────────────

/**
 * Parse a USDC decimal string into an integer number of micro-USDC (6 dp).
 * Returns null for values that cannot be safely parsed (empty, NaN, negative,
 * Infinity, non-numeric) so callers must handle null explicitly.
 *
 * Using integers for comparison avoids floating-point drift:
 *   parseFloat("0.1") + parseFloat("0.2") === 0.30000000000000004  (wrong)
 *   parseUsdcMicro("0.1") + parseUsdcMicro("0.2") === 300000       (correct)
 */
function parseUsdcMicro(value: string): number | null {
  const clean = value.trim().replace(/[,$\s]+/g, "");
  if (!clean) return null;
  const n = Number(clean);
  if (!isFinite(n) || n < 0) return null;
  // Round to avoid floating-point accumulation from the multiplication
  return Math.round(n * 1_000_000);
}

/** Format micro-USDC back to a human-readable decimal string */
function formatUsdc(microUsdc: number): string {
  return (microUsdc / 1_000_000).toFixed(6).replace(/\.?0+$/, "");
}

// ─── Idempotency ───────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically strong idempotency key.
 * Uses crypto.randomUUID() where available (all modern runtimes), with a
 * high-entropy fallback for older environments.
 */
function generateIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `pipeline-${crypto.randomUUID()}`;
  }
  // Fallback: two random segments give ~22 chars of base-36 entropy
  return `pipeline-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

// ─── Agent observation helpers ─────────────────────────────────────────────────

function buildPipelineSummary(result: PipelineResult): string {
  if (result.status === "pending_approval") {
    const urlMsg = result.payment?.approvalUrl
      ? ` Approval URL: ${result.payment.approvalUrl}`
      : " No approval URL returned — contact the workflow owner.";
    return (
      "Execution paused — payment approval required. " +
      `Estimated cost: ${result.payment?.estimatedCost ?? "unknown"} USDC.${urlMsg}`
    );
  }
  if (result.status === "running") {
    return `Workflow started (fire-and-forget). Execution ID: ${result.executionId ?? "pending"}.`;
  }
  const succeeded =
    result.status === "completed" || result.status === "success";
  const attemptStr =
    result.attempts > 1 ? ` after ${result.attempts} attempts` : "";
  if (succeeded) {
    return `Workflow completed successfully${attemptStr}. Execution ID: ${result.executionId}.`;
  }
  const errMsg = result.execution?.error
    ? ` Error: ${result.execution.error}.`
    : "";
  return `Workflow ${result.status}${attemptStr}. Execution ID: ${result.executionId ?? "unknown"}.${errMsg}`;
}

function buildPipelineErrorObservation(
  error: unknown
): AgentObservation<PipelineResult> {
  if (error instanceof KeeperHubError) {
    return {
      ok: false,
      action: "pipeline.wait",
      error: {
        message: error.message,
        code: error.code,
        isRetryable: error.isRetryable,
        suggestedAction: error.suggestedAction,
        details:
          error instanceof KeeperHubPaymentPolicyError
            ? {
                estimatedCost: error.estimatedCost,
                approvalUrl: error.approvalUrl,
              }
            : undefined,
      },
      summary: `Pipeline failed: ${error.message} [${error.code}] — ${error.suggestedAction}`,
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    ok: false,
    action: "pipeline.wait",
    error: {
      message,
      code: "UNKNOWN",
      isRetryable: false,
      suggestedAction: "Unexpected error — do not retry.",
    },
    summary: `Pipeline failed with an unexpected error: ${message}`,
  };
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type PipelineTarget =
  | { kind: "workflow"; workflowId: string; input?: Record<string, unknown> }
  | { kind: "listed-workflow"; slug: string; input?: Record<string, unknown> }
  | {
      kind: "generate";
      prompt: string;
      context?: string;
      input?: Record<string, unknown>;
    };

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export class WorkflowPipeline {
  private target?: PipelineTarget;
  private shouldWait = false;
  private simulationRequested = false;
  private requireSimulation = false;
  private paymentOptions?: PaymentExecutionOptions;
  private preflightRequested = false;
  private paymentPolicy?: PaymentPolicy;
  private retryOptions: Required<PipelineRetryOptions> = {
    attempts: 1,
    delayMs: 0,
  };
  private waitOptions?: WaitForCompletionOptions;
  private modifyFn?: (wf: Workflow) => Workflow | Partial<UpdateWorkflowInput>;
  private runtimeInput?: Record<string, unknown>;
  /** When true, generated workflows are deleted after execution completes */
  private isEphemeral = false;

  constructor(
    private readonly workflows: WorkflowsModule,
    private readonly payments: PaymentsModule,
    private readonly executions: ExecutionsModule
  ) {}

  // ─── Target selection ──────────────────────────────────────────────────────

  /** Target an existing workflow by ID */
  workflow(workflowId: string, input?: Record<string, unknown>): this {
    this.target = { kind: "workflow", workflowId, input };
    return this;
  }

  /** Target a publicly listed workflow by its slug */
  listedWorkflow(slug: string, input?: Record<string, unknown>): this {
    this.target = { kind: "listed-workflow", slug, input };
    return this;
  }

  /**
   * Generate a workflow from a natural-language prompt.
   * The generated workflow is saved, optionally modified via .modify(), then executed.
   *
   * @example
   * await kh.pipeline()
   *   .generate("Compound my Aave USDC rewards every Monday at 9am")
   *   .modify(wf => ({ ...wf, name: "My Compound Strategy" }))
   *   .wait()
   */
  generate(prompt: string, options?: { context?: string }): this {
    this.target = { kind: "generate", prompt, context: options?.context };
    return this;
  }

  // ─── Modifiers ─────────────────────────────────────────────────────────────

  modify(fn: (wf: Workflow) => Workflow | Partial<UpdateWorkflowInput>): this {
    this.modifyFn = fn;
    return this;
  }

  withInput(input: Record<string, unknown>): this {
    this.runtimeInput = { ...this.runtimeInput, ...input };
    return this;
  }

  simulate(options?: { required?: boolean }): this {
    this.simulationRequested = true;
    this.requireSimulation = options?.required ?? false;
    return this;
  }

  ifSafe(): this {
    this.requireSimulation = true;
    return this;
  }

  payIfNeeded(options?: PaymentExecutionOptions): this {
    this.paymentOptions = options ?? { strategy: "manual" };
    return this;
  }

  /**
   * Mark this pipeline run as ephemeral — if the workflow was AI-generated,
   * it will be automatically deleted after the execution completes (success
   * or failure). Use this when an agent is exploring options and does not
   * need to keep the generated workflow.
   *
   * @example
   * // Generate, run once, delete — no permanent workflow created
   * await kh.pipeline()
   *   .generate("Check if ETH price is below $2000")
   *   .ephemeral()
   *   .wait();
   */
  ephemeral(): this {
    this.isEphemeral = true;
    return this;
  }

  /**
   * Request a cost estimate before executing.
   * For listed workflows use `.payIfNeeded()` instead.
   */
  preflight(): this {
    this.preflightRequested = true;
    return this;
  }

  /**
   * Apply payment guardrails before execution. Automatically requests a
   * preflight cost estimate so budget checks always have a real number to
   * compare against.
   *
   * Not applicable to `.listedWorkflow()` — those handle payment inline via x402.
   *
   * @example
   * await kh.pipeline()
   *   .generate("rebalance portfolio")
   *   .pay({ budget: "0.05", dailyBudget: "1.00", requireApprovalAbove: "0.02" })
   *   .wait();
   */
  pay(policy: PaymentPolicy): this {
    this.paymentPolicy = policy;
    // Auto-enable preflight — budget/approval checks are meaningless without an estimate
    this.preflightRequested = true;
    return this;
  }

  retry(options?: PipelineRetryOptions): this {
    this.retryOptions = {
      attempts: options?.attempts ?? 2,
      delayMs: options?.delayMs ?? 1000,
    };
    return this;
  }

  async wait(options?: WaitForCompletionOptions): Promise<PipelineResult> {
    this.shouldWait = true;
    this.waitOptions = options;
    return this.run();
  }

  /**
   * Never-throws variant of `.wait()` — always returns an `AgentObservation`.
   * Agents should prefer this over `.wait()` to avoid crashing their loop on errors.
   *
   * @example
   * const obs = await kh.pipeline().workflow("wf_123").safeWait();
   * if (!obs.ok) {
   *   if (obs.error?.isRetryable) { // retry }
   *   else console.error(obs.summary); // escalate
   * }
   */
  async safeWait(
    options?: WaitForCompletionOptions
  ): Promise<AgentObservation<PipelineResult>> {
    try {
      const result = await this.wait(options);
      return {
        ok: true,
        action: "pipeline.wait",
        result,
        summary: buildPipelineSummary(result),
      };
    } catch (error) {
      return buildPipelineErrorObservation(error);
    }
  }

  // ─── Core runner ───────────────────────────────────────────────────────────

  async run(): Promise<PipelineResult> {
    if (!this.target) {
      throw new KeeperHubValidationError(
        "Pipeline target is required. Call .workflow(id), .listedWorkflow(slug), or .generate(prompt) first."
      );
    }

    if (this.simulationRequested && this.requireSimulation) {
      throw new KeeperHubValidationError(
        "Workflow simulation is not exposed by the current KeeperHub API, so .ifSafe() cannot guarantee a preflight pass yet."
      );
    }

    if (this.target.kind === "listed-workflow") {
      if (this.preflightRequested || this.paymentPolicy) {
        throw new KeeperHubValidationError(
          ".preflight() and .pay() are not applicable to listed workflows — " +
            "x402 payment is resolved inline. Use .payIfNeeded() to pass payment headers."
        );
      }
      return this.runListedWorkflow();
    }

    return this.runOwnedWorkflow();
  }

  // ─── Listed-workflow path ──────────────────────────────────────────────────

  private async runListedWorkflow(): Promise<PipelineResult> {
    const t = this.target as {
      kind: "listed-workflow";
      slug: string;
      input?: Record<string, unknown>;
    };
    const mergedInput = { ...(t.input ?? {}), ...(this.runtimeInput ?? {}) };

    const result = await this.payments.execute(
      t.slug,
      mergedInput,
      this.paymentOptions
    );

    return {
      executionId: result.executionId,
      status: result.status as PipelineResult["status"],
      handle: { id: result.executionId },
      attempts: 1,
      simulation: this.simulationState(),
    };
  }

  // ─── Owned-workflow / generate path ───────────────────────────────────────

  private async runOwnedWorkflow(): Promise<PipelineResult> {
    const { workflowId, executionInput, wasGenerated } =
      await this.resolveTarget();

    const paymentResult: PipelinePaymentResult = {};
    let preflightResult: PaymentPreflightResult | undefined;
    let preflightTimestamp = 0;

    const runPreflight = async (): Promise<
      "pending_approval" | "ok" | "skipped"
    > => {
      preflightResult = await this.payments.preflight(workflowId);
      preflightTimestamp = Date.now();
      paymentResult.estimatedCost = preflightResult.estimatedCost;
      paymentResult.currency = preflightResult.currency;
      paymentResult.status = "queued";

      if (!preflightResult.feasible) {
        const codeHint =
          preflightResult.feasibilityCode === "insufficient_balance"
            ? " Top up your KeeperHub wallet to continue."
            : preflightResult.feasibilityCode === "payment_method_unsupported"
              ? " This workflow does not accept x402 payment."
              : "";
        throw new KeeperHubPaymentPolicyError(
          `Workflow not feasible: ${preflightResult.reason ?? "insufficient balance or unsupported payment method"}.${codeHint}`,
          preflightResult.estimatedCost
        );
      }

      if (this.paymentPolicy?.budget) {
        const budgetMicro = parseUsdcMicro(this.paymentPolicy.budget);
        const estimatedMicro = parseUsdcMicro(preflightResult.estimatedCost);
        if (budgetMicro === null) {
          throw new KeeperHubPaymentPolicyError(
            `Invalid budget value "${this.paymentPolicy.budget}". Must be a non-negative USDC decimal, e.g. "0.05".`
          );
        }
        if (estimatedMicro !== null && estimatedMicro > budgetMicro) {
          throw new KeeperHubPaymentPolicyError(
            `Estimated cost ${preflightResult.estimatedCost} USDC exceeds budget limit of ${this.paymentPolicy.budget} USDC`,
            preflightResult.estimatedCost
          );
        }
      }

      if (this.paymentPolicy?.dailyBudget) {
        const dailyCap = parseUsdcMicro(this.paymentPolicy.dailyBudget);
        if (dailyCap === null) {
          throw new KeeperHubPaymentPolicyError(
            `Invalid dailyBudget value "${this.paymentPolicy.dailyBudget}". Must be a non-negative USDC decimal, e.g. "1.00".`
          );
        }
        const since24h = new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString();
        const { transactions } = await this.payments.history({
          since: since24h,
          status: "confirmed",
        });
        const spentMicro = transactions.reduce(
          (sum, tx) => sum + (parseUsdcMicro(tx.amountUsdc) ?? 0),
          0
        );
        const estimatedMicro =
          parseUsdcMicro(preflightResult.estimatedCost) ?? 0;
        if (spentMicro + estimatedMicro > dailyCap) {
          throw new KeeperHubPaymentPolicyError(
            `Daily budget of ${this.paymentPolicy.dailyBudget} USDC would be exceeded. ` +
              `Rolling 24h spend: ${formatUsdc(spentMicro)} USDC + estimated ${preflightResult.estimatedCost} USDC = ` +
              `${formatUsdc(spentMicro + estimatedMicro)} USDC.`,
            preflightResult.estimatedCost
          );
        }
      }

      const forceApproval = this.paymentPolicy?.mode === "requireApproval";
      const approvalThreshold = this.paymentPolicy?.requireApprovalAbove;
      if (forceApproval || approvalThreshold) {
        const thresholdMicro = approvalThreshold
          ? parseUsdcMicro(approvalThreshold)
          : 0;
        const estimatedMicro = parseUsdcMicro(preflightResult.estimatedCost);
        const needsApproval =
          forceApproval ||
          (thresholdMicro !== null &&
            estimatedMicro !== null &&
            estimatedMicro > thresholdMicro);
        if (needsApproval) {
          paymentResult.status = "pending_approval";
          paymentResult.approvalUrl = preflightResult.approvalUrl;
          return "pending_approval";
        }
      }
      return "ok";
    };

    try {
      if (this.preflightRequested || this.paymentPolicy) {
        try {
          const preflightOutcome = await runPreflight();
          if (preflightOutcome === "pending_approval") {
            return {
              executionId: undefined,
              status: "pending_approval",
              handle: undefined,
              attempts: 0,
              simulation: this.simulationState(),
              payment: paymentResult,
            };
          }
        } catch (error) {
          if (error instanceof KeeperHubPaymentPolicyError) throw error;
          if (error instanceof KeeperHubAuthError) throw error;
          if (error instanceof KeeperHubRateLimitError) throw error;
          if (this.preflightRequested) {
            console.warn(
              "[keeperhub-sdk] Payment preflight endpoint not available; " +
                "proceeding without cost estimate. " +
                "Implement GET /api/workflows/{id}/payment/preflight."
            );
          }
          delete paymentResult.estimatedCost;
          delete paymentResult.currency;
          delete paymentResult.status;
        }
      }

      const attempts = Math.max(1, this.retryOptions.attempts);
      const preflightMaxAgeMs = this.paymentPolicy?.preflightMaxAgeMs ?? 60_000;
      let lastError: Error | undefined;
      const idempotencyKey = generateIdempotencyKey();

      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          if (
            attempt > 1 &&
            preflightResult &&
            Date.now() - preflightTimestamp > preflightMaxAgeMs
          ) {
            try {
              const outcome = await runPreflight();
              if (outcome === "pending_approval") {
                return {
                  executionId: undefined,
                  status: "pending_approval",
                  handle: undefined,
                  attempts: attempt - 1,
                  simulation: this.simulationState(),
                  payment: paymentResult,
                };
              }
            } catch (preflightErr) {
              if (preflightErr instanceof KeeperHubPaymentPolicyError)
                throw preflightErr;
              if (preflightErr instanceof KeeperHubAuthError)
                throw preflightErr;
              if (preflightErr instanceof KeeperHubRateLimitError)
                throw preflightErr;
            }
          }

          const handle = await this.workflows.execute(
            workflowId,
            executionInput,
            { idempotencyKey }
          );

          if (!this.shouldWait) {
            return {
              executionId: handle.id,
              status: "running",
              handle: { id: handle.id },
              attempts: attempt,
              simulation: this.simulationState(),
              payment: paymentResult.status ? paymentResult : undefined,
            };
          }

          const execution = await handle.waitForCompletion(this.waitOptions);

          if (
            (execution.status === "error" || execution.status === "failed") &&
            attempt < attempts
          ) {
            await this.sleep(this.retryOptions.delayMs);
            continue;
          }

          if (paymentResult.status === "queued") {
            paymentResult.status =
              execution.status === "completed" || execution.status === "success"
                ? "confirmed"
                : "failed";
          }

          return {
            executionId: handle.id,
            status: execution.status,
            handle: { id: handle.id },
            execution,
            attempts: attempt,
            simulation: this.simulationState(),
            payment: paymentResult.status ? paymentResult : undefined,
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt < attempts) {
            await this.sleep(this.retryOptions.delayMs);
          }
        }
      }

      throw lastError ?? new Error("Pipeline execution failed");
    } finally {
      // Clean up ephemeral generated workflows regardless of success or failure
      if (this.isEphemeral && wasGenerated) {
        await this.workflows.delete(workflowId).catch(() => {
          // Best-effort — don't mask the original result or error
        });
      }
    }
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  private async resolveTarget(): Promise<{
    workflowId: string;
    executionInput?: Record<string, unknown>;
    wasGenerated: boolean;
  }> {
    const mergedInput = (base?: Record<string, unknown>) =>
      base || this.runtimeInput
        ? { ...(base ?? {}), ...(this.runtimeInput ?? {}) }
        : undefined;

    if (this.target!.kind === "workflow") {
      const t = this.target as {
        workflowId: string;
        input?: Record<string, unknown>;
      };
      return {
        workflowId: t.workflowId,
        executionInput: mergedInput(t.input),
        wasGenerated: false,
      };
    }

    const genTarget = this.target as {
      kind: "generate";
      prompt: string;
      context?: string;
      input?: Record<string, unknown>;
    };

    const generated = await this.workflows.generateSpec({
      prompt: genTarget.prompt,
      context: genTarget.context,
    });

    const saved = await this.workflows.create({
      name: generated.name,
      description: generated.description,
      nodes: generated.nodes,
      edges: generated.edges,
    });

    try {
      if (this.modifyFn) {
        const patch = this.modifyFn(saved);
        const updateInput: Partial<UpdateWorkflowInput> =
          "id" in patch
            ? {
                name: (patch as Workflow).name,
                description: (patch as Workflow).description,
                nodes: (patch as Workflow).nodes,
                edges: (patch as Workflow).edges,
              }
            : (patch as Partial<UpdateWorkflowInput>);
        await this.workflows.update(saved.id, updateInput);
      }
    } catch (error) {
      await this.workflows.delete(saved.id).catch(() => {});
      throw error;
    }

    return {
      workflowId: saved.id,
      executionInput: mergedInput(genTarget.input),
      wasGenerated: true,
    };
  }

  private simulationState() {
    return {
      requested: this.simulationRequested,
      supported: false,
      skippedReason: this.simulationRequested
        ? "No public workflow simulation endpoint is currently exposed by KeeperHub."
        : undefined,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
