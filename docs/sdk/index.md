---
title: "TypeScript SDK"
description: "Official TypeScript SDK for KeeperHub — add reliable onchain execution to any AI agent or dApp in minutes."
---

# KeeperHub TypeScript SDK

The `keeperhub-sdk` package is the official TypeScript client for the KeeperHub API. It provides a fully-typed interface for every KeeperHub capability — workflows, executions, payments, web3 operations, analytics, and more — plus a purpose-built layer for AI agents.

## Why the SDK?

Building directly against the KeeperHub REST API requires handling retries, auth headers, error parsing, x402/MPP payment challenges, and streaming responses manually. The SDK handles all of that and adds an agent-native abstraction layer that makes autonomous agents safe to deploy.

| Without SDK | With SDK |
|---|---|
| Write retry/backoff logic | Built into `HttpClient` — exponential backoff, configurable attempts |
| Parse 402 payment challenges | `pipeline().pay()` handles x402 and MPP automatically |
| Build LangChain tool definitions | `KeeperHubToolkit` — 2 lines, full tool set |
| Build ElizaOS plugin | `createKeeperHubPlugin` — 1 line, all actions + providers |
| Handle agent crashes on errors | `tryRun()` and `safeWait()` — never throw, return structured observations |
| Generate workflow from prompt | `kh.pipeline().generate("...").wait()` |

## Packages

| Package | Description | Install |
|---|---|---|
| `keeperhub-sdk` | Core SDK — all modules, pipeline API, React hooks | `npm install keeperhub-sdk` |
| `@keeperhub/langchain` | LangChain toolkit — 4 tools + `buildSystemPrompt()` | `npm install @keeperhub/langchain` |
| `@keeperhub/elizaos` | ElizaOS plugin — 5 actions, 2 providers, full plugin factory | `npm install @keeperhub/elizaos` |

## Quick Example

```typescript
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({ apiKey: process.env.KEEPERHUB_API_KEY });

// Generate a workflow from natural language, pay via x402/MPP, wait for result
const obs = await kh.pipeline()
  .generate("Compound my Aave USDC rewards on Base every Monday")
  .pay({ budget: "0.10", dailyBudget: "1.00" })
  .safeWait(); // never throws — safe for agent loops

if (obs.ok) {
  console.log(obs.summary); // "Workflow completed successfully. Execution ID: exec_abc."
} else {
  console.log(obs.error?.suggestedAction); // what to do next
}
```

## Documentation

- [Quickstart](/sdk/quickstart) — get running in 5 minutes
- [Pipeline API](/sdk/pipeline) — the primary execution interface
- [Payments](/sdk/payments) — x402 and MPP payment handling
- [Agent-Native APIs](/sdk/agent-native) — `tryRun`, `safeWait`, `capabilities`, `agentContext`
- [Security](/sdk/security) — webhook verification, SSRF protection, input sanitization
- [Framework Integrations](/sdk/framework-integrations/) — LangChain and ElizaOS
- [React Hooks](/sdk/react/) — hooks and provider for React dApps
- [Modules](/sdk/modules/) — full reference for all 18 modules
