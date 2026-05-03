# keeperhub_search_actions

Full-text search across all 396 DeFi action types.

## What It Does
Performs a ranked full-text search over the complete library of KeeperHub DeFi action types. Returns matching results with their action type identifier, human-readable name, and protocol. Use this to discover the correct `actionType` string when you know what operation you want to perform but not the exact identifier.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | yes | Search query, e.g. `"supply collateral"`, `"stake ETH"`, `"swap tokens"` |
| limit | number | no | Maximum number of results (default: 10) |

## Python Example
```python
result = await tool._arun(query="stake ETH lido", limit=5)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Find actions related to borrowing on Compound" }]
});
```

## Example Output
```json
{
  "results": [
    {
      "actionType": "compound-v3/borrow",
      "name": "Borrow Asset",
      "protocol": "Compound V3"
    },
    {
      "actionType": "compound-v2/borrow",
      "name": "Borrow Asset",
      "protocol": "Compound V2"
    }
  ]
}
```

## Notes
- Search is case-insensitive and matches against action type, name, protocol name, and description.
- Use the returned `actionType` with `keeperhub_get_action_schema` or `keeperhub_protocol_action`.
- Increase `limit` if the default 10 results don't include the action you're looking for.
