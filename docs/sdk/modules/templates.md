# kh.templates

Pre-built workflow templates for common DeFi operations.

## Methods

### `kh.templates.list()`
```typescript
const templates = await kh.templates.list();
// [{ id, name, description, category, requiredParams }]
```

### `kh.templates.get(templateId)`
```typescript
const template = await kh.templates.get("tmpl_aave_supply");
// { id, name, schema, nodeCount }
```

### `kh.templates.instantiate(templateId, params)`
Create a workflow from a template.

```typescript
const wf = await kh.templates.instantiate("tmpl_aave_supply", {
  network: "8453",
  tokenAddress: "0x833589...",
  amount: "100",
});
// { workflowId, name }
```

## Common Templates

| Template | Description |
|----------|-------------|
| Aave Supply | Supply token to Aave V3 |
| Uniswap Swap | Swap tokens via Uniswap V3 |
| Portfolio Rebalance | Rebalance ETH/stablecoin ratio |
| Compound Supply | Supply to Compound V3 |
| ETH → WETH Wrap | Wrap native ETH to WETH |
