# KeeperHub Agent SDK

> The complete SDK for building AI agents that execute onchain — Python, TypeScript, ElizaOS, OpenClaw, and Hermes.

Built for the **ETHGlobal OpenAgents Hackathon** · Runs on real Base mainnet · 18/18 live tests passing

---

## What Is This?

KeeperHub is an onchain automation platform with 396 DeFi actions across 19 blockchains. This repo is the **multi-framework agent SDK** that makes KeeperHub accessible to every major AI agent framework.

Before this SDK, a developer wanting to build an AI agent that executes DeFi operations had to understand KeeperHub's REST API, figure out the correct action type format, handle execution polling, manage errors, and wire everything up to their agent framework manually.

**Now it's 3 lines:**

```python
from langchain_keeperhub import KeeperHubToolkit
toolkit = KeeperHubToolkit()
tools = toolkit.get_tools()  # 31 tools, ready to use
```

---

## Set Up Your Agent in 5 Minutes

Pick your framework. Set two env vars. Run.

```bash
export KEEPERHUB_API_KEY=kh_...      # app.keeperhub.com → Settings → API Keys
export OPENROUTER_API_KEY=sk-or-...  # openrouter.ai — free models available
```

---

### Python LangChain

```bash
pip install keeperhub-langchain langchain-openai langgraph
```

```python
# quickstart.py
import asyncio, os
from langchain_keeperhub import KeeperHubToolkit
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

async def main():
    toolkit = KeeperHubToolkit(testnet_only=True)
    agent = create_react_agent(
        model=ChatOpenAI(
            model="anthropic/claude-haiku-4-5",
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY"),
        ),
        tools=toolkit.get_tools(),  # 24 tools
    )
    result = await agent.ainvoke({
        "messages": [("user", "What blockchains does KeeperHub support?")]
    })
    print(result["messages"][-1].content)

asyncio.run(main())
```

```bash
python quickstart.py
# → "KeeperHub supports 19 chains: Ethereum, Base, Arbitrum..."
```

---

### TypeScript LangChain

```bash
npm install @ethglobal-openagent/langchain-keeperhub @langchain/openai @langchain/langgraph tsx
```

```typescript
// quickstart.ts
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY!,
  testnetOnly: true,
});

const agent = createReactAgent({
  llm: new ChatOpenAI({
    model: "anthropic/claude-haiku-4-5",
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    },
  }),
  tools: toolkit.getTools(),  // 27 tools
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "Resolve vitalik.eth" }],
});
console.log(result.messages.at(-1)?.content);
// → "vitalik.eth → 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
```

```bash
npx tsx quickstart.ts
```

---

### ElizaOS

```bash
npm install @ethglobal-openagent/elizaos-keeperhub @elizaos/core
```

```typescript
import { AgentRuntime, ModelProviderName } from "@elizaos/core";
import { createKeeperHubPlugin } from "@ethglobal-openagent/elizaos-keeperhub";

const runtime = new AgentRuntime({
  modelProvider: ModelProviderName.OPENAI,  // works with any provider
  character: {
    name: "DeFi Agent",
    bio: ["I execute onchain operations via KeeperHub."],
    plugins: [
      createKeeperHubPlugin({
        apiKey: process.env.KEEPERHUB_API_KEY!,
        testnetOnly: true,
      }),
    ],
  },
});

// Agent now responds to plain English:
// "Send 0.01 ETH to vitalik.eth"   → KEEPERHUB_TRANSFER fires
// "Supply 100 USDC to Aave"        → KEEPERHUB_PROTOCOL_ACTION fires
// "What chains are supported?"     → KEEPERHUB_LIST_CHAINS fires
```

---

### OpenClaw (no code needed)

```bash
npm install -g openclaw
openclaw plugin install @ethglobal-openagent/openclaw-keeperhub
openclaw
```

```
> Check my wallet balance
→ Address: 0x554b...c49b78 | ETH: 0.05 | USDC: 100.00

> What DeFi protocols can I use?
→ 396 actions: Aave V3/V4, Uniswap, Lido, Compound V3, Morpho...

> Resolve vitalik.eth
→ 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

27 tools available in plain English. No code required.

---

### Core SDK (TypeScript — direct API access)

```bash
npm install keeperhub-sdk tsx
```

```typescript
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({ apiKey: process.env.KEEPERHUB_API_KEY! });

const wallet = await kh.wallet.getWallet();
console.log("Wallet:", wallet.walletAddress);

const chains = await kh.chains.getChains();
console.log("Chains:", chains.map(c => c.name).join(", "));

// All other packages (Python, TS, ElizaOS, OpenClaw) run on top of this.
```

```bash
npx tsx quickstart.ts
```

---

## What We Built

### 7 Framework Integrations

| Package | Framework | How | Tools / Actions |
|---------|-----------|-----|----------------|
| `packages/langchain-keeperhub/` | Python LangChain & LangGraph | Native SDK | 31 tools |
| `packages/langchain-tools/` | TypeScript LangChain & LangGraph | Native SDK | 24 tools |
| `packages/elizaos-plugin/` | ElizaOS | Native plugin | 19 actions + 2 providers + 1 evaluator |
| `packages/openclaw-adapter-langchain/` | OpenClaw | Wraps LangChain SDK → OpenClaw tools | 24 tools via our SDK |
| `packages/openclaw-adapter-elizaos/` | OpenClaw | `@elizaos/openclaw-adapter` → our ElizaOS plugin | 19 actions via our SDK |
| `packages/openclaw-skill/` | OpenClaw | SKILL.md → direct KH REST API | All 396 actions |
| `packages/hermes-skill/` | Hermes (Nous Research) | SKILL.md → KH MCP server | 20+ MCP tools |

**OpenClaw gets 3 integration paths** — pick the one that fits your agent:
- **`openclaw-adapter-langchain`** — full SDK, 24 tools, type-safe, testnetOnly guard ← recommended
- **`openclaw-adapter-elizaos`** — 19 ElizaOS actions via `@elizaos/openclaw-adapter`
- **`openclaw-skill`** — lightweight SKILL.md, calls KH REST API directly (no SDK dependency)

### Showcase Website

`keeperhub-agent-sdk/` — a live Next.js demo with 4 interactive examples showing every integration in action.

---

## Features

### Safety Guardrails
```python
# Block all mainnet writes — safe for development
toolkit = KeeperHubToolkit(testnet_only=True)

# Restrict to specific chains only
toolkit = KeeperHubToolkit(allowed_chain_ids={"11155111", "84532"})
```
Applies to `transfer`, `contract_call`, `check_and_execute`. Returns clear error message instead of executing. Available in all 3 SDK packages (Python, TS LangChain, ElizaOS).

### Execution History (Audit Trail)
```python
# SQLite-backed — stdlib only, no extra deps
toolkit = KeeperHubToolkit(history=True)           # ~/.keeperhub/executions.db
toolkit = KeeperHubToolkit(history="./project.db") # custom path
```
Automatically:
- Records every transfer and contract write with execution ID, network, amount, recipient
- Updates status when terminal state is reached (completed / failed) + stores tx hash
- Adds `keeperhub_list_executions` tool — agents can query past activity to avoid double-pays

Use cases: receipts, avoiding double-pays, crash recovery, treasury audit trail.

### MCP Bridge (Optional)
```python
# Combines our 31 native tools + KeeperHub's 20 official MCP tools = 50+ tools
toolkit = KeeperHubToolkit(workflows=True)
tools = await toolkit.aget_tools()  # async required for MCP loading
```
Install optional dep: `pip install "langchain-keeperhub[workflows]"`

### Retry Logic (GET-safe, write-safe)
- GET requests: 3 retries, linear backoff (1s, 2s, 3s) on network errors
- HTTP 429: retry with Retry-After header (capped at 60s)
- POST/PATCH/DELETE: **zero retries** — prevents duplicate blockchain transactions

### x402 / MPP Autonomous Payments
```python
# Agent pays for a workflow execution autonomously — no human approval needed
result = await tools["keeperhub_pay_and_run"]._arun(
    workflow_id="wf_abc",
    max_budget_usd="0.50",
    prefer_mpp=True  # cheaper: Tempo USDC.e vs Base USDC
)
```
AI agents can discover paid workflows, check their wallet balance, and pay autonomously via x402 (Base USDC) or MPP (Tempo USDC.e).

### ERC-8004 Agent Identity
```python
result = await tools["keeperhub_register_agent"]._arun(
    name="MyDeFiAgent",
    capabilities=["aave-v3/supply", "uniswap/swap-exact-input"]
)
# Mints an NFT on Ethereum Mainnet representing this agent's on-chain identity
```

### ENS Resolution
```python
result = await tools["keeperhub_ens_resolve"]._arun(name="vitalik.eth")
# → 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

---

## All 31 Python Tools

### Chains & Contracts
| Tool | Description |
|------|-------------|
| `keeperhub_list_chains` | List all 19 supported blockchains with metadata |
| `keeperhub_fetch_contract_abi` | Fetch verified ABI, auto-resolves EIP-1967/UUPS/Diamond proxies |

### Web3 Execution
| Tool | Description |
|------|-------------|
| `keeperhub_transfer_funds` | Send ETH or any ERC-20 token |
| `keeperhub_contract_call` | Read or write any smart contract function |
| `keeperhub_check_and_execute` | Atomic condition check → transaction (no race conditions) |
| `keeperhub_estimate_gas` | Estimate gas cost before submitting |

### Workflow Automation
| Tool | Description |
|------|-------------|
| `keeperhub_list_workflows` | List all org workflows |
| `keeperhub_execute_workflow` | Run a workflow by ID with inputs |
| `keeperhub_generate_workflow` | Create a new workflow from plain English |
| `keeperhub_get_execution_status` | Poll status, get tx hash when complete |
| `keeperhub_list_executions` | Query local execution history (requires `history=True`) |

### DeFi Protocols (396 actions)
| Tool | Description |
|------|-------------|
| `keeperhub_list_protocols` | Browse all 396 available protocol actions |
| `keeperhub_protocol_action` | Execute any action — Aave, Uniswap, Lido, Compound, Morpho, Yearn, Curve, CowSwap, Aerodrome, Rocket Pool, Pendle, Sky, Spark, Ethena, Safe |
| `keeperhub_get_action_schema` | Get required params for any action type |
| `keeperhub_search_actions` | Search actions by keyword (e.g. "supply", "swap", "stake") |

### Payments
| Tool | Description |
|------|-------------|
| `keeperhub_pay_and_run` | Execute a paid workflow via x402 (Base USDC) or MPP (Tempo USDC.e) |

### Agent Identity & Wallet
| Tool | Description |
|------|-------------|
| `keeperhub_register_agent` | Register agent on-chain (ERC-8004) — mints identity NFT |
| `keeperhub_wallet_balance` | Check managed wallet balance + payment readiness across chains |
| `keeperhub_provision_wallet` | Provision new Turnkey-backed agentic wallet (no key on disk) |

### Notifications
| Tool | Description |
|------|-------------|
| `keeperhub_notify` | Send notification via Discord, Slack, email, or webhook |
| `keeperhub_list_integrations` | List available notification integrations |

### Chainlink
| Tool | Description |
|------|-------------|
| `keeperhub_chainlink_ccip` | Cross-chain token transfer via Chainlink CCIP |
| `keeperhub_chainlink_price` | Get latest price from Chainlink oracle (ETH/USD, BTC/USD, etc.) |

### Ajna Protocol
| Tool | Description |
|------|-------------|
| `keeperhub_ajna` | Permissionless lending — check borrower positions, pool health, auction status |

### Utility
| Tool | Description |
|------|-------------|
| `keeperhub_run_code` | Execute custom JavaScript in KeeperHub's sandboxed VM |
| `keeperhub_math_aggregate` | Sum, average, median, min, max on numeric arrays |

### Workflow Management
| Tool | Description |
|------|-------------|
| `keeperhub_workflow_version` | Get workflow version history |
| `keeperhub_workflow_migrate` | Migrate workflow to a new schema version |
| `keeperhub_workflow_publish` | Publish workflow to KeeperHub marketplace |

### ENS
| Tool | Description |
|------|-------------|
| `keeperhub_ens_resolve` | Resolve ENS name → address (e.g. vitalik.eth) |
| `keeperhub_ens_text_record` | Read ENS text records (avatar, email, url, twitter) |
| `keeperhub_ens_lookup` | Reverse lookup — address → ENS name |

---

## Quick Start

### Python (LangChain / LangGraph)

```bash
pip install langchain-keeperhub langchain-openai langgraph
```

```python
import os
from langchain_keeperhub import KeeperHubToolkit
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

toolkit = KeeperHubToolkit(
    api_key=os.environ["KEEPERHUB_API_KEY"],
    testnet_only=True,   # safe for development
    history=True,        # track all executions locally
)

agent = create_react_agent(
    model=ChatOpenAI(model="gpt-4o"),
    tools=toolkit.get_tools(),
)

result = agent.invoke({
    "messages": [("user", "What's the best USDC yield on Base right now?")]
})
print(result["messages"][-1].content)
```

### TypeScript (LangChain / LangGraph)

```bash
npm install @keeperhub/langchain @langchain/openai @langchain/langgraph
```

```typescript
import { KeeperHubToolkit } from "@keeperhub/langchain";
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
  messages: [{ role: "user", content: "Check my wallet balance across all chains" }],
});
```

### ElizaOS

```typescript
import { createKeeperHubPlugin } from "@keeperhub/elizaos";

const agent = new AgentRuntime({
  character,
  plugins: [
    createKeeperHubPlugin({
      apiKey: process.env.KEEPERHUB_API_KEY,
      testnetOnly: true,
      allowedWorkflowIds: ["wf_rebalance", "wf_yield_scout"],
      agentContext: {
        sessionId: runtime.agentId,
        goal: "Autonomous DeFi yield optimization",
      },
    }),
  ],
});
```

### OpenClaw

```bash
# Install the KeeperHub skill
cp -r packages/openclaw-skill ~/.openclaw/workspace/skills/keeperhub
export KEEPERHUB_API_KEY=kh_...
# Any OpenClaw agent can now use KeeperHub — calls REST API directly
```

### Hermes

```bash
export KEEPERHUB_API_KEY=kh_...
# Hermes reads packages/hermes-skill/SKILL.md and connects to KH MCP automatically
```

---

## What Types of Agents Can Use This

**DeFi yield agents** — compare APY across Aave/Compound/Morpho/Yearn, automatically rebalance to best yield

**Trading agents** — swap on Uniswap/CowSwap/Curve, monitor prices via Chainlink, execute MEV-protected swaps

**Treasury bots** — manage DAO wallets, automate recurring transfers, maintain full audit trail via ExecutionStore

**Portfolio managers** — read balances across 19 chains, check positions, generate onchain reports

**Cross-chain agents** — move assets between Ethereum/Base/Arbitrum/Optimism via Chainlink CCIP

**Notification agents** — monitor on-chain conditions and alert via Discord/Slack/email

**Autonomous operators** — register themselves on-chain (ERC-8004), manage their own funded wallet, pay for services via x402/MPP without human approval

---

## Supported Chains (19)

| Chain | ID | | Chain | ID |
|-------|----|---|-------|----|
| Ethereum | 1 | | Sepolia | 11155111 |
| Base | 8453 | | Base Sepolia | 84532 |
| Arbitrum | 42161 | | Polygon Amoy | 80002 |
| Optimism | 10 | | Arbitrum Sepolia | 421614 |
| Polygon | 137 | | Avalanche Fuji | 43113 |
| Avalanche | 43114 | | Tempo (MPP) | 4217 |
| BNB Chain | 56 | | | |

---

## Architecture

```
keeperhub-eth-global/
│
├── packages/
│   ├── langchain-keeperhub/     # Python SDK — 31 tools, history, MCP bridge
│   │   ├── client.py            # Async HTTP + retry logic
│   │   ├── toolkit.py           # KeeperHubToolkit (testnet_only, history, workflows)
│   │   ├── store.py             # SqliteExecutionStore — audit trail
│   │   ├── mcp_bridge.py        # Optional KH MCP bridge
│   │   └── tools/               # 31 individual tool modules
│   │
│   ├── langchain-tools/         # TypeScript LangChain — 24 tools
│   │   └── src/toolkit.ts       # testnetOnly, allowedChainIds, getToolsAsync()
│   │
│   ├── elizaos-plugin/          # ElizaOS — 19 actions + 2 providers + evaluator
│   │   └── src/plugin.ts        # createKeeperHubPlugin(testnetOnly, allowedChainIds)
│   │
│   ├── openclaw-skill/          # OpenClaw — SKILL.md + protocol/chain references
│   └── hermes-skill/            # Hermes — SKILL.md with MCP config
│
├── keeperhub-agent-sdk/         # Live Next.js showcase (4 interactive demos)
└── FEEDBACK.md                  # 5 KeeperHub API bugs found and documented
```

---

## Live Test Results

Tested against real KeeperHub API with a funded Base mainnet wallet:

```
✅ PASSED:  18    (chains, ABI, transfer, contract read, workflow execute, ENS, protocols, wallet, agent registry, math)
❌ FAILED:  0
⚠️  ISSUES: 2     (KeeperHub server-side bugs — documented in FEEDBACK.md)
```

The 2 issues are KeeperHub server bugs we discovered and reported:
- `GET /api/gas/estimate` → 500 (ethers.js bug on their backend)
- `chainlink/eth-usd-latest-round-data` → 422 (missing server-side protocol config)

---

## KeeperHub API Bugs Found During Development

During testing we found and documented 5 previously undocumented behaviors that were breaking integrations:

| # | Endpoint | Issue | Status |
|---|----------|-------|--------|
| 1 | Two key types (`kh_` vs `wfb_`) | Undocumented distinction — `kh_` returns `[]` for workflows on some accounts | Documented |
| 2 | `GET /api/mcp/schemas` | Returns a dict `{actions: {...}}` not a list — broke all schema tools | Fixed in our code |
| 3 | `GET /api/user/wallet/balances` | 500 Prometheus metrics bug | Workaround via `/api/user/wallet/tokens` |
| 4 | `POST /api/execute/transfer` | API requires `recipientAddress`/`tokenAddress` not `to`/`token` | Fixed in our code |
| 5 | Execution status paths | Workflow vs direct executions use different URLs | Fallback added |

All documented with exact request/response examples in `FEEDBACK.md`.

---

## Environment Variables

```bash
KEEPERHUB_API_KEY=kh_...       # Required — API management key (kh_ prefix)
KEEPERHUB_WEBHOOK_KEY=wfb_...  # Optional — for webhook-triggered workflows (wfb_ prefix)
KEEPERHUB_BASE_URL=https://... # Optional — defaults to https://app.keeperhub.com
```

---

## License

MIT · Built for ETHGlobal OpenAgents Hackathon 2026
