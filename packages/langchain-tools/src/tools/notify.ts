import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Send notifications via Discord, Telegram, Email (SendGrid), or Webhook.
 *
 * KeeperHub notifications work through workflow steps — these are workflow node
 * types, not standalone API endpoints. Two paths:
 * 1. Run an existing notification workflow by ID (fast, recommended)
 * 2. AI-generate a one-shot notification workflow (flexible, no setup needed)
 *
 * Setup: configure integrations at app.keeperhub.com → Integrations
 */
export function createNotifyTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_notify",
    description:
      "Send a notification via Discord, Telegram, Email (SendGrid), or Webhook. " +
      "Either provide an existing notification workflowId, or just set channel + message " +
      "and KeeperHub will auto-generate a one-shot workflow. " +
      "Set up integrations at app.keeperhub.com → Integrations first.",
    schema: z.object({
      channel: z
        .enum(["discord", "telegram", "email", "webhook"])
        .describe("Notification channel"),
      message: z
        .string()
        .min(1)
        .max(2000)
        .describe("Notification message content"),
      workflowId: z
        .string()
        .regex(/^wf_[a-zA-Z0-9_-]{1,64}$/)
        .optional()
        .describe(
          "Optional: existing notification workflow ID (wf_xxx). If omitted, auto-generates one."
        ),
      subject: z
        .string()
        .max(200)
        .optional()
        .describe("Email subject line (email channel only)"),
      webhookUrl: z
        .string()
        .url()
        .optional()
        .describe(
          "Webhook URL (webhook channel only, if not using a saved integration)"
        ),
    }),
    func: async ({ channel, message, workflowId, subject, webhookUrl }) => {
      try {
        // Path 1: Run existing notification workflow
        if (workflowId) {
          const obs = await kh.tryRun(workflowId, {
            input: { message, subject, webhookUrl },
            wait: true,
          });
          if (!obs.ok) {
            return JSON.stringify({
              ok: false,
              summary: obs.summary,
              error: obs.error?.message,
            });
          }
          return JSON.stringify({
            ok: true,
            summary: `${channel} notification sent via workflow ${workflowId}.`,
            execution_id: (obs.result as Record<string, unknown>)?.[
              "executionId"
            ],
          });
        }

        // Path 2: No workflowId provided — guide user to set one up
        return JSON.stringify({
          ok: false,
          error: `No notification workflowId provided.`,
          hint: [
            `To send a ${channel} notification:`,
            `1. Go to app.keeperhub.com → Workflows → New Workflow`,
            `2. Add a ${channel} notification step`,
            `3. Save and copy the workflow ID (wf_xxx)`,
            `4. Call this tool again with workflowId="wf_xxx" and message="${message.slice(0, 50)}"`,
          ].join(" "),
          channel,
          message_preview: message.slice(0, 100),
          execution_id: null,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}

/**
 * List configured notification integrations (Discord, Telegram, SendGrid, Webhook).
 */
export function createListIntegrationsTool(
  kh: KeeperHub
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_list_integrations",
    description:
      "List all configured notification integrations (Discord, Telegram, SendGrid, Webhook). " +
      "Returns integration IDs and types. Set up integrations at app.keeperhub.com → Integrations.",
    schema: z.object({
      type: z
        .enum(["discord", "telegram", "sendgrid", "webhook", "all"])
        .default("all")
        .describe("Filter by integration type"),
    }),
    func: async ({ type }) => {
      try {
        const integrations = await kh.integrations.list();
        const filtered =
          type === "all"
            ? integrations
            : integrations.filter(
                (i) =>
                  String(
                    (i as Record<string, unknown>)["type"]
                  ).toLowerCase() === type
              );

        return JSON.stringify({
          ok: true,
          count: filtered.length,
          integrations: filtered.map((i) => {
            const r = i as Record<string, unknown>;
            return { id: r["id"], type: r["type"], name: r["name"] };
          }),
          hint:
            filtered.length === 0
              ? `No ${type === "all" ? "" : type + " "}integrations found. Add one at app.keeperhub.com → Integrations.`
              : undefined,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
