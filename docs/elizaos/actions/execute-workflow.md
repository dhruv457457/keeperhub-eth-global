# KEEPERHUB_EXECUTE_WORKFLOW

Run a saved KeeperHub workflow by ID.

## What It Does

Detects a workflow ID in the user's message (pattern `wf_xxx`) and triggers its execution. Input parameters can be passed as JSON in a code block or as an `input: {...}` pattern in the message. Returns the execution ID and current status.

## Trigger Phrases

The action matches messages containing:
- "run" + a workflow ID pattern (`wf_xxx`)
- "execute" + a workflow ID pattern
- "trigger" + a workflow ID pattern
- "start workflow wf_..."
- Any message containing a string matching `wf_[a-zA-Z0-9]+`

## Schema

```typescript
// Extracted from message — no explicit parameters required
{
  workflow_id: string   // Extracted from wf_xxx pattern in the message
  input?: Record<string, unknown>  // Parsed from JSON code block or "input: {...}" in message
  wait?: boolean        // True if user says "wait for it" or "tell me when done"
}
```

## Example Conversation

### Basic Execution

```
User: Run workflow wf_a1b2c3d4e5f6

Agent: Starting workflow "Supply USDC to Aave V3 on Base"...

Execution started:
• Execution ID: exec_9z8y7x6w5v
• Status: running
• Workflow: wf_a1b2c3d4e5f6

I'll let you know when it completes.
```

### With Input Parameters

```
User: Execute wf_a1b2c3d4e5f6 with input: {"amount": "200.0"}

Agent: Starting workflow with custom amount of 200.0 USDC...

Execution started:
• Execution ID: exec_8x7w6v5u4t
• Status: running
```

### With JSON Code Block

````
User: Run wf_a1b2c3d4e5f6 using these params:
```json
{"amount": "50.0", "recipient": "0xAbc..."}
```

Agent: Running workflow with the provided parameters...
````

## Example Output (action result)

```json
{
  "executionId": "exec_9z8y7x6w5v",
  "workflowId": "wf_a1b2c3d4e5f6",
  "status": "running",
  "startedAt": "2026-05-03T10:00:00Z"
}
```

## Notes

- The workflow ID pattern `wf_[a-zA-Z0-9]+` is detected automatically — users do not need to use special syntax.
- Input parameters are parsed from:
  1. A JSON code block (` ```json {...} ``` `) in the message
  2. An `input: {...}` inline pattern
  3. Key-value pairs like `amount=50 recipient=0xAbc`
- When `wait` is inferred as `true`, the action polls until completion and reports the final status.
- Use `KEEPERHUB_GET_EXECUTION` to check status of a previously started execution.
