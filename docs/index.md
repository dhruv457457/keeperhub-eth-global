# KeeperHub Agent SDK

KeeperHub provides official SDK packages for integrating AI agents with on-chain workflows, DeFi protocols, managed wallets, and payment-gated execution. All packages authenticate against the KeeperHub API (`https://app.keeperhub.com`) using a Bearer token.

## Packages

| Package | Registry | Tools/Actions | Language |
|---|---|---|---|
| [`keeperhub-langchain`](#python-langchain) | PyPI | 24 tools | Python |
| [`@ethglobal-openagent/langchain-keeperhub`](#ts-langchain) | npm | 25 tools | TypeScript |
| [`@ethglobal-openagent/elizaos-keeperhub`](#elizaos) | npm | 17 actions | TypeScript |
| [`@ethglobal-openagent/openclaw-keeperhub`](#openclaw) | npm | 25 tools | TypeScript |
| [`@ethglobal-openagent/openclaw-eliza-keeperhub`](#openclaw) | npm | 17 actions | TypeScript |

A hosted Telegram bot is also available at [t.me/khethworkbot](https://t.me/khethworkbot).

---

## Installation

### Python LangChain {#python-langchain}

```bash
pip install keeperhub-langchain
```

See full docs: [python-langchain/](./python-langchain/index.md)

### TypeScript LangChain {#ts-langchain}

```bash
npm install @ethglobal-openagent/langchain-keeperhub
```

See full docs: [ts-langchain/](./ts-langchain/index.md)

### ElizaOS Plugin {#elizaos}

```bash
npm install @ethglobal-openagent/elizaos-keeperhub
```

See full docs: [elizaos/](./elizaos/index.md)

### OpenClaw Adapters {#openclaw}

```bash
# LangChain adapter (25 tools)
npm install @ethglobal-openagent/openclaw-keeperhub

# ElizaOS adapter (17 actions)
npm install @ethglobal-openagent/openclaw-eliza-keeperhub
```

See full docs: [openclaw/](./openclaw/index.md)

### Telegram Bot

Hosted bot: [t.me/khethworkbot](https://t.me/khethworkbot)

See full docs: [telegram-bot/](./telegram-bot/index.md)

---

## Authentication

All packages read from the `KEEPERHUB_API_KEY` environment variable:

```bash
export KEEPERHUB_API_KEY=your_api_key_here
```

API keys can be created at [app.keeperhub.com](https://app.keeperhub.com) under Settings → API Keys.

---

## Common Concepts

- **Managed Wallet** — KeeperHub provisions a non-custodial wallet per account. Tools like `keeperhub_transfer_funds` and `keeperhub_register_agent` use this wallet.
- **Workflows** — Directed graphs of on-chain actions. Generate from natural language or compose manually.
- **Protocol Actions** — 396 pre-built DeFi primitives (Aave, Uniswap, etc.) callable directly or via workflow.
- **x402 / MPP Payments** — Payment-gated workflow execution. x402 uses USDC on Base; MPP uses USDC.e on Tempo.

---

## Package Comparison

| Feature | Python LC | TS LC | ElizaOS | OpenClaw LC | OpenClaw Eliza |
|---|---|---|---|---|---|
| Wallet balance | yes | yes | yes | yes | yes |
| Transfer funds | yes | yes | yes | yes | yes |
| Generate workflow | yes | yes | yes | yes | yes |
| Execute workflow | yes | yes | yes | yes | yes |
| Protocol actions | yes | yes | yes | yes | yes |
| Token address resolve | no | yes | no | yes | no |
| Register agent (ERC-8004) | yes | yes | yes | yes | yes |
| Pay-and-run (x402/MPP) | yes | yes | yes | yes | yes |
| ENS resolve | yes | yes | yes | yes | yes |
| Chainlink price | yes | yes | yes | yes | yes |
| Notify | yes | yes | yes | yes | yes |
| testnetOnly safety flag | no | yes | yes | yes | yes |
