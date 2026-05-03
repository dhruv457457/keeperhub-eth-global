# KEEPERHUB_TOKEN_ADDRESS

Look up the contract address for a token on a specific network.

## What It Does
Resolves a token symbol or name to its deployed contract address on a given network. Uses a built-in static table of well-known tokens (USDC, WETH, WBTC, DAI, etc.) with a CoinGecko API fallback for less common tokens. Returns the checksummed contract address ready for use in other tools.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| symbol | string | yes | Token symbol or name, e.g. `"USDC"`, `"WETH"`, `"DAI"` |
| network | string | yes | Chain name or ID, e.g. `"base"`, `"ethereum"`, `"arbitrum"` |

## Python Example
```python
result = await tool._arun(symbol="USDC", network="base")
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What is the USDC contract address on Base?" }]
});
```

## Example Output
```json
{
  "symbol": "USDC",
  "network": "base",
  "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "source": "static"
}
```

## Notes
- Trigger phrases: "token address for [token] on [network]", "USDC address on Base", "what's the contract for WETH"
- `source` will be `"static"` for well-known tokens or `"coingecko"` for CoinGecko-resolved tokens.
- CoinGecko fallback may add latency (~500ms) for tokens not in the static table.
- Returns an error if the token cannot be found on the specified network via either source.
- Always use this tool to resolve token addresses rather than hardcoding them, as addresses differ per chain.
