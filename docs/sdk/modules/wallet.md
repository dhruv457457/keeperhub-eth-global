# kh.wallet

Wallet info and balance queries.

## Methods

### `kh.wallet.get()`
Get the KeeperHub managed wallet info.

```typescript
const wallet = await kh.wallet.get();
// { walletAddress, isActive, walletId, organizationId }
console.log(wallet.walletAddress); // 0x554b...
```

### `kh.wallet.balances(chainId?)`
Get token balances across all chains or a specific chain.

```typescript
const bals = await kh.wallet.balances();
// [{ chainId, chainName, nativeBalance, symbol, tokens: [...] }]

// Filter by chain
const base = await kh.wallet.balances(8453);
```

**Note:** Use `/api/user/wallet/balances` — the `/api/user/wallet/tokens` endpoint always returns empty.

## Example Output

```json
{
  "walletAddress": "0x554bbff68e21e1a4767247586983f98d41c49b78",
  "isActive": true,
  "balances": [
    {
      "chainId": 8453,
      "chainName": "Base",
      "nativeBalance": "0.000475",
      "symbol": "BASE",
      "tokens": [
        { "symbol": "USDC", "balance": "0.9", "tokenAddress": "0x833589..." }
      ]
    }
  ]
}
```
