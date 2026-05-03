# @ethglobal-openagent/elizaos-keeperhub — ElizaOS Plugin

ElizaOS plugin for KeeperHub. Provides 17 actions and 2 context providers that integrate directly into ElizaOS agent runtimes, enabling on-chain DeFi execution, workflow automation, and wallet management through natural conversation.

## Installation

```bash
npm install @ethglobal-openagent/elizaos-keeperhub
```

Requires ElizaOS 0.1.7+.

## Authentication

```bash
export KEEPERHUB_API_KEY=your_api_key_here
```

## Setup

```typescript
import { createKeeperHubPlugin } from "@ethglobal-openagent/elizaos-keeperhub";
import { AgentRuntime } from "@elizaos/core";

const keeperHubPlugin = createKeeperHubPlugin({
  apiKey: process.env.KEEPERHUB_API_KEY,
  testnetOnly: false,  // Set true to restrict to testnets
});

const runtime = new AgentRuntime({
  // ... other runtime config
  plugins: [keeperHubPlugin],
});
```

## Safety Options

| Option | Type | Description |
|---|---|---|
| `testnetOnly` | `boolean` | When `true`, rejects any action targeting a mainnet chain. Useful for staging environments. |

## Actions (17)

| Action | Trigger Phrases | Description |
|---|---|---|
| [`KEEPERHUB_TRANSFER`](./actions/transfer.md) | "send", "transfer", "pay" | Send ETH or ERC-20 tokens |
| [`KEEPERHUB_WALLET_BALANCE`](./actions/wallet-balance.md) | "wallet balance", "how much", "my balance" | Check managed wallet balances |
| [`KEEPERHUB_GENERATE_WORKFLOW`](./actions/generate-workflow.md) | "create a workflow", "automate", "build workflow" | Generate workflow from natural language |
| [`KEEPERHUB_EXECUTE_WORKFLOW`](./actions/execute-workflow.md) | "run", "execute" + wf_xxx ID | Run a saved workflow |
| [`KEEPERHUB_REGISTER_AGENT`](./actions/register-agent.md) | "register agent", "onchain identity", "ERC-8004" | Mint ERC-8004 agent NFT |
| [`KEEPERHUB_ENS_RESOLVE`](./actions/ens-resolve.md) | message contains ".eth" | Resolve ENS name to address |
| [`KEEPERHUB_CHAINLINK_PRICE`](./actions/chainlink-price.md) | "price", "ETH price", "Chainlink" | Fetch live asset price |
| `KEEPERHUB_LIST_WORKFLOWS` | "list workflows", "show workflows" | List saved workflows |
| `KEEPERHUB_GET_EXECUTION` | "execution status", "check execution" | Check execution status |
| `KEEPERHUB_PROTOCOL_ACTION` | "supply to aave", "swap on uniswap" | Execute DeFi protocol action |
| `KEEPERHUB_CONTRACT_CALL` | "call contract", "read contract" | Read/write smart contract |
| `KEEPERHUB_PAY_AND_RUN` | "pay and run", "payment workflow" | Payment-gated workflow |
| `KEEPERHUB_LIST_PROTOCOLS` | "list protocols", "available protocols" | List DeFi action library |
| `KEEPERHUB_LIST_CHAINS` | "list chains", "supported chains" | List supported networks |
| `KEEPERHUB_NOTIFY` | "notify", "send alert", "ping me" | Send notification |
| `KEEPERHUB_CREATE_PROJECT` | "create project", "new project" | Create org project |
| `KEEPERHUB_LIST_PROJECTS` | "list projects", "my projects" | List org projects |

## Context Providers (2)

| Provider | Description |
|---|---|
| `KEEPERHUB_WALLET_CONTEXT` | Injects current wallet balance and payment readiness into agent context before each message. |
| `KEEPERHUB_CHAIN_CONTEXT` | Injects supported chain list into agent context (loaded once at startup). |

## Notes

- Actions are triggered by natural language pattern matching in the ElizaOS runtime. The trigger phrases listed above are examples — the runtime uses fuzzy matching.
- The `testnetOnly` flag is especially important for production deployments; set `testnetOnly: false` explicitly to enable mainnet operations.
- Context providers run automatically and do not require explicit invocation.
- All API calls use `Authorization: Bearer $KEEPERHUB_API_KEY` against `https://app.keeperhub.com`.
