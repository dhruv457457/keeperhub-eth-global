# keeperhub_transfer

Send ETH or ERC-20 tokens from the agentic wallet to any address.

## What It Does
Transfers native ETH or any ERC-20 token from the KeeperHub agentic wallet to a specified recipient address on a given network. Omitting `tokenAddress` sends native ETH; providing a token contract address sends the corresponding ERC-20. Handles approval and transfer in a single call for ERC-20 tokens.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | yes | Chain name or ID, e.g. `"base"`, `"ethereum"` |
| to | string | yes | Recipient wallet address |
| amount | string | yes | Amount to send as a string (in ETH or token units, not wei) |
| tokenAddress | string | no | ERC-20 contract address. Omit to send native ETH |

## Python Example
```python
result = await tool._arun(
    network="base",
    to="0xRecipientAddress",
    amount="0.01"
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Send 10 USDC on Base to 0xRecipient" }]
});
```

## Example Output
```json
{
  "tx_hash": "0xabc123...",
  "network": "base",
  "to": "0xRecipientAddress",
  "amount": "10",
  "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

## Notes
- Amounts are in human-readable units (e.g. `"1.5"` for 1.5 ETH), not wei.
- For ERC-20 transfers, the agentic wallet must hold sufficient token balance and ETH for gas.
- Use `keeperhub_wallet_balance` to verify balances before calling this tool.
