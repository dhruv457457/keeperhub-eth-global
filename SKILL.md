---
name: keeperhub
description: Execute onchain DeFi operations, blockchain transactions, smart contract calls, ENS resolution, and workflow automation via KeeperHub. Use when the user wants to transfer tokens, read/write contracts, interact with Aave/Uniswap/Lido/Compound, check wallet balance, manage KeeperHub workflows, swap tokens, bridge assets via Chainlink CCIP, or automate any onchain task across 19 blockchains.
version: 1.0.0
license: MIT
author: Dhruv Pancholi
homepage: https://github.com/dhruv457457/keeperhub-eth-global
metadata:
  openclaw:
    requires:
      env:
        - KEEPERHUB_API_KEY
    primaryEnv: KEEPERHUB_API_KEY
    emoji: "⛓️"
  hermes:
    mcp:
      server: https://app.keeperhub.com/mcp
      transport: streamable_http
      auth: bearer
      envVar: KEEPERHUB_API_KEY
---

# KeeperHub Skill

## What This Does

Execute any onchain operation via KeeperHub's REST API — transfers, DeFi protocols, smart contracts, ENS, workflows, cross-chain, and notifications. Works across 19 blockchains.

## Authentication

```bash
export KEEPERHUB_API_KEY=kh_...   # Get from app.keeperhub.com → Settings → API Keys
```

## Install

```bash
# For any agent (agentskills.io)
npx agentskills install keeperhub

# For OpenClaw (LangChain tools)
openclaw plugin install @ethglobal-openagent/openclaw-keeperhub

# For OpenClaw (ElizaOS actions)
openclaw plugin install @ethglobal-openagent/openclaw-eliza-keeperhub

# For Python LangChain
pip install keeperhub-langchain

# For TypeScript LangChain
npm install @ethglobal-openagent/langchain-keeperhub

# For ElizaOS
npm install @keeperhub/elizaos
```

## When To Use

- User wants to transfer ETH or ERC-20 tokens to an address or ENS name
- User asks about DeFi yields (Aave, Compound, Morpho, Yearn)
- User wants to swap tokens (Uniswap, Curve, CowSwap, Aerodrome)
- User wants to supply/borrow/repay on lending protocols
- User wants to read or write a smart contract
- User wants to create or run a KeeperHub workflow automation
- User asks about supported blockchains or gas costs
- User wants to resolve an ENS name to an address
- User wants to bridge tokens cross-chain (Chainlink CCIP)
- User wants to register an agent identity on-chain (ERC-8004)
- User wants to send a Discord/Slack/email notification from an agent

## Core API Endpoints

### Check Wallet

```
GET https://app.keeperhub.com/api/user/wallet
GET https://app.keeperhub.com/api/user/wallet/tokens?chainId=<id>
Headers: Authorization: Bearer $KEEPERHUB_API_KEY
```

### List Supported Chains

```
GET https://app.keeperhub.com/api/chains
Headers: Authorization: Bearer $KEEPERHUB_API_KEY
```

### Transfer Tokens

```
POST https://app.keeperhub.com/api/execute/transfer
Headers: Authorization: Bearer $KEEPERHUB_API_KEY
Body: {
  "network": "8453",              // chain ID (Base = 8453)
  "recipientAddress": "0x...",   // or ENS: resolve first
  "amount": "0.01",              // decimal string
  "tokenAddress": "0x..."        // omit for native ETH/gas token
}
```

### Read/Write Smart Contract

```
POST https://app.keeperhub.com/api/execute/contract-call
Headers: Authorization: Bearer $KEEPERHUB_API_KEY
Body: {
  "network": "8453",
  "contractAddress": "0x...",
  "functionName": "balanceOf",
  "functionArgs": "[\"0x...\"]",  // JSON array as string
  "callType": "read"              // or "write"
}
```

### DeFi Protocol Action (396 actions)

```
POST https://app.keeperhub.com/api/execute/node
Headers: Authorization: Bearer $KEEPERHUB_API_KEY
Body: {
  "actionType": "aave-v3/supply",   // format: protocol/action
  "config": {
    "network": "8453",
    "amount": "100",
    "tokenAddress": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
  }
}
```

Common actionTypes:
- `aave-v3/supply` — Supply to Aave V3
- `aave-v3/borrow` — Borrow from Aave V3
- `uniswap/swap-exact-input` — Swap on Uniswap
- `lido/wrap` — Stake ETH via Lido
- `compound-v3/supply` — Supply to Compound V3
- `morpho/supply` — Supply to Morpho
- `curve/exchange` — Swap on Curve

### List Workflows

```
GET https://app.keeperhub.com/api/workflows
Headers: Authorization: Bearer $KEEPERHUB_API_KEY
```

### Execute Workflow

```
POST https://app.keeperhub.com/api/workflow/<id>/execute
Headers: Authorization: Bearer $KEEPERHUB_API_KEY
Body: { "input": { ...params } }
```

### Check Execution Status

```
GET https://app.keeperhub.com/api/workflows/executions/<id>/status
Fallback: GET https://app.keeperhub.com/api/execute/<id>/status
Headers: Authorization: Bearer $KEEPERHUB_API_KEY
```

### Resolve ENS Name

```
GET https://api.ensideas.com/ens/resolve/<name.eth>
```

Response: `{ "address": "0x...", "name": "vitalik.eth" }`

### Send Notification

```
POST https://app.keeperhub.com/api/notifications/send
Headers: Authorization: Bearer $KEEPERHUB_API_KEY
Body: {
  "integrationId": "<id>",
  "message": "Agent completed transfer of 0.01 ETH",
  "title": "Transfer Complete"
}
```

## Supported Chains (19)

| Chain | ID | Use |
|---|---|---|
| Ethereum | 1 | Mainnet |
| Base | 8453 | Mainnet (USDC for x402) |
| Arbitrum | 42161 | Mainnet |
| Optimism | 10 | Mainnet |
| Polygon | 137 | Mainnet |
| Avalanche | 43114 | Mainnet |
| BNB | 56 | Mainnet |
| Sepolia | 11155111 | Testnet |
| Base Sepolia | 84532 | Testnet |
| Polygon Amoy | 80002 | Testnet |
| Arbitrum Sepolia | 421614 | Testnet |
| Avalanche Fuji | 43113 | Testnet |
| Tempo | 4217 | MPP payments (USDC.e) |

## Response Format

All endpoints return `{ "ok": true, ... }` on success or `{ "ok": false, "error": "..." }` on failure.

## Links

- Platform: https://app.keeperhub.com
- API docs: https://app.keeperhub.com/api/openapi
- GitHub: https://github.com/dhruv457457/keeperhub-eth-global
