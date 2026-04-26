import { beforeEach, describe, expect, it, vi } from "vitest";

import { KeeperHub } from "./index.js";

describe("run and execution logs", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses kh.run as the default safe path and returns structured logs", async () => {
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
        new Response(JSON.stringify({ status: "completed" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exec_1",
            workflowId: "wf_1",
            status: "completed",
            transactionHash: "0xabc",
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
                nodeId: "swap",
                nodeName: "swap",
                nodeType: "action",
                status: "completed",
                output: {
                  txHash: "0xabc",
                  gasUsed: "0.002 ETH",
                },
                startTime: "2026-04-24T10:00:00.000Z",
                endTime: "2026-04-24T10:00:05.000Z",
              },
            ],
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const kh = new KeeperHub({ apiKey: "test-key", retry: { maxAttempts: 1 } });
    const result = await kh.run("wf_1", { verbose: true });

    expect(result.mode).toBe("safe");
    expect(result.status).toBe("completed");
    expect(result.logs).toEqual([
      expect.objectContaining({
        step: "swap",
        status: "completed",
        gasUsed: "0.002 ETH",
        txHash: "0xabc",
        durationMs: 5000,
      }),
    ]);
  });

  it("throws a structured execution error when a run fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ executionId: "exec_fail", status: "running" }),
          {
            status: 200,
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "failed" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exec_fail",
            workflowId: "wf_fail",
            status: "failed",
            error: "insufficient liquidity",
            transactionHash: "0xdead",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            execution: { id: "exec_fail" },
            logs: [
              {
                id: "log_1",
                executionId: "exec_fail",
                nodeId: "swap",
                nodeName: "swap",
                nodeType: "action",
                status: "failed",
                error: "insufficient liquidity",
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "failed",
            errorContext: {
              failedNodeId: "swap",
              error: "insufficient liquidity",
            },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ executionId: "exec_retry", status: "running" }),
          {
            status: 200,
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "failed" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "exec_retry",
            workflowId: "wf_fail",
            status: "failed",
            error: "insufficient liquidity",
            transactionHash: "0xdead",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            execution: { id: "exec_retry" },
            logs: [
              {
                id: "log_2",
                executionId: "exec_retry",
                nodeId: "swap",
                nodeName: "swap",
                nodeType: "action",
                status: "failed",
                error: "insufficient liquidity",
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "failed",
            errorContext: {
              failedNodeId: "swap",
              error: "insufficient liquidity",
            },
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const kh = new KeeperHub({ apiKey: "test-key", retry: { maxAttempts: 1 } });

    await expect(kh.run("wf_fail")).rejects.toMatchObject({
      name: "KeeperHubExecutionError",
      code: "EXECUTION_FAILED",
      executionId: "exec_retry",
      workflowId: "wf_fail",
      step: "swap",
      txHash: "0xdead",
      reason: "failed at step swap: insufficient liquidity",
    });
  });
});
