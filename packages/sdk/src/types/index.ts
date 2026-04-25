// ─── Workflow ────────────────────────────────────────────────────────────────

export interface WorkflowNode {
  id: string;
  type: "trigger" | "action";
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    type: string;
    config: Record<string, unknown>;
    status?: "idle" | "running" | "success" | "error";
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  sourceHandle?: "true" | "false" | "loop" | "done";
}

export type WorkflowTriggerType =
  | "Manual"
  | "Schedule"
  | "Webhook"
  | "Event"
  | "Block";

export type ConditionOperator =
  | "=="
  | "==="
  | "!="
  | "!=="
  | ">"
  | ">="
  | "<"
  | "<="
  | "contains"
  | "startsWith"
  | "endsWith"
  | "matchesRegex"
  | "isEmpty"
  | "isNotEmpty"
  | "exists"
  | "doesNotExist";

export interface ConditionRule {
  id: string;
  leftOperand: string;
  operator: ConditionOperator;
  rightOperand?: string;
}

export interface ConditionGroup {
  id: string;
  logic: "AND" | "OR";
  rules: Array<ConditionRule | ConditionGroup>;
}

export interface ConditionConfig {
  group: ConditionGroup;
}

export type WorkflowTriggerDefinition =
  | {
      triggerType: "Manual";
    }
  | {
      triggerType: "Schedule";
      scheduleCron: string;
      scheduleTimezone?: string;
    }
  | {
      triggerType: "Webhook";
      webhookSchema?: string;
      webhookMockRequest?: string;
    }
  | {
      triggerType: "Event";
      network: string;
      contractAddress: string;
      contractABI: string;
      eventName: string;
    }
  | {
      triggerType: "Block";
      network: string;
      blockInterval: string;
    };

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  userId: string;
  organizationId?: string;
  projectId?: string;
  tagId?: string;
  visibility: "private" | "public";
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  projectId?: string;
  tagId?: string;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
  projectId?: string | null;
  tagId?: string | null;
}

export interface ListWorkflowsInput {
  projectId?: string;
  tagId?: string;
}

export interface GenerateWorkflowInput {
  prompt: string;
  context?: string;
}

// ─── Execution ────────────────────────────────────────────────────────────────

export type ExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "success"
  | "failed"
  | "error"
  | "cancelled";

export interface Execution {
  id: string;
  workflowId: string;
  organizationId?: string;
  status: ExecutionStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  transactionHash?: string;
  gasUsedWei?: string;
  gasPriceWei?: string;
  totalSteps?: number;
  completedSteps?: number;
  currentNodeId?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: ExecutionStatus;
  step: string;
  txHash?: string;
  gasUsed?: string;
  gasUsedWei?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startTime?: string;
  endTime?: string;
  iterationIndex?: number;
  raw?: Record<string, unknown>;
}

export interface ExecutionStatusResponse {
  status: ExecutionStatus;
  progress?: {
    totalSteps: number;
    completedSteps: number;
    runningSteps: number;
    currentNodeId?: string | null;
    currentNodeName?: string | null;
    percentage: number;
  };
  nodeStatuses?: Array<{
    nodeId: string;
    status: "pending" | "running" | "success" | "error" | "cancelled";
  }>;
  errorContext?: {
    failedNodeId?: string | null;
    lastSuccessfulNodeId?: string | null;
    lastSuccessfulNodeName?: string | null;
    executionTrace?: string[] | null;
    error?: string | null;
  } | null;
}

export interface WaitForCompletionOptions {
  pollInterval?: number;
  timeout?: number;
  onProgress?: (status: ExecutionStatusResponse) => void;
  /** Cancel polling early — useful for React useEffect cleanup and graceful shutdown */
  signal?: AbortSignal;
}

export interface ListedWorkflow {
  id: string;
  name: string;
  description: string | null;
  listedSlug: string | null;
  listedAt?: string | null;
  inputSchema?: Record<string, unknown> | null;
  outputMapping?: Record<string, unknown> | null;
  priceUsdcPerCall?: string | null;
  organizationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isListed?: boolean;
  workflowType?: "read" | "write";
  category?: string | null;
  chain?: string | null;
}

export interface ListedWorkflowCatalogResponse {
  items: ListedWorkflow[];
  total: number;
  page: number;
  limit: number;
}

export interface ListedWorkflowSearchInput {
  q?: string;
  category?: string;
  chain?: string;
  page?: number;
  limit?: number;
}

export interface PaymentRequirement {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface PaymentChallenge {
  x402Version?: number;
  error?: string;
  resource?: {
    url: string;
    description?: string;
    mimeType?: string;
  };
  accepts?: PaymentRequirement[];
  extensions?: Record<string, unknown>;
}

export interface PaymentExecutionResult {
  executionId: string;
  status: string;
}

export interface PaymentResolverContext {
  slug: string;
  input: Record<string, unknown>;
  challenge: PaymentChallenge;
  headers: Record<string, string>;
}

export interface PaymentExecutionOptions {
  strategy?: "manual" | "auto";
  paymentHeaders?: Record<string, string>;
  resolvePayment?: (
    context: PaymentResolverContext
  ) => Promise<Record<string, string>> | Record<string, string>;
  /**
   * Idempotency key for the post-payment execution call.
   * Reuse the same key on retry to prevent double-charges if the response is lost.
   */
  idempotencyKey?: string;
}

// ─── x402 Payment Infrastructure ─────────────────────────────────────────────

/**
 * Lifecycle of an x402 / USDC payment transaction.
 * Mirrors the async model: pending → queued → processing → confirmed.
 */
export type PaymentStatus =
  | "pending"
  | "queued"
  | "processing"
  | "confirmed"
  | "failed"
  | "pending_approval"
  | "policy_rejected"
  | "cancelled";

/** A single x402/USDC payment transaction record */
export interface PaymentTransaction {
  id: string;
  createdAt: string;
  status: PaymentStatus;
  /** Amount in USDC, e.g. "0.05" */
  amountUsdc: string;
  currency: "USDC";
  memo?: string;
  workflowId?: string;
  executionId?: string;
  toAddress?: string;
  /** On-chain tx hash once confirmed */
  txHash?: string;
  failureReason?: string;
  /** Present when status is pending_approval */
  approvalUrl?: string;
}

/**
 * Machine-readable reason codes for an infeasible preflight.
 * Allows production code to branch without string-matching human-readable messages.
 */
export type PaymentFeasibilityCode =
  | "insufficient_balance"     // wallet does not have enough USDC
  | "payment_method_unsupported" // this workflow does not accept x402 payment
  | "workflow_not_payable"     // workflow is not configured for paid execution
  | "other";

/** Cost estimate returned by a payment preflight check */
export interface PaymentPreflightResult {
  workflowId: string;
  /** Whether the workflow can be funded at current wallet balance */
  feasible: boolean;
  /** Machine-readable reason when feasible is false */
  feasibilityCode?: PaymentFeasibilityCode;
  /** Estimated USDC cost, e.g. "0.02" */
  estimatedCost: string;
  currency: "USDC";
  /** Per-step cost breakdown when available */
  breakdown?: Array<{ step: string; estimatedCost: string }>;
  /** Human-readable reason when feasible is false */
  reason?: string;
  /** ISO timestamp after which this estimate should be considered stale */
  preflightExpiresAt?: string;
  /** URL to redirect the user to for manual payment approval */
  approvalUrl?: string;
}

/**
 * Budget guardrails applied before executing a payment-gated workflow.
 * Passed to pipeline().pay({ ... }) to keep agents from overspending.
 *
 * @example
 * await kh.pipeline()
 *   .generate("rebalance portfolio")
 *   .pay({ budget: "0.05", requireApprovalAbove: "0.02", dailyBudget: "1.00" })
 *   .wait();
 */
export interface PaymentPolicy {
  /**
   * Hard cap per execution in USDC, e.g. "0.05".
   * Throws KeeperHubPaymentPolicyError if the preflight estimate exceeds this.
   */
  budget?: string;
  /**
   * Rolling 24-hour spend cap in USDC, e.g. "1.00".
   * Checked against confirmed transactions in the past 24 hours plus the current
   * estimated cost. Throws KeeperHubPaymentPolicyError if the cap would be exceeded.
   */
  dailyBudget?: string;
  /**
   * Pause and return { status: "pending_approval" } instead of executing when
   * the estimated cost exceeds this threshold, e.g. "0.02".
   * The response includes payment.approvalUrl to redirect the user.
   */
  requireApprovalAbove?: string;
  /**
   * - "auto" (default): proceed automatically when cost is within budget.
   * - "requireApproval": always pause for human sign-off regardless of cost.
   */
  mode?: "auto" | "requireApproval";
  /**
   * Maximum age of a preflight cost estimate before it is re-fetched.
   * Defaults to 60 000 ms (1 minute). Pass 0 to always re-preflight before retry.
   */
  preflightMaxAgeMs?: number;
}

export interface PaymentHistoryOptions {
  limit?: number;
  offset?: number;
  status?: PaymentStatus;
  workflowId?: string;
  /** ISO 8601 timestamp — only return transactions at or after this time */
  since?: string;
  /** ISO 8601 timestamp — only return transactions before this time */
  before?: string;
}

export interface PaymentHistoryResponse {
  transactions: PaymentTransaction[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface PaymentBalanceResult {
  /** USDC balance as a decimal string, e.g. "12.50" */
  usdc: string;
  /** Wallet address holding the funds */
  address: string;
  chain: string;
}

// ─── Pipeline payment result ───────────────────────────────────────────────

export interface PipelinePaymentResult {
  /** Estimated cost from preflight, if requested */
  estimatedCost?: string;
  currency?: "USDC";
  /** Actual cost charged after execution, if returned by the API */
  actualCost?: string;
  status?: PaymentStatus;
  /** Present when status is pending_approval — share with user to unblock execution */
  approvalUrl?: string;
}

export interface ExecutionTrace {
  execution: Execution;
  status: ExecutionStatusResponse;
  logs: ExecutionLog[];
}

export interface FailureExplanation {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  summary: string;
  reason: string;
  step?: string | null;
  txHash?: string;
  failedNodeId?: string | null;
  lastSuccessfulNodeId?: string | null;
  lastSuccessfulNodeName?: string | null;
  executionTrace?: string[] | null;
  logTrail: Array<{
    nodeId: string;
    nodeName: string;
    status: ExecutionStatus;
    error?: string;
  }>;
}

export interface McpSchemaCatalog {
  actions?: Record<string, unknown>;
  triggers?: Record<string, unknown>;
  templateSyntax?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SafeRunOptions {
  mode?: "safe" | "fast";
  input?: Record<string, unknown>;
  retries?: number;
  retryDelayMs?: number;
  wait?: boolean;
  verbose?: boolean;
  debug?: boolean;
  waitOptions?: WaitForCompletionOptions;
  requireSimulation?: boolean;
}

export interface WorkflowRunResult {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
  mode: "safe" | "fast";
  attempts: number;
  execution: Execution;
  logs?: ExecutionLog[];
  failure?: FailureExplanation;
}

export interface PipelineRetryOptions {
  attempts?: number;
  delayMs?: number;
}

export interface PipelineSimulationState {
  requested: boolean;
  supported: boolean;
  skippedReason?: string;
}

export interface PipelineResult {
  /** Undefined when status is "pending_approval" — no execution was created yet */
  executionId?: string;
  status: ExecutionStatus | "pending_approval" | "running";
  /** Undefined when status is "pending_approval" */
  handle?: {
    id: string;
  };
  execution?: Execution;
  attempts: number;
  simulation: PipelineSimulationState;
  /** Present when .preflight() or .pay() was used */
  payment?: PipelinePaymentResult;
}

export interface EventSubscriptionOptions {
  pollInterval?: number;
}

export type KeeperHubEventName =
  | "execution.updated"
  | "execution.completed"
  | "execution.failed";

export interface ExecutionEventPayload {
  id: string;
  workflowId?: string;
  workflowName?: string;
  status: string;
  network?: string;
  transactionHash?: string;
  gasUsedWei?: string;
  source?: "workflow" | "direct";
}

// ─── Web3 ─────────────────────────────────────────────────────────────────────

export interface TransferParams {
  network: string;
  to: string;
  amount: string;
  token?: string;
}

export interface ContractCallParams {
  network: string;
  contract: string;
  function: string;
  args?: unknown[];
  abi?: string;
  value?: string;
  gasLimitMultiplier?: string;
}

export interface ContractReadParams {
  network: string;
  contract: string;
  function: string;
  args?: unknown[];
  abi?: string;
}

export interface CheckAndExecuteParams {
  network: string;
  check: {
    contract: string;
    function: string;
    args?: unknown[];
    abi?: string;
    condition: {
      operator: "gt" | "lt" | "eq" | "neq" | "gte" | "lte";
      value: string;
    };
  };
  action: {
    contract: string;
    function: string;
    args?: unknown[];
    abi?: string;
    gasLimitMultiplier?: string;
  };
}

export interface DirectExecution {
  executionId: string;
  status: string;
  transactionHash?: string;
  gasUsed?: string;
  gasPriceWei?: string;
  output?: unknown;
}

export interface GasEstimate {
  estimatedGas: string;
  estimatedEth: string;
  estimatedUsd?: string;
  gasPrice?: string;
}

// ─── Protocols ────────────────────────────────────────────────────────────────

export interface ProtocolInput {
  name: string;
  type: string;
  label: string;
  required?: boolean;
  default?: string;
}

export interface ProtocolAction {
  id: string;
  slug: string;
  label: string;
  description?: string;
  protocol: string;
  type: "read" | "write";
  inputs: ProtocolInput[];
  chains?: string[];
}

export interface Protocol {
  slug: string;
  name: string;
  description?: string;
  website?: string;
  icon?: string;
  actions: ProtocolAction[];
}

export interface SearchProtocolActionsInput {
  query?: string;
  protocol?: string;
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export interface Integration {
  id: string;
  type: string;
  name: string;
  isManaged?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntegrationInput {
  type: string;
  name?: string;
  config: Record<string, unknown>;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsRange = "7d" | "30d" | "90d" | "custom";

export interface AnalyticsSummary {
  usage: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
  };
  gasCredits: {
    used: number;
    remaining: number;
    limit: number;
    usedCents: number;
    remainingCents: number;
  };
  subscription: {
    plan: string;
    status: string;
  };
  limits: {
    executionsPercent: number;
    executionsUsed: number;
    executionsLimit: number;
  };
}

export interface AnalyticsRun {
  id: string;
  workflowId: string;
  workflowName: string;
  status: ExecutionStatus;
  network?: string;
  gasUsedWei?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AnalyticsTimeSeriesPoint {
  date: string;
  runs: number;
  failures: number;
  gasSpent?: number;
}

export interface NetworkUsage {
  chainId: string;
  name: string;
  runs: number;
  gasSpent?: string;
}

// ─── Chains ───────────────────────────────────────────────────────────────────

export interface Chain {
  id: string;
  chainId: number;
  name: string;
  symbol: string;
  chainType: "evm" | "solana";
  defaultPrimaryRpc: string;
  isTestnet: boolean;
  isEnabled: boolean;
  explorerUrl?: string;
  explorerApiUrl?: string;
}

// ─── Projects & Tags ──────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  workflowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  workflowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

// ─── Address Book ─────────────────────────────────────────────────────────────

export interface AddressBookEntry {
  id: string;
  label: string;
  address: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAddressInput {
  label: string;
  address: string;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface WalletBalance {
  token: string;
  balance: string;
  chainId: number;
  usdValue?: string;
}

export interface WalletToken {
  symbol: string;
  address: string;
  decimals: number;
  chainId: number;
  balance?: string;
}

export interface Wallet {
  id: string;
  address: string;
  provider: "turnkey" | "para";
  isActive: boolean;
  createdAt: string;
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface CreatedApiKey extends ApiKey {
  key: string; // only returned once on creation
}

// ─── Templates ────────────────────────────────────────────────────────────────

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  slug?: string;
  rating?: number;
}

export interface SearchTemplatesInput {
  query?: string;
  category?: string;
}

// ─── Agent / ERC-8004 ────────────────────────────────────────────────────────

export interface AgentService {
  name: string;
  endpoint: string;
}

export interface AgentRegistration {
  agentId: string;
  agentRegistry: string;
  chainId: number;
  txHash?: string;
  registeredAt?: string;
}

export interface AgentRegistryResponse {
  type: string;
  name: string;
  description?: string;
  image?: string;
  services: AgentService[];
  x402Support: boolean;
  active: boolean;
  registrations: AgentRegistration[];
}

// ─── SDK Config ───────────────────────────────────────────────────────────────

// ─── Agent-native types ───────────────────────────────────────────────────────

/**
 * Structured result returned by never-throws agent methods (safeWait, tryRun).
 * Always check `ok` first; use `summary` as ready-made LLM context.
 */
export interface AgentObservation<T = unknown> {
  ok: boolean;
  /** The SDK method that produced this observation, e.g. "pipeline.wait" */
  action: string;
  /** The full result, when ok is true */
  result?: T;
  /** Error details, when ok is false */
  error?: {
    message: string;
    code: string;
    /** Whether the same call is safe to retry */
    isRetryable: boolean;
    /** What the agent should do next */
    suggestedAction: string;
    details?: unknown;
  };
  /** Pre-formatted text for LLM context — paste directly into your next prompt */
  summary: string;
}

/** One entry in the capability manifest returned by kh.capabilities() */
export interface AgentCapability {
  /** Unique machine-readable name for this capability */
  name: string;
  /** One-sentence description for LLM tool selection */
  description: string;
  /** Parameter names → type descriptions */
  parameters: Record<string, string>;
  /** Runnable code example */
  example: string;
  /** Grouping category */
  category: "workflows" | "web3" | "protocols" | "payments" | "analytics" | "identity";
}

export interface KeeperHubConfig {
  apiKey?: string;
  baseUrl?: string;
  retry?: {
    maxAttempts?: number;
    backoff?: "exponential" | "linear" | "none";
    retryOn?: number[];
  };
  timeout?: number;
  /**
   * Agent session metadata — attached to every API request as headers.
   * Enables per-session observability, audit trails, and rate-limit attribution.
   *
   * @example
   * const kh = new KeeperHub({
   *   apiKey: process.env.KEEPERHUB_API_KEY,
   *   agentContext: { sessionId: conversationId, goal: userIntent.slice(0, 200) }
   * });
   */
  agentContext?: {
    /** Conversation or agent session identifier */
    sessionId?: string;
    /** Specific run/loop iteration identifier */
    runId?: string;
    /** What the agent is trying to accomplish (truncated to 500 chars) */
    goal?: string;
  };
}
