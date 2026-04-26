import { beforeEach, describe, expect, it, vi } from "vitest";

import { KeeperHub } from "./index.js";

describe("workflow pipeline", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retries a failed workflow and waits for completion", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ executionId: "exec_1", status: "running" }),
          {
            status: 200,
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "error" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exec_1",
            workflowId: "wf_1",
            status: "error",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ executionId: "exec_2", status: "running" }),
          {
            status: 200,
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "completed" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exec_2",
            workflowId: "wf_1",
            status: "completed",
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const kh = new KeeperHub({ apiKey: "test-key", retry: { maxAttempts: 1 } });
    const result = await kh
      .pipeline()
      .workflow("wf_1", { amount: 1 })
      .simulate()
      .retry({ attempts: 2, delayMs: 0 })
      .wait();

    expect(result.executionId).toBe("exec_2");
    expect(result.status).toBe("completed");
    expect(result.attempts).toBe(2);
    expect(result.simulation.supported).toBe(false);
  });
});
