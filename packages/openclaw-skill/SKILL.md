---
name: keeperhub
description: Execute onchain DeFi operations, blockchain transactions, smart contract calls, and workflow automation via KeeperHub. Use when the user wants to transfer tokens, read/write contracts, interact with Aave/Uniswap/Lido/Compound/Morpho, check wallet balance, manage KeeperHub workflows, resolve ENS names, or automate onchain tasks across 19 chains.
version: 1.0.0
license: MIT
metadata:
  openclaw:
    requires:
      env:
        - KEEPERHUB_API_KEY
    envVars:
      - name: KEEPERHUB_API_KEY
        required: true
        description: "KeeperHub API key (kh_ prefix). Get from app.keeperhub.com → Settings → API Keys."
    primaryEnv: KEEPERHUB_API_KEY
    emoji: "⛓️"
    homepage: https://github.com/dhruv457457/keeperhub-eth-global
---

# KeeperHub Skill

KeeperHub is an onchain automation platform with 396 DeFi actions across 19 blockchains. Use this skill to execute blockchain operations, interact with DeFi protocols, and manage automated workflows on behalf of the user.

## When To Use

- User wants to **transfer** ETH, USDC, or any ERC-20 token
- User asks about **DeFi yields** (Aave, Compound, Morpho, Yearn)
- User wants to **swap tokens** (Uniswap, Curve, CowSwap, Aerodrome)
- User wants to **stake** (Lido, Rocket Pool, Ethena)
- User wants to **read or write** a smart contract
- User wants to **create or run** a KeeperHub automation workflow
- User asks about **supported blockchains**
- User wants to **resolve an ENS name** (e.g. vitalik.eth)
- User wants **cross-chain transfers** via Chainlink CCIP

## Authentication

All requests require: `Authorization: Bearer $KEEPERHUB_API_KEY`

## Supported Chains

See `references/CHAINS.md` for all 19 chains. Key ones:
- Ethereum (1), Base (8453), Arbitrum (42161), Optimism (10)
- Polygon (137), Avalanche (43114), BNB Chain (56)
- Testnets: Sepolia (11155111), Base Sepolia (84532)

## Core API Operations

### 1. List Supported Chains
```
GET https://app.keeperhub.com/api/chains
```

### 2. Check Wallet Balance
```
GET https://app.keeperhub.com/api/user/wallet
GET https://app.keeperhub.com/api/user/wallet/tokens
```

### 3. Transfer Tokens
```
POST https://app.keeperhub.com/api/execute/transfer
{
  "network": "<chainId>",
  "recipientAddress": "<0x...>",
  "amount": "<decimal string>",
  "tokenAddress": "<0x...>"    // omit for native ETH
}
```
Returns `executionId`. Poll with Step 7.

### 4. Read/Write Smart Contract
```
POST https://app.keeperhub.com/api/execute/contract-call
{
  "network": "<chainId>",
  "contractAddress": "<0x...>",
  "functionName": "<name>",
  "functionArgs": "[]",
  "callType": "read"           // or "write" — write returns executionId
}
```

### 5. Fetch Contract ABI (auto-resolves proxies)
```
GET https://app.keeperhub.com/api/chains/<chainId>/abi?address=<0x...>
```

### 6. Execute DeFi Protocol Action (396 actions)
```
POST https://app.keeperhub.com/api/execute/node
{
  "actionType": "<protocol>/<action>",
  "config": {
    "network": "<chainId>",
    // protocol-specific params
  }
}
```
See `references/PROTOCOLS.md` for all actionType values.
Examples:
- `"aave-v3/supply"` — supply to Aave V3 lending pool
- `"uniswap/swap-exact-input"` — swap on Uniswap
- `"lido/wrap"` — wrap ETH to stETH via Lido
- `"compound-v3/supply"` — supply to Compound V3
- `"morpho/supply"` — supply to Morpho
- `"chainlink/ccip-send"` — cross-chain token transfer

### 7. Check Execution Status
```
# For workflow executions:
GET https://app.keeperhub.com/api/workflows/executions/<executionId>/status

# For direct executions (transfer, contract write):
GET https://app.keeperhub.com/api/execute/<executionId>/status
```
Poll until `status` is `completed`, `failed`, or `cancelled`.
`transactionHash` is available once completed.

### 8. List Workflows
```
GET https://app.keeperhub.com/api/workflows
```

### 9. Execute Workflow
```
POST https://app.keeperhub.com/api/workflow/<workflowId>/execute
{ "input": { ...params } }
```

### 10. Generate Workflow from Natural Language
```
POST https://app.keeperhub.com/api/ai/generate
{ "prompt": "<plain English description of what the workflow should do>" }
```

### 11. Resolve ENS Name
```
GET https://api.ensideas.com/ens/resolve/<name.eth>
```
Returns `{ address: "0x...", name: "vitalik.eth", ... }`

### 12. Get Action Schema (learn params for any action)
```
GET https://app.keeperhub.com/api/mcp/schemas
```
Returns `{ actions: { "<actionType>": { requiredFields, optionalFields, outputFields } } }`

## Agent Workflow Pattern

1. **Understand intent** → identify the right action type
2. **Check schema** if needed → `GET /api/mcp/schemas` → find `requiredFields`
3. **Check balance** → `GET /api/user/wallet/tokens`
4. **Execute** → POST the action, get `executionId`
5. **Poll status** → GET status endpoint until terminal state
6. **Report** → share `transactionHash` and human-readable summary

## Error Handling

- `executionId` returned → poll for status, don't retry immediately
- `400` → wrong params — check the action schema
- `402` → payment required (x402 protocol) — insufficient wallet balance
- `422` → validation error — fix the request body
- `500` → KeeperHub server error — retry once after 2 seconds

## Safety Notes

- Always confirm with the user before executing write transactions
- Show the user the amount, recipient, and chain before calling transfer
- For DeFi actions, show expected outcome before executing
