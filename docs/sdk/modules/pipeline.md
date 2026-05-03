# kh.pipeline

Fluent builder for composing multi-step onchain operations.

## What It Does

The pipeline lets you chain multiple KeeperHub operations with a readable API — resolve ENS → check balance → transfer, all in one expression.

## Example

```typescript
const result = await kh.pipeline()
  .resolveEns("vitalik.eth")
  .transfer({ network: "8453", amount: "0.001" })
  .notify({ channel: "slack", message: "Transfer complete" })
  .run();
```

## Methods

| Method | Description |
|--------|-------------|
| `.resolveEns(name)` | Resolve ENS before next step |
| `.transfer(params)` | Send ETH or ERC-20 |
| `.contractCall(params)` | Read or write contract |
| `.executeWorkflow(id, input?)` | Run a workflow |
| `.notify(params)` | Send notification |
| `.condition(fn)` | Conditional — skip next step if false |
| `.run()` | Execute the pipeline |

## With Condition

```typescript
const result = await kh.pipeline()
  .contractCall({ network: "8453", contract: "0x...", fn: "balanceOf", args: ["0x..."], type: "read" })
  .condition((balance) => BigInt(balance) > BigInt("1000000")) // only if balance > 1 USDC
  .transfer({ network: "8453", to: "0x...", amount: "0.001" })
  .run();
```
