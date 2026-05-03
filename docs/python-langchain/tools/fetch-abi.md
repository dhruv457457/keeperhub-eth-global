# keeperhub_fetch_contract_abi

Fetch the ABI for any verified smart contract, with automatic proxy resolution.

## What It Does
Retrieves the full ABI for a deployed and verified contract on any supported network. Automatically detects and resolves proxy patterns including EIP-1967 transparent proxies, UUPS proxies, and Diamond (EIP-2535) proxies — returning the implementation ABI rather than the minimal proxy ABI. This makes it suitable for use with any contract regardless of upgrade pattern.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | str | yes | Chain name or ID, e.g. `"ethereum"`, `"base"`, `"arbitrum"` |
| contract_address | str | yes | Checksummed address of the contract to fetch the ABI for |

## Python Example
```python
result = await tool._arun(
    network="ethereum",
    contract_address="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Fetch the ABI for USDC on Ethereum" }]
});
```

## Example Output
```json
{
  "abi": [
    { "name": "transfer", "type": "function", "inputs": [...], "outputs": [...] },
    { "name": "balanceOf", "type": "function", "inputs": [...], "outputs": [...] }
  ],
  "isProxy": true,
  "implementationAddress": "0x43506849D7C04F9138D1A2050bbF3A0c054402dd"
}
```

## Notes
- Contract must be verified on the network's block explorer (Etherscan, Basescan, etc.) for ABI retrieval to succeed.
- `implementationAddress` is only present when the contract is detected as a proxy.
- Supports EIP-1967 transparent proxies, UUPS proxies, and Diamond (EIP-2535) multi-facet proxies.
- Use the returned ABI with `keeperhub_contract_call` for direct contract interaction.
