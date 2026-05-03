# kh.payments

x402 and MPP payment-gated workflow execution.

## What It Does

Allows an AI agent to autonomously pay for and execute a payment-gated workflow. Two payment methods:
- **x402** — Base USDC (EIP-3009 signed transfer)
- **MPP** — Tempo USDC.e (Micropayment Protocol)

## Methods

### `kh.payments.payAndRun(params)`

```typescript
const result = await kh.payments.payAndRun({
  workflowId: "wf_abc123",     // or listedSlug
  input: { amount: "100" },
  maxBudgetUsd: "1.00",        // default
  preferMpp: true,              // MPP (Tempo) preferred over x402 (Base)
});
// { executionId, paymentMethod, amountPaid, status }
```

## Payment Readiness

Before calling `payAndRun`, check the wallet has the right tokens:

```typescript
const bals = await kh.wallet.balances();
// x402 needs USDC on Base (chainId 8453)
// MPP needs USDC.e on Tempo (chainId 4217)
```

## Limitations

- x402 payment **completion** requires EIP-3009 signing via Turnkey MPC — not exposed via REST API for SDK users
- The 402 challenge is real and receivable, but completing it from outside the KH infrastructure is blocked
- See [limitations.md](../limitations.md) for full details
