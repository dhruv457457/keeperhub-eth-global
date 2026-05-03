# kh.workflows

Create, list, and execute KeeperHub workflows.

## Methods

### `kh.workflows.list(options?)`
```typescript
const workflows = await kh.workflows.list({ limit: 20 });
// [{ id, name, description, createdAt }]
```

### `kh.workflows.generate(prompt, options?)`
Generate a workflow from plain English.

```typescript
const wf = await kh.workflows.generate(
  "Supply 100 USDC to Aave V3 on Base",
  { execute: false }
);
// { workflowId, name, nodeCount }
```

**Always resolve token addresses first** — include real `0x` addresses in the prompt.

### `kh.workflows.execute(workflowId, input?, options?)`
```typescript
const exec = await kh.workflows.execute("wf_abc123", { amount: "100" });
// { executionId, status }
```

### `kh.workflows.getExecution(executionId)`
```typescript
const status = await kh.workflows.getExecution("exec_xyz");
// { status: "completed", progress: 100, transactionHash: "0x..." }
```

## Status Values
`pending` → `running` → `completed` | `failed` | `cancelled`
