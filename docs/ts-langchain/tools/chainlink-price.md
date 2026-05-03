# keeperhub_chainlink_price

Read a price from a Chainlink Data Feed contract.

## What It Does
Fetches the latest price from any Chainlink price feed contract on a supported network. Returns the raw price, the number of decimals used by the feed, and the timestamp of the last update. Use this to get reliable, manipulation-resistant asset prices for use in DeFi decision logic.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | yes | Chain name or ID, e.g. `"base"`, `"ethereum"` |
| contractAddress | string | yes | Address of the Chainlink aggregator contract |

## Python Example
```python
# ETH/USD on Base
result = await tool._arun(
    network="base",
    contractAddress="0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What is the current ETH/USD price on Base?" }]
});
```

## Example Output
```json
{
  "price": "312000000000",
  "decimals": 8,
  "humanReadable": "3120.00",
  "updatedAt": "2026-05-03T11:58:42Z",
  "network": "base"
}
```

## Notes
- ETH/USD price feed on Base: `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`
- Most Chainlink USD feeds use 8 decimals; divide `price` by `10^decimals` to get the human-readable value, or use the `humanReadable` field directly.
- `updatedAt` reflects the last on-chain heartbeat; stale feeds (no update for >1 hour) should be treated with caution.
- Find additional feed addresses at [data.chain.link](https://data.chain.link).
- Use with `keeperhub_check_and_execute` to create price-triggered conditional transactions.
