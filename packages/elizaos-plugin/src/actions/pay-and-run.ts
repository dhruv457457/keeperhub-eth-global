import type { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

function extractWorkflowId(text: string): string | null {
  const match = text.match(/\bwf_[a-zA-Z0-9_-]{1,64}\b/);
  return match ? match[0] : null;
}

function extractBudget(text: string): string {
  const match = text.match(/\$\s*(\d+(?:\.\d+)?)\s*(?:usd|usdc)?/i)
    ?? text.match(/budget[:\s]+(\d+(?:\.\d+)?)/i)
    ?? text.match(/max[:\s]+(\d+(?:\.\d+)?)/i);
  return match ? match[1] : "1.00";
}

export function createPayAndRunAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_PAY_AND_RUN",
    similes: [
      "PAY_AND_RUN", "PAID_WORKFLOW", "PAY_FOR_WORKFLOW",
      "X402_EXECUTE", "MPP_EXECUTE", "PAY_EXECUTE",
    ],
    description:
      "Execute a payment-gated KeeperHub workflow using x402 (Base USDC) or MPP (Tempo USDC.e). " +
      "Payment is handled automatically. Include a workflow ID (wf_xxx) and optional budget.",

    validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const hasPay = /pay|paid|x402|mpp|usdc|budget/i.test(text);
      const hasWorkflow = /\bwf_[a-zA-Z0-9_-]{1,64}\b/.test(text);
      return hasPay && hasWorkflow;
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

      if (!workflowId) {
        await callback?.({ text: "❌ Please include a workflow ID (wf_xxx) to pay and run." });
        return false;
      }

      const budget = extractBudget(text);
      const preferMpp = !text.toLowerCase().includes("x402");

      await callback?.({
        text: `💳 Paying & running \`${workflowId}\` via ${preferMpp ? "MPP (Tempo USDC.e)" : "x402 (Base USDC)"} — budget: $${budget}…`,
      });

      try {
        const obs = await kh
          .pipeline()
          .workflow(workflowId)
          .pay({ budget, preferMpp })
          .safeWait();

        if (!obs.ok) {
          elizaLogger.error(`[KeeperHub] Pay-and-run failed: ${obs.error?.message}`);
          await callback?.({
            text: `❌ ${obs.summary}${obs.error?.isRetryable ? " (retryable)" : ""}`,
          });
          return false;
        }

        const r = obs.result as Record<string, unknown>;
        const exec = r?.["execution"] as Record<string, unknown> | undefined;
        await callback?.({
          text: [
            `✅ Paid workflow \`${workflowId}\` completed!`,
            `💰 Paid: $${budget} USDC via ${preferMpp ? "MPP" : "x402"}`,
            exec?.["transactionHash"] ? `🔗 TX: \`${exec["transactionHash"]}\`` : null,
            `📊 ${obs.summary}`,
          ].filter(Boolean).join("\n"),
        });
        return true;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Pay-and-run error: ${err}`);
        await callback?.({ text: `❌ Payment failed: ${err instanceof Error ? err.message : String(err)}` });
        return false;
      }
    },

    examples: [
      [
        { user: "{{user1}}", content: { text: "Pay and run wf_abc123 with $0.05 budget" } },
        {
          user: "{{agentName}}",
          content: { text: "💳 Paying & running `wf_abc123` via MPP (Tempo USDC.e) — budget: $0.05…", action: "KEEPERHUB_PAY_AND_RUN" },
        },
      ],
    ],
  };
}
