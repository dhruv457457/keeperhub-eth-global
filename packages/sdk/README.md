# keeperhub-sdk

[![npm](https://img.shields.io/npm/v/keeperhub-sdk)](https://www.npmjs.com/package/keeperhub-sdk)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

**TypeScript SDK for KeeperHub** — the onchain workflow automation platform. Build AI agents that execute DeFi operations, blockchain transactions, and automated workflows across 19 chains.

Built for the **ETHGlobal OpenAgents Hackathon**.

---

## Install

```bash
npm install keeperhub-sdk
# or
pnpm add keeperhub-sdk
```

---

## Quick Start

```typescript
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({ apiKey: process.env.KEEPERHUB_API_KEY });

// List supported chains
const chains = await kh.chains.list();

// Transfer tokens
const exec = await kh.web3.transfer({
  network: "11155111",
  recipientAddress: "0x...",
  amount: "0.001",
});

// Poll for tx hash
const status = await kh.executions.getStatus(exec.executionId);
console.log(status.transactionHash);
```

---

## What's Included

### Core Modules

| Module | Description |
|--------|-------------|
| `kh.chains` | List 19 supported blockchains, fetch contract ABIs |
| `kh.web3` | Transfer tokens, read/write contracts, estimate gas |
| `kh.workflows` | List, create, execute, duplicate, version workflows |
| `kh.executions` | Poll execution status, stream logs, cancel |
| `kh.protocols` | Execute any of 396 DeFi protocol actions |
| `kh.payments` | x402 / MPP payment-gated workflow execution |
| `kh.wallet` | Manage Turnkey-backed agentic wallets |
| `kh.agent` | ERC-8004 on-chain agent identity |
| `kh.mcp` | KeeperHub MCP server integration |
| `kh.builder` | Workflow builder DSL |
| `kh.pipeline` | Pipeline builder |
| `kh.webhooks` | Verify webhook signatures |
| `kh.analytics` | Analytics streaming |
| `kh.apiKeys` | API key management |
| `kh.integrations` | Discord, Slack, email integrations |

### Key Features

- **396 DeFi protocol actions** — Aave V3/V4, Uniswap, Lido, Compound V3, Morpho, Yearn V3, Curve, CowSwap, Aerodrome, Rocket Pool, Pendle, Sky, Spark, Ethena, Safe, Chainlink CCIP
- **19 supported chains** — Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche + testnets
- **Retry logic** — GET: exponential backoff, POST/PATCH/DELETE: no retry (prevents duplicate writes)
- **x402 / MPP payments** — agent-autonomous payment for paid API calls
- **ERC-8004** — on-chain agent identity and registration
- **Turnkey custody** — server-side wallet management, no private keys on disk
- **React hooks** — `useKeeperHub()`, `usePipeline()` for frontend agent dashboards
- **TypeScript-first** — full type coverage, Zod validation

---

## DeFi Protocol Actions

```typescript
// Execute any of 396 protocol actions
const result = await kh.protocols.execute({
  actionType: "aave-v3/supply",
  config: {
    network: "8453",       // Base mainnet
    asset: "0x833589...", // USDC
    amount: "100",
  },
});

// Search available actions
const actions = await kh.protocols.search("supply");
const schema = await kh.protocols.getSchema("uniswap/swap-exact-input");
```

---

## Workflow Automation

```typescript
// Generate a workflow from plain English
const workflow = await kh.workflows.generate({
  prompt: "Monitor USDC yield on Aave and Compound, notify via Discord when difference > 0.5%"
});

// Execute it
const exec = await kh.workflows.execute(workflow.id, { threshold: "0.5" });

// Stream execution logs
for await (const event of kh.executions.stream(exec.executionId)) {
  console.log(event.step, event.status);
}
```

---

## Payments (x402 / MPP)

```typescript
// Discover paid workflows
const catalog = await kh.payments.catalog({ limit: 10 });

// Execute with payment (x402 on Base USDC)
const result = await kh.payments.execute("workflow-slug", {}, {
  maxBudgetUsd: "0.50",
  preferMpp: true,  // cheaper: Tempo USDC.e
});
```

---

## Agent Identity (ERC-8004)

```typescript
// Register agent on-chain — mints identity NFT
const registration = await kh.agent.register({
  name: "MyDeFiAgent",
  description: "Autonomous yield optimizer",
  capabilities: ["aave-v3/supply", "uniswap/swap-exact-input"],
});
console.log(registration.tokenId); // NFT token ID
```

---

## React Hooks

```typescript
import { KeeperHubProvider, useKeeperHub, usePipeline } from "keeperhub-sdk/react";

function App() {
  return (
    <KeeperHubProvider apiKey={process.env.KEEPERHUB_API_KEY}>
      <AgentDashboard />
    </KeeperHubProvider>
  );
}

function AgentDashboard() {
  const { kh } = useKeeperHub();
  const { run, status, result } = usePipeline();
  // ...
}
```

---

## Supported Chains

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

## Framework Integrations

This SDK is the foundation for:

- **Python LangChain:** `pip install keeperhub-langchain`
- **TypeScript LangChain:** `npm install @ethglobal-openagent/langchain-keeperhub`
- **ElizaOS:** `npm install @ethglobal-openagent/elizaos-keeperhub`
- **OpenClaw:** `npm install @ethglobal-openagent/openclaw-keeperhub`

---

## Links

- **KeeperHub platform:** https://app.keeperhub.com
- **API docs:** https://app.keeperhub.com/api/openapi
- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global

---

## License

Apache 2.0
