# keeperhub_chainlink_ccip

Send cross-chain messages and tokens via Chainlink CCIP (Cross-Chain Interoperability Protocol).

## What It Does
Initiates a cross-chain transfer of tokens and/or arbitrary data using Chainlink CCIP. Handles fee calculation, LINK payment, and message encoding automatically. Returns a CCIP message ID and transaction hash that can be tracked on the CCIP Explorer. Supports any CCIP-enabled chain pair.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| source_chain_id | str | yes | Chain ID of the source network, e.g. `"8453"` for Base |
| dest_chain_selector | str | yes | Chainlink chain selector for the destination, e.g. `"5009297550715157269"` for Ethereum mainnet |
| receiver | str | yes | Recipient address on the destination chain |
| token_amounts | list[dict] | no | List of `{"token": "0x...", "amount": "1000000"}` objects to transfer |
| data | str | no | Arbitrary hex-encoded data payload to send with the message |

## Python Example
```python
result = await tool._arun(
    source_chain_id="8453",
    dest_chain_selector="5009297550715157269",
    receiver="0xRecipientAddress",
    token_amounts=[{"token": "0xUSDCAddress", "amount": "1000000"}],
    data="0x"
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
  "messageId": "0xccip-message-id-hex",
  "tx_hash": "0xsource-chain-tx-hash",
  "ccipExplorerUrl": "https://ccip.chain.link/msg/0xccip-message-id-hex"
}
```

## Notes
- CCIP fees are paid in LINK on the source chain; ensure the agent wallet has sufficient LINK.
- `dest_chain_selector` uses Chainlink's uint64 chain selector format, not the EVM chain ID.
- Cross-chain finality typically takes 5–20 minutes depending on source chain confirmation requirements.
- Either `token_amounts` or `data` (or both) must be provided; sending neither is invalid.
- Track delivery status via the `ccipExplorerUrl` returned in the response.
