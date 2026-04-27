---
title: "Workflows & Executions"
description: "CRUD, execution, AI generation, and status polling for KeeperHub workflows."
---

# Workflows & Executions

## WorkflowsModule

### `kh.workflows.list(input?)`

```typescript
const workflows = await kh.workflows.list({ projectId: "proj_abc", tagId: "tag_xyz" });
```

### `kh.workflows.get(workflowId)`

```typescript
const wf = await kh.workflows.get("wf_abc123");
console.log(wf.name, wf.visibility, wf.nodes.length);
```

### `kh.workflows.create(input)`

```typescript
const wf = await kh.workflows.create({
  name: "Weekly Compound",
  description: "Compound Aave USDC rewards every Monday",
  nodes: [...],
  edges: [...],
  projectId: "proj_abc",
});
```

### `kh.workflows.update(workflowId, input)`

```typescript
await kh.workflows.update("wf_abc", { name: "Weekly Compound — v2" });
```

### `kh.workflows.delete(workflowId)`

```typescript
await kh.workflows.delete("wf_abc");
```

### `kh.workflows.execute(workflowId, input?, options?)`

Returns an `ExecutionHandle` for polling or streaming. Pass `idempotencyKey` to safely retry without double-executing.

```typescript
const handle = await kh.workflows.execute("wf_abc", { amount: "100" }, {
  idempotencyKey: `exec-${crypto.randomUUID()}`,
});
const execution = await handle.waitForCompletion({ timeout: 60_000 });
```

### `kh.workflows.run(workflowId, options?)`

Higher-level orchestration — execute + optional wait + retry + failure explanation in one call.

```typescript
const result = await kh.workflows.run("wf_abc", {
  input: { amount: "100" },
  wait: true,
  verbose: true,   // attach logs to result
  mode: "safe",    // retry on failure
  retries: 2,
  retryDelayMs: 3000,
});

console.log(result.status);   // "completed"
console.log(result.attempts); // 1
console.log(result.logs);     // ExecutionLog[] when verbose: true
```

### `kh.workflows.generateSpec(input)` — not persisted

Generate a workflow spec from a natural-language prompt. **The result is an in-memory spec — it is NOT saved to KeeperHub.** Call `create()` to persist it, or use `generateAndCreate()`.

```typescript
const spec = await kh.workflows.generateSpec({
  prompt: "Compound my Aave USDC rewards every Monday at 9am UTC",
  context: "Wallet has USDC on Aave v3 on Base",
});
// spec.name, spec.nodes, spec.edges — not yet saved
```

### `kh.workflows.generateAndCreate(input)`

Generate + save in one call. Returns a persisted `Workflow` with a real ID ready for execution.

```typescript
const wf = await kh.workflows.generateAndCreate({
  prompt: "Monitor ETH price and alert on Discord when below $2000",
});
console.log(wf.id); // "wf_abc123" — saved and ready
await kh.workflows.execute(wf.id);
```

### `kh.workflows.duplicate(workflowId)` / `kh.workflows.goLive(workflowId)`

```typescript
const copy = await kh.workflows.duplicate("wf_abc");
await kh.workflows.goLive("wf_abc"); // publish workflow
```

## ExecutionsModule

### `kh.executions.getStatus(executionId)`

```typescript
const status = await kh.executions.getStatus("exec_abc");
// status.status — "pending" | "running" | "completed" | "failed" | ...
// status.progress — { completedSteps, totalSteps, percentage, currentNodeName }
// status.errorContext — { failedNodeId, error, executionTrace }
```

### `kh.executions.getLogs(executionId)`

Returns normalized `ExecutionLog[]`. Each log includes:
- `step` — human-readable step name
- `txHash` — transaction hash if the step submitted an onchain transaction
- `gasUsedWei` — gas consumed by the step
- `durationMs` — step execution time
- `error` — error message if the step failed

### `kh.executions.cancel(executionId)`

```typescript
await kh.executions.cancel("exec_abc");
```

### `kh.executions.handle(executionId)`

Get an `ExecutionHandle` for a previously started execution.

```typescript
const handle = kh.executions.handle("exec_abc");
const execution = await handle.waitForCompletion({
  timeout: 120_000,
  signal: abortController.signal, // cancel from React useEffect cleanup
  onProgress: (status) => {
    setProgress(status.progress?.percentage ?? 0);
  },
});
```

### `ExecutionHandle.stream()`

Open a live WebSocket stream for real-time step logs.

```typescript
const stream = handle.stream();
const off = stream.on("step", (data) => console.log("Step:", data));
stream.on("complete", () => off()); // cleanup listener
```

The stream uses an allowlisted event dispatcher — only `step`, `complete`, `error`, `update`, `log`, `cancelled`, and `running` events are forwarded to listeners.

## `kh.workflowBuilder(input)`

Fluent builder for constructing a workflow programmatically before saving.

```typescript
import { triggers } from "keeperhub-sdk";

const handle = await kh.workflowBuilder({ name: "Weekly Compound" })
  .trigger(triggers.schedule("0 9 * * 1")) // 9am UTC every Monday
  .step({
    id: "s1",
    label: "Supply USDC to Aave",
    actionType: "AaveSupply",
    config: { asset: "USDC", amount: "{{input.amount}}" },
  })
  .step({
    id: "s2",
    label: "Send Discord alert",
    actionType: "DiscordSend",
    config: { message: "Supplied {{s1.output.amount}} USDC to Aave" },
  })
  .run(); // saves and executes immediately
```
