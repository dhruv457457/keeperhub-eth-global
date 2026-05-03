# keeperhub-sdk

The core TypeScript SDK that wraps the KeeperHub REST API. All other TypeScript packages (`@ethglobal-openagent/langchain-keeperhub`, `@ethglobal-openagent/elizaos-keeperhub`, both OpenClaw adapters) depend on this.

## Install

```bash
npm install keeperhub-sdk
```

## Quickstart

```typescript
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({ apiKey: process.env.KEEPERHUB_API_KEY! });

const wallet    = await kh.wallet.get();
const chains    = await kh.chains.list();
const workflows = await kh.workflows.list();

console.log(wallet.walletAddress);
console.log(`${chains.length} chains, ${workflows.length} workflows`);
```

## Modules

| Module | Description | Docs |
|--------|-------------|------|
| `kh.wallet` | Wallet address and balances | [wallet.md](./modules/wallet.md) |
| `kh.workflows` | Create, list, execute workflows | [workflows.md](./modules/workflows.md) |
| `kh.executions` | Poll and stream execution status | [executions.md](./modules/executions.md) |
| `kh.chains` | Supported blockchain list | [chains.md](./modules/chains.md) |
| `kh.web3` | Transfers and contract calls | [web3.md](./modules/web3.md) |
| `kh.protocols` | 396 DeFi protocol actions | [protocols.md](./modules/protocols.md) |
| `kh.payments` | x402 and MPP payment execution | [payments.md](./modules/payments.md) |
| `kh.pipeline` | Fluent multi-step operation builder | [pipeline.md](./modules/pipeline.md) |
| `kh.templates` | Pre-built workflow templates | [templates.md](./modules/templates.md) |
| `kh.integrations` | List configured integrations | [integrations.md](./modules/integrations.md) |
| `kh.analytics` | Usage stats and spend tracking | [analytics.md](./modules/analytics.md) |
| HTTP Client | Retry logic, error types, config | [client.md](./modules/client.md) |
| Webhooks | Verify incoming webhook signatures | [webhooks.md](./modules/webhooks.md) |
| MCP | Connect via Model Context Protocol | [mcp.md](./modules/mcp.md) |
| React Hooks | `useWallet`, `useChains`, etc. | [react.md](./modules/react.md) |

## HTTP Client Config

```typescript
const kh = new KeeperHub({
  apiKey: "kh_...",
  baseUrl: "https://app.keeperhub.com",  // default
  timeout: 30000,                         // ms
  maxAttempts: 3,                         // GET retries
});
```

**Retry policy:** GET = 3 retries with backoff. POST/PATCH/DELETE = zero retries (prevents duplicate transactions). HTTP 429 = honours `Retry-After` header, capped at 60s.

## Notes

- This is the **least tested** package — prefer the LangChain or ElizaOS packages for agent use cases
- React hooks require `@tanstack/react-query` as a peer dependency
- Analytics endpoints return 401 on some plan types — always handle gracefully
