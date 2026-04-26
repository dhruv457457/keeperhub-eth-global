/**
 * @keeperhub/elizaos
 *
 * KeeperHub plugin for ElizaOS — onchain workflow automation for AI agents.
 *
 * @example
 * import { createKeeperHubPlugin } from "@keeperhub/elizaos";
 *
 * const plugin = createKeeperHubPlugin({
 *   apiKey: process.env.KEEPERHUB_API_KEY,
 * });
 *
 * // In your AgentRuntime:
 * const runtime = new AgentRuntime({
 *   character,
 *   plugins: [plugin],
 * });
 */
export { createKeeperHubPlugin } from "./plugin.js";
export type { KeeperHubPluginOptions } from "./plugin.js";

// Re-export individual action/provider factories for custom assembly
export { createCheckExecutionAction } from "./actions/check-execution.js";
export { createExecuteWorkflowAction } from "./actions/execute-workflow.js";
export { createGenerateWorkflowAction } from "./actions/generate-workflow.js";
export { createListWorkflowsAction } from "./actions/list-workflows.js";
export { createRegisterAgentAction } from "./actions/register-agent.js";
export { createWalletProvider } from "./providers/wallet-provider.js";
export { createWorkflowsProvider } from "./providers/workflows-provider.js";
