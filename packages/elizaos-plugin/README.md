# @ethglobal-openagent/elizaos-keeperhub

[![npm](https://img.shields.io/npm/v/@ethglobal-openagent/elizaos-keeperhub)](https://www.npmjs.com/package/@ethglobal-openagent/elizaos-keeperhub)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

**KeeperHub plugin for ElizaOS** — gives any ElizaOS agent the ability to execute DeFi operations, blockchain transactions, cross-chain transfers, workflow automation, and onchain notifications across 19 chains.

Built for the **ETHGlobal OpenAgents Hackathon**.

---

## Install

```bash
npm install @ethglobal-openagent/elizaos-keeperhub
```

---

## Quick Start

```typescript
import { createKeeperHubPlugin } from "@ethglobal-openagent/elizaos-keeperhub";

const agent = new AgentRuntime({
  character,
  plugins: [
    createKeeperHubPlugin({
      apiKey: process.env.KEEPERHUB_API_KEY,
    }),
  ],
});
```

---

## Features

### 19 Actions

| Action | Trigger phrases | What it does |
|--------|----------------|--------------|
| `KEEPERHUB_LIST_WORKFLOWS` | "list workflows", "show automations" | List all KeeperHub workflows |
| `KEEPERHUB_EXECUTE_WORKFLOW` | "run workflow", "execute" | Run a workflow by ID |
| `KEEPERHUB_GENERATE_WORKFLOW` | "create workflow", "automate" | Generate workflow from plain English |
| `KEEPERHUB_CHECK_EXECUTION` | "check status", "execution status" | Poll execution status + tx hash |
| `KEEPERHUB_TRANSFER` | "send ETH", "transfer tokens" | Transfer ETH or ERC-20 tokens |
| `KEEPERHUB_CONTRACT_READ` | "read contract", "call view function" | Read any smart contract |
| `KEEPERHUB_LIST_CHAINS` | "supported chains", "what networks" | List 19 supported blockchains |
| `KEEPERHUB_PROTOCOL_ACTION` | "supply to Aave", "swap on Uniswap" | Execute any of 396 DeFi protocol actions |
| `KEEPERHUB_ESTIMATE_GAS` | "how much gas", "estimate cost" | Estimate gas before a transaction |
| `KEEPERHUB_CHECK_AND_EXECUTE` | "if balance > X then transfer" | Atomic condition check + transaction |
| `KEEPERHUB_REGISTER_AGENT` | "register on-chain", "ERC-8004" | Register agent identity (mints NFT) |
| `KEEPERHUB_PAY_AND_RUN` | "pay and run", "paid workflow" | Execute paid workflow via x402/MPP |
| `KEEPERHUB_NOTIFY` | "send notification", "alert via Discord" | Send Discord/Slack/email notification |
| `KEEPERHUB_CHAINLINK_CCIP` | "cross-chain transfer", "bridge via CCIP" | Cross-chain token transfer |
| `KEEPERHUB_RUN_CODE` | "run JavaScript", "execute code" | Execute JS in KeeperHub sandbox |
| `KEEPERHUB_ACTION_SCHEMA` | "what params does Aave need" | Get schema for any protocol action |
| `KEEPERHUB_WORKFLOW_VERSION` | "workflow history", "versions" | Get workflow version history |
| `KEEPERHUB_WORKFLOW_MIGRATE` | "migrate workflow" | Migrate workflow to new version |

### 2 Providers

- **Wallet Provider** — injects wallet address and token balances into agent context
- **Workflows Provider** — injects available workflows into agent context for better decisions

### 1 Evaluator

- **Execution Success** — detects execution IDs in conversation, stores outcomes in agent memory

---

## Safety Options

```typescript
createKeeperHubPlugin({
  apiKey: process.env.KEEPERHUB_API_KEY,

  // Block all mainnet writes — safe for development
  testnetOnly: true,

  // Restrict to specific chains
  allowedChainIds: ["11155111", "84532"],

  // Only allow specific workflows to execute
  allowedWorkflowIds: ["wf_rebalance", "wf_yield_scout"],

  // Disable web3 actions entirely (workflow-only mode)
  enableWeb3Actions: false,

  // Observability — appears in KeeperHub logs
  agentContext: {
    sessionId: runtime.agentId,
    goal: "Autonomous DeFi yield optimization",
  },
})
```

---

## Supported DeFi Protocols (396 actions)

Aave V3/V4, Uniswap, Lido, Compound V3, Morpho, Yearn V3, Curve, CowSwap, Aerodrome, Rocket Pool, Pendle, Sky (MakerDAO), Spark, Ethena, Safe, Chainlink CCIP

---

## Supported Chains (19)

Ethereum (1), Base (8453), Arbitrum (42161), Optimism (10), Polygon (137), Avalanche (43114), BNB (56), Sepolia (11155111), Base Sepolia (84532), and more.

---

## Links

- **KeeperHub:** https://app.keeperhub.com
- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global
- **Python SDK:** `pip install keeperhub-langchain`
- **TS LangChain:** `npm install @ethglobal-openagent/langchain-keeperhub`

---

## License

MIT
