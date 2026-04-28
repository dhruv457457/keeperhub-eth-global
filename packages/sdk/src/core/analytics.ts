import type {
  AnalyticsRange,
  AnalyticsRun,
  AnalyticsSummary,
  AnalyticsTimeSeriesPoint,
  NetworkUsage,
} from "../types/index.js";
import type { HttpClient } from "./client.js";

export class AnalyticsModule {
  constructor(private readonly client: HttpClient) {}

  /** Dashboard summary: usage, gas credits, subscription, limits */
  async summary(options?: {
    range?: AnalyticsRange;
    projectId?: string;
    customStart?: string;
    customEnd?: string;
  }): Promise<AnalyticsSummary> {
    return this.client.request<AnalyticsSummary>(
      "GET",
      "/api/analytics/summary",
      {
        query: {
          range: options?.range,
          projectId: options?.projectId,
          customStart: options?.customStart,
          customEnd: options?.customEnd,
        },
      }
    );
  }

  /** Execution run history */
  async runs(options?: {
    range?: AnalyticsRange;
    projectId?: string;
  }): Promise<AnalyticsRun[]> {
    return this.client.request<AnalyticsRun[]>("GET", "/api/analytics/runs", {
      query: {
        range: options?.range,
        projectId: options?.projectId,
      },
    });
  }

  /** Step-level detail for one execution run */
  async runSteps(executionId: string): Promise<unknown[]> {
    return this.client.request<unknown[]>(
      "GET",
      `/api/analytics/runs/${executionId}/steps`
    );
  }

  /** Time-series data for charts */
  async timeSeries(options?: {
    range?: AnalyticsRange;
    projectId?: string;
  }): Promise<AnalyticsTimeSeriesPoint[]> {
    return this.client.request<AnalyticsTimeSeriesPoint[]>(
      "GET",
      "/api/analytics/time-series",
      {
        query: {
          range: options?.range,
          projectId: options?.projectId,
        },
      }
    );
  }

  /** Network usage breakdown — runs and gas per chain */
  async networks(): Promise<NetworkUsage[]> {
    return this.client.request<NetworkUsage[]>(
      "GET",
      "/api/analytics/networks"
    );
  }

  /** Gas credit spend cap status */
  async spendCap(): Promise<{
    limit: number;
    used: number;
    remaining: number;
    percentUsed: number;
  }> {
    return this.client.request("GET", "/api/analytics/spend-cap");
  }

  /** Open a live WebSocket stream for real-time execution events */
  stream(): AnalyticsStream {
    return new AnalyticsStream(this.client.baseUrl);
  }
}

const ANALYTICS_ALLOWED_EVENT_TYPES = new Set([
  "execution.completed",
  "execution.failed",
  "execution.updated",
  "execution.started",
  "execution.cancelled",
  "event",
]);

const ANALYTICS_WS_MAX_RECONNECT = 5;
const ANALYTICS_WS_RECONNECT_BASE_MS = 1000;

export class AnalyticsStream extends EventTarget {
  private ws: WebSocket | null = null;
  private readonly wsUrl: string;
  private reconnectAttempts = 0;
  private closed = false;

  constructor(baseUrl: string) {
    super();
    this.wsUrl = baseUrl
      .replace("https://", "wss://")
      .replace("http://", "ws://");
    this.connect();
  }

  private connect() {
    if (this.closed) return;

    this.ws = new WebSocket(`${this.wsUrl}/api/analytics/stream`);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as unknown;
        this.dispatchEvent(Object.assign(new Event("event"), { data }));
        if (data !== null && typeof data === "object" && "type" in data) {
          const type = (data as { type: string }).type;
          // Allowlist prevents prototype pollution via malicious server messages
          if (ANALYTICS_ALLOWED_EVENT_TYPES.has(type)) {
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
      if (!this.closed && this.reconnectAttempts < ANALYTICS_WS_MAX_RECONNECT) {
        const delay =
          ANALYTICS_WS_RECONNECT_BASE_MS * 2 ** this.reconnectAttempts;
        this.reconnectAttempts += 1;
        setTimeout(() => this.connect(), delay);
      } else {
        this.dispatchEvent(new Event("close"));
      }
    };

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };
  }

  on(
    event:
      | "execution.completed"
      | "execution.failed"
      | "event"
      | "close"
      | "error"
      | string,
    listener: (data: unknown) => void
  ) {
    this.addEventListener(event, (e) => {
      listener((e as Event & { data: unknown }).data);
    });
    return this;
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }
}
