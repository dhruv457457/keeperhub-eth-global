import type { StructuredToolInterface } from "@langchain/core/tools";
import type { KeeperHubConfig } from "keeperhub-sdk";
import { KeeperHub } from "keeperhub-sdk";
import { createCheckExecutionTool } from "./tools/check-execution.js";
import { createExecuteWorkflowTool } from "./tools/execute-workflow.js";
import { createGenerateWorkflowTool } from "./tools/generate-workflow.js";
import { createListWorkflowsTool } from "./tools/list-workflows.js";

export interface KeeperHubToolkitOptions extends KeeperHubConfig {
  /**
   * Which tools to include. Defaults to all tools.
   * Use this to limit what the agent can do.
   *
   * @default ["execute", "generate", "list", "check"]
   */
  tools?: Array<"execute" | "generate" | "list" | "check">;
}

/**
 * KeeperHub LangChain Toolkit
 *
 * Bundles all KeeperHub tools for use with LangChain agents.
 *
 * @example
 * // Full toolkit
 * const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
 * const agent = await createReactAgent({ llm, tools: toolkit.getTools() });
 *
 * @example
 * // Read-only (no execution)
 * const toolkit = new KeeperHubToolkit({
 *   apiKey: key,
 *   tools: ["list", "check"],
 * });
 *
 * @example
 * // Inject system context about available workflows
 * const tools = toolkit.getTools();
 * const prompt = await toolkit.buildSystemPrompt();
 * const agent = await createReactAgent({
 *   llm,
 *   tools,
 *   messageModifier: prompt,
 * });
 */
export class KeeperHubToolkit {
  readonly kh: KeeperHub;
  private readonly enabledTools: Set<string>;

  constructor(options: KeeperHubToolkitOptions = {}) {
    const { tools, ...config } = options;
    this.kh = new KeeperHub(config);
    this.enabledTools = new Set(
      tools ?? ["execute", "generate", "list", "check"]
    );
  }

  getTools(): StructuredToolInterface[] {
    const all: Array<[string, () => StructuredToolInterface]> = [
      ["list", () => createListWorkflowsTool(this.kh)],
      ["execute", () => createExecuteWorkflowTool(this.kh)],
      ["generate", () => createGenerateWorkflowTool(this.kh)],
      ["check", () => createCheckExecutionTool(this.kh)],
    ];

    return all
      .filter(([key]) => this.enabledTools.has(key))
      .map(([, factory]) => factory());
  }

  /**
   * Generate a system prompt fragment that describes KeeperHub capabilities.
   * Optionally injects a live list of the user's workflows.
   *
   * @example
   * const systemPrompt = await toolkit.buildSystemPrompt({ includeWorkflows: true });
   * // Use as: new SystemMessage(systemPrompt)
   */
  async buildSystemPrompt(
    options: { includeWorkflows?: boolean } = {}
  ): Promise<string> {
    // Pull the structured capability manifest from the SDK rather than
    // maintaining a hand-written list that would drift over time
    const capabilities = this.kh.capabilities();

    const lines = [
      "You have access to KeeperHub — an onchain workflow automation platform.",
      "You can execute blockchain transactions, DeFi operations, and token transfers through KeeperHub workflows.",
      "",
      "Available tools:",
      "- list_keeperhub_workflows: Discover available automations",
      "- execute_keeperhub_workflow: Run an existing workflow with optional runtime inputs",
      "- generate_keeperhub_workflow: Create a new workflow from a natural-language description",
      "- check_keeperhub_execution: Monitor execution status and logs",
      "",
      "Capabilities (use these to decide which tool to call):",
      ...capabilities.map(
        (cap) => `- ${cap.name} [${cap.category}]: ${cap.description}`
      ),
      "",
      "When a user asks to perform an onchain action:",
      "1. First list workflows to see if one already exists",
      "2. If not, generate one from their description",
      "3. Execute it with the appropriate inputs",
      "4. Check status if they ask about progress",
      "5. If execute returns ok=false with isRetryable=true, retry once before giving up",
      "6. Always surface the summary field to the user — it is written for human consumption",
    ];

    if (options.includeWorkflows !== false) {
      try {
        const workflows = await this.kh.workflows.list();
        if (workflows.length > 0) {
          // Sanitize names/descriptions before injecting into system prompt
          // to prevent prompt injection via malicious workflow metadata
          const sanitize = (s: string) =>
            s.replace(/[`\[\]{}\\]/g, "").slice(0, 80);
          lines.push(
            "",
            `Available workflows (${workflows.length}):`,
            ...workflows
              .slice(0, 10)
              .map((wf) => `- ${sanitize(wf.name)} [${wf.id}]${wf.description ? `: ${sanitize(wf.description)}` : ""}`)
          );
        }
      } catch {
        // skip if API unavailable
      }
    }

    return lines.join("\n");
  }
}
