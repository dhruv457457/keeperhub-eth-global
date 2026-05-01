# @ethglobal-openagent/langchain-keeperhub

[![npm](https://img.shields.io/npm/v/@ethglobal-openagent/langchain-keeperhub)](https://www.npmjs.com/package/@ethglobal-openagent/langchain-keeperhub)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Give any TypeScript LangChain agent onchain superpowers — 27 tools for DeFi, transfers, ENS, workflows, and more.

---

## Skill Install

```bash
npx agentskills install keeperhub
```

---

## Install

```bash
npm install @ethglobal-openagent/langchain-keeperhub
```

---

## 5-Minute Quickstart

```typescript
// npm install @ethglobal-openagent/langchain-keeperhub @langchain/openai langgraph
// KEEPERHUB_API_KEY=kh_... OPENAI_API_KEY=sk-... npx ts-node quickstart.ts

import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY!,
  testnetOnly: true, // safe for dev
});

const agent = createReactAgent({
  llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
  tools: toolkit.getTools(),
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "What blockchains does KeeperHub support?" }],
});
console.log(result.messages.at(-1)?.content);
// → "KeeperHub supports 19 chains: Ethereum, Base, Arbitrum..."
```

Get your API key at [app.keeperhub.com](https://app.keeperhub.com) → Settings → API Keys.

---

## Safety

```typescript
const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY!,

  // Block all mainnet writes — safe for development
  testnetOnly: true,

  // Restrict to specific chains
  allowedChainIds: new Set(["11155111", "84532"]), // Sepolia, Base Sepolia
});
```

Applies to `keeperhub_transfer_funds`, `keeperhub_contract_call`, `keeperhub_check_and_execute`. Returns a structured error instead of executing on mainnet.

---

## Async Tools (MCP Bridge)

```typescript
const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY!,
  workflows: true, // load KeeperHub's official MCP workflow tools
});

// Must use async variant when workflows: true
const tools = await toolkit.getToolsAsync();
```

---

## All 27 Tools

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
| `keeperhub_list_executions` | Query execution history |

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

### Ajna
| Tool | Description |
|------|-------------|
| `keeperhub_ajna` | Permissionless lending — borrower positions, pool health, auction status |

### Utility
| Tool | Description |
|------|-------------|
| `keeperhub_run_code` | Execute custom JavaScript in KeeperHub sandbox |
| `keeperhub_math_aggregate` | Sum, average, median, min, max |

---

## Links

- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/packages/langchain-tools
- **KeeperHub platform:** https://app.keeperhub.com
- **API docs:** https://app.keeperhub.com/api/openapi
- **Python version:** `pip install keeperhub-langchain`
- **ElizaOS plugin:** `npm install @keeperhub/elizaos`
- **OpenClaw adapter:** `openclaw plugin install @ethglobal-openagent/openclaw-keeperhub`

---

## License

MIT
