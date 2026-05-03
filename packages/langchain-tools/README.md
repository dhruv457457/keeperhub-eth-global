# @ethglobal-openagent/langchain-keeperhub

![KeeperHub](../../image.png)

[![npm](https://img.shields.io/npm/v/@ethglobal-openagent/langchain-keeperhub)](https://www.npmjs.com/package/@ethglobal-openagent/langchain-keeperhub)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

Give any TypeScript LangChain agent onchain superpowers — 25 tools for DeFi, transfers, ENS, workflows, and more.

---

## Quick Install (Pick One)

### 🦞 1. OpenClaw (NO CODE — fastest demo)
```bash
npm install -g openclaw
openclaw plugin install @ethglobal-openagent/openclaw-keeperhub
openclaw
```
👉 **Docs:** [OpenClaw Adapter](https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/docs/openclaw)

Optional (Eliza tools inside OpenClaw):
```bash
openclaw plugin install @ethglobal-openagent/openclaw-eliza-keeperhub
```

### 🟦 2. TypeScript (LangChain)
```bash
npm install @ethglobal-openagent/langchain-keeperhub @langchain/openai @langchain/langgraph
```
👉 **Docs:** [TypeScript LangChain](https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/docs/ts-langchain)

### 🐍 3. Python (LangChain)
```bash
pip install keeperhub-langchain langchain-openai langgraph
```
👉 **Docs:** [Python LangChain](https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/docs/python-langchain)

### 🟣 4. ElizaOS
```bash
npm install @ethglobal-openagent/elizaos-keeperhub @elizaos/core
```
👉 **Docs:** [ElizaOS Plugin](https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/docs/elizaos)

### ⚙️ 5. Core SDK (direct API)
```bash
npm install keeperhub-sdk
```
👉 **Docs:** [KeeperHub SDK](https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/docs/sdk)

---

## 5-Minute Quickstart

```typescript
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
```

Get your API key at [app.keeperhub.com](https://app.keeperhub.com) → Settings → API Keys.

---

## Safety

```typescript
const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY!,
  testnetOnly: true,                          // Block all mainnet writes
  allowedChainIds: ["11155111", "84532"],     // Restrict to specific chains
});
```

👉 **Full safety docs:** [Architecture](https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/docs/architecture.md)

---

## All 25 Tools

👉 **Full tool reference with params, inputs, and examples:** [SKILLS.md](./SKILLS.md)

| Category | Tools |
|----------|-------|
| **Chains** | `keeperhub_list_chains`, `keeperhub_fetch_contract_abi` |
| **Web3** | `keeperhub_transfer_funds`, `keeperhub_contract_call`, `keeperhub_check_and_execute`, `keeperhub_estimate_gas` |
| **Workflows** | `keeperhub_list_workflows`, `keeperhub_execute_workflow`, `keeperhub_generate_workflow`, `keeperhub_get_execution_status`, `keeperhub_list_executions` |
| **DeFi** | `keeperhub_list_protocols`, `keeperhub_protocol_action`, `keeperhub_get_action_schema`, `keeperhub_search_actions` |
| **Payments** | `keeperhub_pay_and_run` |
| **Identity** | `keeperhub_register_agent`, `keeperhub_wallet_balance`, `keeperhub_provision_wallet` |
| **ENS** | `keeperhub_ens_resolve`, `keeperhub_ens_text_record`, `keeperhub_ens_lookup` |
| **Chainlink** | `keeperhub_chainlink_ccip`, `keeperhub_chainlink_price` |
| **Ajna** | `keeperhub_ajna` |
| **Utility** | `keeperhub_run_code`, `keeperhub_math_aggregate`, `keeperhub_notify`, `keeperhub_list_integrations` |

---

## Hermes

Used with MCP-compatible agents. **Not a standalone runtime.**

Set up via the KeeperHub SDK's MCP module:
```typescript
import { KeeperHub } from "keeperhub-sdk";
const kh = new KeeperHub({ apiKey: process.env.KEEPERHUB_API_KEY! });
// Use kh.mcp.connect() for MCP-compatible clients
```

👉 **MCP Docs:** [SDK MCP Module](https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/docs/sdk/modules/mcp.md)

---

## Links

- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/packages/langchain-tools
- **KeeperHub platform:** https://app.keeperhub.com
- **API docs:** https://app.keeperhub.com/api/openapi
- **Architecture:** [Architecture Overview](https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/docs/architecture.md)
- **Telegram Bot:** [t.me/khethworkbot](https://t.me/khethworkbot)

---

## License

Apache-2.0
