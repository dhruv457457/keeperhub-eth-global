---
title: "Agent-Native APIs"
description: "APIs designed specifically for autonomous AI agents — never-throws wrappers, capability manifests, session tagging, and structured observations."
---

# Agent-Native APIs

Standard SDK methods throw exceptions on failure. An uncaught exception in an agent loop crashes the entire agent. The agent-native layer solves this by providing never-throws wrappers, structured observations, session context, and a machine-readable capability manifest.

## Problem: Agents Crash on Errors

```typescript
// Dangerous in an agent loop — any network error, payment failure,
// or execution timeout crashes the entire agent
const result = await kh.run("wf_abc123");
```

## Solution: AgentObservation

Every agent-native method returns an `AgentObservation<T>`:

```typescript
interface AgentObservation<T> {
  ok: boolean;
  action: string;         // which SDK method produced this
  result?: T;             // present when ok is true
  error?: {
    message: string;
    code: string;
    isRetryable: boolean;     // should the agent retry?
    suggestedAction: string;  // human-readable next step for the agent
    details?: unknown;
  };
  summary: string;        // LLM-ready text — paste into the next prompt
}
```

## `kh.tryRun(workflowId, options?)`

Never-throws variant of `kh.run()`. Safe to call inside any agent loop.

```typescript
const obs = await kh.tryRun("wf_abc123", { verbose: true });

if (!obs.ok) {
  // Structured error — no stack trace parsing required
  if (obs.error?.isRetryable) {
    // Back off and retry
  } else if (obs.error?.code === "PAYMENT_POLICY") {
    // Notify user about budget exhaustion
  }
  agentLog.push(obs.summary); // LLM-ready: "Workflow wf_abc123 failed: ..."
  return;
}

// Success
agentLog.push(obs.summary); // "Workflow completed successfully after 2 attempts."
```

## `pipeline().safeWait(options?)`

Never-throws variant of `pipeline().wait()`. Returns `AgentObservation<PipelineResult>`.

```typescript
const obs = await kh.pipeline()
  .generate("Check vault health factor on Aave")
  .pay({ budget: "0.05" })
  .safeWait({ timeout: 60_000 });

// Always has a summary — even on failure
console.log(obs.summary);
// Success: "Workflow completed successfully. Execution ID: exec_abc."
// Failure: "Pipeline failed: estimated cost 0.08 USDC exceeds budget 0.05 USDC [PAYMENT_POLICY]"
// Approval: "Execution paused — payment approval required. Approval URL: https://..."
```

## `agentContext` — Session Tagging

Attach session metadata to every API request. KeeperHub uses these headers for per-session observability and audit trails in the dashboard.

```typescript
const kh = new KeeperHub({
  apiKey: process.env.KEEPERHUB_API_KEY,
  agentContext: {
    sessionId: conversationId,      // X-Agent-Session-Id header
    runId: currentLoopIteration,    // X-Agent-Run-Id header
    goal: userIntent.slice(0, 200), // X-Agent-Goal header (truncated to 500 chars)
  },
});
```

With `agentContext` set, every request is tagged — executions, payments, analytics, and errors all appear under the same session in the KeeperHub dashboard.

**ElizaOS:**
```typescript
createKeeperHubPlugin({
  apiKey: process.env.KEEPERHUB_API_KEY,
  agentContext: {
    sessionId: runtime.agentId,
    goal: character.bio[0],
  },
});
```

## `kh.capabilities()`

Returns a structured manifest of everything this SDK instance can do. Designed for LLM tool-selection prompts.

```typescript
const tools = kh.capabilities();

// Use as system prompt context
const systemPrompt = tools
  .map(t => `- ${t.name} [${t.category}]: ${t.description}\n  Example: ${t.example}`)
  .join("\n");

// Or filter by category
const paymentTools = tools.filter(t => t.category === "payments");
```

Each entry:
```typescript
interface AgentCapability {
  name: string;         // machine-readable identifier
  description: string;  // one sentence for LLM tool selection
  parameters: Record<string, string>; // param name → type description
  example: string;      // runnable code example
  category: "workflows" | "payments" | "web3" | "protocols" | "analytics" | "identity";
}
```

The manifest covers 16 capabilities across 5 categories — execute workflow, generate workflow, use template, transfer tokens, read/write contract, swap, protocol actions, preflight, check balance, explain failure, replay, register identity, and more.

## Error Classes — `isRetryable` and `suggestedAction`

All SDK errors expose structured properties for agent decision-making:

| Error Class | `isRetryable` | `suggestedAction` |
|---|---|---|
| `KeeperHubAuthError` | false | "Check your API key" |
| `KeeperHubRateLimitError` | true | "Wait N seconds and retry" |
| `KeeperHubExecutionError` | true (if status is "error") | "Retry or inspect execution logs" |
| `KeeperHubPaymentRequiredError` | false | "Set up payment via resolvePayment" |
| `KeeperHubPaymentPolicyError` | false | "Increase budget, top up wallet, or request approval" |
| `KeeperHubExecutionTimeoutError` | true | "Check execution status separately" |
| `KeeperHubNotFoundError` | false | "Verify the ID exists" |
| `KeeperHubValidationError` | false | "Fix the request parameters" |

```typescript
try {
  await kh.run("wf_abc");
} catch (err) {
  if (err instanceof KeeperHubError) {
    console.log(err.isRetryable);     // boolean
    console.log(err.suggestedAction); // string — paste into agent's next step
  }
}
```

## `kh.agent.ensureRegistered(input?)` — Idempotent On-Chain Identity

Register this agent as an ERC-8004 identity. Safe to call on every startup — returns the existing registration if one is found, only mints a new NFT if none exists.

```typescript
// In your agent's initialization — idempotent, no duplicate mints
const registration = await kh.agent.ensureRegistered({
  name: "My DeFi Agent",
  description: "Automates Aave compounding strategies on Base",
  capabilities: ["aave/supply", "uniswap/swap", "workflow-execution"],
});

console.log(registration.agentId);  // on-chain agent ID
console.log(registration.chainId);  // chain where identity is registered
console.log(registration.txHash);   // present only if just minted
```

## Agent Loop Pattern

Combining all agent-native features:

```typescript
const kh = new KeeperHub({
  apiKey: process.env.KEEPERHUB_API_KEY,
  agentContext: { sessionId: sessionId, goal: userGoal },
});

// Register identity once on startup
await kh.agent.ensureRegistered({ name: "My Agent" });

// Main loop — never crashes
async function agentLoop(intent: string) {
  const obs = await kh.pipeline()
    .generate(intent)
    .pay({ budget: "0.10", dailyBudget: "2.00" })
    .ephemeral()
    .safeWait({ timeout: 120_000 });

  if (obs.ok) {
    return { success: true, message: obs.summary };
  }

  return {
    success: false,
    message: obs.summary,
    shouldRetry: obs.error?.isRetryable ?? false,
    nextStep: obs.error?.suggestedAction,
  };
}
```
