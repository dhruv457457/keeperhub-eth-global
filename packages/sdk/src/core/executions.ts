import type {
  Execution,
  ExecutionLog,
  ExecutionStatus,
  ExecutionStatusResponse,
  WaitForCompletionOptions,
} from "../types/index.js";
import type { HttpClient } from "./client.js";
import { KeeperHubExecutionTimeoutError } from "./errors.js";

const TERMINAL_STATUSES: ExecutionStatus[] = [
  "completed",
  "success",
  "failed",
  "error",
  "cancelled",
];

export class ExecutionHandle {
  readonly id: string;
  private readonly client: HttpClient;

  constructor(id: string, client: HttpClient) {
    this.id = id;
    this.client = client;
  }

  /** Poll until the execution reaches a terminal state */
  async waitForCompletion(
    options: WaitForCompletionOptions = {}
  ): Promise<Execution> {
    const { pollInterval = 2000, timeout = 120_000, onProgress, signal } = options;

    if (signal?.aborted) {
      throw new Error("waitForCompletion was cancelled before it started");
    }

    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      if (signal?.aborted) {
        throw new Error("waitForCompletion was cancelled");
      }

      const status = await this.getStatus();
      onProgress?.(status);

      if (TERMINAL_STATUSES.includes(status.status as ExecutionStatus)) {
        return this.get();
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await sleep(Math.min(pollInterval, remaining), signal);
    }

    // Final check — the execution may have completed during the last sleep window
    // (avoids a false timeout when status flipped just as the deadline was reached)
    const finalStatus = await this.getStatus().catch(() => null);
    if (finalStatus && TERMINAL_STATUSES.includes(finalStatus.status as ExecutionStatus)) {
      return this.get();
    }

    throw new KeeperHubExecutionTimeoutError(this.id, timeout);
  }

  /** Get current execution details */
  async get(): Promise<Execution> {
    return this.client.request<Execution>(
      "GET",
      `/api/workflows/executions/${this.id}`
    );
  }

  /** Get execution status + progress */
  async getStatus(): Promise<ExecutionStatusResponse> {
    return this.client.request<ExecutionStatusResponse>(
      "GET",
      `/api/workflows/executions/${this.id}/status`
    );
  }

  /** Get step-by-step logs */
  async getLogs(): Promise<ExecutionLog[]> {
    const res = await this.client.request<{
      execution: Execution;
      logs: ExecutionLog[];
    }>("GET", `/api/workflows/executions/${this.id}/logs`);
    return res.logs.map(normalizeExecutionLog);
  }

  /** Cancel a running execution */
  async cancel(): Promise<void> {
    await this.client.request("POST", `/api/executions/${this.id}/cancel`);
  }

  /** Open a live WebSocket stream for real-time logs */
  stream(): ExecutionStream {
    return new ExecutionStream(this.id, this.client.baseUrl);
  }
}

const WS_MAX_RECONNECT_ATTEMPTS = 5;
const WS_RECONNECT_BASE_MS = 1_000;
const ALLOWED_STREAM_EVENT_TYPES = new Set([
  "step", "complete", "error", "update", "log", "cancelled", "running",
]);

export class ExecutionStream extends EventTarget {
  private ws: WebSocket | null = null;
  readonly executionId: string;
  private readonly baseUrl: string;
  private reconnectAttempts = 0;
  private closed = false;

  constructor(executionId: string, baseUrl: string) {
    super();
    this.executionId = executionId;
    this.baseUrl = baseUrl;
    this.connect();
  }

  private connect() {
    if (this.closed) return;

    const wsUrl = this.baseUrl
      .replace("https://", "wss://")
      .replace("http://", "ws://");

    // Encode executionId to prevent URL injection
    this.ws = new WebSocket(
      `${wsUrl}/api/analytics/stream?executionId=${encodeURIComponent(this.executionId)}`
    );

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as unknown;
        this.dispatchEvent(Object.assign(new Event("message"), { data }));
        if (data !== null && typeof data === "object" && "type" in data) {
          const type = (data as { type: string }).type;
          // Allowlist prevents prototype pollution and unexpected event injection
          if (ALLOWED_STREAM_EVENT_TYPES.has(type)) {
            this.dispatchEvent(Object.assign(new Event(type), { data }));
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onerror = (err) => {
      this.dispatchEvent(Object.assign(new Event("error"), { error: err }));
    };

    this.ws.onclose = () => {
      if (!this.closed && this.reconnectAttempts < WS_MAX_RECONNECT_ATTEMPTS) {
        // Exponential backoff before reconnecting
        const delay =
          WS_RECONNECT_BASE_MS * 2 ** this.reconnectAttempts;
        this.reconnectAttempts += 1;
        setTimeout(() => this.connect(), delay);
      } else {
        this.dispatchEvent(new Event("close"));
      }
    };

    this.ws.onopen = () => {
      this.reconnectAttempts = 0; // reset on successful connect
    };
  }

  /**
   * Subscribe to a stream event.
   * Returns an unsubscribe function — call it to remove the listener and
   * prevent memory leaks in long-lived agents.
   *
   * @example
   * const off = stream.on("complete", handleDone);
   * // ... later ...
   * off(); // clean up
   */
  on(
    event: "step" | "complete" | "error" | "close" | "message",
    listener: (data: unknown) => void
  ): () => void {
    const handler = (e: Event) => {
      listener((e as Event & { data: unknown }).data);
    };
    this.addEventListener(event, handler);
    return () => this.removeEventListener(event, handler);
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }
}

export class ExecutionsModule {
  constructor(private readonly client: HttpClient) {}

  /** Get execution by ID */
  async get(executionId: string): Promise<Execution> {
    return this.client.request<Execution>(
      "GET",
      `/api/workflows/executions/${executionId}`
    );
  }

  /** Get execution status */
  async getStatus(executionId: string): Promise<ExecutionStatusResponse> {
    return this.client.request<ExecutionStatusResponse>(
      "GET",
      `/api/workflows/executions/${executionId}/status`
    );
  }

  /** Get execution logs */
  async getLogs(executionId: string): Promise<ExecutionLog[]> {
    const res = await this.client.request<{
      execution: Execution;
      logs: ExecutionLog[];
    }>("GET", `/api/workflows/executions/${executionId}/logs`);
    return res.logs.map(normalizeExecutionLog);
  }

  /** List executions for a workflow */
  async list(workflowId: string): Promise<Execution[]> {
    return this.client.request<Execution[]>(
      "GET",
      `/api/workflows/${workflowId}/executions`
    );
  }

  /** Cancel a running execution */
  async cancel(executionId: string): Promise<void> {
    await this.client.request("POST", `/api/executions/${executionId}/cancel`);
  }

  /** Get an ExecutionHandle to poll/stream a specific execution */
  handle(executionId: string): ExecutionHandle {
    return new ExecutionHandle(executionId, this.client);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("waitForCompletion was cancelled"));
    }, { once: true });
  });
}

function normalizeExecutionLog(log: ExecutionLog): ExecutionLog {
  const raw = log as ExecutionLog & {
    txHash?: string;
    transactionHash?: string;
    gasUsed?: string;
    gasUsedWei?: string;
    metadata?: Record<string, unknown>;
    output?: Record<string, unknown>;
  };
  const output = raw.output;
  const txHash = firstString(
    raw.txHash,
    raw.transactionHash,
    getString(output, "txHash"),
    getString(output, "transactionHash"),
    getString(raw.metadata, "txHash")
  );
  const gasUsedWei = firstString(
    raw.gasUsedWei,
    getString(output, "gasUsedWei"),
    getString(raw.metadata, "gasUsedWei")
  );
  const gasUsed = firstString(
    raw.gasUsed,
    getString(output, "gasUsed"),
    getString(raw.metadata, "gasUsed"),
    gasUsedWei
  );

  return {
    ...log,
    step: log.nodeName || log.nodeId,
    txHash,
    gasUsed,
    gasUsedWei,
    durationMs: getDurationMs(log.startTime, log.endTime),
    raw: {
      nodeId: log.nodeId,
      nodeName: log.nodeName,
      nodeType: log.nodeType,
      input: log.input,
      output: log.output,
      error: log.error,
      startTime: log.startTime,
      endTime: log.endTime,
      iterationIndex: log.iterationIndex,
    },
  };
}

function getDurationMs(
  startTime?: string,
  endTime?: string
): number | undefined {
  if (!(startTime && endTime)) {
    return undefined;
  }

  const startedAt = Date.parse(startTime);
  const endedAt = Date.parse(endTime);
  if (Number.isNaN(startedAt) || Number.isNaN(endedAt)) {
    return undefined;
  }

  return Math.max(0, endedAt - startedAt);
}

function getString(
  value: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const entry = value?.[key];
  return typeof entry === "string" ? entry : undefined;
}

function firstString(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.length > 0);
}
