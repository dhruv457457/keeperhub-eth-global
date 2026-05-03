# keeperhub_math_aggregate

Perform aggregation math operations on an array of numeric values.

## What It Does
Executes a statistical aggregation function (sum, average, minimum, maximum, or median) over a provided list of floating-point numbers. Useful for computing aggregate metrics from multi-source on-chain data, such as average yield across multiple pools, total portfolio value, or median gas prices. Avoids floating-point precision issues that can arise when doing these calculations in LLM context.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| operation | str | yes | Aggregation function: `sum`, `avg`, `min`, `max`, or `median` |
| values | list[float] | yes | Array of numeric values to aggregate |

## Python Example
```python
result = await tool._arun(
    operation="avg",
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
- Supported operations: `sum` (total), `avg` (arithmetic mean), `min` (minimum), `max` (maximum), `median` (middle value).
- Particularly useful for yield calculations across multiple DeFi positions or pools.
- The `values` list must contain at least one element; an empty list will return an error.
- For `median` with an even number of values, the average of the two middle values is returned.
