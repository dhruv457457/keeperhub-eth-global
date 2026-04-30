---
name: keeperhub
description: Execute onchain DeFi operations, blockchain transactions, smart contract calls, and workflow automation via KeeperHub. Use when the user wants to transfer tokens, read/write contracts, interact with Aave/Uniswap/Lido/Compound/Morpho, check wallet balance, manage KeeperHub workflows, resolve ENS names, or automate onchain tasks across 19 chains.
version: 1.0.0
license: MIT
metadata:
  mcp:
    server: https://app.keeperhub.com/mcp
    transport: streamable_http
    auth: bearer
    envVar: KEEPERHUB_API_KEY
    description: "KeeperHub MCP server exposes 20+ tools for workflow management, DeFi protocol actions, and onchain automation."
---

# KeeperHub Skill

KeeperHub is an onchain automation platform with 396 DeFi actions across 19 blockchains. This skill connects Hermes agents to KeeperHub via its MCP server, giving access to workflow management, DeFi protocol execution, and blockchain automation tools.

## MCP Connection

When `KEEPERHUB_API_KEY` is set, Hermes connects to KeeperHub's MCP server automatically:
- Server: `https://app.keeperhub.com/mcp`
- Transport: Streamable HTTP
- Auth: Bearer token (your API key)

Get your API key: app.keeperhub.com → Settings → API Keys

## Available MCP Tools

The KeeperHub MCP server exposes tools for:

| Tool | Description |
|------|-------------|
| `list_workflows` | List all available automation workflows |
| `execute_workflow` | Run a workflow by ID |
| `create_workflow` | Create a new workflow |
| `get_execution_status` | Poll execution status and get tx hash |
| `ai_generate_workflow` | Generate a workflow from plain English |
| `list_protocols` | Browse 396 DeFi protocol actions |
| `get_action_schema` | Get params for any protocol action |
| `execute_protocol_action` | Execute Aave/Uniswap/Lido/Compound actions |
| `list_chains` | List 19 supported blockchains |
| `transfer_funds` | Send ETH or ERC-20 tokens |
| `contract_call` | Read/write any smart contract |
| `wallet_balance` | Check managed wallet balances |
| `register_agent` | Register agent on-chain (ERC-8004) |
| `ens_resolve` | Resolve ENS name to address |

## When To Use

- User wants to **transfer** ETH, USDC, or any ERC-20 token
- User asks about **DeFi yields** (Aave, Compound, Morpho, Yearn)
- User wants to **swap tokens** (Uniswap, Curve, CowSwap)
- User wants to **stake** (Lido, Rocket Pool, Ethena)
- User wants to **read or write** a smart contract
- User wants to **create or run** a KeeperHub automation workflow
- User wants to **resolve an ENS name** (e.g. vitalik.eth)

## Supported Chains (19 total)

Mainnets: Ethereum (1), Base (8453), Arbitrum (42161), Optimism (10), Polygon (137), Avalanche (43114)
Testnets: Sepolia (11155111), Base Sepolia (84532), Polygon Amoy (80002)

## Quick Reference

### Transfer tokens
Use `transfer_funds` with: `network`, `recipientAddress`, `amount`, `tokenAddress` (optional)

### DeFi actions
Use `execute_protocol_action` with: `actionType` (e.g. `"aave-v3/supply"`), `config` (protocol params)
Use `get_action_schema` first to see required params for any action.

### Workflows
Use `list_workflows` → find the right one → `execute_workflow` with workflow ID

### Generate new workflow
Use `ai_generate_workflow` with a plain English description of what you want to automate.

## Safety

- Always confirm amounts and recipients with the user before executing transfers
- Show the expected outcome of DeFi actions before executing
- Use testnets (Sepolia 11155111) for development and testing

## Links

- Dashboard: https://app.keeperhub.com
- Docs: https://docs.keeperhub.com
- API Reference: https://app.keeperhub.com/api/openapi
- GitHub: https://github.com/dhruv457457/keeperhub-eth-global
