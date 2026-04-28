# keeperhub-sdk — Agent Skills Reference

This file is written for AI agents. It describes every callable capability, when to use it, exact invocation syntax, response shape, and error handling. Read this before deciding which method to call.

---

## Setup

```typescript
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({
  apiKey: process.env.KEEPERHUB_API_KEY,
  agentContext: {
    sessionId: "<your-session-id>",   // ties all calls to one session in dashboard
    goal: "<what-the-agent-is-doing>", // surfaced in KeeperHub logs, max 500 chars
  },
});
```

---

## Decision Tree — Which method to call?

```
User wants to run an onchain action
│
├─ Workflow already exists and you know its ID
│   └─ kh.tryRun(workflowId)              ← never throws, always safe
│       or kh.pipeline().workflow(id).safeWait()
│
├─ Workflow needs to be created from a prompt
│   └─ kh.pipeline().generate(prompt).safeWait()
│       add .ephemeral() if you don't want to keep the workflow
│       add .pay({ budget }) if it costs USDC
│
├─ Listed/paid workflow (slug, not your own)
│   └─ kh.payments.execute(slug, input, { strategy: "auto", resolvePayment })
│
├─ Direct onchain operation (no workflow)
│   ├─ Token transfer → kh.web3.transfer()
│   ├─ Contract read  → kh.web3.call("read", params)
│   └─ Contract write → kh.web3.call("write", params)
│
└─ Check what's possible
    └─ kh.capabilities()  ← returns structured manifest for LLM tool selection
```

---

## Core Execution Skills

### `kh.tryRun(workflowId, options?)` ★ recommended for agents

**Use when:** Executing an existing workflow. Preferred over `kh.run()` in agent loops because it never throws.

```typescript
const obs = await kh.tryRun("wf_abc123", {
  input: { amount: "100", token: "USDC" },
  wait: true,
  mode: "safe",      // retries on failure
  verbose: true,     // attach logs to result
});

// Always check obs.ok first
if (obs.ok) {
  obs.result.status       // "completed" | "success" | "failed" | ...
  obs.result.executionId  // "exec_abc"
  obs.summary             // "Workflow wf_abc123 completed after 1 attempt."
} else {
  obs.error.message         // what went wrong
  obs.error.code            // "EXECUTION_FAILED" | "TIMEOUT" | "RATE_LIMIT" | ...
  obs.error.isRetryable     // boolean — should the agent retry?
  obs.error.suggestedAction // what to do next (human-readable)
  obs.summary               // paste into next LLM prompt
}
```

**Never use `kh.run()` in an agent loop** — it throws on failure and will crash the agent.

---

### `kh.pipeline()` — fluent execution builder

**Use when:** You need generate-from-prompt, payment guardrails, retry policy, or ephemeral workflows.

#### Pattern 1 — Run existing workflow with payment guardrails
```typescript
const obs = await kh.pipeline()
  .workflow("wf_abc123")
  .pay({ budget: "0.10", dailyBudget: "1.00" })
  .retry({ attempts: 2, delayMs: 3000 })
  .safeWait({ timeout: 120_000 });
```

#### Pattern 2 — Generate from prompt and run
```typescript
const obs = await kh.pipeline()
  .generate("Compound USDC on Aave v3 every Monday at 9am", {
    context: "Wallet has USDC on Base mainnet",
  })
  .pay({ budget: "0.10" })
  .safeWait();
```

#### Pattern 3 — Generate, run once, delete (ephemeral)
```typescript
const obs = await kh.pipeline()
  .generate("Check if ETH price is below $2000")
  .ephemeral()       // auto-deletes the workflow after execution
  .safeWait();
```

#### Pattern 4 — Listed/paid workflow via pipeline
```typescript
const obs = await kh.pipeline()
  .listedWorkflow("eth-price-feed")
  .payIfNeeded({ strategy: "auto", resolvePayment: wallet.sign })
  .safeWait();
```

**safeWait response:** `AgentObservation<PipelineResult>` — same shape as `tryRun`, always has `ok` and `summary`.

**Special status values in `obs.result.status`:**
- `"pending_approval"` — payment approval required before execution. Check `obs.result.payment.approvalUrl`.
- `"running"` — returned by `.run()` (fire-and-forget). Use the executionId to poll separately.

**Payment policy fields:**
```typescript
{
  budget: "0.05",              // hard cap per execution (USDC decimal string)
  dailyBudget: "1.00",         // rolling 24h cap — checked against real payment history
  requireApprovalAbove: "0.02", // pause for human sign-off above this amount
  mode: "auto" | "requireApproval",
  preflightMaxAgeMs: 60_000,   // re-fetch estimate if stale on retry
}
```

---

## Workflow Management Skills

### `kh.workflows.list(input?)`
```typescript
const workflows = await kh.workflows.list({ projectId?: string, tagId?: string });
// → Workflow[] with id, name, description, visibility, nodes, edges
```

### `kh.workflows.generateAndCreate(input)` — generates AND saves
```typescript
const wf = await kh.workflows.generateAndCreate({
  prompt: "Monitor vault health factor and alert on Discord",
  context: "Optional wallet/protocol context",
});
// → Workflow with real id, ready to execute
await kh.workflows.execute(wf.id);
```

**vs `generateSpec`:** `generateSpec` returns an unsaved in-memory spec. `generateAndCreate` saves it. Use `generateAndCreate` unless you need to inspect/modify the spec before saving.

### `kh.workflows.execute(workflowId, input?, options?)`
Returns `ExecutionHandle` for manual polling. Use `tryRun` or `pipeline().safeWait()` instead unless you need streaming.

```typescript
const handle = await kh.workflows.execute("wf_abc", { amount: "100" }, {
  idempotencyKey: `exec-${crypto.randomUUID()}`, // safe to retry
});
const execution = await handle.waitForCompletion({
  timeout: 120_000,
  signal: abortController.signal,
  onProgress: (s) => console.log(`${s.progress?.completedSteps}/${s.progress?.totalSteps}`),
});
```

---

## Execution Monitoring Skills

### `kh.executions.getStatus(executionId)`
```typescript
const s = await kh.executions.getStatus("exec_abc");
s.status           // current status
s.progress         // { completedSteps, totalSteps, percentage, currentNodeName }
s.errorContext     // { failedNodeId, error, executionTrace } — present on failure
```

### `kh.executions.getLogs(executionId)`
```typescript
const logs = await kh.executions.getLogs("exec_abc");
// → ExecutionLog[] each with: step, status, txHash, gasUsedWei, durationMs, error
```

### `kh.executions.cancel(executionId)`
```typescript
await kh.executions.cancel("exec_abc");
```

---

## x402 & MPP Payment Protocols

KeeperHub listed workflows require payment before execution. Two protocols are supported. Understanding both is required to implement a `resolvePayment` callback correctly.

### Protocol comparison

| | x402 | MPP |
|---|---|---|
| **Chain** | Base mainnet (8453) |Tempo mainnet (4217) |
| **Token** | USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | USDC.e `0x20c000000000000000000000b9537d11c60e8b50` |
| **Signing** | EIP-3009 TransferWithAuthorization (off-chain, no gas from payer) | TIP-1009 expiring nonce credential |
| **Request header** | `PAYMENT-SIGNATURE: <base64-json>` | MPP credential in `Authorization` |
| **Detection** | `X-PAYMENT-REQUIREMENTS` or `PAYMENT-REQUIRED` in 402 response | `WWW-Authenticate: MPP ...` in 402 response |
| **KeeperHub preference** | Fallback | **Preferred** — cheaper, near-instant settlement |

**Rule: when the server offers both, use MPP.** The SDK detects which protocol is requested and sets `context.protocol` in your `resolvePayment` callback.

---

### Payment flow — step by step

```
1. Agent calls kh.payments.execute("workflow-slug", input)
   └─ SDK sends POST /api/mcp/workflows/{slug}/call

2. Server responds HTTP 402 with payment challenge
   └─ Body: { x402Version: 2, error: "Payment required", accepts: [...] }
   └─ Headers: X-PAYMENT-REQUIREMENTS or WWW-Authenticate: MPP

3. SDK detects protocol from response headers
   └─ "mpp"  if WWW-Authenticate starts with "MPP"
   └─ "x402" if X-PAYMENT-REQUIREMENTS present
   └─ "unknown" if neither (treat as x402)

4. SDK calls resolvePayment({ slug, input, challenge, headers, protocol })
   └─ Your wallet signs the appropriate credential

5. SDK retries with same idempotency key + signed payment headers
   └─ Same key → server deduplicates if first response was lost in transit

6. Server verifies payment, executes workflow, returns result
```

---

### Option A — Use `@keeperhub/wallet` (recommended, handles both automatically)

```bash
npx @keeperhub/wallet skill install
npx @keeperhub/wallet add
```

After install, the wallet intercepts all payment challenges automatically. No `resolvePayment` callback needed:

```typescript
// The wallet handles x402 and MPP transparently — just call execute()
const result = await kh.payments.execute("eth-price-feed", { network: "8453" });
```

Safety policy enforced by `PreToolUse` hook: amounts above `auto_approve_max_usd` surface an inline approval prompt. Amounts above `block_threshold_usd` are denied.

Server-side hard limits (enforced by Turnkey, cannot be bypassed):
- Only Base USDC and Tempo USDC.e contracts
- Max 100 USDC per transfer
- Max 200 USDC per UTC day
- Only Base (8453), Tempo mainnet (4217), Tempo testnet (4218)

---

### Option B — Implement `resolvePayment` manually

```typescript
const result = await kh.payments.execute(
  "eth-price-feed",
  { network: "8453" },
  {
    strategy: "auto",
    resolvePayment: async ({ challenge, headers, protocol }) => {

      if (protocol === "mpp") {
        // MPP: sign using mppx client library
        // challenge.accepts[0] has { scheme, network, asset, amount, payTo }
        const credential = await mppWallet.sign({
          realm: "app.keeperhub.com",
          amount: challenge.accepts?.[0]?.amount,
          currency: "0x20c000000000000000000000b9537d11c60e8b50", // Tempo USDC.e
        });
        return { "Authorization": `MPP ${credential}` };
      }

      // x402 (or unknown — treat as x402)
      // Sign EIP-3009 TransferWithAuthorization off-chain (no gas needed)
      const accept = challenge.accepts?.find(a => a.network === "eip155:8453");
      if (!accept) throw new Error("No Base USDC payment option in challenge");

      const authorization = await wallet.signTransferWithAuthorization({
        token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
        from: wallet.address,
        to: accept.payTo,
        value: accept.amount,  // in USDC micro-units (6 decimals)
        validBefore: Math.floor(Date.now() / 1000) + accept.maxTimeoutSeconds,
      });

      // Encode as base64 JSON — this is what PAYMENT-SIGNATURE expects
      const payload = { payload: { authorization, from: wallet.address } };
      return {
        "PAYMENT-SIGNATURE": Buffer.from(JSON.stringify(payload)).toString("base64"),
      };
    },
  }
);
```

**What `challenge` contains:**
```typescript
interface PaymentChallenge {
  x402Version?: number;        // 2
  error?: string;              // "Payment required"
  resource?: {
    url: string;               // workflow call URL
    description?: string;      // workflow name
  };
  accepts?: Array<{
    scheme: string;            // "exact"
    network: string;           // "eip155:8453" (Base) or "eip155:4217" (Tempo)
    asset: string;             // USDC or USDC.e contract address
    amount: string;            // amount in token units (6 decimals for USDC)
    payTo: string;             // creator wallet address
    maxTimeoutSeconds: number; // authorization validity window
  }>;
}
```

---

### Idempotency — never double-charge

The SDK generates a unique idempotency key before the first attempt and reuses the same key on retry. The server deduplicates using this key — if the network drops after payment is verified but before the response arrives, the retry is safe.

```typescript
// Supply your own key to control deduplication scope
const result = await kh.payments.execute(slug, input, {
  strategy: "auto",
  idempotencyKey: `order-${orderId}`, // same key = same charge, no duplicate
  resolvePayment: myWallet.sign,
});
```

---

### Pre-fetch the challenge before executing

Use `kh.payments.prepare()` to fetch the 402 challenge without executing — useful for showing the cost to a user before committing:

```typescript
const challenge = await kh.payments.prepare("eth-price-feed", {});
const accept = challenge.accepts?.[0];
console.log(`This call costs ${accept?.amount} in token units on ${accept?.network}`);

// User approves → then execute
const result = await kh.payments.execute("eth-price-feed", {}, {
  strategy: "auto",
  resolvePayment: myWallet.sign,
});
```

---

### Budget guardrails for owned workflows (pipeline path)

x402/MPP applies to **listed workflows** (other people's). For your **own workflows**, use `pipeline().pay()` to apply budget limits before execution:

```typescript
await kh.pipeline()
  .workflow("wf_my_compound")
  .pay({
    budget: "0.10",              // max per execution (USDC)
    dailyBudget: "2.00",         // rolling 24h cap — checked against real history
    requireApprovalAbove: "0.05", // return pending_approval status above this
  })
  .safeWait();
// Throws KeeperHubPaymentPolicyError if budget would be exceeded
// Returns { status: "pending_approval", payment: { approvalUrl } } for human sign-off
```

---

## Payment Module Methods

### `kh.payments.catalog(input?)`
```typescript
const { items } = await kh.payments.catalog({
  q: "aave",       // keyword search
  category: "defi",
  chain: "8453",   // filter by chain
  page: 1,
  limit: 20,
});
// → ListedWorkflow[] with: name, listedSlug, priceUsdcPerCall, inputSchema, workflowType
// workflowType: "read" (no gas) | "write" (sends tx, costs gas + USDC)
```

### `kh.payments.execute(slug, input, options)`
```typescript
const result = await kh.payments.execute("eth-price-feed", { network: "8453" }, {
  strategy: "auto",
  resolvePayment: async ({ challenge, headers, protocol }) => {
    // protocol: "x402" | "mpp" | "unknown"
    return await wallet.sign(challenge, protocol);
  },
  idempotencyKey: "optional-dedup-key",
});
// → { executionId: string, status: string }
```

### `kh.payments.preflight(workflowId)`
```typescript
const est = await kh.payments.preflight("wf_abc");
est.feasible           // false = wallet can't cover cost
est.feasibilityCode    // "insufficient_balance" | "payment_method_unsupported" | "workflow_not_payable" | "other"
est.estimatedCost      // "0.03" (USDC decimal string)
est.currency           // "USDC"
est.breakdown          // per-step cost breakdown when available
est.preflightExpiresAt // ISO timestamp — re-fetch after this
est.approvalUrl        // present when human approval is required
```

### `kh.payments.balance()`
```typescript
const { usdc, address, chain } = await kh.payments.balance();
```

### `kh.payments.history(options?)`
```typescript
const { transactions, pagination } = await kh.payments.history({
  since: new Date(Date.now() - 86_400_000).toISOString(),
  status: "confirmed", // "pending"|"queued"|"processing"|"confirmed"|"failed"|"pending_approval"|"cancelled"
  workflowId: "wf_abc", // filter by workflow
  limit: 50,
  offset: 0,
});
// transactions[].amountUsdc, .status, .txHash, .workflowId, .executionId, .approvalUrl
```

### `kh.earnings.summary()`
```typescript
const e = await kh.earnings.summary();
e.totalEarned    // USDC earned from listed workflows you published
e.pendingPayout  // awaiting settlement
e.lifetimeCalls  // total calls across all your listed workflows
e.workflows      // per-workflow: { workflowId, name, totalEarned, callCount }
```

---

## Web3 Skills

### `kh.web3.transfer(params)`
```typescript
await kh.web3.transfer({
  network: "8453",                    // chain ID as string
  to: "0xRecipient...",
  amount: "0.01",                     // decimal string in native units
  token: "0xUSDC...",                 // omit for native token
});
```

### `kh.web3.call(type, params)` — unified read/write
```typescript
// Read (no gas, returns value)
const balance = await kh.web3.call("read", {
  network: "1", contract: "0x...", function: "balanceOf", args: ["0x..."],
});

// Write (costs gas, returns execution result)
const tx = await kh.web3.call("write", {
  network: "8453", contract: "0x...", function: "approve",
  args: ["0xSpender...", "1000000"], gasLimitMultiplier: "1.2",
});
```

### `kh.web3.checkAndExecute(params)`
Evaluates an onchain condition, executes if true. Atomic — no race between check and execute.
```typescript
await kh.web3.checkAndExecute({
  network: "8453",
  check: { contract: "0x...", function: "getHealthFactor", args: ["0x..."],
    condition: { operator: "lt", value: "1200000000000000000" } },
  action: { contract: "0x...", function: "repay", args: [...] },
});
```

### `kh.web3.estimateGas(params)`
```typescript
const est = await kh.web3.estimateGas({
  network: "8453", contract: "0x...", function: "supply", args: [...],
});
est.estimatedGas  // gas units
est.estimatedEth  // ETH cost
est.estimatedUsd  // USD cost when available
```

**Note:** `kh.web3.swap()` is not yet available (returns 501). Use `kh.pipeline().generate("Swap X for Y").wait()` instead.

---

## Agent Identity Skills

### `kh.agent.ensureRegistered(input?)` — idempotent, call on startup
```typescript
const reg = await kh.agent.ensureRegistered({
  name: "My Agent",
  description: "Automates DeFi strategies",
  capabilities: ["aave/supply", "uniswap/swap"],
});
// Returns existing registration if found — no duplicate NFT mints
reg.agentId       // on-chain ERC-8004 identity
reg.chainId       // chain where registered
reg.txHash        // present only if just minted (not on existing)
```

---

## Capability Discovery

### `kh.capabilities()`
```typescript
const caps = kh.capabilities();
// → AgentCapability[] each with: name, description, parameters, example, category
// categories: "workflows" | "payments" | "web3" | "protocols" | "analytics" | "identity"

// Use for dynamic tool selection in agent system prompt:
const prompt = caps.map(c => `- ${c.name}: ${c.description}`).join("\n");
```

---

## Error Handling Reference

All errors extend `KeeperHubError`. Structured properties for agent decision-making:

| Code | isRetryable | suggestedAction |
|---|---|---|
| `AUTH_ERROR` | false | Check KEEPERHUB_API_KEY |
| `RATE_LIMIT` | true | Wait retryAfterMs then retry |
| `EXECUTION_FAILED` | true | Check logs, retry or inspect |
| `EXECUTION_TIMEOUT` | true | Poll status separately |
| `PAYMENT_REQUIRED` | false | Set up resolvePayment callback |
| `PAYMENT_POLICY` | false | Increase budget or request approval |
| `VALIDATION_ERROR` | false | Fix request parameters |
| `NOT_FOUND` | false | Verify ID exists |
| `SERVER_ERROR` | true | Retry with backoff |

```typescript
import { KeeperHubError, KeeperHubPaymentPolicyError } from "keeperhub-sdk";

try {
  await kh.run("wf_abc");
} catch (err) {
  if (err instanceof KeeperHubError) {
    err.isRetryable      // boolean
    err.suggestedAction  // string
    err.code             // string
    err.status           // HTTP status
  }
  if (err instanceof KeeperHubPaymentPolicyError) {
    err.estimatedCost    // "0.08"
    err.approvalUrl      // URL for human approval
  }
}
```

**Always prefer `tryRun()` and `safeWait()` over try/catch in agent loops.**

---

## Analytics Skills

```typescript
// Dashboard summary
const s = await kh.analytics.summary({ range: "7d" });
s.usage.totalRuns / successfulRuns / failedRuns
s.gasCredits.used / remaining / limit
s.limits.executionsPercent

// Execution run history
const runs = await kh.analytics.runs({ range: "30d" });

// Network usage
const nets = await kh.analytics.networks();

// Spend cap status
const cap = await kh.analytics.spendCap();
cap.limit / used / remaining / percentUsed

// Real-time stream
const stream = kh.analytics.stream();
stream.on("execution.completed", (data) => console.log(data));
stream.close(); // always close when done
```

---

## Wallet Skills

```typescript
const wallet = await kh.wallet.get();
wallet.address / provider / isActive

const balances = await kh.wallet.balances();
// → WalletBalance[] with token, balance, chainId, usdValue

// Set custom RPC (validated against SSRF blocklist)
await kh.wallet.setRpc(8453, "https://my-rpc.example.com");
```

---

## Protocol & Plugin Skills

### `kh.protocols.execute(slug, params)` — DeFi protocol actions

Format: `"{protocol}/{action}"` — protocol slug / action slug.

```typescript
await kh.protocols.execute("aave-v3/supply", {
  network: "8453",   // chain ID as string
  asset: "0xUSDC...",
  amount: "1000000", // 1 USDC (6 decimals)
  onBehalfOf: "0xWallet...",
});
```

**Discover all available actions at runtime:**
```typescript
const protocols = await kh.protocols.list();
const aave = await kh.protocols.get("aave-v3");
// aave.actions[].slug, aave.actions[].inputs
```

### Supported Protocols — quick reference

| Protocol slug | Key actions |
|---|---|
| `aave-v3` | `supply`, `withdraw`, `borrow`, `repay`, `set-collateral`, `get-user-account-data`, `get-user-reserve-data` |
| `aave-v4` | `supply`, `withdraw`, `borrow`, `repay`, `get-user-account-data`, `get-user-debt` |
| `uniswap` | `swap-exact-input`, `swap-exact-output`, `quote-exact-input`, `quote-exact-output`, `get-pool`, `get-position` |
| `lido` | `wrap`, `unwrap`, `approve-steth`, `get-steth-balance`, `get-wsteth-balance`, `steth-per-token` |
| `compound` | `supply`, `withdraw`, `get-balance`, `get-borrow-balance`, `get-supply-rate`, `get-borrow-rate`, `is-liquidatable` |
| `morpho` | `supply`, `withdraw`, `borrow`, `repay`, `supply-collateral`, `liquidate`, `get-position`, `get-market` |
| `aerodrome` | `swap-exact-tokens`, `add-liquidity`, `remove-liquidity`, `vote`, `create-lock`, `claim-rewards` |
| `sky` | `convert-dai-to-usds`, `convert-usds-to-dai`, `convert-mkr-to-sky`, `get-usds-balance`, `get-sky-balance` |
| `spark` | `supply`, `withdraw`, `borrow`, `repay`, `set-collateral`, `get-user-account-data` |
| `chainlink` | `latest-round-data`, `latest-answer`, `decimals`, `ccip-send`, `ccip-get-fee` |
| `rocket-pool` | `deposit`, `burn-reth`, `get-reth-exchange-rate`, `get-reth-balance` |
| `yearn` | `get-price-per-share`, `get-total-idle`, `get-total-debt`, `get-deposit-limit` |
| `curve` | `exchange`, `get-dy`, `remove-liquidity-one-coin`, `get-virtual-price` |
| `pendle` | `market-swap`, `yt-mint`, `yt-burn`, `redeem-rewards`, `redeem-interest` |
| `cowswap` | `create-conditional-order`, `remove-conditional-order`, `set-pre-signature` |
| `ethena` | `cooldown-assets`, `cooldown-shares`, `unstake`, `get-cooldown-status` |
| `wrapped` | `wrap`, `unwrap`, `balance-of` |
| `safe` | `get-owners`, `get-threshold`, `is-owner`, `get-nonce`, `is-module-enabled` |
| `ajna` | pool kick/take/settle, vault drain/move operations |

### Web3 action slugs (for workflow builder)

Use `actionType: "web3/{slug}"` in workflow builder steps:

| Slug | Description |
|---|---|
| `check-balance` | Read native ETH balance |
| `check-token-balance` | Read ERC-20 balance |
| `transfer-funds` | Send native token |
| `transfer-token` | Send ERC-20 |
| `read-contract` | Call any view/pure function |
| `write-contract` | Call any state-changing function |
| `batch-read-contract` | Multiple view calls in one step |
| `approve-token` | Approve ERC-20 allowance |
| `check-allowance` | Read current allowance |
| `query-events` | Filter contract events |
| `query-transactions` | Address transaction history |
| `decode-calldata` | Decode raw tx calldata |

### Notification integration slugs (for workflow builder)

| actionType | Description | Required config |
|---|---|---|
| `discord/send-message` | Post to Discord channel | `connectionId`, `message` |
| `telegram/send-message` | Send Telegram message | `connectionId`, `chatId`, `message` |
| `sendgrid/send-email` | Send email via SendGrid | `connectionId`, `to`, `subject`, `message` |
| `webhook/send-webhook` | HTTP POST to URL | `url`, `method`, `payload` |
| `slack/send-message` | Post to Slack | `connectionId`, `channel`, `message` |

**Setting up an integration connection:**
```typescript
const conn = await kh.integrations.create({
  type: "discord",               // "discord" | "telegram" | "sendgrid" | "webhook" | "slack"
  name: "My Discord Alerts",
  config: { webhookUrl: "https://discord.com/api/webhooks/..." },
});
// conn.id — use as connectionId in workflow step config
```

**Test before using:**
```typescript
const test = await kh.integrations.test({ type: "discord", config: { ... } });
test.success // true/false
test.error   // string if failed
```

### Workflow Builder — Protocol + Notification Example

```typescript
import { KeeperHub, triggers } from "keeperhub-sdk";

const kh = new KeeperHub({ apiKey: process.env.KEEPERHUB_API_KEY });

await kh.workflowBuilder({ name: "Aave Health Monitor" })
  .trigger(triggers.schedule("0 * * * *")) // hourly
  .step({
    id: "health",
    label: "Check health factor",
    actionType: "protocol/aave-v3/get-user-account-data",
    config: { network: "8453", user: "{{env.WALLET_ADDRESS}}" },
  })
  .if("low-health", "{{health.healthFactor}} < 1.3")
    .thenStep({
      id: "alert",
      label: "Discord alert",
      actionType: "discord/send-message",
      config: {
        connectionId: "conn_discord_xxx",
        message: "Health factor critical: {{health.healthFactor}} — repaying now",
      },
    })
    .thenStep({
      id: "repay",
      label: "Auto-repay USDC",
      actionType: "protocol/aave-v3/repay",
      config: {
        network: "8453",
        asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        amount: "500000000",
        interestRateMode: "2",
        onBehalfOf: "{{env.WALLET_ADDRESS}}",
      },
    })
  .endIf()
  .save();
```

### Template Variable Syntax

Reference outputs from previous steps using `{{stepId.fieldName}}`:

| Variable | Description |
|---|---|
| `{{stepId.fieldName}}` | Output field from a previous step |
| `{{input.fieldName}}` | Workflow runtime input |
| `{{env.VARIABLE_NAME}}` | Environment variable |

---

## Retry and Backoff

The `HttpClient` retries automatically on 429, 502, 503, 504. Default: 3 attempts, exponential backoff (1s, 2s, 4s), capped at 30s. `Retry-After` header is honored but capped at 60s.

Override via config:
```typescript
new KeeperHub({
  apiKey: "...",
  retry: { maxAttempts: 5, backoff: "linear", retryOn: [429, 503] },
  timeout: 60_000,
});
```

---

## Workflow Versioning & Migration Skills

### `kh.workflows.duplicate(workflowId)` — create v2
```typescript
const newWorkflow = await kh.workflows.duplicate("wf_v1_abc");
// → Workflow with new id — full copy of nodes, edges, trigger
newWorkflow.id  // "wf_v2_xyz" — the new version
```

### `kh.workflows.goLive(workflowId)` — publish to marketplace
```typescript
const liveWf = await kh.workflows.goLive("wf_xyz");
// Publishes to KeeperHub marketplace — other agents can discover + call via x402/MPP
```

### `kh.workflows.update(workflowId, input)` — edit existing workflow
```typescript
await kh.workflows.update("wf_xyz", {
  name: "Rebalance ETH-USDC v2",
  description: "Updated to use Aave V3 instead of V2",
  nodes: [...],  // updated node graph
  edges: [...],
});
```

### `kh.workflows.delete(workflowId)` — remove a workflow
```typescript
await kh.workflows.delete("wf_old");
```

### `kh.workflows.exportCode(workflowId)` — get executable code
```typescript
const { code } = await kh.workflows.exportCode("wf_xyz");
// Returns TypeScript/JS code for the workflow steps
```

**Migration pattern (v1 → v2):**
```typescript
// 1. Duplicate
const v2 = await kh.workflows.duplicate("wf_v1");

// 2. Run v1 with withdraw input to drain funds
const drainObs = await kh.tryRun("wf_v1", { input: { _action: "withdraw" }, wait: true });

// 3. Activate v2
const activateObs = await kh.tryRun(v2.id, { wait: true });

// 4. Go live on marketplace
await kh.workflows.goLive(v2.id);
```

---

## MCP & Action Schema Discovery Skills

### `kh.mcp.getSchemas(category?)` — discover action schemas
```typescript
// All schemas
const all = await kh.mcp.getSchemas();

// Filter by category
const aaveSchemas = await kh.mcp.getSchemas("Aave V3");
const codeSchemas = await kh.mcp.getSchemas("Code");
const discordSchemas = await kh.mcp.getSchemas("Discord");
```

**Schema shape:**
```typescript
{
  actionType: "aave-v3/supply",   // use in workflow builder + protocols.execute
  label: "Aave V3 Supply",
  description: "Supply tokens to Aave V3...",
  category: "Aave V3",
  integration: "aave-v3",
  requiresCredentials: false,
  requiredFields: { asset: "string - ERC-20 address", amount: "string - wei amount" },
  optionalFields: { referralCode: "number - default 0" },
  outputFields: { success: "boolean", txHash: "string" },
}
```

**Total actions:** 396 across 20+ protocols + Discord, Telegram, SendGrid, Webhook, Code, Math, Web3

### `kh.mcp.getOpenApiSpec()` — full API spec
```typescript
const spec = await kh.mcp.getOpenApiSpec();
// → Full OpenAPI JSON — use to generate typed clients
```

---

## Earnings Skills (Creator Revenue)

### `kh.earnings.summary()` — creator revenue overview
```typescript
const earnings = await kh.earnings.summary();
// Revenue from your listed/paid workflows called via x402 or MPP
earnings.totalRevenue    // total USDC earned
earnings.byWorkflow      // breakdown per workflow
earnings.pendingPayout   // not yet settled
```

---

## Chainlink CCIP Quick Reference

```typescript
// Step 1: Get fee quote
const fee = await kh.protocols.execute("chainlink/ccip-get-fee", {
  destinationChainSelector: "15971525489660198786",  // Base
  receiver: "0xRecipient",
  tokenAmounts: [{ token: "0xUSDC...", amount: "1000000" }],
  feeToken: "0x0000000000000000000000000000000000000000", // native
});

// Step 2: Approve bridge token
await kh.protocols.execute("chainlink/ccip-approve-bridge-token", {
  spender: "0xCCIPRouter...",
  amount: "1000000",
});

// Step 3: Approve fee token (if paying in LINK)
await kh.protocols.execute("chainlink/ccip-approve-fee-token", {
  spender: "0xCCIPRouter...",
  amount: fee.result.feeAmount,
});

// Step 4: Send
const result = await kh.protocols.execute("chainlink/ccip-send", {
  destinationChainSelector: "15971525489660198786",
  receiver: "0xRecipient",
  tokenAmounts: [{ token: "0xUSDC...", amount: "1000000" }],
  data: "0x",
  feeToken: "0x0000000000000000000000000000000000000000",
});
```

**CCIP Chain Selectors:**
| Chain | Selector |
|-------|---------|
| Ethereum Mainnet | `5009297550715157269` |
| Base | `15971525489660198786` |
| Arbitrum One | `4949039107694359620` |
| Optimism | `3734403246176062136` |
| Polygon | `4051577828743386545` |
| Avalanche C-Chain | `6433500567565415381` |
| BNB Smart Chain | `11344663589394136015` |

---

## Ajna Protocol Quick Reference

```typescript
// Check borrower position
const info = await kh.protocols.execute("ajna/get-borrower-info", {
  pool: "0xAjnaPool...",
  borrower: "0xWallet...",
});
// info.result: { debt, collateral, thresholdPrice, neutralPrice }

// Get pool health
const lup = await kh.protocols.execute("ajna/get-pool-lup", { pool: "0x..." });
const htp = await kh.protocols.execute("ajna/get-pool-htp", { pool: "0x..." });

// Price/index conversion
const idx = await kh.protocols.execute("ajna/price-to-index", { price: "1500" });
```

---

## Complete Module Reference

| Module | Access | Key methods |
|--------|--------|-------------|
| Workflows | `kh.workflows` | list, get, create, update, delete, duplicate, goLive, execute, run, generateSpec, exportCode |
| Executions | `kh.executions` | getStatus, getLogs, cancel, stream |
| Web3 | `kh.web3` | transfer, read, write, checkAndExecute, estimateGas |
| Protocols | `kh.protocols` | execute, list, get, search |
| Chains | `kh.chains` | list, getAbi |
| Wallet | `kh.wallet` | getWallet, getTokenBalances, setRpc |
| Payments | `kh.payments` | balance, preflight, execute, catalog |
| Agent | `kh.agent` | ensureRegistered, register, getRegistry, getRegistrations |
| Analytics | `kh.analytics` | summary, timeSeries, runs |
| Integrations | `kh.integrations` | list, get, create, test, testById |
| Events | `kh.events` | subscribe, onExecution, onStep |
| Debug | `kh.debug` | explainFailure, replay |
| Templates | `kh.templates` | list, use |
| Projects | `kh.projects` | list, get, create |
| Tags | `kh.tags` | list, create |
| AddressBook | `kh.addressBook` | list, create, get |
| ApiKeys | `kh.apiKeys` | list, create, revoke |
| Mcp | `kh.mcp` | getSchemas, getOpenApiSpec |
| Earnings | `kh.earnings` | summary |
| Pipeline | `kh.pipeline()` | workflow, generate, listedWorkflow, pay, retry, ephemeral, safeWait |
| Builder | `kh.workflowBuilder()` | step, trigger, if, then, save, run |
