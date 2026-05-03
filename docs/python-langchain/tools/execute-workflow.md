# keeperhub_execute_workflow

Run an existing KeeperHub workflow by its ID.

## What It Does

Triggers execution of a saved workflow. You can pass runtime input parameters (e.g. dynamic amounts or addresses) that override workflow defaults. The `wait` flag controls whether the call blocks until the workflow completes or returns immediately with a pending status.

## Schema

```
workflow_id: str  — Workflow ID (e.g. "wf_a1b2c3d4e5f6")
input?: dict      — Runtime parameters to pass into the workflow's input nodes.
wait?: bool       — If true, poll until completion and return final status. Default: false.
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_execute_workflow")

async def main():
    # Fire and forget (returns immediately with execution_id)
    result = await tool._arun(
        workflow_id="wf_a1b2c3d4e5f6",
        input={"amount": "50.0", "recipient": "0xAbc..."},
        wait=False
    )
    print(result)

    # Wait for completion
    result = await tool._arun(
        workflow_id="wf_a1b2c3d4e5f6",
        wait=True
    )
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const execTool = tools.find(t => t.name === "keeperhub_execute_workflow")!;

const result = await execTool.invoke({
  workflow_id: "wf_a1b2c3d4e5f6",
  input: { amount: "50.0" },
  wait: true,
});
console.log(result);
```

## Example Output

```json
{
  "executionId": "exec_9z8y7x6w5v",
  "workflowId": "wf_a1b2c3d4e5f6",
  "status": "completed",
  "startedAt": "2026-05-03T10:00:00Z",
  "completedAt": "2026-05-03T10:00:47Z",
  "transactionHashes": [
    "0x4a2f8c1e...9d3b"
  ]
}
```

## Notes

- When `wait=false` (default), use `keeperhub_get_execution_status` to poll for the final result.
- When `wait=true`, the tool polls internally. This may take up to several minutes for complex multi-step workflows.
- The `input` dict keys must match the input node names defined in the workflow. Check `keeperhub_get_workflow` for the expected schema.
- Workflows that require a funded managed wallet will fail if the balance is insufficient. Check with `keeperhub_wallet_balance` first.
