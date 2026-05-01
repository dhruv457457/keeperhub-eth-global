# keeperhub-sdk

[![npm](https://img.shields.io/npm/v/keeperhub-sdk)](https://www.npmjs.com/package/keeperhub-sdk)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

The core TypeScript SDK powering all KeeperHub agent integrations — direct REST API access, wallet management, workflow automation, and streaming.

---

## Skill Install

```bash
npx agentskills install keeperhub
```

---

## Install

```bash
npm install keeperhub-sdk
```

---

## 5-Minute Quickstart

```typescript
// npm install keeperhub-sdk
// export KEEPERHUB_API_KEY=kh_...

import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({ apiKey: process.env.KEEPERHUB_API_KEY! });

// Check wallet
const wallet = await kh.wallet.getWallet();
console.log("Wallet:", wallet.walletAddress);

// List supported chains
const chains = await kh.chains.getChains();
console.log("Chains:", chains.map(c => c.name).join(", "));

// Transfer tokens (testnet)
const tx = await kh.web3.transfer({
  network: "84532", // Base Sepolia
  recipientAddress: "0x1234...",
  amount: "0.001",
});
console.log("TX:", tx.transactionHash);
```

Get your API key at [app.keeperhub.com](https://app.keeperhub.com) → Settings → API Keys.

---

## Key Modules

| Module | Description |
|--------|-------------|
| `kh.wallet` | Manage Turnkey-backed agentic wallets, check balances |
| `kh.chains` | List 19 supported blockchains, fetch contract ABIs |
| `kh.web3` | Transfer tokens, read/write contracts, estimate gas |
| `kh.workflows` | List, create, execute, duplicate, and version workflows |
| `kh.executions` | Poll execution status, stream logs, cancel |
| `kh.protocols` | Execute any of 396 DeFi protocol actions |
| `kh.ens` | Resolve ENS names, reverse lookup, read text records |
| `kh.notifications` | Send Discord/Slack/email/webhook notifications |
| `kh.analytics` | Analytics streaming and execution metrics |

---

## Used By

All 5 KeeperHub agent packages depend on this SDK:

| Package | Install |
|---------|---------|
| Python LangChain toolkit | `pip install keeperhub-langchain` |
| TypeScript LangChain toolkit | `npm install @ethglobal-openagent/langchain-keeperhub` |
| ElizaOS plugin | `npm install @keeperhub/elizaos` |
| OpenClaw LangChain adapter | `openclaw plugin install @ethglobal-openagent/openclaw-keeperhub` |
| OpenClaw ElizaOS adapter | `openclaw plugin install @ethglobal-openagent/openclaw-eliza-keeperhub` |

Use this SDK directly when you need low-level control over the KeeperHub API, want to build your own agent integration, or are working outside of LangChain/ElizaOS.

---

## Links

- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/packages/sdk
- **KeeperHub platform:** https://app.keeperhub.com
- **API docs:** https://app.keeperhub.com/api/openapi

---

## License

MIT
