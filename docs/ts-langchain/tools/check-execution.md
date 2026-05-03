# keeperhub_check_execution

Check the status and result of a workflow execution.

## What It Does
Retrieves the current status, output, and optionally the step-by-step logs of a workflow execution by its ID. Use this to poll asynchronous executions started with `keeperhub_execute_workflow` or to inspect past runs. Returns a status of `pending`, `running`, `completed`, or `failed`.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| executionId | string | yes | Execution ID returned by `keeperhub_execute_workflow`, e.g. `exec_xyz789` or a UUID |
| includeLogs | boolean | no | If `true`, includes per-step execution logs in the response (default: `false`) |

## Python Example
```python
result = await tool._arun(
    executionId="exec_xyz789",
    includeLogs=True
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Check the status of execution exec_xyz789" }]
});
```

## Example Output
```json
{
  "executionId": "exec_xyz789",
  "status": "completed",
  "output": { "tx_hash": "0xabc...", "amountSupplied": "1000000" },
  "startedAt": "2026-05-03T12:00:00Z",
  "completedAt": "2026-05-03T12:00:15Z",
  "logs": [
    { "step": "check-price", "status": "passed", "value": "3100" },
    { "step": "supply-aave", "status": "completed", "tx_hash": "0xabc..." }
  ]
}
```

## Notes
- Possible statuses: `pending` (queued), `running` (in progress), `completed` (success), `failed` (error).
- Check `output` only when status is `completed`; it will be `null` for other statuses.
- Execution IDs match the pattern `exec_xxx` or standard UUID format.
- For failed executions, `output` will contain an `error` field with details.
