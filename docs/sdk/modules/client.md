# HTTP Client

The core HTTP client used by all SDK modules.

## Config

```typescript
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({
  apiKey: "kh_...",
  baseUrl: "https://app.keeperhub.com",  // default
  timeout: 30000,                         // ms, default 30s
  maxAttempts: 3,                         // GET retry attempts
});
```

## Retry Behaviour

| Method | Retries | Why |
|--------|---------|-----|
| GET | 3 (1s, 2s, 3s backoff) | Safe to retry reads |
| POST / PATCH / DELETE | 0 | Prevents duplicate transactions |
| HTTP 429 | Up to 3, honours `Retry-After` (max 60s) | Rate limit |
| HTTP 4xx / 5xx | 0 | Raise immediately |

## Error Types

```typescript
import { KeeperHubError, RateLimitError, AuthError } from "keeperhub-sdk";

try {
  await kh.wallet.get();
} catch (err) {
  if (err instanceof AuthError)      console.log("Invalid API key");
  if (err instanceof RateLimitError) console.log("Rate limited");
  if (err instanceof KeeperHubError) console.log(err.message, err.status);
}
```
