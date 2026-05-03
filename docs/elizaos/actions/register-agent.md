# KEEPERHUB_REGISTER_AGENT

Mint an ERC-8004 agent identity NFT on Base mainnet.

## What It Does

Registers the ElizaOS agent on-chain by minting an ERC-8004 NFT on Base. The action first checks if the agent is already registered (idempotent) and returns the existing token if so. Requires approximately 0.001 ETH in the managed wallet to cover gas.

## Trigger Phrases

The action matches messages containing:
- "register agent" (e.g. "register this agent on-chain")
- "onchain identity" (e.g. "give this agent an onchain identity")
- "ERC-8004" (e.g. "mint an ERC-8004 NFT")
- "agent identity"
- "register on Base"

## Schema

```typescript
// Extracted from message context
{
  name?: string           // Agent name (defaults to runtime agent name)
  description?: string    // Agent description
  capabilities?: string[] // Parsed from message or runtime capabilities list
}
```

## Example Conversation

```
User: Register this agent on-chain with the name "NIYAT DeFi Agent"

Agent: I'll check if this agent is already registered first...

No existing registration found. Minting ERC-8004 NFT on Base...

Agent registered successfully!
• Token ID: 42
• Contract: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
• Network: Base
• Wallet: 0xAbCd1234...5678
• Tx: https://basescan.org/tx/0xf1e2d3c4...b5a6
```

### Already Registered

```
User: Register agent on-chain

Agent: This agent is already registered on Base.

• Token ID: 42
• Contract: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
• Wallet: 0xAbCd1234...5678

No new transaction was submitted.
```

## Example Output (action result)

```json
{
  "tokenId": "42",
  "txHash": "0xf1e2d3c4...b5a6",
  "contract": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  "network": "base",
  "walletAddress": "0xAbCd1234...5678",
  "name": "NIYAT DeFi Agent",
  "capabilities": ["defi", "cross-chain"],
  "alreadyRegistered": false,
  "basescanUrl": "https://basescan.org/tx/0xf1e2d3c4...b5a6"
}
```

## Notes

- **Idempotent**: the action checks for existing registration before minting. Calling it multiple times is safe.
- Requires ~0.001 ETH on the managed wallet on Base. If insufficient, the action will report the required top-up amount.
- The ERC-8004 registry is on Base mainnet only — this action always targets Base regardless of the `testnetOnly` plugin setting.
- `capabilities` are populated from the ElizaOS runtime's action/plugin list if not specified in the message.
- `alreadyRegistered: true` means no transaction was submitted and no gas was spent.
