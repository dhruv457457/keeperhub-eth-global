# TypeScript LangChain x402 Agent

This example proves that a TypeScript LangChain agent can discover listed
KeeperHub workflows and reach a real x402/MPP payment challenge.

## Run

```bash
pnpm install
KEEPERHUB_API_KEY=kh_... pnpm demo
```

Expected behavior:

- Lists workflows from `/api/mcp/workflows`.
- Executes the free listed `helloworld` workflow.
- Calls the paid `microtip` workflow.
- Stops at the real payment challenge unless a payment signer is added.
