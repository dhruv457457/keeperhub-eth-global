# keeperhub_math_aggregate

Perform aggregation math operations on an array of numeric values.

## What It Does
Executes a statistical aggregation function over a provided array of numbers, returning the computed result. Supports sum, average, minimum, maximum, and median. Designed for yield calculations, portfolio aggregations, and other numeric operations over multi-source on-chain data without relying on LLM arithmetic.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| operation | string | yes | Aggregation function: `"sum"`, `"avg"`, `"min"`, `"max"`, or `"median"` |
| values | number[] | yes | Array of numeric values to aggregate |

## Python Example
```python
result = await tool._arun(
    operation="median",
    values=[4.5, 3.8, 5.1, 4.2, 6.0]
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What is the average APY across these pools: 4.5, 3.8, 5.1, 4.2, 6.0?" }]
});
```

## Example Output
```json
{
  "operation": "avg",
  "result": 4.72,
  "inputCount": 5
}
```

## Notes
- Supported operations: `sum`, `avg` (arithmetic mean), `min`, `max`, `median`.
- For `median` with an even number of values, the average of the two middle values is returned.
- The `values` array must contain at least one element.
- Prefer this tool over `keeperhub_run_code` for simple numeric aggregations — it is faster and more explicit.
