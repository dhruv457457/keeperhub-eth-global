# keeperhub_get_action_schema

Get the full input schema for a specific DeFi action type.

## What It Does
Fetches the complete JSON schema for a named DeFi action type, including all required and optional fields, their types, and descriptions. Use this before calling a protocol action to understand exactly what parameters are needed. Supports all 396 available action types across protocols like Aave, Uniswap, Lido, and more.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| action_type | str | yes | Action type identifier, e.g. `"aave-v3/supply"`, `"uniswap-v3/swap"` |

## Python Example
```python
result = await tool._arun(action_type="aave-v3/supply")
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Show me the schema for aave-v3/supply" }]
});
```

## Example Output
```json
{
  "actionType": "aave-v3/supply",
  "description": "Supply an asset as collateral to Aave V3",
  "inputSchema": {
    "type": "object",
    "required": ["network", "asset", "amount"],
    "properties": {
      "network": { "type": "string" },
      "asset": { "type": "string", "description": "Token address to supply" },
      "amount": { "type": "string", "description": "Amount in wei" },
      "onBehalfOf": { "type": "string", "description": "Optional recipient address" }
    }
  }
}
```

## Notes
- Use `keeperhub_search_actions` first if you do not know the exact action type string.
- Action type strings follow the pattern `protocol/action`, e.g. `"lido/stake"`, `"uniswap-v3/add-liquidity"`.
- The returned schema is a standard JSON Schema object and can be used to validate inputs before execution.
