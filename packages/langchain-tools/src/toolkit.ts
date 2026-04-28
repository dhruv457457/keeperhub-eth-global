import type { StructuredToolInterface } from "@langchain/core/tools";
import type { KeeperHubConfig } from "keeperhub-sdk";
import { KeeperHub } from "keeperhub-sdk";
import {
  createGetActionSchemaTool,
  createSearchActionsTool,
} from "./tools/action-schema.js";
import { createAjnaTool } from "./tools/ajna.js";
import {
  createChainlinkCcipTool,
  createChainlinkPriceFeedTool,
} from "./tools/chainlink.js";
import { createCheckAndExecuteTool } from "./tools/check-and-execute.js";
import { createCheckExecutionTool } from "./tools/check-execution.js";
import { createCodeExecuteTool } from "./tools/code-execute.js";
import { createContractCallTool } from "./tools/contract-call.js";
import {
  createEnsLookupTool,
  createEnsResolveTool,
  createEnsTextRecordTool,
} from "./tools/ens.js";
import { createEstimateGasTool } from "./tools/estimate-gas.js";
import { createExecuteWorkflowTool } from "./tools/execute-workflow.js";
import { createFetchAbiTool } from "./tools/fetch-abi.js";
import { createGenerateWorkflowTool } from "./tools/generate-workflow.js";
import { createListChainsTool } from "./tools/list-chains.js";
import { createListWorkflowsTool } from "./tools/list-workflows.js";
import { createMathAggregateTool } from "./tools/math-aggregate.js";
import {
  createListIntegrationsTool,
  createNotifyTool,
} from "./tools/notify.js";
import { createPayAndRunTool } from "./tools/pay-and-run.js";
import {
  createListProtocolsTool,
  createProtocolActionTool,
} from "./tools/protocol-action.js";
import { createProvisionWalletTool } from "./tools/provision-wallet.js";
import { createRegisterAgentTool } from "./tools/register-agent.js";
import { createTransferTool } from "./tools/transfer.js";
import { createWalletBalanceTool } from "./tools/wallet-balance.js";
import {
  createWorkflowGoLiveTool,
  createWorkflowMigrateTool,
  createWorkflowVersionTool,
} from "./tools/workflow-migrate.js";

export type ToolKey =
  | "list_chains"
  | "fetch_abi"
  | "transfer"
  | "contract_call"
  | "check_and_execute"
  | "estimate_gas"
  | "list_workflows"
  | "execute"
  | "generate"
  | "check"
  | "protocol_action"
  | "list_protocols"
  | "pay_and_run"
  | "register_agent"
  | "wallet_balance"
  | "provision_wallet"
  | "notify"
  | "list_integrations"
  | "chainlink_ccip"
  | "chainlink_price"
  | "ajna"
  | "run_code"
  | "math_aggregate"
  | "get_action_schema"
  | "search_actions"
  | "workflow_version"
  | "workflow_migrate"
  | "workflow_publish"
  | "ens_resolve"
  | "ens_text_record"
  | "ens_lookup";

export interface KeeperHubToolkitOptions extends KeeperHubConfig {
  /**
   * Which tools to include. Defaults to all tools.
   * Use this to limit what the agent can do.
   *
   * @default all 10 tools
   */
  tools?: ToolKey[];
}

const ALL_TOOLS: ToolKey[] = [
  // Chain & contract discovery
  "list_chains",
  "fetch_abi",
  // Web3 execution
  "transfer",
  "contract_call",
  "check_and_execute",
  "estimate_gas",
  // Workflow automation
  "list_workflows",
  "execute",
  "generate",
  "check",
  // DeFi protocols
  "protocol_action",
  "list_protocols",
  // Payments (x402 / MPP)
  "pay_and_run",
  // Agent identity & wallet
  "register_agent",
  "wallet_balance",
  "provision_wallet",
  // Notifications
  "notify",
  "list_integrations",
  // Chainlink
  "chainlink_ccip",
  "chainlink_price",
  // Ajna
  "ajna",
  // Utility plugins
  "run_code",
  "math_aggregate",
  // Action schema discovery
  "get_action_schema",
  "search_actions",
  // Workflow versioning & migration
  "workflow_version",
  "workflow_migrate",
  "workflow_publish",
  // ENS integration
  "ens_resolve",
  "ens_text_record",
  "ens_lookup",
];

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
    this.enabledTools = new Set(tools ?? ALL_TOOLS);
  }

  getTools(): StructuredToolInterface[] {
    const all: Array<[ToolKey, () => StructuredToolInterface]> = [
      // Chain & contract
      ["list_chains", () => createListChainsTool(this.kh)],
      ["fetch_abi", () => createFetchAbiTool(this.kh)],
      // Web3
      ["transfer", () => createTransferTool(this.kh)],
      ["contract_call", () => createContractCallTool(this.kh)],
      ["check_and_execute", () => createCheckAndExecuteTool(this.kh)],
      ["estimate_gas", () => createEstimateGasTool(this.kh)],
      // Workflows
      ["list_workflows", () => createListWorkflowsTool(this.kh)],
      ["execute", () => createExecuteWorkflowTool(this.kh)],
      ["generate", () => createGenerateWorkflowTool(this.kh)],
      ["check", () => createCheckExecutionTool(this.kh)],
      // DeFi protocols
      ["protocol_action", () => createProtocolActionTool(this.kh)],
      ["list_protocols", () => createListProtocolsTool(this.kh)],
      // Payments
      ["pay_and_run", () => createPayAndRunTool(this.kh)],
      // Agent identity & wallet
      ["register_agent", () => createRegisterAgentTool(this.kh)],
      ["wallet_balance", () => createWalletBalanceTool(this.kh)],
      ["provision_wallet", () => createProvisionWalletTool(this.kh)],
      // Notifications
      ["notify", () => createNotifyTool(this.kh)],
      ["list_integrations", () => createListIntegrationsTool(this.kh)],
      // Chainlink
      ["chainlink_ccip", () => createChainlinkCcipTool(this.kh)],
      ["chainlink_price", () => createChainlinkPriceFeedTool(this.kh)],
      // Ajna
      ["ajna", () => createAjnaTool(this.kh)],
      // Utility plugins
      ["run_code", () => createCodeExecuteTool(this.kh)],
      ["math_aggregate", () => createMathAggregateTool(this.kh)],
      // Action schema discovery
      ["get_action_schema", () => createGetActionSchemaTool(this.kh)],
      ["search_actions", () => createSearchActionsTool(this.kh)],
      // Workflow versioning & migration
      ["workflow_version", () => createWorkflowVersionTool(this.kh)],
      ["workflow_migrate", () => createWorkflowMigrateTool(this.kh)],
      ["workflow_publish", () => createWorkflowGoLiveTool(this.kh)],
      // ENS
      ["ens_resolve", () => createEnsResolveTool(this.kh)],
      ["ens_text_record", () => createEnsTextRecordTool(this.kh)],
      ["ens_lookup", () => createEnsLookupTool(this.kh)],
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
      "- keeperhub_list_chains: Discover supported blockchain networks and chain IDs",
      "- keeperhub_fetch_contract_abi: Get verified ABI for any contract (auto-detects proxies)",
      "- keeperhub_transfer: Send ETH or ERC-20 tokens to an address",
      "- keeperhub_contract_call: Read (view) or write (state-changing) any contract function",
      "- keeperhub_check_and_execute: Atomic condition check + transaction (no race conditions)",
      "- keeperhub_estimate_gas: Estimate gas cost before submitting a write tx",
      "- list_keeperhub_workflows: Discover available workflow automations",
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
            s.replace(/[`[\]{}\\]/g, "").slice(0, 80);
          lines.push(
            "",
            `Available workflows (${workflows.length}):`,
            ...workflows
              .slice(0, 10)
              .map(
                (wf) =>
                  `- ${sanitize(wf.name)} [${wf.id}]${wf.description ? `: ${sanitize(wf.description)}` : ""}`
              )
          );
        }
      } catch {
        // skip if API unavailable
      }
    }

    return lines.join("\n");
  }
}
