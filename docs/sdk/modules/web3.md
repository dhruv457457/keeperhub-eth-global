---
title: "Web3 Operations"
description: "Direct onchain operations — token transfers, contract calls, and gas estimation via the KeeperHub managed wallet."
---

# Web3 Operations

`kh.web3` executes onchain operations directly through the KeeperHub managed wallet. All calls route through KeeperHub's infrastructure for gas optimization, nonce management, and MEV protection.

## `kh.web3.transfer(params)`

Transfer native tokens (ETH, MATIC, etc.) or ERC-20 tokens to a recipient.

```typescript
// Native token transfer
const result = await kh.web3.transfer({
  network: "8453",        // Base mainnet
  to: "0xRecipient...",
  amount: "0.01",         // in ETH/native units
});

// ERC-20 transfer
const result = await kh.web3.transfer({
  network: "8453",
  to: "0xRecipient...",
  amount: "100",
  token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC
});

console.log(result.transactionHash);
console.log(result.status); // "completed"
```

## `kh.web3.call(type, params)`

Unified contract call — dispatches to `read()` or `write()` based on `type`.

```typescript
// Read (view/pure function — no gas)
const balance = await kh.web3.call("read", {
  network: "1",
  contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  function: "balanceOf",
  args: ["0xWalletAddress..."],
});

// Write (state-changing — costs gas)
const result = await kh.web3.call("write", {
  network: "8453",
  contract: "0x...",
  function: "approve",
  args: ["0xSpender...", "1000000000"],
  gasLimitMultiplier: "1.2", // add 20% headroom
});
```

## `kh.web3.read(params)` / `kh.web3.write(params)`

Direct methods when the call type is known upfront.

```typescript
const price = await kh.web3.read({
  network: "1",
  contract: "0xChainlinkOracle...",
  function: "latestAnswer",
  abi: "...", // optional — auto-resolved if omitted
});

const tx = await kh.web3.write({
  network: "8453",
  contract: "0xAavePool...",
  function: "supply",
  args: ["0xUSDC...", "1000000", "0xOnBehalf...", "0"],
});
```

## `kh.web3.checkAndExecute(params)`

Evaluate an onchain condition, then execute a transaction only if the condition is met. Atomic — no race conditions between check and execute.

```typescript
await kh.web3.checkAndExecute({
  network: "8453",
  check: {
    contract: "0xAavePool...",
    function: "getUserAccountData",
    args: ["0xMyWallet..."],
    condition: {
      operator: "lt",  // "gt" | "lt" | "eq" | "neq" | "gte" | "lte"
      value: "1200000000000000000", // health factor < 1.2
    },
  },
  action: {
    contract: "0xAavePool...",
    function: "repay",
    args: ["0xUSDC...", "500000000", "2", "0xMyWallet..."],
  },
});
```

## `kh.web3.estimateGas(params)`

Estimate gas cost for a contract write before submitting.

```typescript
const estimate = await kh.web3.estimateGas({
  network: "8453",
  contract: "0x...",
  function: "supply",
  args: ["0xUSDC...", "1000000"],
});

console.log(estimate.estimatedGas); // gas units
console.log(estimate.estimatedEth); // ETH cost
console.log(estimate.estimatedUsd); // USD cost (when available)
```

## `kh.web3.swap()`

> **Not yet available.** The KeeperHub swap endpoint is scheduled for a future release (currently returns 501). To swap tokens today, use `kh.pipeline().generate("Swap X ETH for USDC on Base").wait()`.

## Network IDs

Common network IDs for the `network` parameter:

| Network | Chain ID |
|---|---|
| Ethereum Mainnet | `"1"` |
| Base | `"8453"` |
| Arbitrum One | `"42161"` |
| Polygon | `"137"` |
| Sepolia (testnet) | `"11155111"` |

Use `kh.chains.list()` to get the full list of supported chains and their IDs.
