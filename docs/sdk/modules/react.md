# React Hooks

`keeperhub-sdk/react` provides React hooks for all SDK modules using `@tanstack/react-query`.

## Setup

```typescript
import { KeeperHubProvider } from "keeperhub-sdk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KeeperHubProvider apiKey={process.env.NEXT_PUBLIC_KH_API_KEY!}>
        <YourApp />
      </KeeperHubProvider>
    </QueryClientProvider>
  );
}
```

## Available Hooks

```typescript
import {
  useWallet,
  useWalletBalances,
  useChains,
  useWorkflows,
  useExecution,
  useExecutionStatus,
  useExecutionLogs,
  useAnalyticsSummary,
  useKeeperHub,        // raw kh instance
} from "keeperhub-sdk/react";
```

## Example

```typescript
function Dashboard() {
  const wallet   = useWallet();
  const balances = useWalletBalances();
  const chains   = useChains();
  const workflows = useWorkflows();

  if (wallet.isLoading) return <p>Loading...</p>;

  return (
    <div>
      <p>Wallet: {wallet.data?.address}</p>
      <p>Chains: {chains.data?.length}</p>
      <p>Workflows: {workflows.data?.length}</p>
    </div>
  );
}
```

## Notes

- All hooks have `staleTime: 60_000` (1 minute cache)
- Analytics hooks have `retry: false` — 401s are silently ignored
- Use `useKeeperHub()` to access the raw `kh` instance for manual calls
