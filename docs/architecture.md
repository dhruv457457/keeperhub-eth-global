# Architecture

## Overview

The KeeperHub Agent SDK is a multi-layer system. One core SDK wraps the KeeperHub REST API, and four framework integrations sit on top of it — each exposing the same onchain capabilities in a different agent framework's native pattern.

```
┌─────────────────────────────────────────────────────────────┐
│                    KeeperHub REST API                        │
│         app.keeperhub.com  ·  19 chains  ·  396 DeFi actions│
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     keeperhub-sdk                            │
│              packages/sdk  ·  npm: keeperhub-sdk             │
│   TypeScript HTTP client, retry logic, typed responses       │
└──────┬──────────────────┬──────────────────────────────────-┘
       │                  │
       ▼                  ▼
┌──────────────┐   ┌──────────────────────────────┐
│  TS LangChain│   │       ElizaOS Plugin          │
│  25 tools    │   │  17 actions + 2 providers     │
│  packages/   │   │  packages/elizaos-plugin       │
│  langchain-  │   │  npm: @ethglobal-openagent/   │
│  tools       │   │       elizaos-keeperhub        │
└──────┬───────┘   └───────────────┬───────────────┘
       │                           │
       ▼                           ▼
┌──────────────┐   ┌───────────────────────────────┐
│ OpenClaw     │   │ OpenClaw ElizaOS Adapter       │
│ LangChain    │   │ packages/openclaw-adapter-     │
│ Adapter      │   │ elizaos                        │
│ packages/    │   │ npm: @ethglobal-openagent/     │
│ openclaw-    │   │      openclaw-eliza-keeperhub  │
│ adapter-     │   └───────────────────────────────┘
│ langchain    │
└──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Python LangChain                            │
│              packages/langchain-keeperhub                    │
│              PyPI: keeperhub-langchain  ·  24 tools          │
│   Standalone — calls KeeperHub API directly (no SDK dep)    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Telegram Bot                             │
│              telegram-bot/                                   │
│   grammy + KeeperHubToolkit (TS) + OpenRouter LLM           │
│   Live at t.me/khethworkbot                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Packages

### `packages/sdk` — Core SDK
**npm:** `keeperhub-sdk`

The foundation for all TypeScript packages. Wraps the KeeperHub REST API with:
- Typed HTTP client with retry + backoff
- GET requests: 3 retries, linear backoff (1s, 2s, 3s)
- POST/PATCH/DELETE: zero retries (prevents duplicate blockchain transactions)
- HTTP 429: respects `Retry-After` header, capped at 60s
- Modules: `wallet`, `workflows`, `executions`, `chains`, `analytics`

All other TypeScript packages depend on this.

---

### `packages/langchain-tools` — TypeScript LangChain Toolkit
**npm:** `@ethglobal-openagent/langchain-keeperhub`

25 `DynamicStructuredTool` instances for LangChain / LangGraph agents. Uses `KeeperHubToolkit` class:

```typescript
const toolkit = new KeeperHubToolkit({ apiKey, testnetOnly: true });
const tools = toolkit.getTools(); // 25 tools
```

Depends on: `keeperhub-sdk`

---

### `packages/elizaos-plugin` — ElizaOS Plugin
**npm:** `@ethglobal-openagent/elizaos-keeperhub`

17 ElizaOS `Action` objects + 2 context `Provider` objects. Actions fire automatically when user messages match trigger phrases. Providers inject wallet and workflow context into every message.

```typescript
const plugin = createKeeperHubPlugin({ apiKey, testnetOnly: true });
```

Depends on: `keeperhub-sdk`

---

### `packages/openclaw-adapter-langchain` — OpenClaw LangChain Adapter
**npm:** `@ethglobal-openagent/openclaw-keeperhub`

Wraps the TS LangChain toolkit as native OpenClaw tools. Loads 25 tools at startup via `api.registerTool()`. Converts Zod schemas → JSON Schema draft-7 (required by OpenClaw).

Install in OpenClaw:
```bash
openclaw plugin install @ethglobal-openagent/openclaw-keeperhub
```

Depends on: `@ethglobal-openagent/langchain-keeperhub`

---

### `packages/openclaw-adapter-elizaos` — OpenClaw ElizaOS Adapter
**npm:** `@ethglobal-openagent/openclaw-eliza-keeperhub`

Wraps the ElizaOS plugin as native OpenClaw actions. Loads 17 actions with `eliza_keeperhub_*` prefix.

Install in OpenClaw:
```bash
openclaw plugin install @ethglobal-openagent/openclaw-eliza-keeperhub
```

Depends on: `@ethglobal-openagent/elizaos-keeperhub`

---

### `packages/langchain-keeperhub` — Python LangChain Toolkit
**PyPI:** `keeperhub-langchain`

24 Python LangChain tools. **Standalone** — does not depend on `keeperhub-sdk`. Makes HTTP calls directly to the KeeperHub REST API via its own `KeeperHubClient` (httpx-based).

```python
from langchain_keeperhub import KeeperHubToolkit
toolkit = KeeperHubToolkit(api_key="kh_...")
tools = toolkit.get_tools()  # 24 tools
```

---

### `telegram-bot/` — Telegram Bot
**Live:** [t.me/khethworkbot](https://t.me/khethworkbot)

Not a published package — a runnable bot. Stack:
- **grammy** — Telegram bot framework
- **`@ethglobal-openagent/langchain-keeperhub`** — KeeperHub toolkit (local file ref)
- **OpenAI SDK** — pointed at OpenRouter for LLM access
- **LangChain ReAct agent** — tool-calling loop

Each user provides their own `kh_` API key. The bot creates a separate agent instance per user.

---

## LLM Provider

All demos use **OpenRouter** as the LLM provider:
- Model: `anthropic/claude-haiku-4-5`
- Env var: `OPENROUTER_API_KEY`
- Why: single key accesses 100+ models, free tier available, compatible with OpenAI SDK

OpenRouter is not part of the SDK — it's used only in demo scripts and the Telegram bot.

---

## Data Flow

Every user message goes through the same path regardless of framework:

```
User message
    │
    ▼
LLM (Claude Haiku via OpenRouter)
    │  decides which tool to call
    ▼
Tool handler (LangChain tool / ElizaOS action / OpenClaw tool)
    │  makes HTTP request
    ▼
KeeperHub REST API
    │  executes onchain
    ▼
Blockchain (Base, Ethereum, Arbitrum, etc.)
    │
    ▼
Result → LLM → natural language response → User
```

---

## Safety Options

All frameworks support the same safety guards:

| Option | Description |
|--------|-------------|
| `testnetOnly: true` | Blocks all mainnet write operations. Reads always work. |
| `allowedChainIds: Set(["84532"])` | Restricts writes to specific chain IDs only. |

Applies to: `keeperhub_transfer`, `keeperhub_contract_call`, `keeperhub_check_and_execute`.

Testnets: Sepolia (11155111), Base Sepolia (84532), Polygon Amoy (80002), Arbitrum Sepolia (421614), Avalanche Fuji (43113), Tempo (4217).

---

## Dependency Graph

```
keeperhub-sdk
├── @ethglobal-openagent/langchain-keeperhub
│   └── @ethglobal-openagent/openclaw-keeperhub
└── @ethglobal-openagent/elizaos-keeperhub
    └── @ethglobal-openagent/openclaw-eliza-keeperhub

keeperhub-langchain  (no TypeScript SDK dependency)

telegram-bot
└── @ethglobal-openagent/langchain-keeperhub (local file ref)
```
