---
title: "Payments"
description: "x402 and MPP payment handling — how the SDK resolves payment challenges for listed workflows."
---

# Payments

KeeperHub listed workflows can require payment before execution. The SDK handles both payment rails that KeeperHub supports and exposes the `PaymentsModule` for direct access to the catalog, payment history, and creator earnings.

## Payment Rails

KeeperHub supports two payment protocols simultaneously:

| Protocol | Settlement | Token | Chain |
|---|---|---|---|
| **x402** | EIP-3009 TransferWithAuthorization | USDC | Base (chain 8453) |
| **MPP** | TIP-1009 expiring nonce | USDC.e | Tempo (chain 4217) |

When a listed workflow is called, the server may offer one or both protocols in the 402 challenge. If both are offered, KeeperHub prefers MPP (near-instant settlement, lower gas). The SDK detects which protocol is being requested and surfaces it in the `resolvePayment` callback so your wallet can sign the correct format.

## How Payment Challenges Work

```
Agent calls kh.payments.execute(slug, input)
  → Server returns HTTP 402 with payment challenge headers
  → SDK detects protocol: "x402" or "mpp" from WWW-Authenticate header
  → SDK calls resolvePayment({ slug, input, challenge, headers, protocol })
  → Your wallet signs the appropriate credential
  → SDK retries the call with signed payment headers + idempotency key
  → Server verifies, executes, returns result
```

The idempotency key is generated once and reused on retry. If the response is lost in transit, the server deduplicates using the key — you are never charged twice.

## PaymentsModule

### `kh.payments.catalog(input?)`

Search the public listed workflow catalog.

```typescript
const { items } = await kh.payments.catalog({
  q: "aave",
  category: "defi",
  chain: "8453",
  page: 1,
  limit: 20,
});

items.forEach(wf => {
  console.log(`${wf.name} — ${wf.priceUsdcPerCall} USDC/call`);
});
```

### `kh.payments.execute(slug, input, options)`

Execute a listed workflow with automatic payment resolution.

```typescript
const result = await kh.payments.execute(
  "eth-price-feed",
  { network: "8453" },
  {
    strategy: "auto",
    resolvePayment: async ({ challenge, headers, protocol }) => {
      // protocol is "x402" | "mpp" | "unknown"
      if (protocol === "mpp") {
        return await myMppWallet.sign(challenge, headers);
      }
      return await myX402Wallet.sign(challenge, headers);
    },
  }
);
```

With the **KeeperHub agentic wallet** (`@keeperhub/wallet`), payment is resolved automatically — no `resolvePayment` callback needed:

```typescript
// After installing @keeperhub/wallet, it intercepts signing automatically.
// Just call execute with no options:
const result = await kh.payments.execute("eth-price-feed", { network: "8453" });
```

### `kh.payments.prepare(slug, input)`

Retrieve the 402 payment challenge without executing. Useful for pre-signing a payment before calling `execute`.

```typescript
const challenge = await kh.payments.prepare("eth-price-feed", {});
// challenge.accepts — list of accepted payment requirements with amounts
```

### `kh.payments.preflight(workflowId)`

Estimate the USDC cost of executing an owned workflow before committing funds.

```typescript
const estimate = await kh.payments.preflight("wf_abc123");

if (!estimate.feasible) {
  if (estimate.feasibilityCode === "insufficient_balance") {
    console.error(`Need ${estimate.estimatedCost} USDC — top up your wallet`);
  }
}
// estimate.breakdown — per-step cost breakdown when available
// estimate.preflightExpiresAt — when this estimate goes stale
// estimate.approvalUrl — URL for human approval when required
```

### `kh.payments.balance()`

Get the current USDC balance of the KeeperHub execution wallet.

```typescript
const { usdc, address, chain } = await kh.payments.balance();
console.log(`${usdc} USDC at ${address} on chain ${chain}`);
```

### `kh.payments.history(options?)`

Paginated history of all payment transactions with date-range filtering.

```typescript
const { transactions } = await kh.payments.history({
  since: new Date(Date.now() - 7 * 86_400_000).toISOString(),
  status: "confirmed",
  limit: 50,
});

const total = transactions.reduce((sum, tx) => sum + parseFloat(tx.amountUsdc), 0);
console.log(`7-day spend: ${total.toFixed(2)} USDC`);
```

### `kh.payments.getTransaction(id)`

Get a single transaction by ID, including tx hash, status lifecycle, and failure details.

## EarningsModule

Workflow creators earn revenue from paid listed workflows. Use `kh.earnings` to track creator payouts.

### `kh.earnings.summary(options?)`

```typescript
const earnings = await kh.earnings.summary({ page: 1, pageSize: 10 });

console.log(`Total earned: ${earnings.totalEarned} USDC`);
console.log(`Pending payout: ${earnings.pendingPayout} USDC`);
console.log(`Lifetime calls: ${earnings.lifetimeCalls}`);

earnings.workflows.forEach(wf => {
  console.log(`  ${wf.name}: ${wf.totalEarned} USDC (${wf.callCount} calls)`);
});
```

## PaymentStatus lifecycle

```
pending → queued → processing → confirmed
                              ↘ failed
pending_approval (human sign-off required, execution blocked)
policy_rejected  (budget or daily cap exceeded, execution blocked)
cancelled
```

## Budget Guardrails via Pipeline

For owned workflow execution, apply payment policy through the pipeline rather than calling `payments.preflight` manually:

```typescript
await kh.pipeline()
  .workflow("wf_abc")
  .pay({
    budget: "0.05",               // per-execution hard cap
    dailyBudget: "1.00",          // rolling 24h cap — checked against real history
    requireApprovalAbove: "0.02", // pause for sign-off above this threshold
    preflightMaxAgeMs: 30_000,    // re-fetch estimate if older than 30s on retry
  })
  .wait();
```

The pipeline fetches a fresh preflight, compares the estimated cost against all three thresholds using integer micro-USDC arithmetic (no floating-point drift), and either proceeds, blocks, or pauses for approval.
