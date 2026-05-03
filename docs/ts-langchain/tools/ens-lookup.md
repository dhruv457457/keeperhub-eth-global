# keeperhub_ens_lookup

Reverse ENS lookup — resolve an Ethereum address to its ENS name.

## What It Does
Performs a reverse ENS resolution to find the primary ENS name registered for a given wallet address. Returns the human-readable name if a reverse record exists, or null if the address has not set one. Useful for displaying friendly identities in agent responses instead of raw hex addresses.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | string | yes | Ethereum address to look up, e.g. `"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"` |

## Python Example
```python
result = await tool._arun(address="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What ENS name does 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 have?" }]
});
```

## Example Output
```json
{
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "name": "vitalik.eth"
}
```

## Notes
- Returns `"name": null` if the address has no reverse ENS record set.
- Reverse records are not automatically created when an ENS name is registered; the owner must set them explicitly.
- Resolution is performed on Ethereum mainnet.
- This is the reverse lookup (address → name). For forward lookup (name → address), use `keeperhub_ens_resolve`.
