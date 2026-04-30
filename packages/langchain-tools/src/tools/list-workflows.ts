import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

const ListWorkflowsSchema = z.object({
  projectId: z.string().optional().describe("Filter by project ID (optional)"),
  tagId: z.string().optional().describe("Filter by tag ID (optional)"),
});

/** Sanitize workflow metadata before injecting into LLM context */
const sanitize = (s: string) => s.replace(/[`[\]{}\\]/g, "").slice(0, 80);

export function createListWorkflowsTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "list_keeperhub_workflows",
    description:
      "List all available KeeperHub onchain automation workflows. " +
      "Use this to discover what automations exist before executing one. " +
      "Returns workflow IDs, names, and descriptions.",
    schema: ListWorkflowsSchema,
    func: async ({ projectId, tagId }) => {
      try {
        const workflows = await kh.workflows.list({ projectId, tagId });
        const items = workflows.map((wf) => ({
          id: wf.id,
          // Sanitize before injecting into LLM context — workflow names/descriptions
          // are user-controlled and could contain prompt injection attempts
          name: sanitize(wf.name),
          description: wf.description ? sanitize(wf.description) : undefined,
          visibility: wf.visibility,
          updatedAt: wf.updatedAt,
        }));
        return JSON.stringify({ ok: true, workflows: items, count: items.length });
      } catch (err) {
        // LangChain tools must return a string — never throw
        return JSON.stringify({
          ok: false,
          error:
            err instanceof Error ? err.message : "Failed to list workflows",
        });
      }
    },
  });
}
