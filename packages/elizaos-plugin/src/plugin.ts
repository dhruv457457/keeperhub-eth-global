import type { Plugin } from "@elizaos/core";
import { KeeperHub } from "keeperhub-sdk";
import type { KeeperHubConfig } from "keeperhub-sdk";
import { createCheckAndExecuteAction } from "./actions/check-and-execute.js";
import { createCheckExecutionAction } from "./actions/check-execution.js";
import { createContractReadAction } from "./actions/contract-read.js";
import type { ExecuteWorkflowActionOptions } from "./actions/execute-workflow.js";
import { createExecuteWorkflowAction } from "./actions/execute-workflow.js";
import { createEstimateGasAction } from "./actions/estimate-gas.js";
import type { GenerateWorkflowActionOptions } from "./actions/generate-workflow.js";
import { createGenerateWorkflowAction } from "./actions/generate-workflow.js";
import { createListChainsAction } from "./actions/list-chains.js";
import { createListWorkflowsAction } from "./actions/list-workflows.js";
import { createChainlinkCcipAction } from "./actions/chainlink-ccip.js";
import { createNotifyAction } from "./actions/notify.js";
import { createPayAndRunAction } from "./actions/pay-and-run.js";
import { createProtocolActionElizaAction } from "./actions/protocol-action.js";
import { createRunCodeAction } from "./actions/run-code.js";
import { createActionSchemaAction } from "./actions/action-schema.js";
import { createWorkflowVersionAction, createWorkflowMigrateAction } from "./actions/workflow-version.js";
import { createRegisterAgentAction } from "./actions/register-agent.js";
import { createTransferAction } from "./actions/transfer.js";
import { createExecutionSuccessEvaluator } from "./evaluators/execution-success.js";
import { createWalletProvider } from "./providers/wallet-provider.js";
import { createWorkflowsProvider } from "./providers/workflows-provider.js";

export interface KeeperHubPluginOptions extends KeeperHubConfig {
  /**
   * Whether to include the wallet balance context provider.
   * @default true
   */
  enableWalletProvider?: boolean;

  /**
   * Whether to include the workflows context provider.
   * @default true
   */
  enableWorkflowsProvider?: boolean;

  /**
   * Whether to include direct web3 actions (transfer, contract read, gas estimate,
   * check-and-execute, list chains). Disable if you only want workflow actions.
   * @default true
   */
  enableWeb3Actions?: boolean;

  /**
   * Whether to include the execution success evaluator.
   * The evaluator polls execution IDs found in conversation and stores outcomes
   * in agent memory for accurate follow-up answers.
   * @default true
   */
  enableExecutionEvaluator?: boolean;

  /**
   * Allowlist of workflow IDs that the agent is permitted to execute.
   * If omitted, the agent can execute ANY workflow it finds in a message.
   *
   * ⚠️  Recommended for production: always set an explicit allowlist to prevent
   * users from injecting arbitrary workflow IDs through chat messages.
   *
   * @example
   * allowedWorkflowIds: ["wf_compound_usdc", "wf_rebalance_portfolio"]
   */
  allowedWorkflowIds?: string[];
}

/**
 * KeeperHub ElizaOS Plugin
 *
 * Gives any ElizaOS agent the ability to:
 * - List, execute, and generate KeeperHub workflows
 * - Check execution status + logs
 * - Register itself on-chain via ERC-8004
 * - Access its KeeperHub wallet context
 *
 * @example
 * // Minimal setup
 * import { createKeeperHubPlugin } from "@keeperhub/elizaos";
 *
 * const agent = new AgentRuntime({
 *   character,
 *   plugins: [
 *     createKeeperHubPlugin({ apiKey: process.env.KEEPERHUB_API_KEY }),
 *   ],
 * });
 *
 * @example
 * // Production setup — allowlist + agent context for per-session observability
 * createKeeperHubPlugin({
 *   apiKey: process.env.KEEPERHUB_API_KEY,
 *   allowedWorkflowIds: ["wf_compound_usdc", "wf_rebalance"],
 *   agentContext: {
 *     sessionId: runtime.agentId,      // ties all API calls to this agent instance
 *     goal: character.bio[0],          // surfaces the agent's goal in KeeperHub logs
 *   },
 * });
 */
export function createKeeperHubPlugin(
  options: KeeperHubPluginOptions = {}
): Plugin {
  const {
    enableWalletProvider = true,
    enableWorkflowsProvider = true,
    enableWeb3Actions = true,
    enableExecutionEvaluator = true,
    allowedWorkflowIds,
    ...config
  } = options;

  // Build the KeeperHub client — falls back to KEEPERHUB_API_KEY env var
  const kh = new KeeperHub(config);

  const allowedIds = allowedWorkflowIds ? new Set(allowedWorkflowIds) : undefined;

  const executeOptions: ExecuteWorkflowActionOptions = {
    allowedWorkflowIds: allowedIds,
  };

  // Pass the same allowlist to the generate action so that the generate-and-execute
  // path is blocked when an allowlist is configured — generated workflow IDs won't
  // be in the list, so auto-executing them would bypass the access control entirely.
  const generateOptions: GenerateWorkflowActionOptions = {
    allowedWorkflowIds: allowedIds,
  };

  // ── Workflow actions (always included) ─────────────────────────────────────
  const actions = [
    createListWorkflowsAction(kh),
    createExecuteWorkflowAction(kh, executeOptions),
    createGenerateWorkflowAction(kh, generateOptions),
    createCheckExecutionAction(kh),
    createRegisterAgentAction(kh),
    // ── Direct web3 actions (opt-out with enableWeb3Actions: false) ─────────
    ...(enableWeb3Actions
      ? [
          createListChainsAction(kh),
          createTransferAction(kh),
          createContractReadAction(kh),
          createEstimateGasAction(kh),
          createCheckAndExecuteAction(kh),
          createProtocolActionElizaAction(kh),
          createPayAndRunAction(kh),
          createNotifyAction(kh),
          createChainlinkCcipAction(kh),
          createRunCodeAction(kh),
          createActionSchemaAction(kh),
          createWorkflowVersionAction(kh),
          createWorkflowMigrateAction(kh),
        ]
      : []),
  ];

  const providers = [
    enableWorkflowsProvider ? createWorkflowsProvider(kh) : null,
    enableWalletProvider ? createWalletProvider(kh) : null,
  ].filter((p): p is NonNullable<typeof p> => p !== null);

  const evaluators = enableExecutionEvaluator
    ? [createExecutionSuccessEvaluator(kh)]
    : [];

  return {
    name: "@keeperhub/elizaos",
    description:
      "KeeperHub integration for ElizaOS — onchain workflow automation, direct web3 actions, " +
      "agent identity (ERC-8004), and DeFi protocol execution",
    actions,
    providers,
    evaluators,
    services: [],
  };
}
