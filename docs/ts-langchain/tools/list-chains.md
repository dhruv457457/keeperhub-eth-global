# keeperhub_list_chains

List all blockchain networks supported by KeeperHub.

## What It Does
Returns metadata for all 19+ blockchain networks supported by the KeeperHub platform, including chain IDs, native currency symbols, RPC endpoints, and block explorer URLs. Use this to discover supported networks before making cross-chain decisions or to retrieve the correct chain ID for use in other tools.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters required |

## Python Example
```python
result = await tool._arun()
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What chains does KeeperHub support?" }]
});
```

## Example Output
```json
{
  "chains": [
    {
      "chainId": 1,
      "name": "Ethereum",
      "symbol": "ETH",
      "rpc": "https://eth-mainnet.rpc.keeperhub.xyz",
      "explorer": "https://etherscan.io"
    },
    {
      "chainId": 8453,
      "name": "Base",
      "symbol": "ETH",
      "rpc": "https://base-mainnet.rpc.keeperhub.xyz",
      "explorer": "https://basescan.org"
    }
  ],
  "total": 19
}
```

## Notes
- Returns 19+ chains including Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, BSC, and more.
- Use the `chainId` or `name` fields as the `network` parameter in other KeeperHub tools.
- RPC endpoints listed are KeeperHub-managed; you can also use your own RPC if needed in custom code.
- New chains may be added over time; call this tool dynamically rather than hardcoding chain lists.
