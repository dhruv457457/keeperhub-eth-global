# keeperhub_run_code

Execute arbitrary code in KeeperHub's sandboxed runtime environment.

## What It Does
Runs a snippet of JavaScript or Python code inside an isolated sandbox with access to KeeperHub's built-in libraries and on-chain utilities. Useful for custom computations, data transformations, or logic that cannot be expressed with the standard tool set. Returns stdout output and any error messages. In the Python SDK package, this tool may also be referenced as `ZgStore`.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| code | str | yes | The code to execute |
| language | str | no | Execution language: `"javascript"` or `"python"` (default: `"javascript"`) |
| timeout | int | no | Maximum execution time in milliseconds (default: 5000, max: 30000) |

## Python Example
```python
result = await tool._arun(
    code="const total = [1.5, 2.3, 4.1].reduce((a, b) => a + b, 0); console.log(total);",
    language="javascript",
    timeout=5000
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Run this JS to compute compound interest: principal * Math.pow(1 + rate, n)" }]
});
```

## Example Output
```json
{
  "output": "7.9\n",
  "error": null,
  "executionTimeMs": 42
}
```

## Notes
- The sandbox has no access to the filesystem, network (outside KeeperHub APIs), or environment variables.
- In the Python SDK package, this tool may be referenced as `ZgStore` — functionality is identical.
- Execution is stateless; variables do not persist between separate calls.
- If `error` is non-null, `output` may be partial; always check `error` first.
- Use `timeout` to prevent runaway loops; execution is forcibly terminated if the limit is exceeded.
