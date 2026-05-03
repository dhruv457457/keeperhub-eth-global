# KEEPERHUB_CHECK_EXECUTION

Check the status and result of a workflow execution by its ID.

## What It Does
Retrieves the current status, output, and optional step logs for a workflow execution. Supports both `exec_xxx` prefixed IDs and standard UUID formats. Returns a status of `pending`, `running`, `completed`, or `failed`, along with any output or error details.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| executionId | string | yes | Execution ID — matches `exec_xxx` or UUID format |
| includeLogs | boolean | no | If `true`, includes per-step logs |

## Python Example
```python
result = await tool._arun(executionId="exec_xyz789", includeLogs=True)
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
  "output": { "tx_hash": "0xabc..." },
  "startedAt": "2026-05-03T12:00:00Z",
  "completedAt": "2026-05-03T12:00:15Z"
}
```

## Notes
- Trigger phrases: "check execution [ID]", "execution status [ID]", "what happened to exec_xyz789"
- Matches execution IDs in the format `exec_xxx` and standard UUID formats (e.g. `550e8400-e29b-41d4-a716-446655440000`).
- Statuses: `pending` (queued), `running` (in progress), `completed` (success), `failed` (error).
- For failed executions, check the `error` field in `output` for the failure reason.
