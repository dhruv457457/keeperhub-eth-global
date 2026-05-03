# keeperhub_ens_resolve

Resolve an ENS name to its underlying Ethereum address.

## What It Does

Performs a forward ENS lookup (name → address) using Ethereum mainnet. Returns the resolved 0x address for any valid `.eth` name or ENS subdomain. Useful for converting human-readable names to addresses before passing them to transfer or contract call tools.

## Schema

```
name: str  — ENS name to resolve (e.g. "vitalik.eth", "uniswap.eth").
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_ens_resolve")

async def main():
    result = await tool._arun(name="vitalik.eth")
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const ensTool = tools.find(t => t.name === "keeperhub_ens_resolve")!;

const result = await ensTool.invoke({ name: "vitalik.eth" });
console.log(result);
```

## Example Output

```json
{
  "name": "vitalik.eth",
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "resolvedAt": "2026-05-03T10:05:00Z"
}
```

## Notes

- Resolution is performed against Ethereum mainnet (chain 1) ENS registry, regardless of the `network` used in other tool calls.
- If the name is not registered or has no resolver set, the tool returns an error with `address: null`.
- ENS names are case-insensitive; `Vitalik.ETH` resolves the same as `vitalik.eth`.
- The `keeperhub_transfer_funds` tool also accepts ENS names directly in the `to` field and resolves them automatically — this tool is useful when you want the address before constructing a transaction.
- Reverse lookup (address → name) is not supported by this tool.
