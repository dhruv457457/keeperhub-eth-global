import { beforeEach, describe, expect, it, vi } from "vitest";

import { KeeperHub } from "./index.js";

describe("payments module", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws a payment error with parsed challenge metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              x402Version: 2,
              accepts: [
                {
                  scheme: "exact",
                  network: "eip155:8453",
                  asset: "USDC",
                  amount: "50000",
                  payTo: "0xcreator",
                  maxTimeoutSeconds: 300,
                },
              ],
            }),
            {
              status: 402,
              headers: {
                "PAYMENT-REQUIRED": "encoded",
              },
            }
          )
      )
    );

    const kh = new KeeperHub({ apiKey: "test-key", retry: { maxAttempts: 1 } });

    await expect(
      kh.payments.execute("paid-workflow", {})
    ).rejects.toMatchObject({
      name: "KeeperHubPaymentRequiredError",
      status: 402,
      code: "PAYMENT_REQUIRED",
    });
  });

  it("retries automatically when resolvePayment returns headers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            x402Version: 2,
            accepts: [
              {
                scheme: "exact",
                network: "eip155:8453",
                asset: "USDC",
                amount: "50000",
                payTo: "0xcreator",
                maxTimeoutSeconds: 300,
              },
            ],
          }),
          { status: 402 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            executionId: "exec_123",
            status: "running",
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const kh = new KeeperHub({ apiKey: "test-key", retry: { maxAttempts: 1 } });
    const result = await kh.payments.execute(
      "paid-workflow",
      { amount: 1 },
      {
        strategy: "auto",
        resolvePayment: ({ challenge }) => {
          expect(challenge.accepts?.[0]?.payTo).toBe("0xcreator");
          return {
            "PAYMENT-SIGNATURE": "signed-payment",
          };
        },
      }
    );

    expect(result).toEqual({
      executionId: "exec_123",
      status: "running",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("prepares a payment challenge without attempting execution", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              x402Version: 2,
              accepts: [
                {
                  scheme: "exact",
                  network: "eip155:8453",
                  asset: "USDC",
                  amount: "25000",
                  payTo: "0xcreator",
                  maxTimeoutSeconds: 300,
                },
              ],
            }),
            { status: 402 }
          )
      )
    );

    const kh = new KeeperHub({ apiKey: "test-key", retry: { maxAttempts: 1 } });
    const challenge = await kh.payments.prepare("paid-workflow", {});

    expect(challenge.accepts?.[0]?.amount).toBe("25000");
  });
});
