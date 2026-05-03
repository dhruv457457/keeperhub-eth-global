# KEEPERHUB_TRANSFER

Send ETH or ERC-20 tokens from the KeeperHub managed wallet to any address.

## What It Does

Handles transfer requests parsed from natural language. The ElizaOS runtime extracts `network`, `to`, `amount`, and optionally `tokenAddress` from the user's message. Submits the transaction from the managed wallet and returns the transaction hash with a confirmation message.

## Trigger Phrases

The action matches messages containing:
- "send" (e.g. "send 0.1 ETH to vitalik.eth on Base")
- "transfer" (e.g. "transfer 50 USDC to 0xAbc...")
- "pay" (e.g. "pay 10 USDC to bob.eth")

## Schema

```typescript
{
  network: string        // Network name or chain ID (e.g. "base", "8453")
  to: string             // Recipient address (0x...) or ENS name
  amount: string         // Amount as decimal string (e.g. "0.1", "50.0")
  tokenAddress?: string  // ERC-20 contract address. Omit for native ETH.
}
```

## Example Conversation

```
User: Send 0.05 ETH to vitalik.eth on Base

Agent: I'll transfer 0.05 ETH to vitalik.eth (0xd8dA6BF...96045) on Base now.

Transaction submitted!
• Network: Base
• Amount: 0.05 ETH
• To: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
• Tx Hash: 0x4a2f8c1e...9d3b
• Explorer: https://basescan.org/tx/0x4a2f8c1e...9d3b
```

## Example Output (action result)

```json
{
  "success": true,
  "tx_hash": "0x4a2f8c1e...9d3b",
  "network": "base",
  "from": "0xAbCd1234...5678",
  "to": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "amount": "0.05",
  "token": "ETH",
  "explorer_url": "https://basescan.org/tx/0x4a2f8c1e...9d3b"
}
```

## Notes

- ENS names in `to` are automatically resolved before submission.
- For ERC-20 transfers, the agent will attempt to identify the token from the symbol in the message and resolve its address. Provide the explicit `tokenAddress` in the message for reliable resolution.
- Transfers are irreversible. The runtime will ask for confirmation before submitting when the amount exceeds a configurable threshold.
- If `testnetOnly: true` is set in the plugin config, mainnet transfer requests are rejected with an explanation.
- Uses the KeeperHub managed wallet — not a user-provided private key.
