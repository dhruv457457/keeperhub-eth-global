# keeperhub_run_code

Execute arbitrary code in KeeperHub's sandboxed runtime environment.

## What It Does
Runs a JavaScript or Python code snippet inside an isolated execution sandbox with access to KeeperHub's built-in utilities. Useful for custom computations, data transformations, or logic that cannot be expressed with the standard tool set. Returns captured stdout output and any error information.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | string | yes | The code to execute |
| language | string | no | Execution language: `"javascript"` or `"python"` (default: `"javascript"`) |
| timeout | number | no | Maximum execution time in milliseconds (default: 5000, max: 30000) |

## Python Example
```python
result = await tool._arun(
    code="const vals = [4.5, 3.8, 5.1]; const avg = vals.reduce((a,b)=>a+b,0)/vals.length; console.log(avg);",
    language="javascript",
    timeout=3000
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Run JavaScript to calculate the compound interest for 1000 at 5% over 3 years" }]
});
```

## Example Output
```json
{
  "output": "1157.625\n",
  "error": null,
  "executionTimeMs": 38
}
```

## Notes
- The sandbox has no filesystem access, no external network calls, and no environment variables.
- Execution is stateless; variables do not persist between separate `keeperhub_run_code` calls.
- If `error` is non-null, `output` may be partial; always check `error` before using `output`.
- Execution is forcibly terminated if `timeout` is exceeded; no partial results are returned.
- Use `keeperhub_math_aggregate` for simple statistical operations to avoid unnecessary code execution.
