---
title: "Pipeline API"
description: "The fluent pipeline API — the primary way to execute, generate, and pay for KeeperHub workflows."
---

# Pipeline API

The pipeline is the primary execution interface in the SDK. It is a fluent builder that chains target selection, payment guardrails, retry policy, and execution into a single readable expression.

```typescript
const result = await kh.pipeline()
  .generate("Rebalance my Aave position")
  .pay({ budget: "0.05", dailyBudget: "1.00" })
  .retry({ attempts: 2, delayMs: 2000 })
  .wait({ timeout: 120_000 });
```

## Target Selection

Every pipeline starts by choosing what to execute.

### `.workflow(id, input?)`

Execute an existing workflow by ID.

```typescript
await kh.pipeline()
  .workflow("wf_abc123", { amount: "100", token: "USDC" })
  .wait();
```

### `.generate(prompt, options?)`

Generate a new workflow from natural language, save it, and execute it. The generated workflow persists in your account after execution.

```typescript
await kh.pipeline()
  .generate("Compound USDC on Aave v3 every Monday at 9am UTC", {
    context: "User has USDC deposited on Base mainnet"
  })
  .wait();
```

### `.generate() + .ephemeral()`

Generate, run once, then auto-delete. Use when an agent is exploring options and does not need to keep the workflow.

```typescript
await kh.pipeline()
  .generate("Check if ETH price is below $2000")
  .ephemeral()
  .wait();
// workflow is deleted after execution regardless of success or failure
```

### `.listedWorkflow(slug, input?)`

Call a publicly listed paid workflow by slug. Handles x402/MPP payment automatically.

```typescript
await kh.pipeline()
  .listedWorkflow("eth-price-feed", { network: "8453" })
  .payIfNeeded({ strategy: "auto", resolvePayment: myWallet.sign })
  .wait();
```

## Modifiers

### `.withInput(input)`

Merge runtime inputs into whatever was set on the target. Useful when the input isn't known until after target selection.

```typescript
const amount = await getUserInput();
await kh.pipeline()
  .workflow("wf_transfer")
  .withInput({ amount, recipient: "0x..." })
  .wait();
```

### `.modify(fn)`

Transform a generated workflow before saving and executing. Return a partial `UpdateWorkflowInput` to patch specific fields.

```typescript
await kh.pipeline()
  .generate("Weekly Aave compound")
  .modify(wf => ({ name: "My Compound Strategy — v2" }))
  .wait();
```

## Payment Guardrails

### `.pay(policy)`

Apply budget limits before execution. Automatically requests a preflight cost estimate so the budget check has a real number to compare against.

```typescript
await kh.pipeline()
  .workflow("wf_expensive_rebalance")
  .pay({
    budget: "0.10",             // hard cap per execution (USDC)
    dailyBudget: "1.00",        // rolling 24h spend cap (USDC)
    requireApprovalAbove: "0.05", // pause for human sign-off above this
    mode: "auto",               // "auto" | "requireApproval"
  })
  .wait();
```

If the estimated cost exceeds `budget` or would breach `dailyBudget`, execution is blocked and a `KeeperHubPaymentPolicyError` is thrown with `estimatedCost` and `approvalUrl`.

If `requireApprovalAbove` is triggered, the pipeline returns `{ status: "pending_approval", payment: { approvalUrl } }` without executing.

### `.preflight()`

Request a cost estimate without applying budget guardrails. Adds `payment.estimatedCost` to the result.

```typescript
const result = await kh.pipeline().workflow("wf_abc").preflight().wait();
console.log(result.payment?.estimatedCost); // "0.03"
```

## Retry

```typescript
await kh.pipeline()
  .workflow("wf_abc")
  .retry({ attempts: 3, delayMs: 5_000 })
  .wait();
```

Retries re-run the workflow if the previous attempt returned `failed` or `error`. Payment policy is re-evaluated before each retry to ensure the cost estimate is fresh.

## Execution

### `.wait(options?)`

Execute and block until a terminal status is reached. Returns `PipelineResult`.

```typescript
const result = await kh.pipeline().workflow("wf_abc").wait({
  timeout: 120_000,   // ms before KeeperHubExecutionTimeoutError
  pollInterval: 2000, // how often to poll status
  onProgress: (status) => {
    console.log(`${status.progress?.completedSteps}/${status.progress?.totalSteps} steps`);
  },
  signal: abortController.signal, // cancel from React cleanup or SIGINT
});
```

### `.safeWait(options?)` — recommended for agents

Never throws. Always returns an `AgentObservation<PipelineResult>` with `ok`, `summary`, and structured error details.

```typescript
const obs = await kh.pipeline()
  .generate("Check vault health")
  .safeWait();

if (!obs.ok) {
  // obs.error.isRetryable — should the agent try again?
  // obs.error.suggestedAction — what to do next
  // obs.summary — paste directly into the next LLM prompt
}
```

### `.run()`

Fire and don't wait. Returns immediately with `{ status: "running", executionId }`.

```typescript
const result = await kh.pipeline().workflow("wf_abc").run();
// result.executionId is available to poll separately
```

## Result shape

```typescript
interface PipelineResult {
  executionId?: string;        // undefined if status is "pending_approval"
  status: ExecutionStatus | "pending_approval" | "running";
  execution?: Execution;       // full execution object when waited
  attempts: number;
  payment?: {
    estimatedCost?: string;    // from preflight
    actualCost?: string;       // from post-execution
    status?: PaymentStatus;
    approvalUrl?: string;      // present when status is "pending_approval"
  };
}
```

## Common patterns

**Agent loop — generate, run, report:**
```typescript
const obs = await kh.pipeline()
  .generate(userIntent, { context: agentContext })
  .pay({ budget: "0.10", dailyBudget: "2.00" })
  .ephemeral()
  .safeWait();

agentMemory.push(obs.summary); // LLM-ready outcome
```

**Human-in-the-loop approval:**
```typescript
const result = await kh.pipeline()
  .workflow("wf_large_transfer")
  .pay({ requireApprovalAbove: "0.01" })
  .wait();

if (result.status === "pending_approval") {
  notifyUser(`Approve at: ${result.payment?.approvalUrl}`);
}
```
