# kh.analytics

Usage statistics and spend tracking.

**Note:** Analytics endpoints return `401` on some KeeperHub plan types. Always handle errors gracefully — do not let analytics failures crash your agent.

## Methods

### `kh.analytics.summary(options?)`
```typescript
try {
  const summary = await kh.analytics.summary({ range: "30d" });
  // { usage: { totalRuns, totalCost }, gasCredits }
} catch {
  // 401 on some plans — handle gracefully
}
```

### `kh.analytics.runs(options?)`
List recent execution runs.

```typescript
const runs = await kh.analytics.runs({ range: "7d" });
// [{ executionId, status, createdAt, cost }]
```

### `kh.analytics.spendCap()`
Get gas credit usage.

```typescript
const credits = await kh.analytics.spendCap();
// { limit, used, remaining, percentUsed }
```

## React Hook

```typescript
import { useAnalyticsSummary } from "keeperhub-sdk/react";

function Dashboard() {
  const { data, error } = useAnalyticsSummary();
  // data?.usage.totalRuns
}
```

The React hook has `retry: false` and `throwOnError: false` set — 401s are silently ignored.
