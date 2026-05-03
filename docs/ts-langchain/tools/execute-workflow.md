# keeperhub_execute_workflow

Trigger the execution of an existing KeeperHub workflow.

## What It Does
Runs a saved workflow by its ID, optionally passing runtime input parameters. Supports both synchronous (wait for result) and asynchronous (fire-and-forget) execution modes, as well as safe vs. fast execution modes for risk management. Returns an execution ID that can be polled with `keeperhub_check_execution`.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| workflowId | string | yes | ID of the workflow to execute |
| input | Record\<string, any\> | no | Runtime input parameters to pass to the workflow |
| wait | boolean | no | If `true`, blocks until execution completes (default: `false`) |
| mode | string | no | Execution mode: `"safe"` (simulate first) or `"fast"` (execute immediately). Default: `"safe"` |

## Python Example
```python
result = await tool._arun(
    workflowId="wf_abc123",
    input={"threshold": "3000", "asset": "ETH"},
    wait=False,
    mode="safe"
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Run the Daily Yield Rebalancer workflow" }]
});
```

## Example Output
```json
{
  "executionId": "exec_xyz789",
  "status": "running",
  "workflowId": "wf_abc123",
  "startedAt": "2026-05-03T12:00:00Z"
}
```

## Notes
- Use `wait: true` for short workflows; for long-running automations, use `wait: false` and poll with `keeperhub_check_execution`.
- `"safe"` mode runs a simulation before executing any on-chain actions; `"fast"` skips simulation for lower latency.
- Passed `input` values override workflow default parameters for that execution only.
- Use `keeperhub_list_workflows` to find valid workflow IDs.
