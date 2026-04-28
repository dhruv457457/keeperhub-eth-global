import type {
  CreateWorkflowInput,
  Execution,
  ExecutionLog,
  FailureExplanation,
  GenerateWorkflowInput,
  ListWorkflowsInput,
  SafeRunOptions,
  UpdateWorkflowInput,
  Workflow,
  WorkflowRunResult,
} from "../types/index.js";
import type { HttpClient } from "./client.js";
import { KeeperHubExecutionError, KeeperHubValidationError } from "./errors.js";
import { ExecutionHandle } from "./executions.js";

export class WorkflowsModule {
  constructor(private readonly client: HttpClient) {}

  /** List all workflows, optionally filtered by project or tag */
  async list(input?: ListWorkflowsInput): Promise<Workflow[]> {
    return this.client.request<Workflow[]>("GET", "/api/workflows", {
      query: {
        projectId: input?.projectId,
        tagId: input?.tagId,
      },
    });
  }

  /** Get a single workflow by ID */
  async get(workflowId: string): Promise<Workflow> {
    return this.client.request<Workflow>("GET", `/api/workflows/${workflowId}`);
  }

  /** Create a new workflow */
  async create(input: CreateWorkflowInput): Promise<Workflow> {
    return this.client.request<Workflow>("POST", "/api/workflows/create", {
      body: input,
    });
  }

  /** Update workflow name, description, nodes, edges, or assignments */
  async update(
    workflowId: string,
    input: UpdateWorkflowInput
  ): Promise<Workflow> {
    return this.client.request<Workflow>(
      "PATCH",
      `/api/workflows/${workflowId}`,
      { body: input }
    );
  }

  /** Delete a workflow permanently */
  async delete(workflowId: string): Promise<void> {
    await this.client.request("DELETE", `/api/workflows/${workflowId}`);
  }

  /** Duplicate a workflow */
  async duplicate(workflowId: string): Promise<Workflow> {
    return this.client.request<Workflow>(
      "POST",
      `/api/workflows/${workflowId}/duplicate`
    );
  }

  /** Publish a workflow (make it go-live) */
  async goLive(workflowId: string): Promise<Workflow> {
    return this.client.request<Workflow>(
      "POST",
      `/api/workflows/${workflowId}/go-live`
    );
  }

  /** Export workflow as runnable code */
  async exportCode(workflowId: string): Promise<{ code: string }> {
    return this.client.request<{ code: string }>(
      "POST",
      `/api/workflows/${workflowId}/code`
    );
  }

  /** Download workflow as JSON */
  async download(workflowId: string): Promise<Workflow> {
    return this.client.request<Workflow>(
      "POST",
      `/api/workflows/${workflowId}/download`
    );
  }

  /**
   * Execute a workflow.
   * Returns an ExecutionHandle — call .waitForCompletion() to block until done,
   * or .stream() for live logs.
   *
   * @param options.idempotencyKey — pass the same key on retry to prevent duplicate executions
   */
  async execute(
    workflowId: string,
    input?: Record<string, unknown>,
    options?: { idempotencyKey?: string }
  ): Promise<ExecutionHandle> {
    const res = await this.client.request<{
      executionId: string;
      status: string;
    }>("POST", `/api/workflow/${workflowId}/execute`, {
      body: { input },
      headers: options?.idempotencyKey
        ? { "Idempotency-Key": options.idempotencyKey }
        : undefined,
    });
    return new ExecutionHandle(res.executionId, this.client);
  }

  /**
   * Safe orchestration wrapper for workflow execution.
   * Unifies execute + optional wait + retry into one call.
   */
  async run(
    workflowId: string,
    options: SafeRunOptions = {}
  ): Promise<WorkflowRunResult> {
    if (options.requireSimulation) {
      throw new KeeperHubValidationError(
        "Workflow simulation is not exposed by the current KeeperHub API, so safe preflight cannot be required yet."
      );
    }

    const mode = options.mode ?? "safe";
    const shouldWait =
      options.wait ?? (mode === "safe" || options.verbose || options.debug);
    const attempts = Math.max(1, options.retries ?? (mode === "safe" ? 2 : 1));
    let lastExecution: Execution | undefined;
    let lastLogs: ExecutionLog[] | undefined;
    let lastFailure: FailureExplanation | undefined;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const handle = await this.execute(workflowId, options.input);
      if (!shouldWait) {
        const execution = await handle.get();
        return {
          executionId: handle.id,
          workflowId,
          status: execution.status,
          mode,
          attempts: attempt,
          execution,
        };
      }

      const execution = await handle.waitForCompletion(options.waitOptions);
      lastExecution = execution;
      const shouldAttachLogs =
        options.verbose || options.debug || execution.status !== "completed";
      const logs = shouldAttachLogs ? await handle.getLogs() : undefined;
      lastLogs = logs;
      lastFailure =
        execution.status === "completed"
          ? undefined
          : await this.buildFailureExplanation(execution, logs);

      if (execution.status === "completed" || attempt === attempts) {
        if (execution.status !== "completed") {
          throw new KeeperHubExecutionError(
            execution.id,
            execution.workflowId,
            execution.status,
            lastFailure?.summary ?? execution.error ?? "Execution failed",
            lastFailure?.step ?? lastFailure?.failedNodeId ?? undefined,
            execution.transactionHash,
            {
              failure: lastFailure,
              logs,
            }
          );
        }

        return {
          executionId: execution.id,
          workflowId: execution.workflowId,
          status: execution.status,
          mode,
          attempts: attempt,
          execution,
          logs,
        };
      }

      await this.sleep(options.retryDelayMs ?? 1000);
    }

    throw new KeeperHubExecutionError(
      lastExecution?.id ?? "unknown",
      workflowId,
      lastExecution?.status ?? "error",
      lastFailure?.summary ?? lastExecution?.error ?? "Execution failed",
      lastFailure?.step ?? lastFailure?.failedNodeId ?? undefined,
      lastExecution?.transactionHash,
      {
        failure: lastFailure,
        logs: lastLogs,
      }
    );
  }

  /**
   * AI-generate a workflow spec from a natural language prompt.
   *
   * **Important:** returns an in-memory spec — it is NOT saved to KeeperHub yet.
   * Call `workflows.create(spec)` to persist it, or use `generateAndCreate()` to do
   * both in one call. The pipeline's `.generate()` method also handles this for you.
   */
  async generateSpec(input: GenerateWorkflowInput): Promise<Workflow> {
    // Use requestResponse so we keep auth headers and timeout handling
    const response = await this.client.requestResponse(
      "POST",
      "/api/ai/generate",
      { body: input }
    );

    if (!response.body) {
      throw new KeeperHubValidationError(
        "AI generation returned empty response"
      );
    }

    // Consume NDJSON stream — KeeperHub streams partial operations then a
    // final {"type":"complete","workflow":{...}} line.
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assembled: Partial<Workflow> = {};
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const op = JSON.parse(line) as {
              type: string;
              workflow?: Workflow;
              [key: string]: unknown;
            };
            if (op.type === "complete" && op.workflow) {
              assembled = op.workflow;
            }
          } catch {
            // skip malformed lines in stream
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!(assembled.id || assembled.name)) {
      throw new KeeperHubValidationError(
        "AI generation did not return a valid workflow. Try a more specific prompt."
      );
    }

    return assembled as Workflow;
  }

  /**
   * AI-generate a workflow spec AND save it to KeeperHub in one call.
   * Returns the persisted Workflow with a real ID ready for execution.
   *
   * @example
   * const wf = await kh.workflows.generateAndCreate({
   *   prompt: "Compound my Aave USDC rewards every Monday at 9am"
   * });
   * await kh.pipeline().workflow(wf.id).wait();
   */
  async generateAndCreate(input: GenerateWorkflowInput): Promise<Workflow> {
    const spec = await this.generateSpec(input);
    return this.create({
      name: spec.name,
      description: spec.description,
      nodes: spec.nodes,
      edges: spec.edges,
    });
  }

  /** Get or set webhook configuration for a workflow */
  async getWebhook(
    workflowId: string
  ): Promise<{ url: string; secret?: string }> {
    return this.client.request<{ url: string; secret?: string }>(
      "GET",
      `/api/workflows/${workflowId}/webhook`
    );
  }

  /** List all executions for a workflow */
  async executions(workflowId: string): Promise<Execution[]> {
    return this.client.request<Execution[]>(
      "GET",
      `/api/workflows/${workflowId}/executions`
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async buildFailureExplanation(
    execution: Execution,
    logs?: ExecutionLog[]
  ): Promise<FailureExplanation> {
    const status = await this.client.request<{
      errorContext?: {
        failedNodeId?: string | null;
        lastSuccessfulNodeId?: string | null;
        lastSuccessfulNodeName?: string | null;
        executionTrace?: string[] | null;
        error?: string | null;
      } | null;
    }>("GET", `/api/workflows/executions/${execution.id}/status`);
    const failedLog = logs?.find((log) => Boolean(log.error));
    const reason =
      status.errorContext?.error ??
      failedLog?.error ??
      execution.error ??
      "Execution failed without a detailed error message.";
    const step = failedLog?.step ?? status.errorContext?.failedNodeId;
    const stepLabel = formatStepLabel(step, status.errorContext?.failedNodeId);

    return {
      executionId: execution.id,
      workflowId: execution.workflowId,
      status: execution.status,
      summary: `${execution.status}${step ? ` at step ${stepLabel}` : ""}: ${reason}`,
      reason,
      step,
      txHash: execution.transactionHash,
      failedNodeId: status.errorContext?.failedNodeId,
      lastSuccessfulNodeId: status.errorContext?.lastSuccessfulNodeId,
      lastSuccessfulNodeName: status.errorContext?.lastSuccessfulNodeName,
      executionTrace: status.errorContext?.executionTrace,
      logTrail: (logs ?? []).map((log) => ({
        nodeId: log.nodeId,
        nodeName: log.step,
        status: log.status,
        error: log.error,
      })),
    };
  }
}

function formatStepLabel(step?: string | null, nodeId?: string | null): string {
  if (!step) {
    return nodeId ?? "unknown";
  }

  if (!nodeId || step === nodeId) {
    return step;
  }

  return `${step} (${nodeId})`;
}
