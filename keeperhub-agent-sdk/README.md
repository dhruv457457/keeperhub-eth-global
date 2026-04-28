# KeeperHub Agent SDK Showcase

Interactive hackathon showcase for the KeeperHub Agent SDK integrations.

This app is intentionally separate from the KeeperHub platform code. It consumes
the packages in `packages/` like a developer-facing project would.

## Setup

Build the local packages first:

```bash
pnpm --dir ../packages/sdk build
pnpm --dir ../packages/langchain-tools build
pnpm --dir ../packages/elizaos-plugin build
```

Install and run the showcase:

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3100`.

## Environment

Required:

```bash
KEEPERHUB_API_KEY=kh_...
KEEPERHUB_BASE_URL=https://app.keeperhub.com
```

Optional:

```bash
KEEPERHUB_WALLET=0x...
ENABLE_SEPOLIA_WRITES=false
TEST_NETWORK=11155111
TEST_RECIPIENT=0x...
TEST_AMOUNT=0.0001
```

The app keeps live writes disabled by default. Payment demos stop at the real
x402/MPP challenge unless a future payment signer is configured.

## Demos

- TypeScript LangChain paid workflow agent: catalog, free listed workflow call,
  paid `microtip` challenge, x402 and MPP detection.
- ElizaOS plugin operator: action/provider registration, safe live actions,
  wallet/workflow context, notification visibility.
- Python DeFi safety executor: safe live reads in the app plus a runnable
  Python LangChain example.

## Checks

```bash
pnpm type-check
pnpm build
```
