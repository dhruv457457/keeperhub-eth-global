# langchain-keeperhub — Agent Skills Reference

> **For AI assistants (Copilot, Cursor, Claude, etc.):**
> Read this before writing any Python code that uses `langchain-keeperhub`.
> Complete reference — 32 tools across 10 files.

---

## Install & setup

```python
pip install langchain-keeperhub

from langchain_keeperhub import KeeperHubToolkit
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

toolkit = KeeperHubToolkit(
    api_key="kh_live_...",          # or KEEPERHUB_API_KEY env var
    tools=["list_chains", "transfer"],  # subset; omit = all 32
    agent_context={
        "session_id": "conv-123",   # → X-Agent-Session-Id header
        "run_id": "run-abc",        # → X-Agent-Run-Id header
        "goal": "DeFi automation",  # → X-Agent-Goal header
    },
)

system = await toolkit.build_system_prompt()  # injects live workflow list
agent = create_react_agent(ChatOpenAI(model="gpt-4o"), toolkit.get_tools(), state_modifier=system)
```

---

## All valid `ToolKey` values

```python
ToolKey = Literal[
    # Chain & contract
    "list_chains", "fetch_abi",
    # Web3
    "transfer", "contract_call", "check_and_execute", "estimate_gas",
    # Workflows
    "list_workflows", "execute_workflow", "generate_workflow", "execution_status",
    # DeFi protocols
    "list_protocols", "protocol_action",
    # Payments
    "pay_and_run",
    # Agent identity & wallet
    "register_agent", "wallet_balance", "provision_wallet",
    # Notifications
    "notify", "list_integrations",
    # Chainlink
    "chainlink_ccip", "chainlink_price",
    # Ajna
    "ajna",
    # Utility plugins
    "run_code", "math_aggregate",
    # Action schema discovery
    "get_action_schema", "search_actions",
    # Workflow versioning & migration
    "workflow_version", "workflow_migrate", "workflow_publish",
]
```

---

## Tool decision tree

```
Task
├─ need chain ID                          → keeperhub_list_chains
├─ need contract functions                → keeperhub_fetch_contract_abi
│
├─ send ETH/token                         → keeperhub_transfer_funds
│     check affordability first           → keeperhub_estimate_gas
├─ read contract (view/pure)              → keeperhub_contract_call (call_type="read")
├─ write contract                         → keeperhub_contract_call (call_type="write")
├─ conditional execute                    → keeperhub_check_and_execute
│
├─ browse org workflows                   → keeperhub_list_workflows
├─ run workflow by ID                     → keeperhub_execute_workflow
├─ create workflow from description       → keeperhub_generate_workflow
├─ check execution status                 → keeperhub_get_execution_status
├─ run paid/listed workflow               → keeperhub_pay_and_run
│
├─ Aave/Uniswap/Lido/etc action           → keeperhub_protocol_action
│     discover params first               → keeperhub_get_action_schema
│     discover action names               → keeperhub_search_actions
├─ bridge tokens cross-chain              → keeperhub_chainlink_ccip
├─ get ETH/BTC price                      → keeperhub_chainlink_price
├─ Ajna pool/borrower data                → keeperhub_ajna
│
├─ check wallet USDC for payments         → keeperhub_wallet_balance
├─ provision new agent wallet             → keeperhub_provision_wallet
├─ register agent on-chain (ERC-8004)     → keeperhub_register_agent
│
├─ send notification                      → keeperhub_notify
├─ list configured integrations           → keeperhub_list_integrations
│
├─ run custom JS in sandbox               → keeperhub_run_code
├─ sum/average/max/min numbers            → keeperhub_math_aggregate
│
├─ create v2 of workflow                  → keeperhub_workflow_version
├─ migrate funds v1 → v2                 → keeperhub_workflow_migrate
└─ publish to marketplace                 → keeperhub_workflow_publish
```

---

## All 32 tools

### keeperhub_list_chains
**Key:** `list_chains` | **File:** `tools/chains.py` | **Class:** `ListChainsTool`
**Input:** *(none)*
**Returns:** `[{ chainId, name, symbol, isTestnet, explorerUrl }]`
Key chain IDs: Ethereum=1, Base=8453, Polygon=137, Arbitrum=42161, Tempo=4217

---

### keeperhub_fetch_contract_abi
**Key:** `fetch_abi` | **File:** `tools/chains.py` | **Class:** `FetchContractABITool`
**Input:** `chain_id: int, contract_address: str`
**Returns:** `{ ok, abi: list, explorer_url }`
Auto-resolves proxies (EIP-1967, UUPS, Transparent Proxy, Diamond)

---

### keeperhub_transfer_funds
**Key:** `transfer` | **File:** `tools/web3.py` | **Class:** `TransferFundsTool`
**Input:** `network: str, to: str, amount: str, token: str | None`
- `network`: chain ID string e.g. `"8453"`
- `amount`: decimal string e.g. `"0.01"`
- `token`: ERC-20 address; omit for native ETH/MATIC
**Returns:** `{ ok, execution_id, status, hint }`
Follow up with `keeperhub_get_execution_status`

---

### keeperhub_contract_call
**Key:** `contract_call` | **File:** `tools/web3.py` | **Class:** `ContractCallTool`
**Input:** `network, contract, function, args?, abi?, call_type: "read"|"write", gas_limit_multiplier?`
**Returns (read):** `{ ok, result }` — immediate, no gas
**Returns (write):** `{ ok, execution_id, status }` — poll for tx hash

---

### keeperhub_check_and_execute
**Key:** `check_and_execute` | **File:** `tools/web3.py` | **Class:** `CheckAndExecuteTool`
**Input:** `network, check_contract, check_function, check_args?, check_abi?, condition_operator, condition_value, action_contract, action_function, action_args?, action_abi?`
Condition operators: `gt | lt | eq | neq | gte | lte`
Atomic — no race condition
**Returns:** `{ ok, condition_met, execution_id, status }`

---

### keeperhub_estimate_gas
**Key:** `estimate_gas` | **File:** `tools/web3.py` | **Class:** `EstimateGasTool`
**Input:** `network, contract, function, args?, abi?`
**Returns:** `{ ok, estimated_gas, estimated_eth, estimated_usd, gas_price }`
Auto-fetches ABI if not provided

---

### keeperhub_list_workflows
**Key:** `list_workflows` | **File:** `tools/workflows.py` | **Class:** `ListWorkflowsTool`
**Input:** `project_id?: str, tag_id?: str`
**Returns:** `[{ id, name, description, visibility, updated_at }]`
Names sanitized against prompt injection

---

### keeperhub_execute_workflow
**Key:** `execute_workflow` | **File:** `tools/workflows.py` | **Class:** `ExecuteWorkflowTool`
**Input:** `workflow_id: str, input?: dict, wait: bool = True`
**Returns (completed):** `{ ok, summary, execution_id, status }`
**Returns (failed):** `{ ok: False, is_retryable, suggestion }`
Polls for 2 minutes when `wait=True`

---

### keeperhub_generate_workflow
**Key:** `generate_workflow` | **File:** `tools/workflows.py` | **Class:** `GenerateWorkflowTool`
**Input:** `prompt: str (max 1000), context?: str (max 500), execute: bool = False`
**Returns:** `{ ok, workflow_id, name, hint }` or `{ execution_id }` if execute=True

---

### keeperhub_get_execution_status
**Key:** `execution_status` | **File:** `tools/workflows.py` | **Class:** `GetExecutionStatusTool`
**Input:** `execution_id: str, include_logs: bool = False`
**Returns:** `{ execution_id, status, progress, error, failed_node_id, logs? }`
Status: `pending | running | completed | success | failed | error | cancelled`
Security: 404/403 → generic "not found"

---

### keeperhub_pay_and_run
**Key:** `pay_and_run` | **File:** `tools/payments.py` | **Class:** `PayAndRunTool`
**Input:** `workflow_id, input?, max_budget_usd: str = "1.00", prefer_mpp: bool = True`
**Returns:** `{ ok, summary, execution_id, status, payment_protocol }`
MPP = Tempo USDC.e (cheaper, near-instant); x402 = Base USDC

---

### keeperhub_list_protocols
**Key:** `list_protocols` | **File:** `tools/protocols.py` | **Class:** `ListProtocolsTool`
**Input:** `query?: str, protocol?: str`
**Returns:** `{ count, actions: [{ actionType, name, protocol, description }] }`

---

### keeperhub_protocol_action
**Key:** `protocol_action` | **File:** `tools/protocols.py` | **Class:** `ProtocolActionTool`
**Input:** `action_type: str, params: dict`
**actionType format:** `"protocol/action"` e.g. `"aave-v3/supply"`
**Key protocols & actions:**
```
aave-v3/supply              uniswap/swap-exact-input    lido/wrap
aave-v3/borrow              uniswap/swap-exact-output   compound-v3/supply
aave-v3/withdraw            curve/exchange              morpho/supply
aave-v3/repay               yearn-v3/deposit            cowswap/create-order
aave-v3/repayWithATokens    rocket-pool/stake           pendle/swap
```
Use `keeperhub_get_action_schema` to discover params

---

### keeperhub_chainlink_ccip
**Key:** `chainlink_ccip` | **File:** `tools/plugins.py` | **Class:** `ChainlinkCcipTool`
**Input:** `action: str, params: dict`
Actions: `ccip-get-fee | ccip-send | ccip-approve-bridge-token | ccip-approve-fee-token | ccip-check-bridge-balance | ccip-check-bridge-allowance | ccip-check-fee-balance | ccip-check-fee-allowance`
Flow: get-fee → approve-bridge-token → approve-fee-token → send

---

### keeperhub_chainlink_price
**Key:** `chainlink_price` | **File:** `tools/plugins.py` | **Class:** `ChainlinkPriceFeedTool`
**Input:** `feed: str` — e.g. `"eth-usd"`, `"btc-usd"`, `"link-usd"`, `"matic-usd"`
**Returns:** `{ ok, feed, price, result }`

---

### keeperhub_ajna
**Key:** `ajna` | **File:** `tools/plugins.py` | **Class:** `AjnaTool`
**Input:** `action: str, params?: dict`
Actions: `get-borrower-info | get-auction-status | get-pool-lup | get-pool-htp | get-hpb-index | price-to-index | index-to-price | get-deposit-index | pool1-kicker-info`
Permissionless lending on Base — no oracle, no governance

---

### keeperhub_register_agent
**Key:** `register_agent` | **File:** `tools/agent.py` | **Class:** `RegisterAgentTool`
**Input:** `name?, description?, capabilities?: list[str]`
**Returns:** `{ ok, agent_id, token_id, registry_address, tx_hash }`
Idempotent — checks existing registration before minting

---

### keeperhub_wallet_balance
**Key:** `wallet_balance` | **File:** `tools/agent.py` | **Class:** `WalletBalanceTool`
**Input:** `chain_id?: int`
**Returns:** `{ ok, wallet_address, balances, payment_readiness: { x402_base_usdc, mpp_tempo_usdce } }`
Use before `pay_and_run` to verify USDC balance

---

### keeperhub_provision_wallet
**Key:** `provision_wallet` | **File:** `tools/agent.py` | **Class:** `ProvisionWalletTool`
**Input:** `label?: str`
**Returns:** `{ ok, wallet_address, sub_org_id, next_steps }`
Turnkey server-side custody — no private key on disk
Fund: USDC on Base (x402) or USDC.e on Tempo (MPP)

---

### keeperhub_notify
**Key:** `notify` | **File:** `tools/notifications.py` | **Class:** `NotifyTool`
**Input:** `channel: str, message: str, workflow_id?: str, subject?: str`
**Path 1:** `workflow_id` provided → run that notification workflow
**Path 2:** no `workflow_id` → AI generates + runs one-shot notification workflow

---

### keeperhub_list_integrations
**Key:** `list_integrations` | **File:** `tools/notifications.py` | **Class:** `ListIntegrationsTool`
**Input:** `type?: str` — `"discord" | "telegram" | "sendgrid" | "webhook"`
**Returns:** `{ count, integrations: [{ id, type, name }] }`

---

### keeperhub_run_code
**Key:** `run_code` | **File:** `tools/plugins.py` | **Class:** `CodeExecuteTool`
**Input:** `code: str (max 10k), inputs?: dict`
**Returns:** `{ ok, workflow_id, execution_id, status }`
Generates sandboxed workflow step (server-side VM, `fetch()` available)

---

### keeperhub_math_aggregate
**Key:** `math_aggregate` | **File:** `tools/plugins.py` | **Class:** `MathAggregateTool`
**Input:** `operation: str, values: list[float], description?: str`
Operations: `sum | count | average | median | min | max | product`
**Returns:** `{ ok, operation, result, input_count, summary }`
Computed locally — instant, no API call

---

### keeperhub_get_action_schema
**Key:** `get_action_schema` | **File:** `tools/action_schema.py` | **Class:** `GetActionSchemaTool`
**Input:** `action_type: str`
**Returns:** `{ ok, action_type, required_fields, optional_fields, output_fields, description }`
Use BEFORE `keeperhub_protocol_action` to know exact params
Covers all 396 actions across 20+ protocols + plugins

---

### keeperhub_search_actions
**Key:** `search_actions` | **File:** `tools/action_schema.py` | **Class:** `SearchActionsTool`
**Input:** `query: str, category?: str, limit: int = 10`
**Returns:** `{ total_found, results: [{ action_type, label, category, required_fields }] }`

---

### keeperhub_workflow_version
**Key:** `workflow_version` | **File:** `tools/workflow_migrate.py` | **Class:** `WorkflowVersionTool`
**Input:** `workflow_id: str, improvements?: str, go_live: bool = False`
**Returns:** `{ ok, original_workflow_id, new_workflow_id, next_steps }`

---

### keeperhub_workflow_migrate
**Key:** `workflow_migrate` | **File:** `tools/workflow_migrate.py` | **Class:** `WorkflowMigrateTool`
**Input:** `from_workflow_id, to_workflow_id, withdraw_input?, activate_new: bool = True, activate_input?`
**Returns:** `{ ok, drain_result, activate_result, steps, summary }`
Answers: "how do I move funds from v1 to v2?"

---

### keeperhub_workflow_publish
**Key:** `workflow_publish` | **File:** `tools/workflow_migrate.py` | **Class:** `PublishWorkflowTool`
**Input:** `workflow_id: str`
**Returns:** `{ ok, workflow_id, status, name }`
Publishes to KeeperHub marketplace for x402/MPP monetization

---

## All class imports

```python
from langchain_keeperhub.tools import (
    # Chain & contract
    ListChainsTool, FetchContractABITool,
    # Web3
    TransferFundsTool, ContractCallTool,
    CheckAndExecuteTool, EstimateGasTool,
    # Workflows
    ListWorkflowsTool, ExecuteWorkflowTool,
    GenerateWorkflowTool, GetExecutionStatusTool,
    # Protocols
    ListProtocolsTool, ProtocolActionTool,
    # Payments
    PayAndRunTool,
    # Agent & wallet
    RegisterAgentTool, WalletBalanceTool, ProvisionWalletTool,
    # Notifications
    NotifyTool, ListIntegrationsTool,
    # Plugins
    ChainlinkCcipTool, ChainlinkPriceFeedTool,
    AjnaTool, CodeExecuteTool, MathAggregateTool,
    # Schema discovery
    GetActionSchemaTool, SearchActionsTool,
    # Workflow management
    WorkflowVersionTool, WorkflowMigrateTool, PublishWorkflowTool,
)

# Direct usage:
from langchain_keeperhub.client import KeeperHubClient
client = KeeperHubClient(api_key="kh_live_...")
tool = ProtocolActionTool(client=client)
result = await tool._arun(action_type="aave-v3/supply", params={...})
```

---

## Never-throws pattern

Every tool returns a JSON string — never raises. Always parse:

```python
import json

result = await tool._arun(...)
data = json.loads(result)

if not data.get("ok"):
    print(f"Error: {data.get('error') or data.get('summary')}")
    if data.get("is_retryable"):
        # retry once
        pass
```

**Agent reasoning rules:**
1. `list_workflows` first — reuse before generating
2. `get_action_schema` before `protocol_action` — know your params
3. `wallet_balance` before `pay_and_run` — verify USDC
4. `estimate_gas` before `contract_call(write)` — check cost
5. Always surface `summary` to user — written for humans
6. `is_retryable=True` → retry once, then report failure

---

## Context manager

```python
async with KeeperHubToolkit(api_key="kh_live_...") as toolkit:
    tools = toolkit.get_tools()
    # httpx.AsyncClient closed automatically on exit
```
