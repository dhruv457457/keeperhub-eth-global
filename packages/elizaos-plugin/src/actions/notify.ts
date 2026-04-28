import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

/**
 * KeeperHub notifications work through workflow steps — Discord, Telegram,
 * SendGrid, and Webhook are all workflow node types, not standalone endpoints.
 *
 * Two paths:
 * 1. Execute an existing notification workflow by ID (fast)
 * 2. Generate a one-shot notification workflow via AI and run it (flexible)
 */

type NotifyChannel = "discord" | "telegram" | "email" | "webhook";

function detectChannel(text: string): NotifyChannel {
  const lower = text.toLowerCase();
  if (lower.includes("discord")) return "discord";
  if (lower.includes("telegram")) return "telegram";
  if (lower.includes("email") || lower.includes("sendgrid")) return "email";
  return "webhook";
}

function extractWorkflowId(text: string): string | null {
  const match = text.match(/\bwf_[a-zA-Z0-9_-]{1,64}\b/);
  return match ? match[0] : null;
}

function extractNotifyMessage(text: string): string {
  const quoted = text.match(/["']([^"']{3,400})["']/)?.[1];
  if (quoted) return quoted;
  const labeled = text.match(
    /(?:message|say|notify|send)[:\s]+"?([^"]{3,300})"?/i
  )?.[1];
  if (labeled) return labeled.trim();
  // Fall back to full text (will be used as the notification content)
  return text.slice(0, 200);
}

export function createNotifyAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_NOTIFY",
    similes: [
      "SEND_NOTIFICATION",
      "NOTIFY",
      "SEND_DISCORD",
      "SEND_TELEGRAM",
      "SEND_EMAIL",
      "ALERT",
      "SEND_ALERT",
      "SEND_MESSAGE",
      "SEND_WEBHOOK",
    ],
    description:
      "Send a notification via Discord, Telegram, email (SendGrid), or webhook. " +
      "Either provide a workflow ID (wf_xxx) for an existing notification workflow, " +
      "or describe the notification and KeeperHub will generate + run one automatically.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = (message.content?.text ?? "").toLowerCase();
      return (
        (text.includes("notify") ||
          text.includes("notification") ||
          text.includes("alert") ||
          text.includes("send") ||
          text.includes("message")) &&
        (text.includes("discord") ||
          text.includes("telegram") ||
          text.includes("email") ||
          text.includes("webhook"))
      );
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const channel = detectChannel(text);
      const notifyMessage = extractNotifyMessage(text);
      const existingWorkflowId = extractWorkflowId(text);

      // Path 1: User gave an existing notification workflow ID
      if (existingWorkflowId) {
        await callback?.({
          text: `📤 Running notification workflow \`${existingWorkflowId}\`…`,
        });
        try {
          const obs = await kh.tryRun(existingWorkflowId, {
            input: { message: notifyMessage },
            wait: true,
          });
          if (!obs.ok) {
            await callback?.({ text: `❌ ${obs.summary}` });
            return false;
          }
          await callback?.({
            text: `✅ Notification sent via \`${existingWorkflowId}\`!\n📝 "${notifyMessage.slice(0, 100)}"`,
          });
          return true;
        } catch (err) {
          await callback?.({
            text: `❌ Failed: ${err instanceof Error ? err.message : String(err)}`,
          });
          return false;
        }
      }

      // Path 2: Generate a one-shot notification workflow via AI pipeline
      const channelLabel = {
        discord: "Discord",
        telegram: "Telegram",
        email: "Email (SendGrid)",
        webhook: "Webhook",
      }[channel];
      await callback?.({
        text: `🤖 Generating a ${channelLabel} notification workflow and sending…`,
      });

      try {
        const prompt = `Send a ${channel} notification with this message: "${notifyMessage.slice(0, 500)}". Use the configured ${channel} integration.`;

        const obs = await kh.pipeline().generate(prompt).safeWait();

        if (!obs.ok) {
          elizaLogger.error(
            `[KeeperHub] Notification generation failed: ${obs.error?.message}`
          );
          await callback?.({
            text: [
              `❌ Could not auto-generate notification workflow: ${obs.error?.message}`,
              "",
              `💡 **To set up ${channelLabel} notifications:**`,
              "1. Go to app.keeperhub.com → Workflows → New",
              `2. Add a ${channelLabel} node with your message`,
              `3. Save the workflow, then use its ID here: \`notify wf_yourId "your message"\``,
            ].join("\n"),
          });
          return false;
        }

        const r = obs.result as Record<string, unknown>;
        await callback?.({
          text: [
            `✅ ${channelLabel} notification sent!`,
            `🔑 Execution: \`${r?.["executionId"]}\``,
            `📝 Message: "${notifyMessage.slice(0, 100)}${notifyMessage.length > 100 ? "…" : ""}"`,
          ].join("\n"),
        });
        return true;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Notify failed: ${err}`);
        await callback?.({
          text: `❌ Notification failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: {
            text: "Send a Discord notification: 'Rebalance complete'",
          },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "🤖 Generating a Discord notification workflow and sending…",
            action: "KEEPERHUB_NOTIFY",
          },
        },
      ],
      [
        {
          user: "{{user1}}",
          content: {
            text: "Send Discord notification wf_notify123 'Portfolio rebalanced'",
          },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "📤 Running notification workflow `wf_notify123`…",
            action: "KEEPERHUB_NOTIFY",
          },
        },
      ],
    ],
  };
}
