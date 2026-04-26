/**
 * @keeperhub/langchain
 *
 * KeeperHub tools for LangChain — use onchain workflow automation inside any agent.
 *
 * @example
 * // Full toolkit (recommended)
 * import { KeeperHubToolkit } from "@keeperhub/langchain";
 * const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
 * const agent = await createReactAgent({ llm, tools: toolkit.getTools() });
 *
 * @example
 * // Individual tools
 * import { createExecuteWorkflowTool, createGenerateWorkflowTool } from "@keeperhub/langchain";
 * import { KeeperHub } from "keeperhub-sdk";
 * const kh = new KeeperHub({ apiKey: "..." });
 * const tools = [createExecuteWorkflowTool(kh), createGenerateWorkflowTool(kh)];
 */
export { KeeperHubToolkit } from "./toolkit.js";
export type { KeeperHubToolkitOptions } from "./toolkit.js";

// Individual tool factories for custom agent assembly
export { createCheckExecutionTool } from "./tools/check-execution.js";
export { createExecuteWorkflowTool } from "./tools/execute-workflow.js";
export { createGenerateWorkflowTool } from "./tools/generate-workflow.js";
export { createListWorkflowsTool } from "./tools/list-workflows.js";
