# keeperhub_chainlink_ccip

Send cross-chain messages and tokens via Chainlink CCIP.

## What It Does
Initiates a cross-chain transfer of tokens and/or arbitrary message data using Chainlink's Cross-Chain Interoperability Protocol (CCIP). Handles fee estimation, LINK token approval, and message submission automatically. Returns a CCIP message ID and source chain transaction hash for tracking delivery on the CCIP Explorer.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sourceChainId | string | yes | EVM chain ID of the source network, e.g. `"8453"` for Base |
| destChainSelector | string | yes | Chainlink uint64 chain selector for the destination chain |
| receiver | string | yes | Recipient address on the destination chain |
| tokenAmounts | Array\<\{token: string, amount: string\}\> | no | Tokens to transfer, e.g. `[{"token": "0xUSDC", "amount": "1000000"}]` |
| data | string | no | Hex-encoded arbitrary data payload to include in the message |

## Python Example
```python
result = await tool._arun(
    sourceChainId="8453",
    destChainSelector="5009297550715157269",
    receiver="0xRecipientAddress",
    tokenAmounts=[{"token": "0xUSDCBase", "amount": "1000000"}]
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Send 1 USDC from Base to Ethereum via Chainlink CCIP" }]
});
```

## Example Output
```json
{
  "messageId": "0xccip-message-id",
  "tx_hash": "0xsource-tx-hash",
  "ccipExplorerUrl": "https://ccip.chain.link/msg/0xccip-message-id"
}
```

## Notes
- CCIP fees are paid in LINK on the source chain; the agentic wallet must hold sufficient LINK.
- `destChainSelector` uses Chainlink's uint64 selector format, not the standard EVM chain ID.
- At least one of `tokenAmounts` or `data` must be provided.
- Cross-chain delivery typically takes 5–20 minutes depending on source chain finalization requirements.
- Use `ccipExplorerUrl` to monitor delivery status in real time.
