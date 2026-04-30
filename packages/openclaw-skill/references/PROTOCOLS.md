# KeeperHub Protocol Actions

All actions are executed via:
```
POST https://app.keeperhub.com/api/execute/node
{ "actionType": "<listed below>", "config": { "network": "<chainId>", ...params } }
```

Get full schema for any action:
```
GET https://app.keeperhub.com/api/mcp/schemas
```
Returns `requiredFields` and `optionalFields` for each action.

---

## Aave V3

| Action Type | Description |
|-------------|-------------|
| `aave-v3/supply` | Supply assets to earn yield |
| `aave-v3/borrow` | Borrow against collateral |
| `aave-v3/withdraw` | Withdraw supplied assets |
| `aave-v3/repay` | Repay borrowed amount |
| `aave-v3/get-user-account-data` | Get health factor, collateral, debt |
| `aave-v3/get-reserve-data` | Get pool APY and liquidity |

## Aave V4 (latest)

| Action Type | Description |
|-------------|-------------|
| `aave-v4/supply` | Supply to Aave V4 |
| `aave-v4/borrow` | Borrow from Aave V4 |
| `aave-v4/withdraw` | Withdraw from Aave V4 |
| `aave-v4/repay` | Repay Aave V4 debt |

## Uniswap

| Action Type | Description |
|-------------|-------------|
| `uniswap/swap-exact-input` | Swap exact amount in |
| `uniswap/swap-exact-output` | Swap for exact amount out |
| `uniswap/get-quote` | Get price quote |
| `uniswap/add-liquidity` | Add LP position |
| `uniswap/remove-liquidity` | Remove LP position |

## Compound V3

| Action Type | Description |
|-------------|-------------|
| `compound-v3/supply` | Supply to Compound |
| `compound-v3/withdraw` | Withdraw from Compound |
| `compound-v3/borrow` | Borrow from Compound |
| `compound-v3/repay` | Repay Compound debt |
| `compound-v3/get-account-info` | Get position info |

## Morpho

| Action Type | Description |
|-------------|-------------|
| `morpho/supply` | Supply to Morpho vault |
| `morpho/withdraw` | Withdraw from Morpho |
| `morpho/borrow` | Borrow from Morpho |
| `morpho/repay` | Repay Morpho debt |

## Lido

| Action Type | Description |
|-------------|-------------|
| `lido/wrap` | ETH → stETH (liquid staking) |
| `lido/unwrap` | stETH → ETH |
| `lido/get-staking-stats` | Get current APR |

## Curve

| Action Type | Description |
|-------------|-------------|
| `curve/exchange` | Swap via Curve pool |
| `curve/add-liquidity` | Add to Curve pool |
| `curve/remove-liquidity` | Remove from Curve pool |

## CowSwap (MEV-protected swaps)

| Action Type | Description |
|-------------|-------------|
| `cowswap/create-order` | Create MEV-protected swap order |
| `cowswap/get-quote` | Get swap quote |
| `cowswap/cancel-order` | Cancel pending order |

## Rocket Pool

| Action Type | Description |
|-------------|-------------|
| `rocket-pool/stake` | Stake ETH → rETH |
| `rocket-pool/unstake` | Unstake rETH |
| `rocket-pool/get-stats` | Get current APR |

## Yearn V3

| Action Type | Description |
|-------------|-------------|
| `yearn-v3/deposit` | Deposit to Yearn vault |
| `yearn-v3/withdraw` | Withdraw from Yearn vault |
| `yearn-v3/get-vault-info` | Get vault APY and TVL |

## Pendle

| Action Type | Description |
|-------------|-------------|
| `pendle/swap` | Swap yield tokens |
| `pendle/add-liquidity` | Add Pendle liquidity |

## Aerodrome (Base)

| Action Type | Description |
|-------------|-------------|
| `aerodrome/swap` | Swap on Aerodrome DEX |
| `aerodrome/add-liquidity` | Add liquidity |

## Sky (formerly MakerDAO)

| Action Type | Description |
|-------------|-------------|
| `sky/get-dsr-rate` | Get DAI Savings Rate |
| `sky/deposit-dsr` | Deposit DAI to earn yield |

## Spark

| Action Type | Description |
|-------------|-------------|
| `spark/supply` | Supply to Spark |
| `spark/borrow` | Borrow sDAI |

## Ethena

| Action Type | Description |
|-------------|-------------|
| `ethena/stake` | Stake USDe → sUSDe |
| `ethena/unstake` | Unstake sUSDe |

## Chainlink

| Action Type | Description |
|-------------|-------------|
| `chainlink/ccip-send` | Cross-chain token transfer |
| `chainlink/ccip-get-fee` | Quote CCIP transfer fee |
| `chainlink/ccip-approve-bridge-token` | Approve token for CCIP |
| `chainlink/eth-usd-latest-round-data` | ETH/USD price from oracle |
| `chainlink/btc-usd-latest-round-data` | BTC/USD price from oracle |
| `chainlink/link-usd-latest-round-data` | LINK/USD price |
| `chainlink/usdc-usd-latest-round-data` | USDC/USD price |

## Ajna (permissionless lending)

| Action Type | Description |
|-------------|-------------|
| `ajna/get-borrower-info` | Check borrower position |
| `ajna/get-auction-status` | Check auction state |
| `ajna/get-pool-lup` | Get lowest utilization price |
| `ajna/get-pool-htp` | Get highest threshold price |

## Safe (multisig)

| Action Type | Description |
|-------------|-------------|
| `safe/create-transaction` | Create Safe transaction |
| `safe/execute-transaction` | Execute approved transaction |
| `safe/get-pending-transactions` | List pending transactions |

## Web3 Utilities

| Action Type | Description |
|-------------|-------------|
| `web3/check-balance` | Check ETH/token balance |
| `web3/approve-erc20` | Approve ERC-20 spending |
| `web3/get-erc20-info` | Get token info (name, decimals, supply) |
| `web3/write-contract` | Call any contract write function |

## Code Execution

| Action Type | Description |
|-------------|-------------|
| `code/run-code` | Execute custom JavaScript in KeeperHub sandbox |

Config: `{ "code": "return 42", "inputs": { "key": "value" } }`

## Math

| Action Type | Description |
|-------------|-------------|
| `math/aggregate` | Sum, average, min, max, median of values |

## Discord / Notifications

| Action Type | Description |
|-------------|-------------|
| `discord/send-message` | Send Discord message |
| `slack/send-message` | Send Slack message |
| `email/send` | Send email notification |
