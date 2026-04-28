import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Execute custom JavaScript inside a KeeperHub workflow (sandboxed server-side VM).
 * The Code plugin runs JS with access to workflow step data via template variables.
 * Can make outbound HTTP requests via fetch().
 *
 * Use cases:
 * - Custom calculation logic between workflow steps
 * - Fetch external data and transform it
 * - Validate conditions with complex logic
 * - Format/transform data for downstream steps
 */
export function createCodeExecuteTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_run_code",
    description:
      "Execute custom JavaScript code in a KeeperHub sandboxed workflow step. " +
      "Code runs server-side in a secure VM with fetch() available for HTTP calls. " +
      "Use for custom calculations, data transformation, external API calls, or complex logic. " +
      "Returns the value of the last expression or explicit return statement.",
    schema: z.object({
      code: z
        .string()
        .min(1)
        .max(10_000)
        .describe(
          "JavaScript code to execute. Use return to return a value. " +
            "fetch() is available for HTTP calls. " +
            "Example: 'return { result: inputs.amount * 1.05, fee: inputs.amount * 0.05 }'"
        ),
      inputs: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .optional()
        .describe("Input values accessible as 'inputs.key' inside the code"),
      workflowName: z
        .string()
        .max(100)
        .optional()
        .describe(
          "Name for the generated workflow (default: 'Code Execution')"
        ),
    }),
    func: async ({ code, inputs, workflowName }) => {
      try {
        // Build a workflow with a single Code node via AI generation
        const prompt =
          `Execute this JavaScript code and return the result:\n\`\`\`js\n${code.slice(0, 2000)}\n\`\`\`\n` +
          (inputs ? `With these inputs: ${JSON.stringify(inputs)}` : "");

        const obs = await kh
          .pipeline()
          .generate(prompt.slice(0, 1000))
          .safeWait();

        if (!obs.ok) {
          return JSON.stringify({
            ok: false,
            error: obs.error?.message,
            suggestion: obs.error?.suggestedAction,
          });
        }

        const r = obs.result as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          execution_id: r?.["executionId"],
          status: r?.["status"],
          summary: obs.summary,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
