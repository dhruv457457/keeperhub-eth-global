# kh.executions

Poll and track workflow execution status.

## Methods

### `kh.executions.get(executionId)`
Get current status of an execution.

```typescript
const exec = await kh.executions.get("exec_abc123");
// { status, progress, nodeStatuses, transactionHash }
```

### `kh.executions.wait(executionId, options?)`
Poll until terminal state (completed / failed / cancelled).

```typescript
const result = await kh.executions.wait("exec_abc123", {
  pollInterval: 2000,  // ms between polls, default 2000
  timeout: 120000,     // max wait ms, default 120000
});
```

### `kh.executions.stream(executionId)`
Live WebSocket stream of execution events.

```typescript
const stream = kh.executions.stream("exec_abc123");
stream.on("step", (event) => console.log(event));
stream.on("complete", (event) => console.log("Done:", event));
stream.close(); // cleanup
```

## Status Values

| Status | Meaning |
|--------|---------|
| `pending` | Queued, not started |
| `running` | Currently executing |
| `completed` | Finished successfully |
| `failed` | Error during execution |
| `cancelled` | Manually stopped |
