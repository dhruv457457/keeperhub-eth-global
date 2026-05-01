# @keeperhub/elizaos

[![npm](https://img.shields.io/npm/v/@keeperhub/elizaos)](https://www.npmjs.com/package/@keeperhub/elizaos)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

KeeperHub plugin for ElizaOS — 19 actions for DeFi, transfers, and workflow automation.

---

## Skill Install

```bash
npx agentskills install keeperhub
```

---

## Install

```bash
npm install @keeperhub/elizaos
```

---

## 5-Minute Quickstart

```typescript
// npm install @keeperhub/elizaos @elizaos/core
// export KEEPERHUB_API_KEY=kh_...

import { AgentRuntime, ModelProviderName } from "@elizaos/core";
import { createKeeperHubPlugin } from "@keeperhub/elizaos";

const plugin = createKeeperHubPlugin({
  apiKey: process.env.KEEPERHUB_API_KEY!,
  testnetOnly: true,
});

const runtime = new AgentRuntime({
  modelProvider: ModelProviderName.OPENAI,
  character: {
    name: "DeFi Agent",
    bio: ["I help with onchain DeFi operations via KeeperHub."],
    plugins: [plugin],
  },
});

// Agent now responds to:
// "Check my wallet balance" → calls keeperhub_wallet_balance
// "Send 0.01 ETH to vitalik.eth" → ENS resolve + transfer
// "What's the best USDC yield on Base?" → protocol_action with Aave
```

Get your API key at [app.keeperhub.com](https://app.keeperhub.com) → Settings → API Keys.

---

## All 19 Actions

| Action | Trigger Phrases | What It Does |
|--------|----------------|--------------|
| `KEEPERHUB_LIST_WORKFLOWS` | "list workflows", "show automations" | List all KeeperHub workflows |
| `KEEPERHUB_EXECUTE_WORKFLOW` | "run workflow", "execute workflow" | Run a workflow by ID |
| `KEEPERHUB_GENERATE_WORKFLOW` | "create workflow", "automate this" | Generate workflow from plain English |
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
| `KEEPERHUB_WALLET_BALANCE` | "check my balance", "wallet balance" | Check wallet balance across chains |
| `KEEPERHUB_ENS_RESOLVE` | "resolve ENS", "what address is vitalik.eth" | Resolve ENS name → address |
| `KEEPERHUB_WORKFLOW_VERSION` | "workflow history", "versions" | Get workflow version history |

---

## Safety

```typescript
createKeeperHubPlugin({
  apiKey: process.env.KEEPERHUB_API_KEY!,

  // Block all mainnet writes — safe for development
  testnetOnly: true,

  // Restrict to specific chains
  allowedChainIds: ["11155111", "84532"], // Sepolia, Base Sepolia
})
```

---

## Links

- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/packages/elizaos-plugin
- **KeeperHub platform:** https://app.keeperhub.com
- **API docs:** https://app.keeperhub.com/api/openapi
- **Python LangChain:** `pip install keeperhub-langchain`
- **TS LangChain:** `npm install @ethglobal-openagent/langchain-keeperhub`
- **OpenClaw (ElizaOS):** `openclaw plugin install @ethglobal-openagent/openclaw-eliza-keeperhub`

---

## License

MIT
