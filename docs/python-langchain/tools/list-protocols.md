# keeperhub_list_protocols

List all 396 available DeFi protocol actions in the KeeperHub library.

## What It Does

Returns the full catalog of protocol actions that can be invoked via `keeperhub_protocol_action`. Supports optional keyword search and protocol name filtering. Each result includes the action slug, description, required parameters, and supported networks.

## Schema

```
query?: str     — Keyword search across action names and descriptions (e.g. "supply", "swap").
protocol?: str  — Filter by protocol name (e.g. "aave-v3", "uniswap", "compound-v3").
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_list_protocols")

async def main():
    # List all actions
    result = await tool._arun()
    print(result)

    # Filter by protocol
    result = await tool._arun(protocol="uniswap")
    print(result)

    # Search by keyword
    result = await tool._arun(query="borrow")
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const listTool = tools.find(t => t.name === "keeperhub_list_protocols")!;

const result = await listTool.invoke({ protocol: "aave-v3" });
console.log(result);
```

## Example Output

```json
{
  "count": 12,
  "actions": [
    {
      "slug": "aave-v3/supply",
      "protocol": "aave-v3",
      "name": "Supply",
      "description": "Supply an asset to Aave V3 as collateral or for yield.",
      "networks": ["ethereum", "base", "polygon", "arbitrum", "optimism"],
      "params": {
        "network": { "type": "string", "required": true },
        "asset": { "type": "address", "required": true },
        "amount": { "type": "decimal", "required": true },
        "onBehalfOf": { "type": "address", "required": false }
      }
    },
    {
      "slug": "aave-v3/borrow",
      "protocol": "aave-v3",
      "name": "Borrow",
      "description": "Borrow an asset from Aave V3 against supplied collateral.",
      "networks": ["ethereum", "base", "polygon", "arbitrum", "optimism"],
      "params": {
        "network": { "type": "string", "required": true },
        "asset": { "type": "address", "required": true },
        "amount": { "type": "decimal", "required": true },
        "interestRateMode": { "type": "integer", "required": true, "enum": [1, 2] }
      }
    }
  ]
}
```

## Notes

- The full library contains 396 actions across 20+ protocols including Aave V3, Uniswap V3, Compound V3, Curve, Balancer, GMX, Morpho, and more.
- This tool is read-only and does not perform any on-chain actions.
- Use the returned `slug` value directly as the `action_type` in `keeperhub_protocol_action`.
- `params` in the response describes the schema for each action — check `required` fields before calling.
- Supported `networks` values match the `network` parameter accepted by `keeperhub_protocol_action` and `keeperhub_transfer_funds`.
