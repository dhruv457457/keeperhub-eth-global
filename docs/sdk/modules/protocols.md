# kh.protocols

DeFi protocol action discovery and execution — 396 actions across Aave, Uniswap, Lido, Compound, and more.

## Methods

### `kh.protocols.list(options?)`
List all available protocol actions.

```typescript
const actions = await kh.protocols.list({ query: "aave", limit: 20 });
// [{ actionType, name, protocol, description }]
```

### `kh.protocols.getSchema(actionType)`
Get the input schema for a specific action.

```typescript
const schema = await kh.protocols.getSchema("aave-v3/supply");
// { inputSchema: { properties: { amount, tokenAddress, ... } } }
```

### `kh.protocols.execute(actionType, params)`
Execute a protocol action.

```typescript
const result = await kh.protocols.execute("aave-v3/supply", {
  network: "8453",
  amount: "100",
  tokenAddress: "0x833589...", // USDC on Base
});
```

**Note:** Direct protocol writes may fail with a server-side error. Use `kh.workflows.generate({ prompt, execute: true })` as fallback.

## Common Action Types

| Action | Protocol |
|--------|----------|
| `aave-v3/supply` | Aave V3 |
| `aave-v3/borrow` | Aave V3 |
| `uniswap/swap-exact-input` | Uniswap V3 |
| `lido/wrap` | Lido |
| `compound-v3/supply` | Compound V3 |
| `morpho/supply` | Morpho |
| `curve/exchange` | Curve |
| `cowswap/swap-exact-tokens` | CoW Protocol (mainnet only) |
