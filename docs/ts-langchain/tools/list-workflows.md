# keeperhub_list_workflows

List workflows in the current KeeperHub project, with optional filtering.

## What It Does
Returns a paginated list of workflows available in the project. Supports filtering by project ID and tag, and limits the number of results returned. Use this to discover existing automations, find a workflow ID for execution, or audit what is currently deployed.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | string | no | Filter results to a specific project ID |
| tagId | string | no | Filter by tag ID assigned to workflows |
| limit | number | no | Maximum number of workflows to return (default: 20) |

## Python Example
```python
result = await tool._arun(limit=10)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "List my workflows" }]
});
```

## Example Output
```json
{
  "workflows": [
    {
      "id": "wf_abc123",
      "name": "Daily Yield Rebalancer",
      "status": "active",
      "tags": ["defi", "yield"]
    },
    {
      "id": "wf_def456",
      "name": "Price Alert Sender",
      "status": "paused",
      "tags": ["alerts"]
    }
  ],
  "total": 2
}
```

## Notes
- Without filters, returns all workflows accessible to the current API key up to `limit`.
- Use the `id` field from results as the `workflowId` for `keeperhub_execute_workflow`.
- Workflows in `paused` status can still be executed via `keeperhub_execute_workflow`; `status` reflects scheduled execution state.
