# KEEPERHUB_LIST_WORKFLOWS

List the workflows configured in the current KeeperHub project.

## What It Does
Retrieves up to 15 workflows from the project, returning their names, IDs, and current status. Useful for users who want to see what automations are available, find a workflow ID for execution, or audit existing setups. Results are returned as a formatted list in the agent response.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | string | no | Filter to a specific project ID |
| tagId | string | no | Filter by tag |
| limit | number | no | Max results, capped at 15 for ElizaOS responses |

## Python Example
```python
result = await tool._arun(limit=15)
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
    { "id": "wf_abc123", "name": "Daily Yield Rebalancer", "status": "active" },
    { "id": "wf_def456", "name": "Price Alert Sender", "status": "paused" }
  ],
  "total": 2
}
```

## Notes
- Trigger phrases: "list workflows", "show automations", "what workflows do I have", "show me my automations"
- Returns up to 15 workflows by default in ElizaOS responses for readability.
- Use workflow `id` values with the `KEEPERHUB_EXECUTE_WORKFLOW` action.
- Workflows in `paused` status can still be manually triggered.
