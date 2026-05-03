# keeperhub_chainlink_price

Read a live asset price from a Chainlink price feed via `keeperhub_contract_call`.

## What It Does

Reads the `latestRoundData()` function from a Chainlink aggregator contract to fetch the current on-chain price. This is not a standalone tool — it is the recommended pattern for using `keeperhub_contract_call` with Chainlink feeds. Returns the round ID, raw answer (8 decimal places), and the timestamp of the last update.

## Schema

Uses `keeperhub_contract_call` with these fixed values:

```
network: str             — Chain where the feed is deployed (e.g. "base").
contract_address: str    — Chainlink aggregator address for the desired pair.
function_name: str       — Always "latestRoundData".
call_type: str           — Always "read".
```

### Common Chainlink Feed Addresses

| Pair | Network | Address |
|---|---|---|
| ETH/USD | Base (8453) | `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70` |
| ETH/USD | Ethereum (1) | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` |
| BTC/USD | Base (8453) | `0xCCADC697c55bbB68dc5bCdf8d3CBe83CdD4E071E` |
| LINK/USD | Base (8453) | `0x17CAb8FE31E32f08326e5E27412894e49B0f9D65` |

Full feed list at [docs.chain.link/data-feeds/price-feeds/addresses](https://docs.chain.link/data-feeds/price-feeds/addresses).

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_contract_call")

async def main():
    # Read ETH/USD price on Base
    result = await tool._arun(
        network="base",
        contract_address="0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
        function_name="latestRoundData",
        function_args="[]",
        call_type="read"
    )
    import json
    data = json.loads(result) if isinstance(result, str) else result
    raw_answer = int(data["result"][1])
    usd_price = raw_answer / 1e8
    print(f"ETH/USD: ${usd_price:,.2f}")

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const callTool = tools.find(t => t.name === "keeperhub_contract_call")!;

const result = await callTool.invoke({
  network: "base",
  contract_address: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
  function_name: "latestRoundData",
  function_args: "[]",
  call_type: "read",
});

const data = typeof result === "string" ? JSON.parse(result) : result;
const usdPrice = Number(data.result[1]) / 1e8;
console.log(`ETH/USD: $${usdPrice.toFixed(2)}`);
```

## Example Output

```json
{
  "result": [
    "18446744073709598341",
    "303412000000",
    "1746266700",
    "1746266700",
    "18446744073709598341"
  ],
  "decoded": {
    "roundId": "18446744073709598341",
    "answer": "303412000000",
    "startedAt": "1746266700",
    "updatedAt": "1746266700",
    "answeredInRound": "18446744073709598341"
  }
}
```

## Notes

- **Divide `answer` by 1e8** (10^8) to get the human-readable USD price. The example above decodes to $3,034.12.
- `updatedAt` is a Unix timestamp. Feeds are typically updated every ~1 hour or when price deviates by a configured threshold (the "deviation threshold").
- Chainlink feeds are read-only (`call_type: "read"`) and do not consume gas.
- Use the full feed directory at [docs.chain.link](https://docs.chain.link/data-feeds/price-feeds/addresses) to find the correct address for other pairs and networks.
- Stale prices: if `updatedAt` is more than a few hours old, the feed may be paused or experiencing issues.
