# @ethglobal-openagent/langchain-keeperhub

[![npm](https://img.shields.io/npm/v/@ethglobal-openagent/langchain-keeperhub)](https://www.npmjs.com/package/@ethglobal-openagent/langchain-keeperhub)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**TypeScript LangChain toolkit for KeeperHub** — 24 tools for building AI agents that execute DeFi operations, blockchain transactions, workflow automation, and onchain payments.

Built for the **ETHGlobal OpenAgents Hackathon**.

---

## Install

```bash
npm install @ethglobal-openagent/langchain-keeperhub
```

---

## Quick Start

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY!,
  testnetOnly: true,
});

const agent = createReactAgent({
  llm: new ChatOpenAI({ model: "gpt-4o" }),
  tools: toolkit.getTools(),
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "What's the best USDC yield on Base?" }],
});
```

---

## All 24 Tools

| Tool | Description |
|------|-------------|
| `keeperhub_list_chains` | List 19 supported blockchains |
| `keeperhub_fetch_contract_abi` | Fetch verified ABI (auto-resolves proxies) |
| `keeperhub_transfer_funds` | Send ETH or ERC-20 tokens |
| `keeperhub_contract_call` | Read or write any smart contract |
| `keeperhub_check_and_execute` | Atomic condition check + transaction |
| `keeperhub_estimate_gas` | Estimate gas cost |
| `keeperhub_list_workflows` | List KeeperHub workflows |
| `keeperhub_execute_workflow` | Run a workflow by ID |
| `keeperhub_generate_workflow` | Create workflow from plain English |
| `keeperhub_get_execution_status` | Poll status + get tx hash |
| `keeperhub_list_protocols` | Browse 396 DeFi protocol actions |
| `keeperhub_protocol_action` | Execute Aave/Uniswap/Lido/Compound actions |
| `keeperhub_get_action_schema` | Get required params for any action |
| `keeperhub_search_actions` | Search 396 actions by keyword |
| `keeperhub_pay_and_run` | Pay via x402/MPP and run workflow |
| `keeperhub_register_agent` | Register on-chain identity (ERC-8004) |
| `keeperhub_wallet_balance` | Check wallet balance across all chains |
| `keeperhub_provision_wallet` | Provision new agentic wallet |
| `keeperhub_notify` | Send Discord/Slack/email notification |
| `keeperhub_chainlink_ccip` | Cross-chain transfer via CCIP |
| `keeperhub_ens_resolve` | Resolve ENS name → address |
| `keeperhub_ens_lookup` | Reverse lookup address → ENS |
| `keeperhub_math_aggregate` | Sum, average, min, max |
| `keeperhub_run_code` | Execute JavaScript in sandbox |

---

## Safety Options

```typescript
const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY!,

  // Block all mainnet writes
  testnetOnly: true,

  // Restrict to specific chains
  allowedChainIds: new Set(["11155111", "84532"]),
});
```

---

## MCP Bridge (50+ tools)

```typescript
const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY!,
  workflows: true,  // load KeeperHub's 20 official MCP tools
});

// Must use async when workflows=true
const tools = await toolkit.getToolsAsync();
```

---

## Links

- **KeeperHub:** https://app.keeperhub.com
- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global
- **Python SDK:** `pip install keeperhub-langchain`
- **ElizaOS plugin:** `npm install @ethglobal-openagent/elizaos-keeperhub`

---

## License

MIT
