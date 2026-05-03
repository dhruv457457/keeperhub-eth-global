# keeperhub_get_execution_status

Check the status and progress of a workflow execution.

## What It Does

Polls the KeeperHub API for the current state of a workflow execution by its ID. Returns the overall status (`pending`, `running`, `completed`, `failed`), per-node statuses, progress percentage, and any emitted transaction hashes. Optionally includes the full execution log.

## Schema

```
execution_id: str     — Execution ID returned by execute_workflow or generate_workflow.
include_logs?: bool   — If true, include verbose node execution logs. Default: false.
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_get_execution_status")

async def main():
    # Basic status check
    result = await tool._arun(execution_id="exec_9z8y7x6w5v")
    print(result)

    # With full logs
    result = await tool._arun(
        execution_id="exec_9z8y7x6w5v",
        include_logs=True
    )
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const statusTool = tools.find(t => t.name === "keeperhub_get_execution_status")!;

const result = await statusTool.invoke({
  execution_id: "exec_9z8y7x6w5v",
  include_logs: false,
});
console.log(result);
```

## Example Output

```json
{
  "executionId": "exec_9z8y7x6w5v",
  "workflowId": "wf_a1b2c3d4e5f6",
  "status": "completed",
  "progress": 100,
  "startedAt": "2026-05-03T10:00:00Z",
  "completedAt": "2026-05-03T10:00:47Z",
  "nodeStatuses": [
    {
      "nodeId": "fetch-balance",
      "status": "completed",
      "durationMs": 312
    },
    {
      "nodeId": "aave-v3-supply",
      "status": "completed",
      "durationMs": 28400,
      "transactionHash": "0x4a2f8c1e...9d3b"
    },
    {
      "nodeId": "notify-email",
      "status": "completed",
      "durationMs": 890
    }
  ],
  "transactionHash": "0x4a2f8c1e...9d3b",
  "error": null
}
```

## Notes

- Status values: `pending` (queued), `running` (in progress), `completed` (success), `failed` (error).
- `progress` is an integer 0–100 representing percentage of nodes completed.
- `transactionHash` at the top level is the hash of the final on-chain transaction (if any).
- Use `include_logs=true` for debugging failed executions — logs include per-node stdout and error messages.
- This tool is read-only and safe to poll frequently.
