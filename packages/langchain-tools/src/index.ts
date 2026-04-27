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
export type { KeeperHubToolkitOptions, ToolKey } from "./toolkit.js";

// Chain & contract tools
export { createListChainsTool } from "./tools/list-chains.js";
export { createFetchAbiTool } from "./tools/fetch-abi.js";

// Web3 execution tools
export { createTransferTool } from "./tools/transfer.js";
export { createContractCallTool } from "./tools/contract-call.js";
export { createCheckAndExecuteTool } from "./tools/check-and-execute.js";
export { createEstimateGasTool } from "./tools/estimate-gas.js";

// Workflow tools
export { createListWorkflowsTool } from "./tools/list-workflows.js";
export { createExecuteWorkflowTool } from "./tools/execute-workflow.js";
export { createGenerateWorkflowTool } from "./tools/generate-workflow.js";
export { createCheckExecutionTool } from "./tools/check-execution.js";

// DeFi protocol tools
export { createProtocolActionTool, createListProtocolsTool } from "./tools/protocol-action.js";

// Payment tools (x402 / MPP)
export { createPayAndRunTool } from "./tools/pay-and-run.js";

// Agent identity & wallet tools
export { createRegisterAgentTool } from "./tools/register-agent.js";
export { createWalletBalanceTool } from "./tools/wallet-balance.js";
export { createProvisionWalletTool } from "./tools/provision-wallet.js";

// Notification tools
export { createNotifyTool, createListIntegrationsTool } from "./tools/notify.js";

// Chainlink tools
export { createChainlinkCcipTool, createChainlinkPriceFeedTool } from "./tools/chainlink.js";

// Ajna protocol tool
export { createAjnaTool } from "./tools/ajna.js";

// Utility plugin tools
export { createCodeExecuteTool } from "./tools/code-execute.js";
export { createMathAggregateTool } from "./tools/math-aggregate.js";

// Action schema discovery tools
export { createGetActionSchemaTool, createSearchActionsTool } from "./tools/action-schema.js";

// Workflow versioning & migration tools
export { createWorkflowVersionTool, createWorkflowMigrateTool, createWorkflowGoLiveTool } from "./tools/workflow-migrate.js";
