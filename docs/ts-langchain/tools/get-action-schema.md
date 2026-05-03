# keeperhub_get_action_schema

Get the full JSON input schema for a specific DeFi action type.

## What It Does
Fetches the complete JSON Schema definition for a named DeFi action, including all required and optional parameters with their types and descriptions. Use this before calling `keeperhub_protocol_action` to understand exactly what parameters are needed, or to validate inputs programmatically.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actionType | string | yes | Action type identifier, e.g. `"aave-v3/supply"`, `"lido/stake"` |

## Python Example
```python
result = await tool._arun(actionType="uniswap-v3/swap")
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Show me the schema for uniswap-v3/swap" }]
});
```

## Example Output
```json
{
  "actionType": "uniswap-v3/swap",
  "description": "Swap one token for another using Uniswap V3",
  "inputSchema": {
    "type": "object",
    "required": ["network", "tokenIn", "tokenOut", "amountIn"],
    "properties": {
      "network": { "type": "string" },
      "tokenIn": { "type": "string", "description": "Input token address" },
      "tokenOut": { "type": "string", "description": "Output token address" },
      "amountIn": { "type": "string", "description": "Amount to swap in wei" },
      "slippageTolerance": { "type": "number", "description": "Max slippage as percentage (default: 0.5)" }
    }
  }
}
```

## Notes
- Use `keeperhub_search_actions` first if you don't know the exact `actionType` string.
- The returned `inputSchema` is a standard JSON Schema object compatible with validation libraries.
- Required fields are listed in the `required` array; all other fields in `properties` are optional.
