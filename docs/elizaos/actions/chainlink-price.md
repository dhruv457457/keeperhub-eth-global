# KEEPERHUB_CHAINLINK_PRICE

Fetch the live price of an asset from a Chainlink price feed.

## What It Does

Detects asset price queries in user messages and reads the corresponding Chainlink aggregator contract on the appropriate chain. Returns the current price, the last update timestamp, and a staleness warning if the feed has not updated recently.

## Trigger Phrases

The action matches messages containing:
- "price" (e.g. "what's the price of ETH?")
- "ETH price" (e.g. "current ETH price")
- "Chainlink" (e.g. "get the Chainlink price for BTC")
- "how much is [token]" (e.g. "how much is LINK worth?")
- "current price of"

## Schema

```typescript
// Extracted from message context
{
  asset: string    // Ticker symbol detected in message (e.g. "ETH", "BTC", "LINK")
  network?: string // Chain to query. Defaults to "base" for ETH/USD.
  quote?: string   // Quote currency. Defaults to "USD".
}
```

### Supported Feeds (Default)

| Pair | Network | Feed Address |
|---|---|---|
| ETH/USD | Base | `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70` |
| ETH/USD | Ethereum | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` |
| BTC/USD | Base | `0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E` |
| LINK/USD | Base | `0x17CAb8FE31E32f08326e5E27412894e49B0f9D65` |

## Example Conversation

```
User: What's the current ETH price?

Agent: Fetching ETH/USD from Chainlink on Base...

ETH/USD Price:
• Price: $3,034.12
• Feed: 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70 (Base)
• Last Updated: 2026-05-03 10:02:30 UTC (2 minutes ago)
• Status: Fresh ✓
```

## Example Output (action result)

```json
{
  "pair": "ETH/USD",
  "price": "3034.12",
  "rawAnswer": "303412000000",
  "decimals": 8,
  "updatedAt": "2026-05-03T10:02:30Z",
  "roundId": "18446744073709598341",
  "network": "base",
  "feedAddress": "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  "stale": false
}
```

## Notes

- `rawAnswer` divided by 10^8 gives the human-readable USD price.
- `stale: true` is set when the feed's `updatedAt` timestamp is more than 1 hour old.
- Feed addresses are hardcoded for well-known pairs. For other pairs, the action attempts to find the feed from the Chainlink feed registry on Ethereum mainnet.
- This action is read-only and does not cost gas.
- Price data reflects the last on-chain update — it is not necessarily real-time to the second. Chainlink feeds update on price deviation thresholds (typically 0.5%) or heartbeat intervals.
