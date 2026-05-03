# kh.webhooks

Verify incoming webhook signatures from KeeperHub.

## Verify a Webhook

```typescript
import { verifyWebhookSignature } from "keeperhub-sdk";

// In your Express/Next.js webhook handler:
app.post("/webhook", (req, res) => {
  const sig  = req.headers["x-keeperhub-signature"] as string;
  const body = req.rawBody; // raw string body

  const valid = verifyWebhookSignature({
    payload: body,
    signature: sig,
    secret: process.env.KEEPERHUB_WEBHOOK_SECRET!,
  });

  if (!valid) return res.status(401).send("Invalid signature");

  const event = JSON.parse(body);
  // event.type: "execution.completed" | "execution.failed" | ...
  res.status(200).send("ok");
});
```

## Event Types

| Event | When |
|-------|------|
| `execution.completed` | Workflow finished successfully |
| `execution.failed` | Workflow failed |
| `execution.step` | Individual step completed |
| `wallet.funded` | Managed wallet received funds |

## Notes

- Signature uses HMAC-SHA256
- Always use constant-time comparison (the SDK handles this)
- Verify on raw body before JSON parsing
