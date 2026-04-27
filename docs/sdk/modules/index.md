---
title: "Modules"
description: "Complete reference for all 18 modules on the KeeperHub SDK root class."
---

# Modules

The `KeeperHub` class exposes 18 modules, each scoped to a specific area of the API. All modules share the same `HttpClient` instance, which handles authentication, retry, timeout, and agent context headers automatically.

```typescript
const kh = new KeeperHub({ apiKey: "kh_..." });

kh.workflows    // Workflow CRUD, execute, generate
kh.executions   // Poll status, get logs, cancel, handle
kh.pipeline()   // Primary execution interface (fluent builder)
kh.payments     // Catalog, x402/MPP execute, preflight, history
kh.earnings     // Creator revenue from paid workflows
kh.web3         // Transfer, contract read/write, check-and-execute
kh.protocols    // Aave, Uniswap, Lido, and other DeFi protocol actions
kh.wallet       // Managed wallet — balances, tokens, RPC preferences
kh.analytics    // Runs, time-series, network usage, spend cap, stream
kh.events       // Real-time execution event subscriptions
kh.agent        // ERC-8004 on-chain agent registry
kh.chains       // Supported blockchain networks
kh.projects     // Workflow project folders
kh.tags         // Workflow tags
kh.addressBook  // Saved wallet addresses
kh.apiKeys      // Programmatic API key management
kh.templates    // Public workflow template library
kh.integrations // Discord, SendGrid, webhook integrations
kh.debug        // Execution tracing, replay, failure summaries
kh.mcp          // AI-facing schema catalog and OpenAPI spec
```

## Module Quick Reference

| Module | Key methods |
|---|---|
| `workflows` | `list`, `get`, `create`, `update`, `delete`, `execute`, `run`, `generateSpec`, `generateAndCreate` |
| `executions` | `get`, `getStatus`, `getLogs`, `list`, `cancel`, `handle` |
| `payments` | `catalog`, `execute`, `prepare`, `preflight`, `balance`, `history`, `getTransaction` |
| `earnings` | `summary` |
| `web3` | `transfer`, `call`, `read`, `write`, `checkAndExecute`, `estimateGas` |
| `protocols` | `list`, `search`, `get`, `execute` |
| `wallet` | `get`, `balances`, `tokens`, `withdraw`, `setRpc`, `removeRpc`, `getRpcPreferences` |
| `analytics` | `summary`, `runs`, `runSteps`, `timeSeries`, `networks`, `spendCap`, `stream` |
| `events` | `subscribe`, `on` |
| `agent` | `getRegistry`, `getRegistrations`, `register`, `ensureRegistered` |
| `chains` | `list`, `get` |
| `projects` | `list`, `create`, `update`, `delete` |
| `tags` | `list`, `create`, `update`, `delete` |
| `addressBook` | `list`, `create`, `update`, `delete` |
| `apiKeys` | `list`, `create`, `delete` |
| `templates` | `list`, `get`, `search`, `use` |
| `integrations` | `list`, `create`, `update`, `delete`, `test` |
| `debug` | `getTrace`, `explainFailure`, `replay` |
| `mcp` | `getSchemas`, `getOpenApiSpec` |

## Detailed Guides

- [Workflows & Executions](/sdk/modules/workflows)
- [Payments & Earnings](/sdk/modules/payments)
- [Web3 Operations](/sdk/modules/web3)
- [Analytics & Events](/sdk/modules/analytics)
- [Agent Identity (ERC-8004)](/sdk/modules/agent)
