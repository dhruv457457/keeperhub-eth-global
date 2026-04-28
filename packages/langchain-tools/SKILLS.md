# @keeperhub/langchain — Agent Skills Reference

> **For AI assistants (Copilot, Cursor, Claude, etc.):**
> Read this before writing any code that uses `@keeperhub/langchain`.
> Complete reference — 27 tools across 22 files.

---

## Install & setup

```typescript
import { KeeperHubToolkit } from "@keeperhub/langchain";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY,
  tools: ["execute", "generate", "list", "check"], // subset; omit = all 27
  agentContext: { sessionId: "conv-123", goal: "DeFi automation" },
});

const agent = await createReactAgent({
  llm,
  tools: toolkit.getTools(),
  messageModifier: await toolkit.buildSystemPrompt({ includeWorkflows: true }),
});
```

---

## All valid `ToolKey` values

```typescript
type ToolKey =
  // Chain & contract discovery
  | "list_chains" | "fetch_abi"
  // Web3 execution
  | "transfer" | "contract_call" | "check_and_execute" | "estimate_gas"
  // Workflow automation
  | "list_workflows" | "execute" | "generate" | "check"
  // DeFi protocols
  | "protocol_action" | "list_protocols"
  // Chainlink
  | "chainlink_ccip" | "chainlink_price"
  // Ajna
  | "ajna"
  // Payments (x402 / MPP)
  | "pay_and_run"
  // Agent identity & wallet
  | "register_agent" | "wallet_balance" | "provision_wallet"
  // Notifications
  | "notify" | "list_integrations"
  // Utility plugins
  | "run_code" | "math_aggregate"
  // Action schema discovery
  | "get_action_schema" | "search_actions"
  // Workflow versioning & migration
  | "workflow_version" | "workflow_migrate" | "workflow_publish"
```

---

## Tool decision tree

```
Agent task
├─ "what chains?" / need chain ID          → keeperhub_list_chains
├─ "what functions does 0x... have?"        → keeperhub_fetch_contract_abi
│
├─ send ETH or token                        → keeperhub_transfer
│     └─ check affordability first          → keeperhub_estimate_gas
├─ read contract function (view/pure)       → keeperhub_contract_call (callType=read)
├─ write contract function                  → keeperhub_contract_call (callType=write)
│     └─ then poll                          → check_keeperhub_execution
├─ conditional execute                      → keeperhub_check_and_execute
│
├─ list org workflows                       → list_keeperhub_workflows
├─ run existing workflow                    → execute_keeperhub_workflow
├─ create new workflow from description     → generate_keeperhub_workflow
├─ check execution status                   → check_keeperhub_execution
├─ run paid/listed workflow                 → keeperhub_pay_and_run
│
├─ Aave/Uniswap/Lido/Curve/Morpho/etc      → keeperhub_protocol_action
│     └─ discover params first              → keeperhub_get_action_schema
│     └─ discover action names              → keeperhub_search_actions
├─ bridge tokens cross-chain                → keeperhub_chainlink_ccip
├─ get ETH/BTC/LINK price from oracle       → keeperhub_chainlink_price
├─ Ajna pool/borrower info                  → keeperhub_ajna
│
├─ check wallet USDC balance for payment    → keeperhub_wallet_balance
├─ provision new agent wallet               → keeperhub_provision_wallet
├─ register agent on-chain (ERC-8004)       → keeperhub_register_agent
│
├─ send Discord/Telegram/email notification → keeperhub_notify
├─ list configured integrations             → keeperhub_list_integrations
│
├─ run custom JS code in sandbox            → keeperhub_run_code
├─ sum/average/max/min array of numbers     → keeperhub_math_aggregate
│
├─ create v2 of existing workflow           → keeperhub_workflow_version
├─ migrate funds from v1 to v2              → keeperhub_workflow_migrate
└─ publish workflow to marketplace          → keeperhub_workflow_publish
```

---

## All 27 tools

### keeperhub_list_chains
**Key:** `list_chains` | **File:** `src/tools/list-chains.ts`
**Input:** *(none)*
**Returns:** `[{ chainId, name, symbol, isTestnet, explorerUrl }]`
**Use:** call first to discover valid network IDs before any web3 operation

---

### keeperhub_fetch_contract_abi
**Key:** `fetch_abi` | **File:** `src/tools/fetch-abi.ts`
**Input:** `{ chainId: number, contractAddress: string }`
**Returns:** `{ ok, abi: ABI[], explorer_url }`
Auto-resolves proxies: EIP-1967, UUPS, Transparent Proxy, Diamond, Gnosis Safe

---

### keeperhub_transfer
**Key:** `transfer` | **File:** `src/tools/transfer.ts`
**Input:** `{ network: string, to: string, amount: string, token?: string }`
- `network`: chain ID as string (e.g. `"8453"`)
- `amount`: decimal string (e.g. `"0.01"`)
- `token`: ERC-20 address; omit for native ETH
**Returns:** `{ ok, execution_id, status, hint }`
Always follow up with `check_keeperhub_execution` to get tx hash

---

### keeperhub_contract_call
**Key:** `contract_call` | **File:** `src/tools/contract-call.ts`
**Input:** `{ network, contract, function, args?, abi?, callType: "read"|"write", gasLimitMultiplier? }`
**Returns (read):** `{ ok, result }` — immediate, no gas
**Returns (write):** `{ ok, execution_id, status }` — poll for tx hash

---

### keeperhub_check_and_execute
**Key:** `check_and_execute` | **File:** `src/tools/check-and-execute.ts`
**Input:**
```typescript
{
  network, checkContract, checkFunction, checkArgs?, checkAbi?,
  conditionOperator: "gt"|"lt"|"eq"|"neq"|"gte"|"lte",
  conditionValue: string,
  actionContract, actionFunction, actionArgs?, actionAbi?, actionGasLimitMultiplier?
}
```
Atomic — no race condition between check and action
**Returns:** `{ ok, condition_met, execution_id, status }`

---

### keeperhub_estimate_gas
**Key:** `estimate_gas` | **File:** `src/tools/estimate-gas.ts`
**Input:** `{ network, contract, function, args? }`
**Returns:** `{ ok, estimated_gas, estimated_eth, estimated_usd, gas_price }`
Auto-fetches ABI if not provided; use before `contract_call` with `callType=write`

---

### list_keeperhub_workflows
**Key:** `list_workflows` | **File:** `src/tools/list-workflows.ts`
**Input:** `{ projectId?: string, tagId?: string }`
**Returns:** `[{ id, name, description, visibility, updated_at }]`
Names sanitized against prompt injection

---

### execute_keeperhub_workflow
**Key:** `execute` | **File:** `src/tools/execute-workflow.ts`
**Input:** `{ workflowId: string, input?: object, wait?: boolean }`
**Returns (completed):** `{ ok, summary, execution_id, status }`
**Returns (failed):** `{ ok: false, is_retryable, suggestion }`
**Returns (timeout):** `{ ok: false, status: "timeout", suggestion }`
Polls for up to 2 minutes when `wait=true`

---

### generate_keeperhub_workflow
**Key:** `generate` | **File:** `src/tools/generate-workflow.ts`
**Input:** `{ prompt: string (max 1000), context?: string (max 500), execute?: boolean }`
**Returns:** `{ ok, workflow_id, name, hint }` or `{ execution_id }` if execute=true

---

### check_keeperhub_execution
**Key:** `check` | **File:** `src/tools/check-execution.ts`
**Input:** `{ executionId: string, includeLogs?: boolean }`
**Returns:** `{ execution_id, status, progress, error, failed_node_id, logs? }`
Status values: `pending | running | completed | success | failed | error | cancelled`
Security: 404/403 → generic "not found" message

---

### keeperhub_pay_and_run
**Key:** `pay_and_run` | **File:** `src/tools/pay-and-run.ts`
**Input:** `{ workflowId, input?, maxBudgetUsd?: string, preferMpp?: boolean }`
**Returns:** `{ ok, summary, execution_id, status, tx_hash, amount_paid_usd }`
Uses `kh.pipeline().workflow(id).pay({ budget, preferMpp }).safeWait()`
MPP = Tempo USDC.e (cheaper); x402 = Base USDC

---

### keeperhub_protocol_action
**Key:** `protocol_action` | **File:** `src/tools/protocol-action.ts`
**Input:** `{ actionType: string, params: Record<string, string|number|boolean|null> }`
**actionType format:** `"protocol/action"` e.g. `"aave-v3/supply"`
**Key actions:**
```
aave-v3/supply          uniswap/swap-exact-input   lido/wrap
aave-v3/borrow          uniswap/swap-exact-output  compound-v3/supply
aave-v3/withdraw        curve/exchange             morpho/supply
aave-v3/repay           yearn-v3/deposit           cowswap/create-order
aave-v3/repayWithATokens rocket-pool/stake         pendle/swap
```
Use `keeperhub_get_action_schema` to discover params first

---

### keeperhub_list_protocols
**Key:** `list_protocols` | **File:** `src/tools/protocol-action.ts`
**Input:** `{ query?: string, protocol?: string }`
**Returns:** `{ count, actions: [{ actionType, name, protocol, description }] }`
Searches all 396 KeeperHub actions

---

### keeperhub_chainlink_ccip
**Key:** `chainlink_ccip` | **File:** `src/tools/chainlink.ts`
**Input:** `{ action: CcipAction, params: object }`
**Actions:** `ccip-get-fee | ccip-send | ccip-approve-bridge-token | ccip-approve-fee-token | ccip-check-bridge-balance | ccip-check-bridge-allowance | ccip-check-fee-balance | ccip-check-fee-allowance`
**Recommended flow:** get-fee → approve-bridge-token → approve-fee-token → send
**Supported chains:** Ethereum(1), Base(8453), Arbitrum(42161), Optimism(10), Polygon(137), Avalanche(43114), BNB(56)

---

### keeperhub_chainlink_price
**Key:** `chainlink_price` | **File:** `src/tools/chainlink.ts`
**Input:** `{ feed: string }` — e.g. `"eth-usd"`, `"btc-usd"`, `"link-usd"`
**Returns:** `{ ok, feed, price, result }`

---

### keeperhub_ajna
**Key:** `ajna` | **File:** `src/tools/ajna.ts`
**Input:** `{ action: AjnaAction, params?: object }`
**Actions:** `get-borrower-info | get-auction-status | get-pool-lup | get-pool-htp | get-hpb-index | price-to-index | index-to-price | get-deposit-index | pool1-kicker-info`
Ajna = permissionless lending on Base, no oracle, no governance

---

### keeperhub_register_agent
**Key:** `register_agent` | **File:** `src/tools/register-agent.ts`
**Input:** `{ name?, description?, capabilities?: string[] }`
**Returns:** `{ ok, agent_id, name, token_id, registry_address, tx_hash }`
Idempotent — safe to call on every startup

---

### keeperhub_wallet_balance
**Key:** `wallet_balance` | **File:** `src/tools/wallet-balance.ts`
**Input:** `{ chainId?: number }`
**Returns:** `{ ok, wallet_address, balances, payment_readiness: { x402_base_usdc, mpp_tempo_usdce } }`
Use before `pay_and_run` to verify sufficient USDC

---

### keeperhub_provision_wallet
**Key:** `provision_wallet` | **File:** `src/tools/provision-wallet.ts`
**Input:** `{ label?: string }`
**Returns:** `{ ok, wallet_address, sub_org_id, next_steps }`
Turnkey server-side custody — no private key on disk
Fund: USDC on Base (x402) or USDC.e on Tempo (MPP)

---

### keeperhub_notify
**Key:** `notify` | **File:** `src/tools/notify.ts`
**Input:** `{ channel: "discord"|"telegram"|"email"|"webhook", message, workflowId?, subject?, webhookUrl? }`
**Path 1:** workflowId provided → run that notification workflow
**Path 2:** no workflowId → AI generates one-shot notification workflow
**Note:** Set up integrations at app.keeperhub.com → Integrations first

---

### keeperhub_list_integrations
**Key:** `list_integrations` | **File:** `src/tools/notify.ts`
**Input:** `{ type: "discord"|"telegram"|"sendgrid"|"webhook"|"all" }`
**Returns:** `{ count, integrations: [{ id, type, name }] }`

---

### keeperhub_run_code
**Key:** `run_code` | **File:** `src/tools/code-execute.ts`
**Input:** `{ code: string (max 10k), inputs?: object, workflowName?: string }`
**Returns:** `{ ok, execution_id, status }` — JS runs in server-side sandboxed VM
`fetch()` available inside code. Use for custom calculations between workflow steps.

---

### keeperhub_math_aggregate
**Key:** `math_aggregate` | **File:** `src/tools/math-aggregate.ts`
**Input:** `{ operation: "sum"|"count"|"average"|"median"|"min"|"max"|"product", values: number[], description? }`
**Returns:** `{ ok, operation, result, input_count, summary }`
Computed locally — no API call needed

---

### keeperhub_get_action_schema
**Key:** `get_action_schema` | **File:** `src/tools/action-schema.ts`
**Input:** `{ actionType: string }`
**Returns:** `{ ok, action_type, required_fields, optional_fields, output_fields, description }`
Use BEFORE `keeperhub_protocol_action` to discover exact params
Covers all 396 actions: protocols + plugins (code, math, discord, telegram, etc.)

---

### keeperhub_search_actions
**Key:** `search_actions` | **File:** `src/tools/action-schema.ts`
**Input:** `{ query: string, category?: string, limit?: number }`
**Returns:** `{ total_found, results: [{ action_type, label, category, required_fields }] }`

---

### keeperhub_workflow_version
**Key:** `workflow_version` | **File:** `src/tools/workflow-migrate.ts`
**Input:** `{ workflowId, improvements?: string, goLive?: boolean }`
**Returns:** `{ ok, original_workflow_id, new_workflow_id, next_steps }`
Duplicates workflow → optionally describes improvements → optionally publishes

---

### keeperhub_workflow_migrate
**Key:** `workflow_migrate` | **File:** `src/tools/workflow-migrate.ts`
**Input:** `{ fromWorkflowId, toWorkflowId, withdrawInput?, activateNew?, activateInput? }`
**Returns:** `{ ok, drain_result, activate_result, steps, summary }`
Answers "how do I move funds from v1 to v2?"

---

### keeperhub_workflow_publish
**Key:** `workflow_publish` | **File:** `src/tools/workflow-migrate.ts`
**Input:** `{ workflowId }`
**Returns:** `{ ok, workflow_id, status, name }`
Publishes to KeeperHub marketplace — callable via x402/MPP payments by others

---

## All tool factories (individual import)

```typescript
import {
  createListChainsTool, createFetchAbiTool,
  createTransferTool, createContractCallTool,
  createCheckAndExecuteTool, createEstimateGasTool,
  createListWorkflowsTool, createExecuteWorkflowTool,
  createGenerateWorkflowTool, createCheckExecutionTool,
  createProtocolActionTool, createListProtocolsTool,
  createChainlinkCcipTool, createChainlinkPriceFeedTool,
  createAjnaTool,
  createPayAndRunTool,
  createRegisterAgentTool, createWalletBalanceTool, createProvisionWalletTool,
  createNotifyTool, createListIntegrationsTool,
  createCodeExecuteTool, createMathAggregateTool,
  createGetActionSchemaTool, createSearchActionsTool,
  createWorkflowVersionTool, createWorkflowMigrateTool, createWorkflowGoLiveTool,
} from "@keeperhub/langchain";

// Usage with any KeeperHub instance:
const kh = new KeeperHub({ apiKey: "kh_live_..." });
const tools = [createListChainsTool(kh), createProtocolActionTool(kh)];
```

---

## Never-throws pattern

Every tool returns a JSON string — never raises. Always check `ok`:

```typescript
const raw = await tool.invoke({ ... });
const result = JSON.parse(raw);
if (!result.ok) {
  console.log(result.error || result.summary);
  if (result.is_retryable) { /* retry once */ }
}
```

**Agent reasoning rules:**
1. `list_workflows` first — reuse before generating
2. `get_action_schema` before `protocol_action` — know your params
3. `wallet_balance` before `pay_and_run` — check USDC balance
4. `estimate_gas` before `contract_call(write)` — check affordability
5. Always surface `summary` to user — written for humans
6. `is_retryable=true` → retry once, then report failure
