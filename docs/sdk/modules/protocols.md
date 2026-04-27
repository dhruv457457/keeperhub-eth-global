---
title: "Protocols & Plugins"
description: "Complete reference for all DeFi protocol actions, notification integrations, and web3 operations available through the KeeperHub SDK."
---

# Protocols & Plugins

KeeperHub exposes 20+ DeFi protocols and 6 notification/integration plugins through its execution layer. All are accessible via `kh.protocols.execute()` or as steps in `kh.workflowBuilder()`.

## How Protocol Calls Work

```typescript
// Direct execution — runs a single protocol action immediately
await kh.protocols.execute("aave-v3/supply", {
  network: "8453",
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  amount: "1000000",     // 1 USDC in 6-decimal units
  onBehalfOf: "0xYourWallet...",
});

// As a workflow step — part of a recurring automation
kh.workflowBuilder({ name: "Weekly Aave Compound" })
  .trigger(triggers.schedule("0 9 * * 1"))
  .step({
    id: "supply",
    label: "Supply USDC to Aave",
    actionType: "protocol/aave-v3/supply",
    config: {
      network: "8453",
      asset: "0xUSDC...",
      amount: "{{input.amount}}",
    },
  })
  .save();
```

**Discover at runtime:**
```typescript
// Get all protocols with their actions and input schemas
const protocols = await kh.protocols.list();
const aave = await kh.protocols.get("aave-v3");
// aave.actions[].slug — action names
// aave.actions[].inputs — required fields with types
```

---

## DeFi Protocols

### Aave V3 — `aave-v3`

| Action slug | Description | Key params |
|---|---|---|
| `supply` | Deposit asset into Aave | `network`, `asset`, `amount`, `onBehalfOf` |
| `withdraw` | Withdraw from Aave | `network`, `asset`, `amount`, `to` |
| `borrow` | Borrow against collateral | `network`, `asset`, `amount`, `interestRateMode`, `onBehalfOf` |
| `repay` | Repay a borrow position | `network`, `asset`, `amount`, `interestRateMode`, `onBehalfOf` |
| `set-collateral` | Enable/disable asset as collateral | `network`, `asset`, `useAsCollateral` |
| `get-user-account-data` | Read full position — health factor, collateral, debt | `network`, `user` |
| `get-user-reserve-data` | Read per-asset position | `network`, `user`, `asset` |

```typescript
// Example: Supply USDC to Aave V3 on Base
await kh.protocols.execute("aave-v3/supply", {
  network: "8453",
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  amount: "1000000", // 1 USDC (6 decimals)
  onBehalfOf: "0xYourWallet...",
});

// Check health factor before acting
const data = await kh.protocols.execute("aave-v3/get-user-account-data", {
  network: "8453",
  user: "0xYourWallet...",
});
// data.result.healthFactor — if below 1.0, liquidation risk
```

---

### Aave V4 — `aave-v4`

Same actions as V3 plus: `get-reserve-id`, `get-user-supplied-assets`, `get-user-debt`.

---

### Uniswap V3 — `uniswap`

| Action slug | Description | Key params |
|---|---|---|
| `swap-exact-input` | Swap exact amount of tokenIn for tokenOut | `network`, `tokenIn`, `tokenOut`, `amountIn`, `amountOutMinimum`, `recipient` |
| `swap-exact-output` | Swap for exact amount of tokenOut | `network`, `tokenIn`, `tokenOut`, `amountOut`, `amountInMaximum`, `recipient` |
| `quote-exact-input` | Get quote without executing | `network`, `tokenIn`, `tokenOut`, `amountIn` |
| `quote-exact-output` | Get quote without executing | `network`, `tokenIn`, `tokenOut`, `amountOut` |
| `get-pool` | Read pool state | `network`, `token0`, `token1`, `fee` |
| `get-position` | Read LP position | `network`, `tokenId` |
| `burn-position` | Burn LP position and collect fees | `network`, `tokenId` |

```typescript
// Swap USDC → WETH on Base via Uniswap V3
await kh.protocols.execute("uniswap/swap-exact-input", {
  network: "8453",
  tokenIn: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
  tokenOut: "0x4200000000000000000000000000000000000006", // WETH
  amountIn: "10000000", // 10 USDC
  amountOutMinimum: "0",
  recipient: "0xYourWallet...",
});
```

---

### Lido — `lido`

| Action slug | Description |
|---|---|
| `wrap` | Wrap stETH into wstETH |
| `unwrap` | Unwrap wstETH back to stETH |
| `approve-steth` | Approve stETH spending |
| `get-steth-balance` | Read stETH balance |
| `get-wsteth-balance` | Read wstETH balance |
| `get-steth-by-wsteth` | Convert wstETH amount to stETH |
| `get-wsteth-by-steth` | Convert stETH amount to wstETH |
| `steth-per-token` | Current exchange rate |

---

### Compound V3 — `compound`

| Action slug | Description |
|---|---|
| `supply` | Supply asset to Compound |
| `withdraw` | Withdraw from Compound |
| `get-balance` | Read base asset balance |
| `get-collateral-balance` | Read collateral balance |
| `get-borrow-balance` | Read borrow balance |
| `get-utilization` | Pool utilization rate |
| `get-supply-rate` | Current supply APR |
| `get-borrow-rate` | Current borrow APR |
| `is-liquidatable` | Check liquidation status |

---

### Morpho — `morpho`

| Action slug | Description |
|---|---|
| `supply` | Supply assets to Morpho market |
| `withdraw` | Withdraw from Morpho |
| `borrow` | Borrow from Morpho |
| `repay` | Repay Morpho loan |
| `supply-collateral` | Add collateral |
| `withdraw-collateral` | Remove collateral |
| `liquidate` | Liquidate unhealthy position |
| `get-position` | Read full position |
| `get-market` | Read market state |
| `accrue-interest` | Trigger interest accrual |
| `flash-loan` | Execute a flash loan |

---

### Aerodrome — `aerodrome`

Key actions: `swap-exact-tokens`, `add-liquidity`, `remove-liquidity`, `vote`, `create-lock`, `increase-lock-amount`, `claim-rewards`, `get-reserves`, `get-pool-for-pair`.

---

### Sky (formerly MakerDAO) — `sky`

| Action slug | Description |
|---|---|
| `get-usds-balance` | Read USDS balance |
| `get-dai-balance` | Read DAI balance |
| `get-sky-balance` | Read SKY balance |
| `convert-dai-to-usds` | Migrate DAI → USDS |
| `convert-usds-to-dai` | Convert USDS → DAI |
| `convert-mkr-to-sky` | Migrate MKR → SKY |
| `approve-usds` | Approve USDS spending |
| `approve-dai` | Approve DAI spending |

---

### Spark — `spark`

Same interface as Aave V3: `supply`, `withdraw`, `borrow`, `repay`, `set-collateral`, `get-user-account-data`, `get-user-reserve-data`.

---

### Chainlink — `chainlink`

| Action slug | Description |
|---|---|
| `latest-round-data` | Get latest price feed data |
| `latest-answer` | Get latest price (raw) |
| `decimals` | Get feed decimals |
| `get-round-data` | Get historical round |
| `ccip-get-fee` | Estimate CCIP cross-chain fee |
| `ccip-send` | Send cross-chain message |
| `ccip-approve-bridge-token` | Approve token for CCIP bridge |

```typescript
// Get ETH/USD price from Chainlink
const price = await kh.protocols.execute("chainlink/latest-round-data", {
  network: "1",
  feed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH/USD
});
```

---

### Rocket Pool — `rocket-pool`

| Action slug | Description |
|---|---|
| `deposit` | Stake ETH for rETH |
| `burn-reth` | Burn rETH for ETH |
| `get-reth-exchange-rate` | rETH/ETH exchange rate |
| `get-reth-balance` | Read rETH balance |
| `get-reth-total-supply` | Total rETH supply |
| `get-total-collateral` | Protocol collateral |

---

### Yearn V3 — `yearn`

| Action slug | Description |
|---|---|
| `get-price-per-share` | Current share price |
| `get-total-idle` | Idle assets in vault |
| `get-total-debt` | Deployed assets |
| `get-deposit-limit` | Max deposit allowed |
| `get-is-shutdown` | Vault shutdown status |
| `get-profit-max-unlock-time` | Profit unlock duration |

---

### Curve — `curve`

| Action slug | Description |
|---|---|
| `get-dy` | Quote for exchange |
| `exchange` | Execute swap |
| `remove-liquidity-one-coin` | Remove LP in one asset |
| `get-virtual-price` | LP token virtual price |
| `get-pool-balance` | Pool asset balances |
| `crv-balance-of` | CRV token balance |

---

### Pendle — `pendle`

Key actions: `market-swap`, `market-mint`, `market-burn`, `yt-mint`, `yt-burn`, `redeem-rewards`, `redeem-interest`, `get-pt-balance`, `get-yt-balance`, `get-market-expiry`.

---

### Ajna — `ajna`

For advanced Ajna pool management: `pool1-kick`, `pool1-bucket-take`, `pool1-settle`, vault operations, auction queries.

---

### CoW Swap — `cowswap`

| Action slug | Description |
|---|---|
| `create-conditional-order` | Create a conditional/TWAP order |
| `remove-conditional-order` | Cancel order |
| `set-pre-signature` | Sign order off-chain |
| `check-single-order` | Validate order |
| `get-filled-amount` | Amount filled so far |

---

### Ethena — `ethena`

| Action slug | Description |
|---|---|
| `cooldown-assets` | Start USDe unstaking cooldown |
| `cooldown-shares` | Start sUSDe cooldown |
| `unstake` | Complete unstake after cooldown |
| `get-cooldown-status` | Check cooldown progress |
| `approve-usde` | Approve USDe spending |

---

### Wrapped Tokens — `wrapped`

| Action slug | Description |
|---|---|
| `wrap` | Wrap ETH → WETH (or equivalent) |
| `unwrap` | Unwrap WETH → ETH |
| `balance-of` | Read wrapped token balance |

---

### Safe — `safe`

| Action slug | Description |
|---|---|
| `get-owners` | List Safe signers |
| `get-threshold` | Required signatures |
| `is-owner` | Check if address is owner |
| `get-nonce` | Current Safe nonce |
| `is-module-enabled` | Check module status |
| `get-modules-paginated` | List enabled modules |

---

## Web3 Plugin Actions

Direct web3 operations available as workflow steps. Use `actionType: "web3/{slug}"` in the builder.

| Slug | Description |
|---|---|
| `check-balance` | Read native ETH balance of address |
| `check-token-balance` | Read ERC-20 token balance |
| `transfer-funds` | Send native ETH |
| `transfer-token` | Send ERC-20 tokens |
| `read-contract` | Call any view/pure function |
| `write-contract` | Call any state-changing function |
| `batch-read-contract` | Call multiple view functions in one step |
| `approve-token` | Approve ERC-20 spending |
| `check-allowance` | Read current ERC-20 allowance |
| `get-transaction` | Fetch transaction details by hash |
| `query-events` | Filter contract events by block range |
| `query-transactions` | Query address transaction history |
| `decode-calldata` | Decode raw transaction calldata |
| `assess-risk` | Assess contract interaction risk |

---

## Notification & Integration Plugins

Use as workflow steps to send alerts when conditions are met.

| Plugin | Slug | Action |
|---|---|---|
| Discord | `discord/send-message` | Post to Discord webhook |
| Telegram | `telegram/send-message` | Send Telegram bot message |
| SendGrid | `sendgrid/send-email` | Send transactional email |
| Webhook | `webhook/send-webhook` | HTTP POST to any URL |
| Slack | `slack/send-message` | Post to Slack channel |

**Setup:** Integrations require a saved connection. Use `kh.integrations.create()` to add one:

```typescript
// Add a Discord integration
const integration = await kh.integrations.create({
  type: "discord",
  name: "My Discord Alert",
  config: { webhookUrl: "https://discord.com/api/webhooks/..." },
});

// Use in workflow builder step
.step({
  id: "alert",
  label: "Discord Alert",
  actionType: "discord/send-message",
  config: {
    connectionId: integration.id,
    message: "Vault health factor dropped to {{get-user-account-data.healthFactor}}",
  },
})
```

---

## Other Plugins

| Plugin | actionType | Description |
|---|---|---|
| Math | `math/aggregate` | Compute sum, average, min, max over a list |
| Code | `code/run` | Execute custom JavaScript inside the workflow |

---

## Workflow Builder — Full Example

```typescript
import { KeeperHub, triggers } from "keeperhub-sdk";

const kh = new KeeperHub({ apiKey: process.env.KEEPERHUB_API_KEY });

const wf = await kh.workflowBuilder({ name: "Vault Health Monitor" })
  .trigger(triggers.schedule("0 * * * *")) // every hour
  .step({
    id: "health",
    label: "Check Aave health factor",
    actionType: "protocol/aave-v3/get-user-account-data",
    config: { network: "8453", user: "{{env.WALLET_ADDRESS}}" },
  })
  .if("health-check", "{{health.healthFactor}} < 1.3")
    .thenStep({
      id: "alert",
      label: "Send Discord alert",
      actionType: "discord/send-message",
      config: {
        connectionId: "conn_discord_abc",
        message: "Health factor critical: {{health.healthFactor}}",
      },
    })
    .thenStep({
      id: "repay",
      label: "Auto-repay to restore health",
      actionType: "protocol/aave-v3/repay",
      config: {
        network: "8453",
        asset: "0xUSDC...",
        amount: "500000000", // 500 USDC
        interestRateMode: "2",
        onBehalfOf: "{{env.WALLET_ADDRESS}}",
      },
    })
  .endIf()
  .save();

console.log(`Created workflow: ${wf.id}`);
```
