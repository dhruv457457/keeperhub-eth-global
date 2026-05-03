# keeperhub_token_address

Resolve a token ticker symbol to its contract address on a specific chain.

## What It Does

Converts a human-readable token symbol (e.g. `"USDC"`) to a checksummed 0x contract address for a given chain ID. Uses a built-in static table covering 40+ tokens across 9 chains, with a CoinGecko API fallback for tokens not in the table. This tool is available in the TypeScript package only — the Python package requires explicit 0x addresses.

**Always call this tool before constructing prompts for `keeperhub_generate_workflow` that reference token symbols.**

## Schema

```typescript
{
  symbol: string   // Token ticker symbol (case-insensitive, e.g. "USDC", "WETH", "DAI").
  chainId: string  // Chain ID as a string (e.g. "8453" for Base, "1" for Ethereum).
}
```

## Static Token Table (partial)

| Symbol | Chain | Chain ID | Address |
|---|---|---|---|
| USDC | Base | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| USDC | Ethereum | 1 | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| USDC | Polygon | 137 | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |
| USDC | Arbitrum | 42161 | `0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8` |
| WETH | Base | 8453 | `0x4200000000000000000000000000000000000006` |
| WETH | Ethereum | 1 | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |
| DAI | Ethereum | 1 | `0x6B175474E89094C44Da98b954EedeAC495271d0F` |
| DAI | Base | 8453 | `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb` |
| LINK | Ethereum | 1 | `0x514910771AF9Ca656af840dff83E8264EcF986CA` |
| LINK | Base | 8453 | `0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196` |
| USDT | Ethereum | 1 | `0xdAC17F958D2ee523a2206206994597C13D831ec7` |
| AAVE | Ethereum | 1 | `0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9` |
| UNI | Ethereum | 1 | `0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984` |

Full table covers 40+ tokens on Ethereum, Base, Polygon, Arbitrum, Optimism, Avalanche, BSC, Fantom, and Gnosis.

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const tokenTool = tools.find(t => t.name === "keeperhub_token_address")!;

// Resolve USDC on Base
const result = await tokenTool.invoke({ symbol: "USDC", chainId: "8453" });
console.log(result);
// { symbol: "USDC", chainId: "8453", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", source: "static" }

// Resolve WETH on Ethereum
const weth = await tokenTool.invoke({ symbol: "WETH", chainId: "1" });
console.log(weth);
```

### Workflow Integration Pattern

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();

const tokenTool = tools.find(t => t.name === "keeperhub_token_address")!;
const genTool = tools.find(t => t.name === "keeperhub_generate_workflow")!;

// Always resolve first
const [usdcResult, wethResult] = await Promise.all([
  tokenTool.invoke({ symbol: "USDC", chainId: "8453" }),
  tokenTool.invoke({ symbol: "WETH", chainId: "8453" }),
]);

const usdc = (usdcResult as any).address;
const weth = (wethResult as any).address;

// Then build the workflow prompt with explicit addresses
const workflow = await genTool.invoke({
  prompt: `Swap 0.01 WETH (${weth}) for USDC (${usdc}) on Uniswap V3 on Base (chainId 8453).`,
  execute: true,
});
console.log(workflow);
```

## Example Output

```json
{
  "symbol": "USDC",
  "chainId": "8453",
  "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "name": "USD Coin",
  "decimals": 6,
  "source": "static"
}
```

## Notes

- `source` is either `"static"` (from built-in table, fast) or `"coingecko"` (API fallback, slower).
- When falling back to CoinGecko, the call may take 1–3 seconds and is subject to rate limits.
- If the token is not found in either source, the tool returns an error with `address: null`.
- Symbol lookup is case-insensitive: `"usdc"` and `"USDC"` return the same result.
- This tool is **TypeScript only** — it is not available in the Python `keeperhub-langchain` package. Python users must supply 0x addresses directly.
- The static table is updated with each package release. For newly deployed tokens, the CoinGecko fallback handles resolution automatically.
