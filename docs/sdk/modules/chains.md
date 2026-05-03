# kh.chains

Supported blockchain information.

## Methods

### `kh.chains.list()`
List all supported chains.

```typescript
const chains = await kh.chains.list();
// [{ chainId, name, symbol, rpc, explorer, isTestnet }]
```

## Supported Chains (19+)

| Chain | ID | Type |
|-------|----|------|
| Ethereum | 1 | Mainnet |
| Base | 8453 | Mainnet |
| Arbitrum | 42161 | Mainnet |
| Optimism | 10 | Mainnet |
| Polygon | 137 | Mainnet |
| Avalanche | 43114 | Mainnet |
| BNB Chain | 56 | Mainnet |
| Tempo | 4217 | Mainnet (MPP payments) |
| Sepolia | 11155111 | Testnet |
| Base Sepolia | 84532 | Testnet |
| Polygon Amoy | 80002 | Testnet |
| Arbitrum Sepolia | 421614 | Testnet |
| Avalanche Fuji | 43113 | Testnet |
