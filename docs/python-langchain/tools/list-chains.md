# keeperhub_list_chains

List all blockchain networks supported by KeeperHub.

## What It Does

Returns the full list of 19+ chains that KeeperHub supports, including chain IDs, native currency symbols, RPC endpoints, and block explorer URLs. Use this to discover valid `network` values for other tools.

## Schema

No parameters.

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_list_chains")

async def main():
    result = await tool._arun()
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const chainsTool = tools.find(t => t.name === "keeperhub_list_chains")!;

const result = await chainsTool.invoke({});
console.log(result);
```

## Example Output

```json
{
  "count": 19,
  "chains": [
    {
      "chainId": 1,
      "name": "Ethereum",
      "networkSlug": "ethereum",
      "symbol": "ETH",
      "rpc": "https://rpc.ankr.com/eth",
      "explorer": "https://etherscan.io"
    },
    {
      "chainId": 8453,
      "name": "Base",
      "networkSlug": "base",
      "symbol": "ETH",
      "rpc": "https://mainnet.base.org",
      "explorer": "https://basescan.org"
    },
    {
      "chainId": 137,
      "name": "Polygon",
      "networkSlug": "polygon",
      "symbol": "MATIC",
      "rpc": "https://rpc.ankr.com/polygon",
      "explorer": "https://polygonscan.com"
    },
    {
      "chainId": 42161,
      "name": "Arbitrum One",
      "networkSlug": "arbitrum",
      "symbol": "ETH",
      "rpc": "https://arb1.arbitrum.io/rpc",
      "explorer": "https://arbiscan.io"
    },
    {
      "chainId": 10,
      "name": "Optimism",
      "networkSlug": "optimism",
      "symbol": "ETH",
      "rpc": "https://mainnet.optimism.io",
      "explorer": "https://optimistic.etherscan.io"
    },
    {
      "chainId": 43114,
      "name": "Avalanche",
      "networkSlug": "avalanche",
      "symbol": "AVAX",
      "rpc": "https://api.avax.network/ext/bc/C/rpc",
      "explorer": "https://snowtrace.io"
    }
  ]
}
```

## Notes

- The `networkSlug` field is the value to pass as the `network` parameter in tools like `keeperhub_transfer_funds`, `keeperhub_contract_call`, and `keeperhub_protocol_action`.
- `chainId` can be used interchangeably with `networkSlug` in most tools.
- This tool is read-only and does not affect any on-chain state.
- Supported chains may expand over time — call this tool at runtime rather than hardcoding chain lists.
- Testnets (Sepolia, Base Sepolia, etc.) are included when the `testnetOnly` flag is set in the TS/ElizaOS packages.
