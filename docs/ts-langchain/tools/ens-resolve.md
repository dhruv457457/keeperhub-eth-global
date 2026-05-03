# keeperhub_ens_resolve

Forward ENS lookup — resolve an ENS name to its Ethereum address.

## What It Does
Resolves a human-readable ENS (Ethereum Name Service) name to its associated Ethereum address. Performs a forward resolution query on Ethereum mainnet. Use this to convert user-provided names (e.g. `"vitalik.eth"`) to wallet addresses before executing transfers or contract calls.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| name | string | yes | ENS name to resolve, e.g. `"vitalik.eth"` |

## Python Example
```python
result = await tool._arun(name="vitalik.eth")
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What address does vitalik.eth resolve to?" }]
});
```

## Example Output
```json
{
  "name": "vitalik.eth",
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
}
```

## Notes
- Returns `"address": null` if the name is not registered or has no address record set.
- Resolution is performed on Ethereum mainnet; L2 ENS names may not resolve.
- This is the forward lookup (name → address). For the reverse (address → name), use `keeperhub_ens_lookup`.
- Always resolve ENS names before passing addresses to other tools to avoid errors.
