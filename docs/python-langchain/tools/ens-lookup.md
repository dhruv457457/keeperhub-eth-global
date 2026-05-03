# keeperhub_ens_lookup

Reverse ENS lookup — resolve an Ethereum address to its ENS name.

## What It Does
Performs a reverse resolution query to find the ENS (Ethereum Name Service) primary name registered for a given wallet address. Returns the human-readable name if one is registered, or null if the address has no reverse record set. Useful for displaying user-friendly names in agent outputs instead of raw hex addresses.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | str | yes | Ethereum address to look up, must start with `0x` |

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
- This is the reverse of `keeperhub_ens_resolve` which goes from name → address.
- Reverse records are set by the address owner and are not automatically created when a name is registered.
- Resolution is performed on Ethereum mainnet; L2 reverse records are not yet supported.
