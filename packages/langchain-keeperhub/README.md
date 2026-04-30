# keeperhub-langchain

[![PyPI](https://img.shields.io/pypi/v/keeperhub-langchain)](https://pypi.org/project/keeperhub-langchain/)
[![Python](https://img.shields.io/pypi/pyversions/keeperhub-langchain)](https://pypi.org/project/keeperhub-langchain/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-24%20passing-brightgreen)](https://github.com/dhruv457457/keeperhub-eth-global)

**The most complete LangChain toolkit for KeeperHub** — 31 tools covering DeFi protocols, blockchain execution, workflow automation, ENS resolution, x402/MPP payments, ERC-8004 agent identity, and more.

Built for the **ETHGlobal OpenAgents Hackathon**. Tested against real KeeperHub API on Base mainnet.

---

## Why keeperhub-langchain?

| Feature | This package | Others |
|---------|-------------|--------|
| Tools | **31** (DeFi + Web3 + Workflows + ENS + Payments + Identity) | 4–8 |
| DeFi protocols | **396 actions** (Aave, Uniswap, Lido, Compound, Morpho, Yearn, Curve, CowSwap...) | ❌ |
| Safety guardrails | ✅ `testnet_only`, `allowed_chain_ids` | ❌ |
| Execution history | ✅ SQLite audit trail, receipts, dedup | ❌ |
| MCP bridge | ✅ optional — adds KH's 20 official MCP tools | ❌ |
| ENS resolution | ✅ forward + reverse + text records | ❌ |
| x402/MPP payments | ✅ agent-autonomous paid workflow execution | ❌ |
| ERC-8004 identity | ✅ on-chain agent registration | ❌ |
| Retry logic | ✅ GET: 3× backoff, POST: 0× (no duplicate writes) | mixed |
| Async-first | ✅ `httpx.AsyncClient` | mixed |
| Never-throws | ✅ `ok/error/is_retryable` on every tool | ❌ |

---

## Install

```bash
pip install keeperhub-langchain
```

With MCP bridge (adds KeeperHub's 20 official workflow tools):
```bash
pip install "keeperhub-langchain[workflows]"
```

---

## Quick Start

```python
import os
from langchain_keeperhub import KeeperHubToolkit
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

toolkit = KeeperHubToolkit()  # reads KEEPERHUB_API_KEY from env
agent = create_react_agent(
    model=ChatOpenAI(model="gpt-4o"),
    tools=toolkit.get_tools(),
)

result = agent.invoke({
    "messages": [("user", "What's the best USDC yield on Base right now?")]
})
print(result["messages"][-1].content)
```

Set your API key:
```bash
export KEEPERHUB_API_KEY=kh_...
```

---

## Safety Guardrails

```python
# Block all mainnet writes — safe for development
toolkit = KeeperHubToolkit(testnet_only=True)

# Restrict to specific chains only
toolkit = KeeperHubToolkit(
    testnet_only=True,
    allowed_chain_ids={"11155111", "84532"},  # Sepolia, Base Sepolia
)
```

Applies to `transfer_funds`, `contract_call`, `check_and_execute`. Returns a clear error instead of executing on mainnet.

---

## Execution History (Audit Trail)

```python
# SQLite-backed — stdlib only, zero extra deps
toolkit = KeeperHubToolkit(history=True)           # ~/.keeperhub/executions.db
toolkit = KeeperHubToolkit(history="./project.db") # custom path

# Or bring your own store
from langchain_keeperhub import SqliteExecutionStore
toolkit = KeeperHubToolkit(history=SqliteExecutionStore("./executions.db"))
```

When `history` is enabled:
- Every `transfer_funds` call is persisted with execution ID, network, amount, recipient
- `get_execution_status` updates the row with tx hash when the transaction completes
- Adds `keeperhub_list_executions` tool — the agent can query past transactions

```python
# Query directly (without agent)
records = await toolkit.store.list(status="completed", limit=10)
for r in records:
    print(r.execution_id, r.transaction_hash, r.amount)
```

---

## MCP Bridge (Optional)

```python
# Combines 31 native tools + KeeperHub's 20 official MCP tools = 50+ tools
toolkit = KeeperHubToolkit(
    workflows=True,
    mcp_include={"list_workflows", "execute_workflow", "ai_generate_workflow"},
)
tools = await toolkit.aget_tools()  # must use async when workflows=True
```

---

## All 31 Tools

### Chains & Contracts
| Tool | Description |
|------|-------------|
| `keeperhub_list_chains` | List all 19 supported blockchains |
| `keeperhub_fetch_contract_abi` | Fetch verified ABI, auto-resolves EIP-1967/UUPS/Diamond proxies |

### Web3 Execution
| Tool | Description |
|------|-------------|
| `keeperhub_transfer_funds` | Send ETH or any ERC-20 token |
| `keeperhub_contract_call` | Read or write any smart contract function |
| `keeperhub_check_and_execute` | Atomic condition check + transaction (no race conditions) |
| `keeperhub_estimate_gas` | Estimate gas cost before submitting |

### Workflow Automation
| Tool | Description |
|------|-------------|
| `keeperhub_list_workflows` | List all org workflows |
| `keeperhub_execute_workflow` | Run a workflow by ID |
| `keeperhub_generate_workflow` | Create a workflow from plain English |
| `keeperhub_get_execution_status` | Poll status, get tx hash |
| `keeperhub_list_executions` | Query local execution history (requires `history=True`) |

### DeFi Protocols (396 actions)
| Tool | Description |
|------|-------------|
| `keeperhub_list_protocols` | Browse all 396 available actions |
| `keeperhub_protocol_action` | Execute any action — Aave V3/V4, Uniswap, Lido, Compound V3, Morpho, Yearn V3, Curve, CowSwap, Aerodrome, Rocket Pool, Pendle, Sky, Spark, Ethena, Safe |
| `keeperhub_get_action_schema` | Get required params for any action |
| `keeperhub_search_actions` | Search 396 actions by keyword |

### Payments
| Tool | Description |
|------|-------------|
| `keeperhub_pay_and_run` | Execute a paid workflow via x402 (Base USDC) or MPP (Tempo USDC.e) |

### Agent Identity & Wallet
| Tool | Description |
|------|-------------|
| `keeperhub_register_agent` | Register agent on-chain (ERC-8004) — mints identity NFT |
| `keeperhub_wallet_balance` | Check managed wallet balance across all chains |
| `keeperhub_provision_wallet` | Provision new Turnkey-backed agentic wallet |

### Notifications
| Tool | Description |
|------|-------------|
| `keeperhub_notify` | Send notification via Discord, Slack, email, or webhook |
| `keeperhub_list_integrations` | List available notification integrations |

### Chainlink
| Tool | Description |
|------|-------------|
| `keeperhub_chainlink_ccip` | Cross-chain token transfer via Chainlink CCIP |
| `keeperhub_chainlink_price` | Get latest price from Chainlink oracle |

### Ajna Protocol
| Tool | Description |
|------|-------------|
| `keeperhub_ajna` | Permissionless lending — borrower positions, pool health, auction status |

### Utility
| Tool | Description |
|------|-------------|
| `keeperhub_run_code` | Execute custom JavaScript in KeeperHub sandbox |
| `keeperhub_math_aggregate` | Sum, average, median, min, max |

### Workflow Management
| Tool | Description |
|------|-------------|
| `keeperhub_workflow_version` | Get workflow version history |
| `keeperhub_workflow_migrate` | Migrate workflow to new version |
| `keeperhub_workflow_publish` | Publish workflow to KeeperHub marketplace |

### ENS
| Tool | Description |
|------|-------------|
| `keeperhub_ens_resolve` | Resolve ENS name → address (e.g. vitalik.eth) |
| `keeperhub_ens_text_record` | Read ENS text records (avatar, email, twitter, url) |
| `keeperhub_ens_lookup` | Reverse lookup — address → ENS name |

---

## Selective Tools

```python
# Only load what your agent needs
toolkit = KeeperHubToolkit(
    tools=["list_protocols", "protocol_action", "wallet_balance", "ens_resolve"]
)
```

---

## Retry Logic

| Request type | Retries | Backoff |
|---|---|---|
| GET (read) | 3 | Linear: 1s, 2s, 3s |
| HTTP 429 | 3 | Honours `Retry-After` header (max 60s) |
| POST/PATCH/DELETE | **0** | No retry — prevents duplicate writes |
| HTTP 4xx/5xx | 0 | Raises immediately |

---

## Never-Throws Design

Every tool returns a JSON string — never raises. The agent always has a path forward:

```json
{
  "ok": false,
  "error": "testnet_only mode — mainnet write blocked (chain 1).",
  "is_retryable": false
}
```

---

## Supported Chains (19)

Ethereum (1), Base (8453), Arbitrum (42161), Optimism (10), Polygon (137), Avalanche (43114), BNB (56), Sepolia (11155111), Base Sepolia (84532), Polygon Amoy (80002), Arbitrum Sepolia (421614), Avalanche Fuji (43113), Tempo/MPP (4217), and more.

---

## Configuration

```python
KeeperHubToolkit(
    api_key="kh_...",                    # or KEEPERHUB_API_KEY env var
    base_url="https://app.keeperhub.com", # default
    timeout=30.0,                         # per-request timeout
    tools=None,                           # None = all 31 tools
    agent_context={                       # optional observability
        "session_id": "...",
        "goal": "DeFi yield optimization",
    },
    testnet_only=False,                   # safety guardrail
    allowed_chain_ids=None,               # chain allowlist
    history=False,                        # execution store
    workflows=False,                      # MCP bridge
)
```

---

## Links

- **KeeperHub platform:** https://app.keeperhub.com
- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global
- **API docs:** https://app.keeperhub.com/api/openapi
- **ElizaOS plugin:** `@keeperhub/elizaos`
- **TypeScript LangChain:** `@keeperhub/langchain`
- **OpenClaw adapter:** `@keeperhub/openclaw-langchain`

---

## License

MIT
