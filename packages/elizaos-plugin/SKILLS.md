# @keeperhub/elizaos — Agent Skills Reference

> **For AI assistants (Copilot, Cursor, Claude, etc.):**
> Read this before writing any code that uses `@keeperhub/elizaos`.
> Complete reference — 17 actions, 2 providers, 1 evaluator.

---

## Install & setup

```typescript
import { createKeeperHubPlugin } from "@keeperhub/elizaos";

const plugin = createKeeperHubPlugin({
  apiKey: process.env.KEEPERHUB_API_KEY,           // required
  allowedWorkflowIds: ["wf_abc", "wf_xyz"],         // security allowlist (omit = all)
  agentContext: { sessionId: runtime.agentId, goal: character.bio[0] },
  enableWalletProvider: true,        // inject live wallet balance (default: true)
  enableWorkflowsProvider: true,     // inject workflow list into context (default: true)
  enableWeb3Actions: true,           // enable all web3/protocol actions (default: true)
  enableExecutionEvaluator: true,    // track execution outcomes in memory (default: true)
});
// In AgentRuntime: plugins: [plugin]
```

---

## Action decision tree

```
User says...
├─ "run wf_xxx" / "execute wf_xxx"          → EXECUTE_KEEPERHUB_WORKFLOW
├─ "pay and run wf_xxx" / x402/mpp budget   → KEEPERHUB_PAY_AND_RUN
├─ "generate a workflow that does X"        → GENERATE_KEEPERHUB_WORKFLOW
├─ "status of exec_xxx" / "did it work?"    → CHECK_KEEPERHUB_EXECUTION
├─ "list my workflows"                      → LIST_KEEPERHUB_WORKFLOWS
├─ "create v2 of wf_xxx"                    → KEEPERHUB_WORKFLOW_VERSION
├─ "migrate wf_old to wf_new"               → KEEPERHUB_WORKFLOW_MIGRATE
│
├─ "send 0.01 ETH to 0x..."                 → KEEPERHUB_TRANSFER
├─ "read balanceOf on 0x..."                → KEEPERHUB_CONTRACT_READ
├─ "estimate gas for transfer on 0x..."     → KEEPERHUB_ESTIMATE_GAS
├─ "if health < 1.2, repay" + JSON block    → KEEPERHUB_CHECK_AND_EXECUTE
├─ "what chains are supported?"             → KEEPERHUB_LIST_CHAINS
│
├─ "supply USDC to Aave" + JSON block       → KEEPERHUB_PROTOCOL_ACTION
├─ "bridge tokens to Base via Chainlink"    → KEEPERHUB_CHAINLINK_CCIP
│
├─ "send Discord notification: '...'"       → KEEPERHUB_NOTIFY
├─ "register this agent on-chain"           → REGISTER_KEEPERHUB_AGENT
├─ "what params does aave-v3/supply need?"  → KEEPERHUB_ACTION_SCHEMA
└─ JS code block OR "sum these: 3.2, 4.1"  → KEEPERHUB_RUN_CODE
```

---

## All 17 actions

### EXECUTE_KEEPERHUB_WORKFLOW
**File:** `src/actions/execute-workflow.ts`
**Trigger regex:** `/wf_[a-zA-Z0-9_-]{1,64}/` + execute/run/trigger/start intent
**Input extraction:** workflow ID by regex; JSON from ` ```json ``` ` block
**Security:** allowlist checked at validate + handler; JSON sanitized (round-trip strips `__proto__`); 8KB limit; 512-char value cap; null returned (not `{}`) when input too large
**Callbacks:** `⚙️ Executing…` → `🔄 N/M: StepName…` → `✅ status + tx hash`

### GENERATE_KEEPERHUB_WORKFLOW
**File:** `src/actions/generate-workflow.ts`
**Trigger:** generate/create/build + description (no wf_ ID present)
**Prompt capped** to 1000 chars; context to 500
**Returns:** new wf_xxx ID, hint to execute, or auto-executes if `execute=true`

### LIST_KEEPERHUB_WORKFLOWS
**File:** `src/actions/list-workflows.ts`
**Trigger:** list/show/what/available + workflows
**Security:** names sanitized before display (strips backtick, brackets, braces)

### CHECK_KEEPERHUB_EXECUTION
**File:** `src/actions/check-execution.ts`
**Trigger:** exec_xxx / UUID + status/progress/done/logs
**Security:** 404/403 returns generic "not found" — never reveals whether ID exists

### KEEPERHUB_PAY_AND_RUN
**File:** `src/actions/pay-and-run.ts`
**Trigger:** wf_xxx + pay/paid/x402/mpp/usdc/budget
**Extracts:** workflow ID, budget (`$0.05`, `budget: 1`), protocol (MPP default, x402 if explicit)
**Uses:** `kh.pipeline().workflow(id).pay({ budget, preferMpp }).safeWait()`

### KEEPERHUB_WORKFLOW_VERSION
**File:** `src/actions/workflow-version.ts`
**Trigger:** wf_xxx + version/v2/upgrade/duplicate/new version
**Uses:** `kh.workflows.duplicate(workflowId)`
**Returns:** original ID, new v2 ID, next steps

### KEEPERHUB_WORKFLOW_MIGRATE
**File:** `src/actions/workflow-version.ts`
**Trigger:** two wf_xxx IDs + migrate/move funds/from.*to
**Flow:** drain old (`_action: withdraw`) → activate new → report both results

### KEEPERHUB_TRANSFER
**File:** `src/actions/transfer.ts`
**Trigger:** send/transfer + amount+symbol + 0x address
**Extracts from NL:** amount (`0.01 ETH`), recipient (first 0x), network (name → chainId map), token (second 0x if present)
**Default network:** Base (8453)
**Returns execution_id** — poll with CHECK_KEEPERHUB_EXECUTION

### KEEPERHUB_CONTRACT_READ
**File:** `src/actions/contract-read.ts`
**Trigger:** read/call/query/contract + function name + 0x address
**Extracts:** contract (first 0x), function (from `call X`, backtick `X`, `function X`), args from `args: [...]`
**Returns:** value immediately (no gas, view/pure)

### KEEPERHUB_ESTIMATE_GAS
**File:** `src/actions/estimate-gas.ts`
**Trigger:** gas/cost/estimate/fee + 0x address
**Returns:** gas units, ETH cost, USD cost, gas price

### KEEPERHUB_CHECK_AND_EXECUTE
**File:** `src/actions/check-and-execute.ts`
**Trigger:** check/condition/if.*then/atomic + JSON block
**Required JSON schema:**
```json
{ "network": "8453",
  "check": { "contract": "0x...", "function": "fn", "args": [], "condition": { "operator": "lt", "value": "1.2e18" } },
  "action": { "contract": "0x...", "function": "fn", "args": [] } }
```
Operators: `gt | lt | eq | neq | gte | lte`

### KEEPERHUB_LIST_CHAINS
**File:** `src/actions/list-chains.ts`
**Trigger:** list/what/which/available + chains/networks/blockchain
**Returns:** 20 chains split mainnets + testnets
Key IDs: Ethereum=1, Base=8453, Polygon=137, Arbitrum=42161, Optimism=10, Tempo=4217

### KEEPERHUB_PROTOCOL_ACTION
**File:** `src/actions/protocol-action.ts`
**Trigger:** protocol name (aave/uniswap/lido/compound/curve/morpho/yearn/aerodrome/cowswap/rocket-pool/pendle/sky/spark/ethena/safe) + action + JSON block
**Required JSON:**
```json
{ "protocol": "aave-v3", "action": "supply",
  "params": { "asset": "0xUSDC...", "amount": "1000000000", "onBehalfOf": "0xWallet" } }
```
**Key protocol/action pairs:**
```
aave-v3:     supply, withdraw, borrow, repay, repayWithATokens
uniswap:     swap-exact-input, swap-exact-output
lido:        wrap, unwrap
compound-v3: supply, withdraw, borrow, repay
curve:       exchange, add-liquidity, remove-liquidity
morpho:      supply, withdraw, borrow, repay
yearn-v3:    deposit, withdraw, redeem
cowswap:     create-order
rocket-pool: stake, unstake
pendle:      swap, add-liquidity
ajna:        get-borrower-info, get-auction-status, get-pool-lup, get-pool-htp
```

### KEEPERHUB_CHAINLINK_CCIP
**File:** `src/actions/chainlink-ccip.ts`
**Trigger:** bridge/ccip/chainlink + send/transfer/cross-chain
**Full flow:** get-fee → approve-bridge-token → approve-fee-token → send
**Supported chains:** Ethereum(1), Base(8453), Arbitrum(42161), Optimism(10), Polygon(137), Avalanche(43114), BNB(56)
**Uses AI pipeline** to generate multi-step CCIP workflow for ccip-send

### KEEPERHUB_NOTIFY
**File:** `src/actions/notify.ts`
**Trigger:** notify/send/alert + discord/telegram/email/webhook
**Path 1:** wf_xxx present → run that workflow with `{ message }` input
**Path 2:** no wf_xxx → `kh.pipeline().generate("Send discord notification: ...").safeWait()`
**Note:** Notifications are workflow node types — set up integrations at app.keeperhub.com first

### REGISTER_KEEPERHUB_AGENT
**File:** `src/actions/register-agent.ts`
**Trigger:** register/identity/ERC-8004/on-chain
**Idempotent:** checks existing registration before minting new NFT
**Uses:** `kh.agent.ensureRegistered({ name, description, capabilities })`

### KEEPERHUB_ACTION_SCHEMA
**File:** `src/actions/action-schema.ts`
**Trigger:** schema/params/what fields/how call + action name
**Mode 1:** specific action (e.g. `` 'aave-v3/supply' ``) → required/optional/output fields
**Mode 2:** keyword search → top 8 matches from all 396 actions
**Uses:** `kh.mcp.getSchemas(query)`

### KEEPERHUB_RUN_CODE
**File:** `src/actions/run-code.ts`
**Trigger (code):** ` ```js ``` ` code block
**Trigger (math):** sum/average/median/max/min/product + numbers
- Math: computed instantly (no API call)
- Code: generates sandboxed workflow step (server-side VM, `fetch()` available)

---

## Providers

### `wallet-provider` — `src/providers/wallet-provider.ts`
Injected into every conversation turn:
```
[KeeperHub Wallet]
Address: 0x1234...abcd          ← truncated, not full address
  ETH: 0.142 on Ethereum
  USDC: 45.00 on Base           ← x402 payment ready ($45 budget)
  USDC.e: 12.50 on Tempo        ← MPP payment ready ($12.50 budget)
```
Zero-balance tokens omitted. Disable: `enableWalletProvider: false`.

### `workflows-provider` — `src/providers/workflows-provider.ts`
Injected into every conversation turn:
```
[KeeperHub Workflows — 36 available]
- Rebalance ETH-USDC [wf_abc]: Swap ETH for USDC when ratio drops
- Harvest Aave Rewards [wf_def]: Claim and compound yield
...
```
Names sanitized. Shows up to 10. Disable: `enableWorkflowsProvider: false`.

---

## Evaluator

### `KEEPERHUB_EXECUTION_SUCCESS` — `src/evaluators/execution-success.ts`
Runs after every turn where execution IDs appear.
- Polls up to 5 IDs per turn, skips non-terminal statuses
- On terminal: stores fact in `runtime.messageManager` memory
- Stored: `"KeeperHub execution exec_abc completed. TX: 0x..."`
- Makes "did it work?" questions answer accurately from memory
- Disable: `enableExecutionEvaluator: false`

---

## Individual exports for custom assembly

```typescript
import {
  // Workflow
  createListWorkflowsAction, createExecuteWorkflowAction,
  createGenerateWorkflowAction, createCheckExecutionAction,
  createRegisterAgentAction, createPayAndRunAction,
  createWorkflowVersionAction, createWorkflowMigrateAction,
  // Web3
  createListChainsAction, createTransferAction,
  createContractReadAction, createEstimateGasAction,
  createCheckAndExecuteAction,
  // Protocols
  createProtocolActionElizaAction, createChainlinkCcipAction,
  // Utility
  createNotifyAction, createRunCodeAction, createActionSchemaAction,
  // Providers & evaluators
  createWalletProvider, createWorkflowsProvider,
  createExecutionSuccessEvaluator,
} from "@keeperhub/elizaos";
```
