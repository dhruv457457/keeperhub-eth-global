---
title: "React Integration"
description: "React provider and hooks for building KeeperHub-powered dApps with live execution status and workflow management."
---

# React Integration

The SDK ships a React integration under the `/react` export path. It provides a context provider and a set of hooks built on `@tanstack/react-query`.

## Install

```bash
npm install keeperhub-sdk @tanstack/react-query react
```

## Setup

Wrap your app with `KeeperHubProvider`:

```tsx
import { KeeperHubProvider } from "keeperhub-sdk/react";

function App() {
  return (
    <KeeperHubProvider
      apiKey={process.env.NEXT_PUBLIC_KEEPERHUB_API_KEY}
      agentContext={{ sessionId: userId, goal: "DeFi automation dashboard" }}
    >
      <YourApp />
    </KeeperHubProvider>
  );
}
```

The provider creates a `KeeperHub` instance and a `QueryClient`. Pass your own `queryClient` if you already have one:

```tsx
<KeeperHubProvider apiKey="kh_..." queryClient={myQueryClient}>
```

The `KeeperHub` instance is memoized on `[apiKey, baseUrl, timeout, retry]` — changing config creates a new client, preventing stale connections.

## Hooks Reference

### Data Hooks

**`useWorkflows(input?)`** — list workflows with optional project/tag filter
```tsx
const { data: workflows, isLoading } = useWorkflows({ projectId: "proj_abc" });
```

**`useWorkflow(workflowId)`** — get a single workflow
```tsx
const { data: workflow } = useWorkflow("wf_abc123");
```

**`useExecution(executionId)`** — get execution details
```tsx
const { data: execution } = useExecution("exec_abc");
```

**`useAnalytics(options?)`** — dashboard summary (runs, gas credits, limits)
```tsx
const { data: analytics } = useAnalytics({ range: "7d" });
console.log(analytics?.usage.successfulRuns);
```

**`useProtocols()`** / **`useProtocol(slug)`** — DeFi protocol catalog

**`useChains()`** — supported blockchain networks

### Mutation Hooks

**`useExecuteWorkflow()`**
```tsx
const { mutate: executeWorkflow, isPending } = useExecuteWorkflow();

executeWorkflow(
  { workflowId: "wf_abc", input: { amount: "100" } },
  { onSuccess: (result) => console.log(result.executionId) }
);
```

**`useCreateWorkflow()`**
```tsx
const { mutate: createWorkflow } = useCreateWorkflow();
createWorkflow({ name: "My Workflow", nodes: [], edges: [] });
```

**`useUpdateWorkflow()`** / **`useDeleteWorkflow()`**

**`useGenerateWorkflow()`** — AI generation
```tsx
const { mutate: generateWorkflow, isPending } = useGenerateWorkflow();

generateWorkflow({ prompt: "Monitor vault health factor" }, {
  onSuccess: (wf) => router.push(`/workflows/${wf.id}`),
});
```

**`useWeb3()`** — transfer tokens and call contracts from React
```tsx
const { transfer, write, read, isPending } = useWeb3();

await transfer({ network: "8453", to: "0x...", amount: "0.01" });
```

### Streaming Hook

**`useExecutionStream(executionId)`** — live WebSocket stream for real-time step logs

```tsx
function ExecutionMonitor({ executionId }: { executionId: string }) {
  const { steps, status, isConnected } = useExecutionStream(executionId);

  return (
    <div>
      <p>Status: {status} {isConnected ? "🟢" : "🔴"}</p>
      {steps.map((step, i) => (
        <div key={i}>{step.nodeName}: {step.status}</div>
      ))}
    </div>
  );
}
```

## `useKeeperHub()`

Access the raw `KeeperHub` instance for direct API calls:

```tsx
import { useKeeperHub } from "keeperhub-sdk/react";

function MyComponent() {
  const kh = useKeeperHub();

  const handleRun = async () => {
    const obs = await kh.tryRun("wf_abc");
    console.log(obs.summary);
  };
}
```

## Import Path

The React integration is a separate export to keep tree-shaking clean for non-React environments:

```typescript
// React hooks and provider
import { KeeperHubProvider, useWorkflows, useExecuteWorkflow } from "keeperhub-sdk/react";

// Core SDK (no React dependency)
import { KeeperHub } from "keeperhub-sdk";
```
