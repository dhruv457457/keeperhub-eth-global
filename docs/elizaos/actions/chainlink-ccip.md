# KEEPERHUB_CHAINLINK_CCIP

Send cross-chain messages and tokens via Chainlink CCIP.

## What It Does
Initiates a cross-chain transfer of tokens and/or message data using Chainlink's Cross-Chain Interoperability Protocol (CCIP). Manages fee calculation, LINK approval, and message submission automatically. Returns a CCIP message ID, source transaction hash, and a link to the CCIP Explorer for delivery tracking.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| sourceChainId | string | yes | EVM chain ID of the source network, e.g. `"8453"` for Base |
| destChainSelector | string | yes | Chainlink uint64 chain selector for the destination |
| receiver | string | yes | Recipient address on the destination chain |
| tokenAmounts | Array\<\{token: string, amount: string\}\> | no | Tokens to transfer |
| data | string | no | Hex-encoded data payload to send with the message |

## Python Example
```python
result = await tool._arun(
    sourceChainId="8453",
    destChainSelector="5009297550715157269",
    receiver="0xRecipientAddress",
    tokenAmounts=[{"token": "0xUSDCOnBase", "amount": "1000000"}]
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Send 1 USDC from Base to Ethereum via CCIP to 0xRecipient" }]
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
- Trigger phrases: "send cross-chain", "CCIP", "bridge message", "cross-chain transfer", "send tokens to another chain"
- CCIP fees are paid in LINK on the source chain; ensure the agentic wallet holds sufficient LINK.
- `destChainSelector` uses Chainlink's uint64 format, not the standard EVM chain ID.
- At least one of `tokenAmounts` or `data` must be provided.
- Cross-chain delivery typically takes 5–20 minutes; use `ccipExplorerUrl` to track progress.
