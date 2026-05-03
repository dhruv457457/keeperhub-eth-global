# KEEPERHUB_CHECK_AND_EXECUTE

Conditionally execute an on-chain action only if a read value passes a threshold check.

## What It Does
Performs a conditional on-chain execution atomically: reads a value from a contract, evaluates it against a condition, and only submits the execution transaction if the condition is met. Designed for price-triggered automations, balance guards, and threshold-based DeFi strategies — eliminating race conditions between checking and acting.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | yes | Chain name or ID |
| check.contract | string | yes | Contract address to read from |
| check.function | string | yes | View function name to call |
| check.args | any[] | no | Arguments for the check function |
| condition.operator | string | yes | Comparison: `"gt"`, `"lt"`, `"eq"`, `"gte"`, `"lte"` |
| condition.value | string | yes | Threshold value (as string) |
| execute.contract | string | yes | Contract to call if condition passes |
| execute.function | string | yes | Function name to call |
| execute.args | any[] | no | Arguments for the execute function |

## Python Example
```python
result = await tool._arun(
    network="base",
    check={"contract": "0xPriceFeed", "function": "latestAnswer", "args": []},
    condition={"operator": "gt", "value": "300000000000"},
    execute={"contract": "0xPool", "function": "supply", "args": ["0xAsset", "1000000", "0xUser", 0]}
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Only execute the supply if ETH price is above $3000" }]
});
```

## Example Output
```json
{
  "conditionMet": true,
  "checkValue": "312000000000",
  "tx_hash": "0xabc123...",
  "network": "base"
}
```

## Notes
- Trigger phrases: "if price is above X", "when balance exceeds Y", "only execute if the value is", "conditional execution"
- Atomically checks and executes server-side, preventing TOCTOU race conditions.
- All numeric threshold values should be strings to avoid floating-point precision loss.
- If condition is not met, `conditionMet` is `false` and no transaction is submitted.
