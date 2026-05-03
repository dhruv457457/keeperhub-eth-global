# keeperhub_protocol_action

Execute a named DeFi protocol action (supply, swap, stake, etc.) with structured parameters.

## What It Does
Dispatches one of 396 supported DeFi protocol actions using a structured action type and parameter map. Handles ABI encoding, transaction building, and submission automatically. For read-only actions, returns the on-chain result. For write actions, returns a transaction hash. If an action type is not supported, fall back to `keeperhub_generate_workflow`.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actionType | string | yes | Action type identifier, e.g. `"aave-v3/supply"`, `"uniswap-v3/swap"` |
| params | Record\<string, any\> | yes | Action-specific parameters. Use `keeperhub_get_action_schema` to discover required fields |

## Python Example
```python
result = await tool._arun(
    actionType="aave-v3/supply",
    params={
        "network": "base",
        "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        "amount": "1000000",
        "onBehalfOf": "0xAgentWalletAddress"
    }
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Supply 1 USDC to Aave V3 on Base" }]
});
```

## Example Output
```json
{
  "ok": true,
  "tx_hash": "0xabc123...",
  "actionType": "aave-v3/supply",
  "network": "base"
}
```

## Notes
- Use `keeperhub_search_actions` to find the correct `actionType` string.
- Use `keeperhub_get_action_schema` to discover the required `params` for an action before calling.
- For write actions on unrecognized or custom contract interactions, use `keeperhub_generate_workflow` as a fallback.
- 396 action types are available across protocols including Aave, Uniswap, Lido, Compound, Curve, Balancer, and more.
