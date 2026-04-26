import { beforeEach, describe, expect, it, vi } from "vitest";

import { KeeperHub } from "./index.js";

describe("debug module", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a failure explanation from execution status and logs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exec_1",
            workflowId: "wf_1",
            status: "error",
            error: "transaction reverted",
            input: { amount: 1 },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "error",
            nodeStatuses: [{ nodeId: "condition-1", status: "error" }],
            progress: {
              totalSteps: 3,
              completedSteps: 2,
              runningSteps: 0,
              currentNodeId: "condition-1",
              currentNodeName: "Condition",
              percentage: 67,
            },
            errorContext: {
              failedNodeId: "condition-1",
              lastSuccessfulNodeId: "fetch-price",
              lastSuccessfulNodeName: "Fetch Price",
              executionTrace: ["trigger", "fetch-price", "condition-1"],
              error: "price threshold check failed",
            },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            execution: { id: "exec_1" },
            logs: [
              {
                id: "log_1",
                executionId: "exec_1",
                nodeId: "condition-1",
                nodeName: "Condition",
                nodeType: "action",
                status: "error",
                error: "price threshold check failed",
              },
            ],
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const kh = new KeeperHub({ apiKey: "test-key", retry: { maxAttempts: 1 } });
    const explanation = await kh.debug.explainFailure("exec_1");

    expect(explanation.summary).toContain("condition-1");
    expect(explanation.lastSuccessfulNodeName).toBe("Fetch Price");
    expect(explanation.executionTrace).toEqual([
      "trigger",
      "fetch-price",
      "condition-1",
    ]);
  });
});
