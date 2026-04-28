import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import { KeeperHubPaymentRequiredError, type KeeperHub } from "keeperhub-sdk";

function extractWorkflowId(text: string): string | null {
  const match = text.match(
    /\b(?:wf_[a-zA-Z0-9_-]{1,64}|[a-z0-9]{10,30})\b/i
  );
  return match ? match[0] : null;
}

function extractListedSlug(text: string): string | null {
  return (
    text.match(
      /(?:listedSlug|slug)[:=\s]+["`']?([a-z0-9][a-z0-9-]{1,120})/i
    )?.[1] ?? null
  );
}

function extractBudget(text: string): string {
  const match =
    text.match(/\$\s*(\d+(?:\.\d+)?)\s*(?:usd|usdc)?/i) ??
    text.match(/budget[:\s]+(\d+(?:\.\d+)?)/i) ??
    text.match(/max[:\s]+(\d+(?:\.\d+)?)/i);
  return match ? match[1] : "1.00";
}

function paymentProtocol(err: KeeperHubPaymentRequiredError): "MPP" | "x402" {
  const wwwAuthenticate =
    err.responseHeaders?.["www-authenticate"] ??
    err.responseHeaders?.["WWW-Authenticate"] ??
    "";
  return /method="?tempo"?|^mpp/i.test(wwwAuthenticate) ? "MPP" : "x402";
}

export function createPayAndRunAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_PAY_AND_RUN",
    similes: [
      "PAY_AND_RUN",
      "PAID_WORKFLOW",
      "PAY_FOR_WORKFLOW",
      "X402_EXECUTE",
      "MPP_EXECUTE",
      "PAY_EXECUTE",
    ],
    description:
      "Execute a payment-gated KeeperHub workflow using x402 (Base USDC) or MPP (Tempo USDC.e). " +
      "Use an owned workflow ID or a public listed workflow slug.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const hasPay = /pay|paid|x402|mpp|usdc|budget/i.test(text);
      const hasTarget = extractWorkflowId(text) !== null || extractListedSlug(text) !== null;
      return hasPay && hasTarget;
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const workflowId = extractWorkflowId(text);
      const listedSlug = extractListedSlug(text);

      if (!(workflowId || listedSlug)) {
        await callback?.({
          text: "Please include a workflow ID or listed workflow slug to pay and run.",
        });
        return false;
      }

      const budget = extractBudget(text);
      const preferMpp = !text.toLowerCase().includes("x402");
      const target = listedSlug ?? workflowId;

      await callback?.({
        text: `Paying and running \`${target}\` via ${
          preferMpp ? "MPP (Tempo USDC.e)" : "x402 (Base USDC)"
        } with budget $${budget}.`,
      });

      try {
        if (listedSlug) {
          const result = await kh.payments.execute(listedSlug, {});
          await callback?.({
            text: [
              `Listed workflow \`${listedSlug}\` completed.`,
              `Status: ${result.status}`,
              `Execution: \`${result.executionId}\``,
            ].join("\n"),
          });
          return true;
        }

        const obs = await kh
          .pipeline()
          .workflow(workflowId!)
          .pay({ budget, preferMpp })
          .safeWait();

        if (!obs.ok) {
          elizaLogger.error(
            `[KeeperHub] Pay-and-run failed: ${obs.error?.message}`
          );
          await callback?.({
            text: `${obs.summary}${obs.error?.isRetryable ? " (retryable)" : ""}`,
          });
          return false;
        }

        const r = obs.result as Record<string, unknown>;
        const exec = r?.["execution"] as Record<string, unknown> | undefined;
        await callback?.({
          text: [
            `Paid workflow \`${workflowId}\` completed.`,
            `Paid: $${budget} USDC via ${preferMpp ? "MPP" : "x402"}`,
            exec?.["transactionHash"]
              ? `TX: \`${exec["transactionHash"]}\``
              : null,
            obs.summary,
          ]
            .filter(Boolean)
            .join("\n"),
        });
        return true;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Pay-and-run error: ${err}`);
        if (err instanceof KeeperHubPaymentRequiredError) {
          await callback?.({
            text: [
              `Payment required via ${paymentProtocol(err)}.`,
              "KeeperHub returned a payment challenge.",
              "Use an x402/MPP payment resolver to sign and retry.",
            ].join("\n"),
          });
          return false;
        }

        await callback?.({
          text: `Payment failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: { text: "Pay and run slug microtip with $0.01 budget" },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "Paying and running `microtip` via MPP (Tempo USDC.e) with budget $0.01.",
            action: "KEEPERHUB_PAY_AND_RUN",
          },
        },
      ],
    ],
  };
}
