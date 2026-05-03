# keeperhub_check_and_execute

Read a value on-chain, evaluate a condition, and execute a transaction only if the condition passes — atomically.

## What It Does
Performs a conditional on-chain execution in a single atomic operation. First reads a value from a contract (the "check"), evaluates it against a condition, and only submits the execution transaction if the condition is satisfied. Because the check and execute happen atomically server-side, there is no race condition between reading the value and acting on it.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | str | yes | Chain name or ID, e.g. `"base"`, `"ethereum"` |
| check.contract | str | yes | Address of the contract to read from |
| check.function | str | yes | View function name to call for the check |
| check.args | list | no | Arguments to pass to the check function |
| condition.operator | str | yes | Comparison operator: `gt`, `lt`, `eq`, `gte`, `lte` |
| condition.value | str | yes | Value to compare against (as string to preserve precision) |
| execute.contract | str | yes | Address of the contract to call if condition passes |
| execute.function | str | yes | Function name to call on the execute contract |
| execute.args | list | no | Arguments to pass to the execute function |

## Python Example
```python
result = await tool._arun(
    network="base",
    check={
        "contract": "0xPriceFeedAddress",
        "function": "latestAnswer",
        "args": []
    },
    condition={
        "operator": "gt",
        "value": "300000000000"  # $3000 in 8-decimal Chainlink format
    },
    execute={
        "contract": "0xAavePoolAddress",
        "function": "supply",
        "args": ["0xAssetAddress", "1000000000000000000", "0xUserAddress", 0]
    }
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Only supply to Aave if ETH price is above $3000" }]
});
```

## Example Output
```json
{
  "conditionMet": true,
  "checkValue": "310000000000",
  "tx_hash": "0xabc123...",
  "network": "base"
}
```

## Notes
- Atomic execution eliminates the TOCTOU (time-of-check/time-of-use) race condition common in multi-step agent flows.
- All numeric values in `condition.value` should be passed as strings to avoid floating-point precision loss.
- If the condition is not met, no transaction is submitted and `conditionMet` will be `false`.
- Supported operators: `gt` (>), `lt` (<), `eq` (==), `gte` (>=), `lte` (<=).
