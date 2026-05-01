# keeperhub-langchain

[![PyPI](https://img.shields.io/pypi/v/keeperhub-langchain)](https://pypi.org/project/keeperhub-langchain/)
[![Python](https://img.shields.io/pypi/pyversions/keeperhub-langchain)](https://pypi.org/project/keeperhub-langchain/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-24%20passing-brightgreen)](https://github.com/dhruv457457/keeperhub-eth-global)

Give any Python LangChain agent onchain superpowers — 24 tools for DeFi, transfers, ENS, workflows, and more.

---

## Skill Install

```bash
npx agentskills install keeperhub
```

---

## Install

```bash
pip install keeperhub-langchain
```

With MCP bridge (adds KeeperHub's official workflow tools):
```bash
pip install "keeperhub-langchain[workflows]"
```

---

## 5-Minute Quickstart

```python
import asyncio, os
from langchain_keeperhub import KeeperHubToolkit
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

# pip install keeperhub-langchain langchain-openai langgraph
# export KEEPERHUB_API_KEY=kh_...
# export OPENAI_API_KEY=sk-...

async def main():
    toolkit = KeeperHubToolkit(testnet_only=True)  # safe for dev
    agent = create_react_agent(
        model=ChatOpenAI(model="gpt-4o-mini"),
        tools=toolkit.get_tools(),
    )
    result = await agent.ainvoke({
        "messages": [("user", "What blockchains does KeeperHub support?")]
    })
    print(result["messages"][-1].content)
    # → "KeeperHub supports 19 chains: Ethereum, Base, Arbitrum, Optimism..."

asyncio.run(main())
```

Get your API key at [app.keeperhub.com](https://app.keeperhub.com) → Settings → API Keys.

---

## Safety

```python
# Block all mainnet writes — safe for development
toolkit = KeeperHubToolkit(testnet_only=True)

# Restrict to specific chains only
toolkit = KeeperHubToolkit(
    testnet_only=True,
    allowed_chain_ids={"11155111", "84532"},  # Sepolia, Base Sepolia
)
```

Applies to `transfer_funds`, `contract_call`, `check_and_execute`. Returns a structured error instead of executing on mainnet.

---

## Execution History

```python
# SQLite-backed — zero extra deps
toolkit = KeeperHubToolkit(history=True)           # ~/.keeperhub/executions.db
toolkit = KeeperHubToolkit(history="./project.db") # custom path

# Or bring your own store
from langchain_keeperhub import SqliteExecutionStore
toolkit = KeeperHubToolkit(history=SqliteExecutionStore("./executions.db"))
```

When `history=True`, every `transfer_funds` call is persisted with execution ID, network, amount, and recipient. `get_execution_status` updates the row with the tx hash when the transaction completes.

---

## MCP Bridge (Optional)

```python
# Combines native tools + KeeperHub's official MCP tools
toolkit = KeeperHubToolkit(
    workflows=True,
    mcp_include={"list_workflows", "execute_workflow", "ai_generate_workflow"},
)
tools = await toolkit.aget_tools()  # must use async when workflows=True
```

---

## All 24 Tools

### Chains
| Tool | Description |
|------|-------------|
| `keeperhub_list_chains` | List all 19 supported blockchains |
| `keeperhub_fetch_contract_abi` | Fetch verified ABI, auto-resolves EIP-1967/UUPS/Diamond proxies |

### Web3
| Tool | Description |
|------|-------------|
| `keeperhub_transfer_funds` | Send ETH or any ERC-20 token |
| `keeperhub_contract_call` | Read or write any smart contract function |
| `keeperhub_check_and_execute` | Atomic condition check + transaction |
| `keeperhub_estimate_gas` | Estimate gas cost before submitting |

### Workflows
| Tool | Description |
|------|-------------|
| `keeperhub_list_workflows` | List all org workflows |
| `keeperhub_execute_workflow` | Run a workflow by ID |
| `keeperhub_generate_workflow` | Create a workflow from plain English |
| `keeperhub_get_execution_status` | Poll status, get tx hash |

### DeFi
| Tool | Description |
|------|-------------|
| `keeperhub_list_protocols` | Browse all 396 available protocol actions |
| `keeperhub_protocol_action` | Execute any action — Aave V3/V4, Uniswap, Lido, Compound V3, Morpho, Yearn V3, Curve, CowSwap, Aerodrome |
| `keeperhub_get_action_schema` | Get required params for any action |
| `keeperhub_search_actions` | Search 396 actions by keyword |

### Payments
| Tool | Description |
|------|-------------|
| `keeperhub_pay_and_run` | Execute a paid workflow via x402 (Base USDC) or MPP (Tempo USDC.e) |

### Identity
| Tool | Description |
|------|-------------|
| `keeperhub_register_agent` | Register agent on-chain (ERC-8004) — mints identity NFT |
| `keeperhub_wallet_balance` | Check managed wallet balance across all chains |
| `keeperhub_provision_wallet` | Provision new Turnkey-backed agentic wallet |

### ENS
| Tool | Description |
|------|-------------|
| `keeperhub_ens_resolve` | Resolve ENS name → address (e.g. vitalik.eth) |
| `keeperhub_ens_text_record` | Read ENS text records (avatar, email, twitter, url) |
| `keeperhub_ens_lookup` | Reverse lookup — address → ENS name |

### Chainlink
| Tool | Description |
|------|-------------|
| `keeperhub_chainlink_ccip` | Cross-chain token transfer via Chainlink CCIP |
| `keeperhub_chainlink_price` | Get latest price from Chainlink oracle |

### Utility
| Tool | Description |
|------|-------------|
| `keeperhub_run_code` | Execute custom JavaScript in KeeperHub sandbox |
| `keeperhub_math_aggregate` | Sum, average, median, min, max |

---

## Config Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | `str` | env `KEEPERHUB_API_KEY` | KeeperHub API key |
| `base_url` | `str` | `https://app.keeperhub.com` | API base URL |
| `timeout` | `float` | `30.0` | Per-request timeout in seconds |
| `tools` | `list[str]` | `None` (all 24) | Allowlist of tool names to load |
| `testnet_only` | `bool` | `False` | Block all mainnet writes |
| `allowed_chain_ids` | `set[str]` | `None` | Chain ID allowlist |
| `history` | `bool \| str \| Store` | `False` | Execution history store |
| `workflows` | `bool` | `False` | Enable MCP bridge |
| `agent_context` | `dict` | `None` | Session/goal metadata for observability |

---

## Links

- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/packages/langchain-keeperhub
- **KeeperHub platform:** https://app.keeperhub.com
- **API docs:** https://app.keeperhub.com/api/openapi
- **TypeScript version:** `npm install @ethglobal-openagent/langchain-keeperhub`
- **ElizaOS plugin:** `npm install @keeperhub/elizaos`
- **OpenClaw adapter:** `openclaw plugin install @ethglobal-openagent/openclaw-keeperhub`

---

## License

MIT
