import type { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

function extractWorkflowId(text: string): string | null {
  return text.match(/\bwf_[a-zA-Z0-9_-]{1,64}\b/)?.[0] ?? null;
}

function extractTwoWorkflowIds(text: string): [string | null, string | null] {
  const all = [...text.matchAll(/\bwf_[a-zA-Z0-9_-]{1,64}\b/g)].map((m) => m[0]);
  return [all[0] ?? null, all[1] ?? null];
}

export function createWorkflowVersionAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_WORKFLOW_VERSION",
    similes: [
      "VERSION_WORKFLOW", "UPGRADE_WORKFLOW", "CREATE_V2",
      "DUPLICATE_WORKFLOW", "NEW_VERSION",
    ],
    description:
      "Create a new version of a workflow (v1 → v2) by duplicating it. " +
      "Use when you want to improve an existing workflow without breaking the original.",

    validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
      const text = (message.content?.text ?? "").toLowerCase();
      const hasWf = /\bwf_[a-zA-Z0-9_-]{1,64}\b/.test(message.content?.text ?? "");
      const hasVersion = text.includes("version") || text.includes("upgrade") ||
        text.includes("duplicate") || text.includes("v2") || text.includes("new version");
      return hasWf && hasVersion;
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
        await callback?.({ text: "❌ Please include a workflow ID (wf_xxx) to version." });
        return false;
      }

      await callback?.({ text: `📋 Creating new version of \`${workflowId}\`…` });

      try {
        const newWorkflow = await kh.workflows.duplicate(workflowId);
        const nw = newWorkflow as Record<string, unknown>;
        await callback?.({
          text: [
            `✅ New workflow version created!`,
            `📌 Original: \`${workflowId}\``,
            `🆕 New v2: \`${nw["id"]}\` — **${nw["name"]}**`,
            ``,
            `**Next steps:**`,
            `1. Test new version: \`run workflow ${nw["id"]}\``,
            `2. Migrate funds: \`migrate from ${workflowId} to ${nw["id"]}\``,
            `3. Publish when ready: \`publish workflow ${nw["id"]}\``,
          ].join("\n"),
        });
        return true;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Workflow version failed: ${err}`);
        await callback?.({ text: `❌ Failed: ${err instanceof Error ? err.message : String(err)}` });
        return false;
      }
    },

    examples: [
      [
        { user: "{{user1}}", content: { text: "Create a v2 of workflow wf_abc123" } },
        { user: "{{agentName}}", content: { text: "📋 Creating new version of `wf_abc123`…", action: "KEEPERHUB_WORKFLOW_VERSION" } },
      ],
    ],
  };
}

export function createWorkflowMigrateAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_WORKFLOW_MIGRATE",
    similes: [
      "MIGRATE_WORKFLOW", "MOVE_FUNDS_WORKFLOW", "WORKFLOW_MIGRATION",
      "UPGRADE_FUNDS", "MOVE_V1_V2",
    ],
    description:
      "Migrate funds from one workflow version to another (v1 → v2). " +
      "Provide both workflow IDs: the old one and the new one.",

    validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const ids = [...text.matchAll(/\bwf_[a-zA-Z0-9_-]{1,64}\b/g)];
      const hasMigrate = /(migrate|move fund|v1.*v2|from.*to)/i.test(text);
      return ids.length >= 2 && hasMigrate;
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const [fromId, toId] = extractTwoWorkflowIds(text);

      if (!fromId || !toId) {
        await callback?.({ text: "❌ Please provide both workflow IDs: `migrate from wf_old to wf_new`" });
        return false;
      }

      await callback?.({
        text: `🔄 Migrating from \`${fromId}\` → \`${toId}\`…\n⏳ Draining old workflow, then activating new one.`,
      });

      try {
        // Drain old
        const drainObs = await kh.tryRun(fromId, { input: { _action: "withdraw" }, wait: true });
        const drainMsg = drainObs.ok ? "✅ Old workflow drained." : `⚠️ Drain: ${drainObs.summary}`;

        // Activate new
        const activateObs = await kh.tryRun(toId, { input: {}, wait: true });
        const activateMsg = activateObs.ok ? "✅ New workflow activated." : `❌ Activation: ${activateObs.summary}`;

        const r = activateObs.result as Record<string, unknown>;
        await callback?.({
          text: [
            `🎉 Migration complete!`,
            drainMsg,
            activateMsg,
            r?.["executionId"] ? `🔑 New execution: \`${r["executionId"]}\`` : null,
            ``,
            `**${fromId}** → **${toId}**`,
          ].filter(Boolean).join("\n"),
        });
        return activateObs.ok;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Migration failed: ${err}`);
        await callback?.({ text: `❌ Migration failed: ${err instanceof Error ? err.message : String(err)}` });
        return false;
      }
    },

    examples: [
      [
        { user: "{{user1}}", content: { text: "Migrate from wf_old123 to wf_new456" } },
        { user: "{{agentName}}", content: { text: "🔄 Migrating from `wf_old123` → `wf_new456`…", action: "KEEPERHUB_WORKFLOW_MIGRATE" } },
      ],
    ],
  };
}
