# KeeperHub Supported Chains

Use these chain IDs (as strings) in the `network` field of all API calls.

## Mainnets

| Chain | Chain ID | Notes |
|-------|----------|-------|
| Ethereum | `1` | Full DeFi support (Aave, Uniswap, Lido, etc.) |
| Base | `8453` | Coinbase L2 — x402 payments, USDC |
| Arbitrum One | `42161` | Optimistic rollup |
| Optimism | `10` | OP Stack L2 |
| Polygon | `137` | MATIC chain |
| Avalanche C-Chain | `43114` | AVAX |
| BNB Smart Chain | `56` | Binance chain |
| Gnosis | `100` | xDAI chain |
| Fantom | `250` | FTM |

## Testnets

| Chain | Chain ID | Notes |
|-------|----------|-------|
| Ethereum Sepolia | `11155111` | Primary testnet — recommended for development |
| Base Sepolia | `84532` | Base testnet |
| Polygon Amoy | `80002` | Polygon testnet |
| Arbitrum Sepolia | `421614` | Arbitrum testnet |
| Avalanche Fuji | `43113` | Avalanche testnet |
| Tempo | `4217` | KeeperHub MPP testnet — USDC.e payments |

## Notes

- Always use string chain IDs in API calls (e.g. `"network": "1"` not `"network": 1`)
- Testnet faucets: Sepolia ETH from sepoliafaucet.com or Alchemy faucet
- x402 payments use Base (8453) with USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- MPP payments use Tempo (4217) with USDC.e: `0x20C000000000000000000000B9537D11c60E8b50`
