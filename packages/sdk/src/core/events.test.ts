import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KeeperHub } from "./index.js";

describe("events module", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits workflow completion events when execution status changes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "exec_1",
              workflowId: "wf_1",
              status: "running",
            },
          ]),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "exec_1",
              workflowId: "wf_1",
              status: "completed",
            },
          ]),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const kh = new KeeperHub({ apiKey: "test-key", retry: { maxAttempts: 1 } });
    const subscription = kh.events.subscribeWorkflow("wf_1", {
      pollInterval: 1000,
    });

    const completed = vi.fn();
    subscription.on("execution.completed", completed);

    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(1000);

    expect(completed).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "exec_1",
        workflowId: "wf_1",
        status: "completed",
      })
    );

    subscription.close();
  });
});
