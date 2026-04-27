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

// Re-export individual action/provider/evaluator factories for custom assembly

// Workflow actions
export { createCheckExecutionAction } from "./actions/check-execution.js";
export { createExecuteWorkflowAction } from "./actions/execute-workflow.js";
export { createGenerateWorkflowAction } from "./actions/generate-workflow.js";
export { createListWorkflowsAction } from "./actions/list-workflows.js";
export { createRegisterAgentAction } from "./actions/register-agent.js";

// Direct web3 actions
export { createCheckAndExecuteAction } from "./actions/check-and-execute.js";
export { createContractReadAction } from "./actions/contract-read.js";
export { createEstimateGasAction } from "./actions/estimate-gas.js";
export { createListChainsAction } from "./actions/list-chains.js";
export { createTransferAction } from "./actions/transfer.js";

// DeFi protocol actions
export { createProtocolActionElizaAction } from "./actions/protocol-action.js";

// Payment actions (x402 / MPP)
export { createPayAndRunAction } from "./actions/pay-and-run.js";

// Notification actions
export { createNotifyAction } from "./actions/notify.js";

// Chainlink CCIP action
export { createChainlinkCcipAction } from "./actions/chainlink-ccip.js";

// Code & Math actions
export { createRunCodeAction } from "./actions/run-code.js";

// Action schema discovery
export { createActionSchemaAction } from "./actions/action-schema.js";

// Workflow versioning & migration
export { createWorkflowVersionAction, createWorkflowMigrateAction } from "./actions/workflow-version.js";

// Context providers
export { createWalletProvider } from "./providers/wallet-provider.js";
export { createWorkflowsProvider } from "./providers/workflows-provider.js";

// Evaluators
export { createExecutionSuccessEvaluator } from "./evaluators/execution-success.js";
