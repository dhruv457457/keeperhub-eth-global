import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

const GenerateWorkflowSchema = z.object({
  prompt: z
    .string()
    .max(1000)
    .trim()
    .describe(
      "Natural language description of what the workflow should do. " +
        "Be specific: include the action, token/protocol, network, and frequency if relevant. " +
        "Example: 'Compound USDC rewards on Aave every Monday at 9am UTC'"
    ),
  execute: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, immediately execute the workflow after generating it"),
  executionInput: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .refine(
      (obj) => !obj || JSON.stringify(obj).length < 8192,
      "Execution input too large (max 8KB)"
    )
    .describe("Runtime inputs to pass to the workflow if execute is true"),
  context: z
    .string()
    .max(500)
    .trim()
    .optional()
    .describe(
      "Additional context about the user's wallet, protocols, or preferences"
    ),
});

/**
 * LangChain tool that generates a KeeperHub workflow from natural language.
 *
 * @example
 * const tool = createGenerateWorkflowTool(kh);
 */
export function createGenerateWorkflowTool(
  kh: KeeperHub
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "generate_keeperhub_workflow",
    description:
      "Generate a new KeeperHub onchain automation workflow from a natural-language description using AI. " +
      "Use this when the user wants to create a new automation for DeFi, token management, " +
      "scheduled transactions, or any onchain task. " +
      "Optionally set execute=true to immediately run the workflow after generating it.",
    schema: GenerateWorkflowSchema,
    func: async ({ prompt, execute, executionInput, context }) => {
      if (execute) {
        const result = await kh
          .pipeline()
          .generate(prompt, { context })
          .withInput(executionInput ?? {})
          .wait({ timeout: 180_000 });

        return JSON.stringify({
          generated: true,
          executed: true,
          executionId: result.executionId ?? null,
          status: result.status,
        });
      }

      // Generate and save only — generateSpec() returns an unsaved spec, then we persist it
      const generated = await kh.workflows.generateSpec({ prompt, context });
      const saved = await kh.workflows.create({
        name: generated.name,
        description: generated.description,
        nodes: generated.nodes,
        edges: generated.edges,
      });

      return JSON.stringify({
        generated: true,
        executed: false,
        workflowId: saved.id,
        name: saved.name,
        description: saved.description,
        hint: `To execute, call execute_keeperhub_workflow with workflowId="${saved.id}"`,
      });
    },
  });
}
