# keeperhub_check_and_execute

Read a value on-chain, evaluate a condition, and execute atomically if the condition passes.

## What It Does
Performs a conditional on-chain execution in a single atomic server-side operation. Reads a value from a contract, compares it to a threshold using the specified operator, and only submits the execute transaction if the condition is satisfied. Eliminates the TOCTOU race condition that arises when check and execute are separate agent steps.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | yes | Chain name or ID, e.g. `"base"`, `"ethereum"` |
| check.contract | string | yes | Address of the contract to read from |
| check.function | string | yes | View function name to call for the check |
| check.args | any[] | no | Arguments to pass to the check function |
| condition.operator | string | yes | Comparison: `"gt"`, `"lt"`, `"eq"`, `"gte"`, `"lte"` |
| condition.value | string | yes | Threshold value to compare against (as string) |
| execute.contract | string | yes | Contract address to call if condition passes |
| execute.function | string | yes | Function name to call on the execute contract |
| execute.args | any[] | no | Arguments to pass to the execute function |

## Python Example
```python
result = await tool._arun(
    network="base",
    check={"contract": "0xFeed", "function": "latestAnswer", "args": []},
    condition={"operator": "gt", "value": "300000000000"},
    execute={"contract": "0xPool", "function": "supply", "args": ["0xAsset", "1000000", "0xUser", 0]}
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Supply to Aave only if ETH price is above $3000" }]
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
- Atomic execution prevents race conditions between the read and write steps.
- All numeric values in `condition.value` should be passed as strings to avoid precision loss.
- If the condition is not met, no transaction is submitted; `conditionMet` will be `false` and `tx_hash` will be `null`.
- Supported operators: `gt` (>), `lt` (<), `eq` (==), `gte` (>=), `lte` (<=).
