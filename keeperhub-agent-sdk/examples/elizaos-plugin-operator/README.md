# ElizaOS Plugin Operator

This example loads the KeeperHub ElizaOS plugin and calls one action directly.
It demonstrates that payment-gated workflows surface a payment challenge instead
of breaking the agent loop.

## Run

```bash
pnpm install
KEEPERHUB_API_KEY=kh_... pnpm demo
```

Expected behavior:

- Loads the plugin with actions, providers, and evaluator.
- Calls `KEEPERHUB_PAY_AND_RUN` with listed slug `microtip`.
- Reports the MPP/x402 payment challenge.
