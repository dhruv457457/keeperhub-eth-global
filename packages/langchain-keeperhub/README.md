# langchain-keeperhub

[![PyPI](https://img.shields.io/pypi/v/langchain-keeperhub)](https://pypi.org/project/langchain-keeperhub/)
[![Python](https://img.shields.io/pypi/pyversions/langchain-keeperhub)](https://pypi.org/project/langchain-keeperhub/)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

**LangChain toolkit for [KeeperHub](https://keeperhub.com)** — reliable onchain execution, DeFi automation, and AI workflow generation for any LangChain or LangGraph agent.

## Why langchain-keeperhub?

| Feature | This package | Other Web3 toolkits |
|---------|-------------|---------------------|
| Tools | **10** (chains + ABI + transfer + contract + check-execute + gas + 4× workflows) | 4–6 |
| Never-throws pattern | ✅ `ok/summary/is_retryable` on every tool | ❌ raises on error |
| Prompt injection protection | ✅ sanitized workflow metadata | ❌ raw injection |
| Execution polling | ✅ built-in (2 min timeout) | ❌ you poll manually |
| System prompt builder | ✅ live workflow list | ❌ static |
| Async-first | ✅ `httpx.AsyncClient` | mixed |
| Proxy-aware ABI | ✅ resolves EIP-1967/UUPS/Diamond | ❌ |

---

## Install

```bash
pip install langchain-keeperhub
```

## Quick start

```python
import asyncio
import os

from langchain_keeperhub import KeeperHubToolkit
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

async def main():
    toolkit = KeeperHubToolkit()          # reads KEEPERHUB_API_KEY from env
    llm = ChatOpenAI(model="gpt-4o")

    system = await toolkit.build_system_prompt()   # injects live workflow list
    agent = create_react_agent(llm, toolkit.get_tools(), state_modifier=system)

    result = await agent.ainvoke({
        "messages": [{"role": "user", "content": "What chains does KeeperHub support?"}]
    })
    print(result["messages"][-1].content)

asyncio.run(main())
```

Set your API key:

```bash
export KEEPERHUB_API_KEY=kh_live_...
```

---

## Tools reference

### Chain discovery

| Tool | Description |
|------|-------------|
| `keeperhub_list_chains` | All supported networks with chain IDs, symbols, explorer URLs |
| `keeperhub_fetch_contract_abi` | Verified ABI — auto-resolves proxy patterns (EIP-1967, UUPS, Diamond) |

### Web3 execution

| Tool | Description |
|------|-------------|
| `keeperhub_transfer_funds` | Send ETH or any ERC-20 token |
| `keeperhub_contract_call` | Read (`call_type="read"`) or write (`call_type="write"`) any contract function |
| `keeperhub_check_and_execute` | Atomic condition check + action — no race conditions |
| `keeperhub_estimate_gas` | Estimate gas cost (ETH + USD) before submitting a write tx |

### Workflow automation

| Tool | Description |
|------|-------------|
| `keeperhub_list_workflows` | Browse your org's saved workflows |
| `keeperhub_execute_workflow` | Run a workflow by ID, blocks until complete (2-min timeout) |
| `keeperhub_generate_workflow` | Create a new workflow from a plain-English description |
| `keeperhub_get_execution_status` | Poll execution status + step logs |

---

## Selective tools

Load only the tools your agent needs:

```python
toolkit = KeeperHubToolkit(
    tools=["list_workflows", "execute_workflow", "execution_status"]
)
```

Valid keys: `list_chains`, `fetch_abi`, `transfer`, `contract_call`,
`check_and_execute`, `estimate_gas`, `list_workflows`, `execute_workflow`,
`generate_workflow`, `execution_status`.

---

## Observability / session context

Pass metadata that appears in KeeperHub execution logs and traces:

```python
toolkit = KeeperHubToolkit(
    agent_context={
        "session_id": conversation_id,
        "run_id":     agent_run_id,
        "goal":       "Rebalance DeFi portfolio for user",
    }
)
```

These map to `X-Agent-Session-Id`, `X-Agent-Run-Id`, and `X-Agent-Goal` headers on every request.

---

## System prompt builder

```python
system = await toolkit.build_system_prompt(include_workflows=True)
# Returns a ready-to-use prompt fragment that:
# - Lists all 10 tools with usage guidance
# - Injects your org's live workflow names (sanitized against prompt injection)
# - Falls back gracefully if the API is unavailable
```

---

## Never-throws design

Every tool returns a JSON string — never raises. The agent always has a path forward:

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

Agent reasoning guide baked into every tool description:
1. `keeperhub_list_workflows` first — reuse before generating
2. `keeperhub_generate_workflow` → `keeperhub_execute_workflow` for new automations
3. For write calls: poll with `keeperhub_get_execution_status`
4. If `ok=false` and `is_retryable=true`: retry once, then report failure
5. Always surface `summary` to the user — it's written for humans

---

## Direct tool usage (without toolkit)

```python
from langchain_keeperhub import KeeperHubClient, ListChainsTool, ExecuteWorkflowTool

client = KeeperHubClient(api_key="kh_live_...")

chains_tool = ListChainsTool(client=client)
wf_tool = ExecuteWorkflowTool(client=client)

chains = await chains_tool._arun()
result = await wf_tool._arun(workflow_id="wf_abc123", input={"amount": "0.01"})
```

---

## Context manager (resource cleanup)

```python
async with KeeperHubToolkit() as toolkit:
    tools = toolkit.get_tools()
    # ... use tools
# httpx.AsyncClient is closed automatically
```

---

## Configuration

```python
KeeperHubToolkit(
    api_key="kh_live_...",           # default: KEEPERHUB_API_KEY env var
    base_url="https://app.keeperhub.com",  # default
    timeout=30.0,                    # per-request timeout in seconds
    tools=None,                      # None = all 10 tools
    agent_context=None,              # dict with session_id, run_id, goal
)
```

---

## LangGraph full example

```python
import asyncio
from langchain_keeperhub import KeeperHubToolkit
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

async def main():
    async with KeeperHubToolkit(
        agent_context={"session_id": "demo-001", "goal": "DeFi portfolio management"}
    ) as toolkit:
        llm = ChatOpenAI(model="gpt-4o", temperature=0)
        system_prompt = await toolkit.build_system_prompt()
        agent = create_react_agent(
            llm,
            toolkit.get_tools(),
            state_modifier=system_prompt,
        )

        result = await agent.ainvoke({
            "messages": [{
                "role": "user",
                "content": (
                    "Swap 0.01 ETH for USDC on Base. "
                    "Check if a workflow exists first, otherwise create one."
                ),
            }]
        })

        for msg in result["messages"]:
            print(f"[{msg.type}] {msg.content[:200]}")

asyncio.run(main())
```

---

## Requirements

- Python ≥ 3.10
- `httpx >= 0.27`
- `langchain-core >= 0.2`
- `pydantic >= 2.0`

Optional (for running agents):
```bash
pip install langchain-openai langgraph python-dotenv
```

---

## License

Apache 2.0 — see [LICENSE](../../LICENSE).
