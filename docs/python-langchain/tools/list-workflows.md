# keeperhub_list_workflows

List workflows saved in your KeeperHub organization.

## What It Does

Returns a paginated list of workflows associated with your account or a specific project. Each entry includes the workflow ID, name, description, node count, and creation timestamp. Useful for discovering existing automations before generating new ones.

## Schema

```
project_id?: str  — Filter by project ID. Omit to list all org workflows.
limit?: int       — Maximum number of workflows to return. Default: 20. Max: 100.
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_list_workflows")

async def main():
    # List all workflows
    result = await tool._arun()
    print(result)

    # List workflows in a specific project
    result = await tool._arun(project_id="proj_xyz123", limit=50)
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const listTool = tools.find(t => t.name === "keeperhub_list_workflows")!;

const result = await listTool.invoke({ limit: 10 });
console.log(result);
```

## Example Output

```json
{
  "count": 3,
  "workflows": [
    {
      "id": "wf_a1b2c3d4e5f6",
      "name": "Supply USDC to Aave V3 on Base",
      "description": "Supply 100 USDC to Aave V3 on Base mainnet, then send email notification.",
      "nodeCount": 3,
      "projectId": "proj_xyz123",
      "createdAt": "2026-05-01T09:00:00Z",
      "updatedAt": "2026-05-02T14:30:00Z"
    },
    {
      "id": "wf_b2c3d4e5f6a1",
      "name": "Daily ETH Price Alert",
      "description": "Check ETH/USD price via Chainlink and notify if below threshold.",
      "nodeCount": 2,
      "projectId": "proj_xyz123",
      "createdAt": "2026-04-28T08:00:00Z",
      "updatedAt": "2026-04-28T08:00:00Z"
    },
    {
      "id": "wf_c3d4e5f6a1b2",
      "name": "Register Agent on Base",
      "description": "Mint ERC-8004 NFT for this agent on Base.",
      "nodeCount": 1,
      "projectId": null,
      "createdAt": "2026-04-25T12:00:00Z",
      "updatedAt": "2026-04-25T12:00:00Z"
    }
  ]
}
```

## Notes

- Results are sorted by `updatedAt` descending (most recently modified first).
- Use the returned `id` values with `keeperhub_execute_workflow` or `keeperhub_get_execution_status`.
- Workflows with `projectId: null` belong to the org root (not associated with a specific project).
- This tool is read-only and does not affect any on-chain state.
