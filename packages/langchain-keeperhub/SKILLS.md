# SKILLS — langchain-keeperhub

> **Machine-readable capability manifest.**
> This file tells AI agents what this toolkit can do, which tools to call for each task,
> and how to interpret results. If you are an AI agent reading this file, follow the
> decision tree below before choosing tools.

---

## Package identity

```
package:  langchain-keeperhub
version:  0.1.0
language: Python ≥ 3.10
base_url: https://app.keeperhub.com
auth:     Bearer token (KEEPERHUB_API_KEY)
pattern:  async-only (_arun), never-throws (always returns JSON string)
```

---

## Quick-start for agents

```python
from langchain_keeperhub import KeeperHubToolkit

toolkit = KeeperHubToolkit()          # reads KEEPERHUB_API_KEY from env
tools   = toolkit.get_tools()         # list[BaseTool] — pass to your agent
system  = await toolkit.build_system_prompt()  # ready-made prompt fragment
```

---

## Decision tree

```
USER ASKS FOR AN ONCHAIN ACTION
│
├─ Does an existing workflow cover this?
│   ├─ YES → keeperhub_execute_workflow(workflow_id=...)
│   └─ NO  → keeperhub_generate_workflow(prompt=..., execute=True)
│
├─ Is this a simple token transfer?
│   └─ keeperhub_transfer_funds(network, to, amount[, token])
│
├─ Is this a contract READ (view/pure)?
│   └─ keeperhub_contract_call(network, contract, function, call_type="read")
│
├─ Is this a contract WRITE?
│   ├─ 1. keeperhub_estimate_gas(...)         ← check affordability first
│   └─ 2. keeperhub_contract_call(..., call_type="write")  → execution_id
│              └─ 3. keeperhub_get_execution_status(execution_id)
│
├─ Is this conditional (only execute if condition X is true)?
│   └─ keeperhub_check_and_execute(...)
│
└─ Discovery tasks
    ├─ "what chains are supported?" → keeperhub_list_chains
    ├─ "what functions does contract X have?" → keeperhub_fetch_contract_abi
    └─ "what workflows exist?" → keeperhub_list_workflows
```

---

## Tool catalogue

### 1. `keeperhub_list_chains`

**Purpose:** Discover which blockchain networks KeeperHub supports.

**Input:** *(none)*

**Returns:**
```json
[
  {
    "chainId": 8453,
    "name": "Base",
    "symbol": "ETH",
    "isTestnet": false,
    "explorerUrl": "https://basescan.org"
  }
]
```

**When to call:** Before any web3 operation when you don't know the chain ID.

**Common chain IDs:**
| Chain | chainId |
|-------|---------|
| Ethereum Mainnet | 1 |
| Base | 8453 |
| Polygon | 137 |
| Arbitrum One | 42161 |
| Optimism | 10 |
| Avalanche C-Chain | 43114 |
| BNB Smart Chain | 56 |

---

### 2. `keeperhub_fetch_contract_abi`

**Purpose:** Get the verified ABI for a contract. Auto-resolves proxies (EIP-1967, UUPS, Transparent Proxy, EIP-1167, Gnosis Safe, EIP-2535 Diamond).

**Input:**
```python
chain_id: int           # e.g. 8453 for Base
contract_address: str   # "0x..."
```

**Returns:** Raw ABI JSON array (or `{"error": "..."}` on failure)

**When to call:** Before `keeperhub_contract_call` when you don't know available functions.

---

### 3. `keeperhub_transfer_funds`

**Purpose:** Send ETH (or any ERC-20) to a recipient address.

**Input:**
```python
network: str    # Chain ID as string — "8453" for Base, "1" for Ethereum
to:      str    # Recipient address "0x..."
amount:  str    # Decimal string — "0.01" for 0.01 ETH
token:   str    # OPTIONAL — ERC-20 contract address; omit for native ETH
```

**Returns:**
```json
{
  "ok": true,
  "execution_id": "exec_abc123",
  "status": "running",
  "hint": "Call keeperhub_get_execution_status with this execution_id to get the tx hash."
}
```

**Follow-up:** Always call `keeperhub_get_execution_status(execution_id)` to get tx hash.

---

### 4. `keeperhub_contract_call`

**Purpose:** Read or write any smart contract function.

**Input:**
```python
network:              str        # Chain ID as string
contract:             str        # Contract address "0x..."
function:             str        # Function name e.g. "balanceOf", "transfer"
args:                 list|None  # OPTIONAL — positional arguments e.g. ["0xABC...", "1000000"]
abi:                  str|None   # OPTIONAL — ABI JSON string; auto-fetched if omitted
call_type:            str        # "read" (default) or "write"
gas_limit_multiplier: str|None   # OPTIONAL — write only, e.g. "1.2" adds 20% headroom
```

**Returns (read):**
```json
{ "ok": true, "result": "1000000000000000000" }
```

**Returns (write):**
```json
{
  "ok": true,
  "execution_id": "exec_xyz",
  "status": "pending",
  "hint": "Call keeperhub_get_execution_status with this execution_id to get the tx hash."
}
```

**Agent rule:** For write calls, ALWAYS follow up with `keeperhub_get_execution_status`.

---

### 5. `keeperhub_check_and_execute`

**Purpose:** Atomically check an onchain condition, then execute a transaction only if the condition is met. Eliminates race conditions between check and action.

**Input:**
```python
network:             str       # Chain ID as string
check_contract:      str       # Contract to read condition from
check_function:      str       # View function for the check
check_args:          list|None # OPTIONAL — args for check function
check_abi:           str|None  # OPTIONAL — ABI for check contract
condition_operator:  str       # "gt" | "lt" | "eq" | "neq" | "gte" | "lte"
condition_value:     str       # Value to compare against (as string)
action_contract:     str       # Contract to call if condition is true
action_function:     str       # Function to execute
action_args:         list|None # OPTIONAL — args for action function
action_abi:          str|None  # OPTIONAL — ABI for action contract
```

**Returns:**
```json
{
  "ok": true,
  "condition_met": true,
  "execution_id": "exec_abc",
  "status": "pending",
  "hint": "Call keeperhub_get_execution_status with this execution_id to get the tx hash."
}
```

**Example use case:** "If Aave health factor < 1.2, trigger repayWithATokens"

---

### 6. `keeperhub_estimate_gas`

**Purpose:** Estimate gas cost before submitting a write transaction.

**Input:**
```python
network:  str       # Chain ID as string
contract: str       # Contract address
function: str       # Function name
args:     list|None # OPTIONAL — function arguments
```

**Returns:**
```json
{
  "ok": true,
  "estimated_gas": 85000,
  "estimated_eth": "0.0000034",
  "estimated_usd": "0.0102",
  "gas_price": "40000000000"
}
```

**When to call:** Before `keeperhub_contract_call(call_type="write")` to check affordability.

---

### 7. `keeperhub_list_workflows`

**Purpose:** Browse all saved automation workflows in the authenticated org.

**Input:**
```python
project_id: str|None  # OPTIONAL — filter by project folder
tag_id:     str|None  # OPTIONAL — filter by tag
```

**Returns:**
```json
[
  {
    "id": "wf_abc123",
    "name": "Rebalance ETH-USDC",
    "description": "Swap ETH for USDC when ETH/USDC ratio drops below target",
    "visibility": "private",
    "updated_at": "2025-04-20T10:00:00Z"
  }
]
```

**Agent rule:** Call this FIRST before `keeperhub_generate_workflow`. Reuse existing workflows.

---

### 8. `keeperhub_execute_workflow`

**Purpose:** Run a workflow by ID. Polls until completion (max 2 minutes).

**Input:**
```python
workflow_id: str        # Format: "wf_xxx" — get from keeperhub_list_workflows
input:       dict|None  # OPTIONAL — runtime key-value pairs, max 8KB
wait:        bool       # True (default) = block until done; False = fire-and-forget
```

**Returns (completed):**
```json
{
  "ok": true,
  "summary": "Workflow wf_abc completed after 1 attempt. Execution ID: exec_xyz.",
  "execution_id": "exec_xyz",
  "status": "completed",
  "is_retryable": null,
  "suggestion": null
}
```

**Returns (failed):**
```json
{
  "ok": false,
  "summary": "Workflow wf_abc failed with status 'error'. Execution ID: exec_xyz.",
  "execution_id": "exec_xyz",
  "status": "error",
  "is_retryable": true,
  "suggestion": "Check keeperhub_get_execution_status for details."
}
```

**Returns (timeout):**
```json
{
  "ok": false,
  "summary": "Workflow wf_abc timed out. Execution ID: exec_xyz.",
  "execution_id": "exec_xyz",
  "status": "timeout",
  "is_retryable": true,
  "suggestion": "Check execution status separately: keeperhub_get_execution_status('exec_xyz')"
}
```

**Agent rules:**
- Always surface `summary` to the user verbatim — it's human-readable
- If `ok=false` and `is_retryable=true`: retry once after a short wait, then give up
- If `is_retryable=false` (e.g. `cancelled`): report failure immediately

---

### 9. `keeperhub_generate_workflow`

**Purpose:** Create a new workflow from a plain-English description.

**Input:**
```python
prompt:  str       # Natural language description, max 1000 chars
context: str|None  # OPTIONAL — wallet/protocol/chain context, max 500 chars
execute: bool      # False (default) = create only; True = create AND execute immediately
```

**Returns (create only):**
```json
{
  "ok": true,
  "workflow_id": "wf_new123",
  "name": "Rebalance ETH-USDC",
  "description": "Swap ETH for USDC when ratio drops below target",
  "hint": "To execute, call keeperhub_execute_workflow with workflow_id='wf_new123'"
}
```

**Returns (execute=True):**
```json
{
  "ok": true,
  "workflow_id": "wf_new123",
  "execution_id": "exec_abc",
  "status": "running",
  "hint": "Call keeperhub_get_execution_status to track completion."
}
```

**Agent rule:** Always call `keeperhub_list_workflows` first — generate only if no match found.

**Prompt injection guard:** Prompts are limited to 1000 chars; context to 500. Workflow names are sanitized before injection into system prompts.

---

### 10. `keeperhub_get_execution_status`

**Purpose:** Check status and progress of any workflow execution.

**Input:**
```python
execution_id:  str   # Format: "exec_xxx" or UUID
include_logs:  bool  # False (default); True = include step-level detail (use for debugging)
```

**Returns:**
```json
{
  "execution_id": "exec_abc123",
  "status": "completed",
  "progress": 100,
  "error": null,
  "failed_node_id": null
}
```

**With `include_logs=True`:**
```json
{
  "execution_id": "exec_abc123",
  "status": "failed",
  "progress": 60,
  "error": "insufficient funds",
  "failed_node_id": "node_transfer_1",
  "logs": [
    {
      "step": "Approve USDC",
      "status": "completed",
      "duration_ms": 2100,
      "tx_hash": "0xabc...",
      "error": null
    },
    {
      "step": "Transfer USDC",
      "status": "failed",
      "duration_ms": 800,
      "tx_hash": null,
      "error": "insufficient funds"
    }
  ]
}
```

**Status values:**
| Status | Meaning |
|--------|---------|
| `pending` | Queued, not started |
| `running` | Executing now |
| `completed` / `success` | Terminal — success |
| `failed` / `error` | Terminal — retryable failure |
| `cancelled` | Terminal — not retryable |

**Security note:** Returns generic `"Execution not found or not accessible with your API key."` for 404/401/403 — does not reveal whether the ID exists.

---

## Error handling reference

All tools return a JSON string. Parse it and check `ok` or `error`:

```python
import json

result = await some_tool._arun(...)
data = json.loads(result)

if data.get("ok") is False or "error" in data:
    print(f"Error: {data.get('error') or data.get('summary')}")
    if data.get("is_retryable"):
        print("Retrying once...")
```

**Error pattern guarantees:**
- `ok: false` always accompanies a `summary` written for humans
- `is_retryable` is `true` only for transient failures (network, timeout, gas spike)
- `suggestion` gives the agent a concrete next step

---

## Toolkit configuration reference

```python
KeeperHubToolkit(
    api_key="kh_live_...",              # env: KEEPERHUB_API_KEY
    base_url="https://app.keeperhub.com",
    timeout=30.0,                        # seconds per request
    tools=["list_chains", "transfer"],   # subset; None = all 10
    agent_context={
        "session_id": "...",             # → X-Agent-Session-Id header
        "run_id":     "...",             # → X-Agent-Run-Id header
        "goal":       "...",             # → X-Agent-Goal header
    },
)
```

**Valid `tools` keys:**
`list_chains` · `fetch_abi` · `transfer` · `contract_call` · `check_and_execute`
· `estimate_gas` · `list_workflows` · `execute_workflow` · `generate_workflow`
· `execution_status`

---

## System prompt fragment (sample output)

`await toolkit.build_system_prompt()` produces:

```
You have access to KeeperHub — an onchain workflow automation platform.
You can execute blockchain transactions, DeFi operations, and token transfers.

Available tools:
- keeperhub_list_chains: Discover supported blockchain networks
- keeperhub_fetch_contract_abi: Get verified ABI for any contract (auto-detects proxies)
- keeperhub_transfer_funds: Send ETH or ERC-20 tokens
- keeperhub_contract_call: Read or write any smart contract function
- keeperhub_check_and_execute: Atomic condition check + transaction (no race conditions)
- keeperhub_estimate_gas: Estimate gas cost before submitting a tx
- keeperhub_list_workflows: Discover available automation workflows
- keeperhub_execute_workflow: Run an existing workflow by ID
- keeperhub_generate_workflow: Create a new workflow from a plain-English description
- keeperhub_get_execution_status: Poll execution status and get tx hash

Agent reasoning guide:
1. For onchain actions: check keeperhub_list_workflows first — reuse before generating
2. For new automations: keeperhub_generate_workflow → keeperhub_execute_workflow
3. For write calls: use execution_id from the response + keeperhub_get_execution_status
4. If ok=false and is_retryable=true: retry once after a short wait, then give up
5. Always surface the summary field to the user — it is written for human consumption

Available workflows (3):
- Rebalance ETH-USDC [wf_abc]: Swap ETH for USDC when ratio drops below target
- Harvest Aave Rewards [wf_def]: Claim and compound Aave yield
- Monitor Health Factor [wf_ghi]: Alert when Aave health factor drops below 1.5
```

---

## Integration examples

### LangGraph ReAct agent

```python
from langchain_keeperhub import KeeperHubToolkit
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

async with KeeperHubToolkit(agent_context={"goal": "DeFi automation"}) as tk:
    agent = create_react_agent(
        ChatOpenAI(model="gpt-4o"),
        tk.get_tools(),
        state_modifier=await tk.build_system_prompt(),
    )
    result = await agent.ainvoke({"messages": [{"role": "user", "content": "..."}]})
```

### OpenAI function calling (manual tool loop)

```python
from langchain_keeperhub import KeeperHubToolkit

toolkit = KeeperHubToolkit(tools=["list_chains", "transfer"])
tools   = {t.name: t for t in toolkit.get_tools()}

# Convert to OpenAI schema
openai_tools = [
    {"type": "function", "function": {"name": t.name, "description": t.description,
     "parameters": t.args_schema.model_json_schema()}}
    for t in toolkit.get_tools()
]

# In your tool-call handler:
async def call_tool(name: str, args: dict) -> str:
    tool = tools[name]
    return await tool._arun(**args)
```

### Anthropic Claude tool use

```python
import anthropic, json
from langchain_keeperhub import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tools_map = {t.name: t for t in toolkit.get_tools()}

# Build Anthropic tool definitions
claude_tools = [
    {
        "name": t.name,
        "description": t.description,
        "input_schema": t.args_schema.model_json_schema(),
    }
    for t in toolkit.get_tools()
]

client = anthropic.AsyncAnthropic()
response = await client.messages.create(
    model="claude-opus-4-5",
    max_tokens=1024,
    tools=claude_tools,
    messages=[{"role": "user", "content": "Send 0.01 ETH to 0xABC... on Base"}],
)

# Handle tool calls
for block in response.content:
    if block.type == "tool_use":
        tool = tools_map[block.name]
        result = await tool._arun(**block.input)
        print(result)
```
