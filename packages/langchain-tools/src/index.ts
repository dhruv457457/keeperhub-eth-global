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

export type { KeeperHubToolkitOptions, ToolKey } from "./toolkit.js";
export { KeeperHubToolkit } from "./toolkit.js";
// Action schema discovery tools
export {
  createGetActionSchemaTool,
  createSearchActionsTool,
} from "./tools/action-schema.js";
// Ajna protocol tool
export { createAjnaTool } from "./tools/ajna.js";
// Chainlink tools
export {
  createChainlinkCcipTool,
  createChainlinkPriceFeedTool,
} from "./tools/chainlink.js";
export { createCheckAndExecuteTool } from "./tools/check-and-execute.js";
export { createCheckExecutionTool } from "./tools/check-execution.js";
// Utility plugin tools
export { createCodeExecuteTool } from "./tools/code-execute.js";
export { createContractCallTool } from "./tools/contract-call.js";
// ENS tools
export {
  createEnsLookupTool,
  createEnsResolveTool,
  createEnsTextRecordTool,
} from "./tools/ens.js";
export { createEstimateGasTool } from "./tools/estimate-gas.js";
export { createExecuteWorkflowTool } from "./tools/execute-workflow.js";
export { createFetchAbiTool } from "./tools/fetch-abi.js";
export { createGenerateWorkflowTool } from "./tools/generate-workflow.js";
// Chain & contract tools
export { createListChainsTool } from "./tools/list-chains.js";
// Token address lookup (resolve symbol → 0x address before generating workflows)
export { createTokenAddressTool } from "./tools/token-address.js";
// Workflow tools
export { createListWorkflowsTool } from "./tools/list-workflows.js";
export { createMathAggregateTool } from "./tools/math-aggregate.js";

// Notification tools
export {
  createListIntegrationsTool,
  createNotifyTool,
} from "./tools/notify.js";
// Payment tools (x402 / MPP)
export { createPayAndRunTool } from "./tools/pay-and-run.js";
// DeFi protocol tools
export {
  createListProtocolsTool,
  createProtocolActionTool,
} from "./tools/protocol-action.js";
export { createProvisionWalletTool } from "./tools/provision-wallet.js";
// Agent identity & wallet tools
export { createRegisterAgentTool } from "./tools/register-agent.js";
// Web3 execution tools
export { createTransferTool } from "./tools/transfer.js";
export { createWalletBalanceTool } from "./tools/wallet-balance.js";
// Workflow versioning & migration tools
export {
  createWorkflowGoLiveTool,
  createWorkflowMigrateTool,
  createWorkflowVersionTool,
} from "./tools/workflow-migrate.js";
