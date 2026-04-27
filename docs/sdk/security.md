---
title: "Security"
description: "Security features built into the SDK — webhook verification, SSRF protection, input sanitization, and prototype pollution defense."
---

# Security

The SDK includes several security layers that are active by default. This page documents each protection, why it exists, and how it works.

## Webhook Signature Verification

KeeperHub signs webhook payloads with HMAC-SHA256. Always verify the signature before processing — an unverified webhook can be forged by any party that knows your endpoint URL.

```typescript
import { handleWebhook } from "keeperhub-sdk";

// Express — pass raw body, not parsed JSON
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const payload = await handleWebhook(
      req.body,                                  // raw Buffer — do NOT call JSON.parse first
      req.headers["x-keeperhub-signature"],
      process.env.WEBHOOK_SECRET!
    );
    // payload is verified and typed as WebhookPayload
    console.log(payload.event, payload.executionId);
    res.sendStatus(200);
  } catch {
    res.status(401).send("Invalid signature");
  }
});
```

**Implementation detail:** The HMAC comparison uses a constant-time algorithm that pads both strings to equal length before XOR-comparing character codes. Length mismatches are encoded as a bit difference in the result rather than causing an early return. This prevents timing-based attacks where an attacker measures response time to determine how many characters of the signature are correct.

```typescript
// Internally — no early return on length mismatch
function constantTimeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  const aPad = a.padEnd(maxLen, "\0");
  const bPad = b.padEnd(maxLen, "\0");
  let result = a.length === b.length ? 0 : 1; // length mismatch as bit, not early exit
  for (let i = 0; i < maxLen; i++) {
    result |= aPad.charCodeAt(i) ^ bPad.charCodeAt(i);
  }
  return result === 0;
}
```

## SSRF Protection on Base URL

The SDK validates `baseUrl` and custom RPC URLs before making any requests. Private IP ranges and non-HTTPS schemes are rejected.

```typescript
// These throw immediately — never reach the network
new KeeperHub({ baseUrl: "http://192.168.1.1/malicious" }); // private IP
new KeeperHub({ baseUrl: "file:///etc/passwd" });            // non-HTTP scheme

// Custom RPC URLs go through the same check
await kh.wallet.setRpc(8453, "http://10.0.0.1/node"); // blocked
```

Blocked ranges: `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`, `169.254.x.x` (link-local), IPv6 private ranges. `localhost` and `127.0.0.1` are allowed for local development.

## Event Type Allowlist

WebSocket streams dispatch events using `dispatchEvent()`. Without an allowlist, a malicious server message with `type: "constructor"` or `type: "__proto__"` could pollute the event target's prototype.

Both `ExecutionStream` and `AnalyticsStream` maintain an explicit allowlist:

```typescript
// ExecutionStream — only these types are dispatched
const ALLOWED_STREAM_EVENT_TYPES = new Set([
  "step", "complete", "error", "update", "log", "cancelled", "running",
]);

// AnalyticsStream
const ANALYTICS_ALLOWED_EVENT_TYPES = new Set([
  "execution.completed", "execution.failed", "execution.updated",
  "execution.started", "execution.cancelled", "event",
]);
```

## Input Sanitization (ElizaOS Plugin)

The `execute-workflow` action in the ElizaOS plugin sanitizes JSON input extracted from chat messages before passing it to the workflow.

**Prototype pollution defense:** All input goes through a JSON round-trip (`JSON.parse(JSON.stringify(raw))`) before any processing. This strips `__proto__` from nested objects at every depth level — something that key-level checks alone cannot do.

```typescript
// This nested attack is neutralized:
const malicious = { user: { __proto__: { admin: true } } };
const safe = JSON.parse(JSON.stringify(malicious));
// safe.user.__proto__ === Object.prototype — attack stripped
```

Additional guardrails applied after round-trip:
- Top-level `__proto__`, `constructor`, `prototype` keys are blocked
- String values are truncated to 512 chars before serialization (never after, which would break JSON structure)
- Maximum 20 keys per input object
- Maximum 8KB total serialized size — returns `null` (rejected, not silently dropped as `{}`) if exceeded

## Prompt Injection Prevention

Workflow names and descriptions are user-controlled content that goes into LLM system prompts. The ElizaOS workflows provider and LangChain `buildSystemPrompt()` both sanitize metadata before injection:

```typescript
const sanitize = (s: string) =>
  s.replace(/[`\[\]{}\\]/g, "").slice(0, 80);
```

Stripped characters prevent:
- Backtick-fenced code injection via workflow names
- JSON/object literal injection via `{}` 
- Markdown link injection via `[]`
- Escape sequence injection via `\`

## Prompt Size Limits

The `generate-workflow` action in both the ElizaOS plugin and LangChain tools enforces a 1000-character limit on prompts and a 500-character limit on context before calling `kh.workflows.generateSpec()`.

```typescript
// ElizaOS
const MAX_PROMPT = 1000;
if (prompt.length > MAX_PROMPT) {
  await callback?.({ text: `❌ Prompt too long (${prompt.length} chars)...` });
  return false;
}

// LangChain — enforced in Zod schema
prompt: z.string().max(1000).trim(),
context: z.string().max(500).trim().optional(),
```

## Allowlist for Workflow Execution (ElizaOS)

The `createKeeperHubPlugin` factory accepts an `allowedWorkflowIds` set. When configured, only workflows in the set can be executed by the agent — any workflow ID extracted from a chat message that isn't in the list is rejected at both `validate` and `handler` time.

The same allowlist is forwarded to the `generate-workflow` action to block the generate-and-execute path. A freshly generated workflow ID won't be in the allowlist, so without this guard an attacker could say "create a workflow to drain my wallet and run it" and bypass the allowlist entirely.

```typescript
createKeeperHubPlugin({
  apiKey: process.env.KEEPERHUB_API_KEY,
  allowedWorkflowIds: ["wf_compound_usdc", "wf_rebalance_portfolio"],
});
// Any other wf_ ID in a chat message is silently ignored
```

## Retry-After Cap

The `Retry-After` header from a 429 response is capped at 60 seconds, regardless of what the server returns. This prevents a compromised or misbehaving server from instructing the SDK to sleep for an arbitrarily long period.

```typescript
private backoffDelay(attempt: number, retryAfter?: number): number {
  if (retryAfter) return Math.min(retryAfter * 1000, 60_000); // cap at 60s
  // ...
}
```
