import type {
  Execution,
  ExecutionTrace,
  FailureExplanation,
} from "../types/index.js";
import type { HttpClient } from "./client.js";
import { ExecutionHandle } from "./executions.js";

export class DebugModule {
  constructor(private readonly client: HttpClient) {}

  async trace(executionId: string): Promise<ExecutionTrace> {
    const handle = new ExecutionHandle(executionId, this.client);
    const [execution, status, logs] = await Promise.all([
      handle.get(),
      handle.getStatus(),
      handle.getLogs(),
    ]);

    return {
      execution,
      status,
      logs,
    };
  }

  async explainFailure(executionId: string): Promise<FailureExplanation> {
    const trace = await this.trace(executionId);
    const latestFailedLog = trace.logs.find((log) => Boolean(log.error));
    const errorText =
      trace.status.errorContext?.error ??
      latestFailedLog?.error ??
      trace.execution.error ??
      "Execution failed without a detailed error message.";
    const failedStep =
      latestFailedLog?.step ?? trace.status.errorContext?.failedNodeId;
    const failedNodeId = trace.status.errorContext?.failedNodeId;
    const location = failedStep
      ? ` at step ${formatStepLabel(failedStep, failedNodeId)}`
      : "";

    return {
      executionId,
      workflowId: trace.execution.workflowId,
      status: trace.execution.status,
      summary: `${trace.execution.status}${location}: ${errorText}`,
      reason: errorText,
      step: failedStep,
      txHash: trace.execution.transactionHash,
      failedNodeId,
      lastSuccessfulNodeId: trace.status.errorContext?.lastSuccessfulNodeId,
      lastSuccessfulNodeName: trace.status.errorContext?.lastSuccessfulNodeName,
      executionTrace: trace.status.errorContext?.executionTrace,
      logTrail: trace.logs.map((log) => ({
        nodeId: log.nodeId,
        nodeName: log.step,
        status: log.status,
        error: log.error,
      })),
    };
  }

  async replay(
    executionId: string,
    options?: { input?: Record<string, unknown> }
  ): Promise<ExecutionHandle> {
    const execution = await this.client.request<Execution>(
      "GET",
      `/api/workflows/executions/${executionId}`
    );
    const response = await this.client.request<{
      executionId: string;
      status: string;
    }>("POST", `/api/workflow/${execution.workflowId}/execute`, {
      body: {
        input: options?.input ?? execution.input ?? {},
      },
    });

    return new ExecutionHandle(response.executionId, this.client);
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
