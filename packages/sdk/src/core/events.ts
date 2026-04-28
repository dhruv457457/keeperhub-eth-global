import type {
  EventSubscriptionOptions,
  ExecutionEventPayload,
  KeeperHubEventName,
} from "../types/index.js";
import type { AnalyticsModule } from "./analytics.js";
import type { WorkflowsModule } from "./workflows.js";

type PollSource = () => Promise<ExecutionEventPayload[]>;

/** Max entries in the "seen" map before oldest entries are evicted */
const MAX_SEEN_ENTRIES = 500;

/** Max consecutive poll failures before backing off */
const MAX_CONSECUTIVE_ERRORS = 3;

/** Backoff multiplier per consecutive failure (capped at 60s) */
const ERROR_BACKOFF_MS = 5000;

function isTerminalStatus(status: string): boolean {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "error" ||
    status === "cancelled" ||
    status === "success"
  );
}

function isFailureStatus(status: string): boolean {
  return status === "failed" || status === "error" || status === "cancelled";
}

export class EventSubscription extends EventTarget {
  private timer: ReturnType<typeof setInterval> | undefined;
  /** Bounded LRU-style map: evicts oldest entries when MAX_SEEN_ENTRIES is hit */
  private readonly seen = new Map<string, string>();
  private polling = false;
  private consecutiveErrors = 0;
  private closed = false;

  constructor(
    private readonly source: PollSource,
    private readonly options: Required<EventSubscriptionOptions>
  ) {
    super();
    void this.poll();
    this.timer = setInterval(() => {
      void this.poll();
    }, this.options.pollInterval);
  }

  /**
   * Subscribe to an event. Returns an unsubscribe function — call it to
   * remove the listener and avoid memory leaks in long-running processes.
   *
   * @example
   * const off = subscription.on("execution.completed", handler);
   * // later:
   * off();
   */
  on(
    event: KeeperHubEventName,
    listener: (payload: ExecutionEventPayload) => void
  ): () => void {
    const handler = (e: Event) => {
      listener((e as Event & { data: ExecutionEventPayload }).data);
    };
    this.addEventListener(event, handler);
    return () => this.removeEventListener(event, handler);
  }

  close(): void {
    this.closed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.seen.clear();
  }

  get isActive(): boolean {
    return !this.closed;
  }

  private async poll(): Promise<void> {
    if (this.polling || this.closed) return;

    // Set polling=true BEFORE sleeping so the interval timer can't fire a
    // concurrent poll during the backoff window (was a race condition previously)
    this.polling = true;

    // Exponential backoff when the API keeps failing
    if (this.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      const backoffMs = Math.min(
        ERROR_BACKOFF_MS * this.consecutiveErrors,
        60_000
      );
      await this.sleep(backoffMs);
      if (this.closed) {
        this.polling = false;
        return;
      }
    }
    try {
      const items = await this.source();
      this.consecutiveErrors = 0; // reset on success

      for (const item of items) {
        const previousStatus = this.seen.get(item.id);

        // Evict oldest entries if map is too large (prevents memory leak)
        if (!this.seen.has(item.id) && this.seen.size >= MAX_SEEN_ENTRIES) {
          const firstKey = this.seen.keys().next().value;
          if (firstKey !== undefined) {
            this.seen.delete(firstKey);
          }
        }
        this.seen.set(item.id, item.status);

        if (previousStatus === item.status) continue;

        this.dispatch("execution.updated", item);
        if (isTerminalStatus(item.status) && !isFailureStatus(item.status)) {
          this.dispatch("execution.completed", item);
        }
        if (isFailureStatus(item.status)) {
          this.dispatch("execution.failed", item);
        }
      }
    } catch {
      this.consecutiveErrors += 1;
      // Errors are silently absorbed — polling will back off automatically
    } finally {
      this.polling = false;
    }
  }

  private dispatch(
    eventName: KeeperHubEventName,
    payload: ExecutionEventPayload
  ): void {
    this.dispatchEvent(Object.assign(new Event(eventName), { data: payload }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class EventsModule {
  constructor(
    private readonly analytics: AnalyticsModule,
    private readonly workflows: WorkflowsModule
  ) {}

  on(
    event: KeeperHubEventName,
    listener: (payload: ExecutionEventPayload) => void,
    options?: EventSubscriptionOptions
  ): EventSubscription {
    const subscription = this.subscribe(options);
    subscription.on(event, listener);
    return subscription;
  }

  subscribe(options?: EventSubscriptionOptions): EventSubscription {
    return new EventSubscription(
      async () => {
        // Limit to "1d" range and slice to 100 entries — avoids fetching entire
        // run history on every 2-second poll tick (was unbounded before)
        const runs = await this.analytics.runs({ range: "7d" });
        return runs.slice(0, 100).map((run) => ({
          id: run.id,
          workflowId: run.workflowId,
          workflowName: run.workflowName,
          status: run.status,
          network: run.network,
          transactionHash: undefined,
          gasUsedWei: run.gasUsedWei,
          source: "workflow" as const,
        }));
      },
      { pollInterval: options?.pollInterval ?? 2000 }
    );
  }

  subscribeWorkflow(
    workflowId: string,
    options?: EventSubscriptionOptions
  ): EventSubscription {
    return new EventSubscription(
      async () => {
        const executions = await this.workflows.executions(workflowId);
        return executions.map((execution) => ({
          id: execution.id,
          workflowId: execution.workflowId,
          workflowName: undefined,
          status: execution.status,
          network: undefined,
          transactionHash: execution.transactionHash,
          gasUsedWei: execution.gasUsedWei,
          source: "workflow" as const,
        }));
      },
      { pollInterval: options?.pollInterval ?? 2000 }
    );
  }
}
