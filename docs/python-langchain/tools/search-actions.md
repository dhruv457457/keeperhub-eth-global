# keeperhub_search_actions

Full-text search across all 396 DeFi action types available in KeeperHub.

## What It Does
Performs a ranked full-text search over the complete library of DeFi action types. Returns matching actions with their type identifier, human-readable name, and protocol. Use this to discover available actions when you know what you want to do but not the exact action type string required by other tools.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | str | yes | Natural language or keyword search query, e.g. `"supply collateral"`, `"swap tokens"` |
| limit | int | no | Maximum number of results to return (default: 10) |

## Python Example
```python
result = await tool._arun(query="supply collateral aave", limit=5)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Search for staking actions on Lido" }]
});
```

## Example Output
```json
{
  "results": [
    {
      "actionType": "aave-v3/supply",
      "name": "Supply Asset",
      "protocol": "Aave V3"
    },
    {
      "actionType": "aave-v2/deposit",
      "name": "Deposit Asset",
      "protocol": "Aave V2"
    }
  ]
}
```

## Notes
- Search is case-insensitive and matches against action type, name, protocol, and description fields.
- Use the returned `actionType` value with `keeperhub_get_action_schema` or `keeperhub_protocol_action`.
- Default limit is 10; set a higher limit if the initial results do not include what you need.
- There are 396 total action types across protocols including Aave, Uniswap, Lido, Compound, Curve, and more.
