# KEEPERHUB_WALLET_BALANCE

Check the KeeperHub managed wallet balance across all supported chains.

## What It Does

Fetches token balances from the KeeperHub-managed wallet and presents them in a readable format. Also reports whether the wallet is ready for x402 (Base USDC) or MPP (Tempo USDC.e) payment-gated workflows.

## Trigger Phrases

The action matches messages containing:
- "wallet balance" (e.g. "what's my wallet balance?")
- "how much" (e.g. "how much ETH do I have?")
- "my balance" (e.g. "show me my balance on Base")
- "check balance"
- "do I have enough"

## Schema

```typescript
// Parsed from message context — no explicit parameters required
{
  chain_id?: number  // Inferred from message if a specific chain is mentioned
}
```

## Example Conversation

```
User: What's my wallet balance on Base?

Agent: Here's your KeeperHub wallet balance on Base:

Wallet: 0xAbCd1234...5678

Base (Chain 8453):
  • ETH: 0.042 (~$142.80)
  • USDC: 25.00 (~$25.00)

Payment Status:
  ✓ x402 ready (25.00 USDC on Base)
  ✗ MPP not ready (0 USDC.e on Tempo)
```

## Example Output (action result)

```json
{
  "wallet_address": "0xAbCd1234...5678",
  "balances": [
    {
      "chain_id": 8453,
      "chain_name": "Base",
      "symbol": "ETH",
      "balance": "0.042",
      "balance_usd": "142.80"
    },
    {
      "chain_id": 8453,
      "chain_name": "Base",
      "symbol": "USDC",
      "token_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "balance": "25.00",
      "balance_usd": "25.00"
    }
  ],
  "payment_readiness": {
    "x402_ready": true,
    "x402_balance_usdc": "25.00",
    "mpp_ready": false,
    "mpp_balance_usdce": "0.00"
  }
}
```

## Notes

- The `KEEPERHUB_WALLET_CONTEXT` provider automatically injects a wallet summary into the agent's context before each message — so the agent may already know the balance without explicitly triggering this action.
- Uses endpoint `/api/user/wallet/balances` — not `/api/user/wallet/tokens` (deprecated).
- The managed wallet address is deterministic per API key.
- This action is read-only and does not affect on-chain state.
