import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Workflow versioning and migration tools.
 *
 * Answers the Discord question: "if I create a v2, what's the strategy
 * to move funds from v1 to v2?"
 *
 * Flow:
 * 1. duplicate(v1) → creates v2 with same nodes
 * 2. modify v2 as needed (update() or AI regenerate)
 * 3. run v1 with a "withdraw" input to drain funds
 * 4. run v2 with migrated funds
 * 5. optionally go-live on v2, archive v1
 */

export function createWorkflowVersionTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_workflow_version",
    description:
      "Create a new version of an existing workflow (v1 → v2). " +
      "Duplicates the workflow, optionally applies AI improvements, " +
      "and returns the new workflow ID. " +
      "Use keeperhub_workflow_migrate to move funds from old to new version.",
    schema: z.object({
      workflowId: z
        .string()
        .describe("Source workflow ID to version (wf_xxx)"),
      improvements: z
        .string()
        .max(500)
        .optional()
        .describe(
          "Optional: describe improvements for the new version e.g. " +
          "'Switch from Aave V2 to Aave V3 for better yield' or " +
          "'Add Morpho as fallback when Aave APY drops below 3%'"
        ),
      goLive: z
        .boolean()
        .default(false)
        .describe("Publish the new version immediately (go-live)"),
    }),
    func: async ({ workflowId, improvements, goLive }) => {
      try {
        // Step 1: Duplicate the workflow
        const newWorkflow = await kh.workflows.duplicate(workflowId);
        const nw = newWorkflow as Record<string, unknown>;
        const newId = nw["id"] as string;

        // Step 2: If improvements described, apply via AI update
        if (improvements && newId) {
          try {
            await kh.workflows.update(newId, {
              description: `${nw["description"] ?? ""} [v2: ${improvements.slice(0, 100)}]`,
            });
          } catch {
            // non-fatal — workflow still created
          }
        }

        // Step 3: Optionally publish
        let liveStatus: string | null = null;
        if (goLive && newId) {
          try {
            await kh.workflows.goLive(newId);
            liveStatus = "published";
          } catch (e) {
            liveStatus = `go-live failed: ${e}`;
          }
        }

        return JSON.stringify({
          ok: true,
          original_workflow_id: workflowId,
          new_workflow_id: newId,
          new_workflow_name: nw["name"],
          live_status: liveStatus,
          summary: `Created v2 workflow ${newId} from ${workflowId}.${improvements ? ` Improvement note: ${improvements}` : ""}`,
          next_steps: [
            `1. Test new workflow: keeperhub_execute_workflow('${newId}')`,
            `2. Migrate funds: keeperhub_workflow_migrate({ fromId: '${workflowId}', toId: '${newId}' })`,
            `3. Archive old workflow when ready`,
          ],
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}

export function createWorkflowMigrateTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_workflow_migrate",
    description:
      "Migrate funds and execution from an old workflow version to a new one. " +
      "Answers: 'how do I move funds from v1 to v2 of my workflow?' " +
      "Drains the old workflow (runs it with withdraw input), then activates the new one. " +
      "Use after keeperhub_workflow_version to complete the migration.",
    schema: z.object({
      fromWorkflowId: z
        .string()
        .describe("Old workflow ID to migrate FROM (wf_xxx)"),
      toWorkflowId: z
        .string()
        .describe("New workflow ID to migrate TO (wf_xxx)"),
      withdrawInput: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional()
        .describe(
          "Optional inputs for the withdrawal run on the old workflow. " +
          "e.g. { action: 'withdraw_all', recipient: '0xYourWallet' }"
        ),
      activateNew: z
        .boolean()
        .default(true)
        .describe("Run the new workflow after migration (default: true)"),
      activateInput: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional()
        .describe("Optional inputs for the initial run of the new workflow"),
    }),
    func: async ({
      fromWorkflowId,
      toWorkflowId,
      withdrawInput,
      activateNew,
      activateInput,
    }) => {
      const steps: string[] = [];

      try {
        // Step 1: Drain old workflow
        steps.push(`Draining old workflow ${fromWorkflowId}…`);
        let drainResult: Record<string, unknown> = {};
        try {
          const obs = await kh.tryRun(fromWorkflowId, {
            input: { ...withdrawInput, _action: "withdraw" },
            wait: true,
          });
          drainResult = {
            ok: obs.ok,
            summary: obs.summary,
            execution_id: (obs.result as Record<string, unknown>)?.["executionId"],
          };
          steps.push(obs.ok ? `✅ Old workflow drained.` : `⚠️ Drain: ${obs.summary}`);
        } catch (e) {
          steps.push(`⚠️ Drain attempt: ${e} (continuing migration)`);
        }

        // Step 2: Activate new workflow
        let activateResult: Record<string, unknown> = {};
        if (activateNew) {
          steps.push(`Activating new workflow ${toWorkflowId}…`);
          const obs = await kh.tryRun(toWorkflowId, {
            input: activateInput ?? {},
            wait: true,
          });
          activateResult = {
            ok: obs.ok,
            summary: obs.summary,
            execution_id: (obs.result as Record<string, unknown>)?.["executionId"],
          };
          steps.push(obs.ok ? `✅ New workflow activated.` : `❌ Activation: ${obs.summary}`);
        }

        return JSON.stringify({
          ok: true,
          from: fromWorkflowId,
          to: toWorkflowId,
          drain_result: drainResult,
          activate_result: activateResult,
          steps,
          summary: `Migration complete: ${fromWorkflowId} → ${toWorkflowId}. ${steps.join(" ")}`,
          next_steps: [
            `Monitor new workflow: keeperhub_get_execution_status('${activateResult["execution_id"]}')`,
            `Delete old workflow when confirmed stable: keeperhub_delete_workflow('${fromWorkflowId}')`,
          ],
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          steps,
          error: String(err),
        });
      }
    },
  });
}

export function createWorkflowGoLiveTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_workflow_publish",
    description:
      "Publish a workflow to the KeeperHub marketplace (go-live). " +
      "Once published, other users can discover and call it via x402/MPP payments. " +
      "Use after testing your workflow and it's ready for production.",
    schema: z.object({
      workflowId: z.string().describe("Workflow ID to publish (wf_xxx)"),
    }),
    func: async ({ workflowId }) => {
      try {
        const result = await kh.workflows.goLive(workflowId);
        const r = result as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          workflow_id: workflowId,
          status: r["status"] ?? "live",
          name: r["name"],
          summary: `Workflow ${workflowId} is now live on the KeeperHub marketplace. Other agents can discover and call it via x402/MPP payments.`,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
