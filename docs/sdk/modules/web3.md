# kh.web3

Token transfers and smart contract calls.

## Methods

### `kh.web3.transfer(params)`
Send ETH or ERC-20 tokens.

```typescript
const result = await kh.web3.transfer({
  network: "8453",          // Base
  to: "0xRecipient...",
  amount: "0.001",
  tokenAddress: undefined,  // omit for native ETH
});
// { executionId, txHash, status }
```

### `kh.web3.read(params)`
Read from any smart contract.

```typescript
const result = await kh.web3.read({
  network: "8453",
  contractAddress: "0xContract...",
  functionName: "balanceOf",
  functionArgs: ["0xAddress..."],
});
```

### `kh.web3.write(params)`
Write to any smart contract.

```typescript
const result = await kh.web3.write({
  network: "8453",
  contractAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  functionName: "register",
  functionArgs: [],
});
// { txHash, executionId }
```

## Notes
- `value` field (msg.value for payable functions) may not be forwarded correctly — see [limitations](../limitations.md)
- For complex DeFi operations, use `kh.workflows.generate()` with `execute: true` instead
