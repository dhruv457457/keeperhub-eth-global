# keeperhub_list_protocols

List available DeFi protocols and their supported action types.

## What It Does
Returns the full or filtered list of DeFi protocols supported by KeeperHub, along with their available action types. Use this to explore what protocols and operations are available before building workflows or dispatching protocol actions. Covers 396 actions across all integrated protocols.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | no | Filter by keyword, e.g. `"lending"`, `"Aave"` |
| protocol | string | no | Filter by exact protocol slug, e.g. `"aave-v3"`, `"uniswap-v3"` |

## Python Example
```python
result = await tool._arun(protocol="aave-v3")
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What protocols does KeeperHub support?" }]
});
```

## Example Output
```json
{
  "protocols": [
    {
      "id": "aave-v3",
      "name": "Aave V3",
      "category": "lending",
      "actions": ["aave-v3/supply", "aave-v3/borrow", "aave-v3/repay", "aave-v3/withdraw"]
    },
    {
      "id": "uniswap-v3",
      "name": "Uniswap V3",
      "category": "dex",
      "actions": ["uniswap-v3/swap", "uniswap-v3/add-liquidity", "uniswap-v3/remove-liquidity"]
    }
  ],
  "totalActions": 396
}
```

## Notes
- Returns all 396 actions when called without filters.
- Use the `actions` array items as `actionType` values in `keeperhub_protocol_action`.
- For full-text search across action names and descriptions, prefer `keeperhub_search_actions`.
- Protocol slugs in the `protocol` filter are case-sensitive.
