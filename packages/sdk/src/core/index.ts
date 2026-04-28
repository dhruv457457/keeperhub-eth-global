export { AnalyticsStream } from "./analytics.js";
export type { WorkflowBuilderInput } from "./builder.js";
export { triggers, WorkflowBuilder } from "./builder.js";
export { ConditionDefinition, NodeReference, ref, when } from "./conditions.js";
export {
  KeeperHubAuthError,
  KeeperHubError,
  KeeperHubExecutionError,
  KeeperHubExecutionTimeoutError,
  KeeperHubNotFoundError,
  KeeperHubPaymentPolicyError,
  KeeperHubPaymentRequiredError,
  KeeperHubRateLimitError,
  KeeperHubTimeoutError,
  KeeperHubValidationError,
} from "./errors.js";
export { EventSubscription, EventsModule } from "./events.js";
export { ExecutionHandle, ExecutionStream } from "./executions.js";
export { WorkflowPipeline } from "./pipeline.js";
export type { WebhookPayload } from "./webhooks.js";
export {
  handleWebhook,
  parseWebhookPayload,
  verifyWebhookSignature,
} from "./webhooks.js";

import type {
  AgentCapability,
  AgentObservation,
  KeeperHubConfig,
  SafeRunOptions,
  WorkflowRunResult,
} from "../types/index.js";
import { AddressBookModule } from "./address-book.js";
import { AgentModule } from "./agent.js";
import { AnalyticsModule } from "./analytics.js";
import { ApiKeysModule } from "./api-keys.js";
import type { WorkflowBuilderInput } from "./builder.js";
import { WorkflowBuilder } from "./builder.js";
import { ChainsModule } from "./chains.js";
import { HttpClient } from "./client.js";
import { DebugModule } from "./debug.js";
import { EarningsModule } from "./earnings.js";
import { KeeperHubError } from "./errors.js";
import { EventsModule } from "./events.js";
import { ExecutionsModule } from "./executions.js";
import { IntegrationsModule } from "./integrations.js";
import { McpModule } from "./mcp.js";
import { PaymentsModule } from "./payments.js";
import { WorkflowPipeline } from "./pipeline.js";
import { ProjectsModule } from "./projects.js";
import { ProtocolsModule } from "./protocols.js";
import { TagsModule } from "./tags.js";
import { TemplatesModule } from "./templates.js";
import { WalletModule } from "./wallet.js";
import { Web3Module } from "./web3.js";
import { WorkflowsModule } from "./workflows.js";

export type {
  AgentCapability,
  AgentObservation,
  KeeperHubConfig,
} from "../types/index.js";

export class KeeperHub {
  /** @internal */
  readonly _http: HttpClient;

  /** Workflow CRUD + execution + AI generation */
  readonly workflows: WorkflowsModule;

  /** Poll execution status, get logs, cancel */
  readonly executions: ExecutionsModule;

  /** Transfer tokens, call contracts, check-and-execute */
  readonly web3: Web3Module;

  /** DeFi protocol actions (Aave, Lido, Uniswap, ...) */
  readonly protocols: ProtocolsModule;

  /** Usage analytics, gas credits, time-series */
  readonly analytics: AnalyticsModule;

  /** Discord, SendGrid, webhook integrations */
  readonly integrations: IntegrationsModule;

  /** Managed wallet balances + RPC preferences */
  readonly wallet: WalletModule;

  /** Supported blockchain networks */
  readonly chains: ChainsModule;

  /** Workflow projects (folders) */
  readonly projects: ProjectsModule;

  /** Workflow tags */
  readonly tags: TagsModule;

  /** Saved wallet address book */
  readonly addressBook: AddressBookModule;

  /** Programmatic API key management */
  readonly apiKeys: ApiKeysModule;

  /** Public workflow template library */
  readonly templates: TemplatesModule;

  /** ERC-8004 on-chain agent identity */
  readonly agent: AgentModule;

  /**
   * Listed workflow catalog, x402 payment execution, preflight cost estimates,
   * payment history and balance.
   */
  readonly payments: PaymentsModule;

  /** Execution tracing, replay, and failure summaries */
  readonly debug: DebugModule;

  /**
   * AI-facing schema catalog and OpenAPI spec discovery.
   * To search and execute listed workflows use kh.payments instead.
   */
  readonly mcp: McpModule;

  /** Real-time execution event subscriptions */
  readonly events: EventsModule;

  /** Creator earnings — revenue from paid listed workflows */
  readonly earnings: EarningsModule;

  constructor(config: KeeperHubConfig) {
    this._http = new HttpClient(config);
    this.workflows = new WorkflowsModule(this._http);
    this.executions = new ExecutionsModule(this._http);
    this.web3 = new Web3Module(this._http);
    this.protocols = new ProtocolsModule(this._http);
    this.analytics = new AnalyticsModule(this._http);
    this.integrations = new IntegrationsModule(this._http);
    this.wallet = new WalletModule(this._http);
    this.chains = new ChainsModule(this._http);
    this.projects = new ProjectsModule(this._http);
    this.tags = new TagsModule(this._http);
    this.addressBook = new AddressBookModule(this._http);
    this.apiKeys = new ApiKeysModule(this._http);
    this.agent = new AgentModule(this._http);
    this.payments = new PaymentsModule(this._http);
    this.debug = new DebugModule(this._http);
    this.mcp = new McpModule(this._http);
    this.earnings = new EarningsModule(this._http);
    this.events = new EventsModule(this.analytics, this.workflows);
    // templates depends on workflows for .use().override().run()
    this.templates = new TemplatesModule(this._http, this.workflows);
  }

  /**
   * Create a workflow using the fluent builder API.
   * The returned builder has .save() and .run() to persist and execute directly.
   *
   * @example
   * const handle = await kh.workflowBuilder({ name: "Weekly compound" })
   *   .trigger(triggers.schedule("0 9 * * 1"))
   *   .step({ id: "s1", label: "Compound USDC", actionType: "AaveSupply", config: {} })
   *   .run();
   */
  workflowBuilder(input: WorkflowBuilderInput): WorkflowBuilder {
    return new WorkflowBuilder(input, this.workflows);
  }

  /**
   * Start a pipeline — the primary way to execute, generate, and pay for workflows.
   *
   * @example
   * // Run an existing workflow
   * const result = await kh.pipeline().workflow("wf_123").wait();
   *
   * // Generate + run from a prompt
   * const result = await kh.pipeline()
   *   .generate("Compound my Aave USDC rewards every Monday")
   *   .pay({ budget: "0.10" })
   *   .wait();
   */
  pipeline(): WorkflowPipeline {
    return new WorkflowPipeline(this.workflows, this.payments, this.executions);
  }

  /**
   * Convenience shorthand for `kh.workflows.run()`.
   * Use `kh.pipeline()` for retry, payment guardrails, and AI generation.
   * Use `kh.tryRun()` for agent loops that must not throw.
   */
  run(
    workflowId: string,
    options?: SafeRunOptions
  ): Promise<WorkflowRunResult> {
    return this.workflows.run(workflowId, options);
  }

  /**
   * Never-throws variant of `run()` — always returns an `AgentObservation`.
   * Agents should prefer this over `run()` to avoid crashing their loop on errors.
   *
   * @example
   * const obs = await kh.tryRun("wf_123", { verbose: true });
   * if (!obs.ok) console.log(obs.summary); // LLM-ready error context
   */
  async tryRun(
    workflowId: string,
    options?: SafeRunOptions
  ): Promise<AgentObservation<WorkflowRunResult>> {
    try {
      const result = await this.workflows.run(workflowId, options);
      const status = result.status;
      const attemptStr =
        result.attempts > 1 ? ` after ${result.attempts} attempts` : "";
      return {
        ok: true,
        action: "workflows.run",
        result,
        summary: `Workflow ${workflowId} ${status}${attemptStr}. Execution ID: ${result.executionId}.`,
      };
    } catch (error) {
      const isKhError = error instanceof KeeperHubError;
      const message = error instanceof Error ? error.message : String(error);
      const code = isKhError ? (error as KeeperHubError).code : "UNKNOWN";
      const isRetryable = isKhError
        ? (error as KeeperHubError).isRetryable
        : false;
      const suggestedAction = isKhError
        ? (error as KeeperHubError).suggestedAction
        : "Unexpected error.";
      return {
        ok: false,
        action: "workflows.run",
        error: { message, code, isRetryable, suggestedAction },
        summary: `Workflow ${workflowId} failed: ${message} — ${suggestedAction}`,
      };
    }
  }

  /**
   * Returns a structured manifest of everything this SDK instance can do.
   * Designed for LLM tool-selection prompts — paste `kh.capabilities()` into
   * your system prompt or use it to generate tool definitions.
   *
   * @example
   * const tools = kh.capabilities();
   * const systemPrompt = tools.map(t =>
   *   `- ${t.name}: ${t.description}\n  Example: ${t.example}`
   * ).join("\n");
   */
  capabilities(): AgentCapability[] {
    return [
      {
        name: "execute_workflow",
        description:
          "Execute an existing workflow by ID and wait for completion.",
        parameters: { workflowId: "string", input: "object (optional)" },
        example: "await kh.pipeline().workflow('wf_123').wait()",
        category: "workflows",
      },
      {
        name: "execute_workflow_safe",
        description:
          "Execute a workflow and get a structured observation — never throws, safe for agent loops.",
        parameters: { workflowId: "string" },
        example:
          "const obs = await kh.pipeline().workflow('wf_123').safeWait()",
        category: "workflows",
      },
      {
        name: "generate_and_run_workflow",
        description:
          "Generate a new workflow from a natural-language prompt, save it, and execute it.",
        parameters: {
          prompt: "string (max 1000 chars)",
          context: "string (optional)",
        },
        example:
          "await kh.pipeline().generate('Compound my Aave USDC rewards weekly').wait()",
        category: "workflows",
      },
      {
        name: "generate_and_run_ephemeral",
        description:
          "Generate a workflow, run it once, then auto-delete it. Use when exploring options.",
        parameters: { prompt: "string" },
        example:
          "await kh.pipeline().generate('Check ETH price').ephemeral().safeWait()",
        category: "workflows",
      },
      {
        name: "use_template",
        description:
          "Deploy a workflow from a public template and execute it with custom inputs.",
        parameters: { templateId: "string", inputs: "object (optional)" },
        example:
          "await kh.templates.use('aave-compound').with({ inputs: { asset: 'USDC' } }).run()",
        category: "workflows",
      },
      {
        name: "call_listed_workflow",
        description:
          "Call a publicly listed paid workflow by slug. Handles x402 payment automatically.",
        parameters: { slug: "string", input: "object (optional)" },
        example: "await kh.pipeline().listedWorkflow('eth-price-feed').wait()",
        category: "payments",
      },
      {
        name: "check_payment_balance",
        description:
          "Get the current USDC balance of the KeeperHub execution wallet.",
        parameters: {},
        example: "const { usdc, address } = await kh.payments.balance()",
        category: "payments",
      },
      {
        name: "preflight_cost_estimate",
        description:
          "Estimate the USDC cost of executing a workflow before committing funds.",
        parameters: { workflowId: "string" },
        example:
          "const { estimatedCost, feasible } = await kh.payments.preflight('wf_123')",
        category: "payments",
      },
      {
        name: "transfer_tokens",
        description:
          "Transfer native token or ERC-20 tokens to a recipient address.",
        parameters: {
          network: "chain ID string",
          to: "recipient address",
          amount: "decimal string",
          token: "ERC-20 address (optional)",
        },
        example:
          "await kh.web3.transfer({ network: '8453', to: '0x...', amount: '1.0' })",
        category: "web3",
      },
      {
        name: "read_contract",
        description:
          "Read a value from a smart contract (view/pure function, no gas).",
        parameters: {
          network: "chain ID",
          contract: "address",
          function: "function name",
          args: "array (optional)",
        },
        example:
          "await kh.web3.call('read', { network: '1', contract: '0xUSDC', function: 'balanceOf', args: ['0xWallet'] })",
        category: "web3",
      },
      {
        name: "write_contract",
        description:
          "Call a state-changing smart contract function (costs gas).",
        parameters: {
          network: "chain ID",
          contract: "address",
          function: "function name",
          args: "array (optional)",
        },
        example:
          "await kh.web3.call('write', { network: '8453', contract: '0x...', function: 'approve', args: ['0xSpender', '1000'] })",
        category: "web3",
      },
      {
        name: "swap_tokens",
        description:
          "Swap one token for another via the configured DEX aggregator.",
        parameters: {
          network: "chain ID",
          tokenIn: "address",
          tokenOut: "address",
          amount: "string",
          slippage: "number 0-100 (optional)",
        },
        example:
          "await kh.web3.swap({ network: '8453', tokenIn: '0xETH', tokenOut: '0xUSDC', amount: '0.1' })",
        category: "web3",
      },
      {
        name: "execute_protocol_action",
        description:
          "Execute a DeFi protocol action (Aave, Lido, Uniswap, etc.)",
        parameters: {
          actionType: "string e.g. 'aave/supply'",
          params: "object matching the action's input schema",
        },
        example:
          "await kh.protocols.execute('aave/supply', { asset: '0xUSDC', amount: '1000000' })",
        category: "protocols",
      },
      {
        name: "explain_execution_failure",
        description:
          "Get a structured explanation of why an execution failed, including the failing step.",
        parameters: { executionId: "string" },
        example: "const info = await kh.debug.explainFailure('exec_abc')",
        category: "workflows",
      },
      {
        name: "replay_execution",
        description:
          "Replay a failed execution with the same or modified inputs.",
        parameters: {
          executionId: "string",
          input: "object (optional override)",
        },
        example:
          "const handle = await kh.debug.replay('exec_abc', { input: { amount: '50' } })",
        category: "workflows",
      },
      {
        name: "register_agent_identity",
        description:
          "Register this agent on-chain as an ERC-8004 identity (idempotent — safe to call on every startup).",
        parameters: {
          name: "string (optional)",
          description: "string (optional)",
          capabilities: "string[] (optional)",
        },
        example:
          "await kh.agent.ensureRegistered({ name: 'My DeFi Agent', capabilities: ['aave/supply'] })",
        category: "identity",
      },
    ];
  }
}
