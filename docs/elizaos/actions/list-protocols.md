# KEEPERHUB_LIST_PROTOCOLS

List DeFi protocols and their supported action types available in KeeperHub.

## What It Does
Returns the full or filtered list of DeFi protocols supported by KeeperHub, along with their action type identifiers. Covers 396 total actions across all integrated protocols. Use this to help users discover what DeFi operations are available before executing them via `KEEPERHUB_PROTOCOL_ACTION`.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | no | Keyword filter, e.g. `"lending"`, `"staking"` |
| protocol | string | no | Filter by protocol slug, e.g. `"aave-v3"` |

## Python Example
```python
result = await tool._arun(query="staking")
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What DeFi protocols does KeeperHub support?" }]
});
```

## Example Output
```json
{
  "protocols": [
    {
      "id": "lido",
      "name": "Lido",
      "category": "staking",
      "actions": ["lido/stake", "lido/unstake"]
    },
    {
      "id": "rocket-pool",
      "name": "Rocket Pool",
      "category": "staking",
      "actions": ["rocket-pool/stake"]
    }
  ],
  "totalActions": 396
}
```

## Notes
- Trigger phrases: "what protocols do you support", "list integrations", "what DeFi protocols", "what can I do with KeeperHub"
- Returns all 396 actions when called without filters.
- Use action type values from the `actions` array with `KEEPERHUB_PROTOCOL_ACTION`.
- For detailed parameter schemas, call `KEEPERHUB_GET_ACTION_SCHEMA` with a specific action type.
