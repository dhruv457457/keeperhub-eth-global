# keeperhub_fetch_abi

Fetch the ABI for any verified smart contract, with automatic proxy resolution.

## What It Does
Retrieves the complete ABI for a deployed and verified smart contract. Automatically detects and resolves proxy patterns — EIP-1967 transparent proxies, UUPS proxies, and Diamond (EIP-2535) proxies — returning the implementation ABI rather than the minimal proxy interface. Use the returned ABI with `keeperhub_contract_call` for direct interaction.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | yes | Chain name or ID, e.g. `"ethereum"`, `"base"`, `"arbitrum"` |
| contractAddress | string | yes | Address of the contract to fetch the ABI for |

## Python Example
```python
result = await tool._arun(
    network="ethereum",
    contractAddress="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Fetch the ABI for the USDC contract on Ethereum" }]
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
- The contract must be verified on the network's block explorer (Etherscan, Basescan, etc.).
- `implementationAddress` is only present when the contract is detected as a proxy.
- Supports EIP-1967 transparent proxies, UUPS proxies, and Diamond (EIP-2535) multi-facet proxies.
- If the contract is unverified, this tool will return an error; use a manually provided ABI instead.
