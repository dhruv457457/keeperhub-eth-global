# keeperhub_register_agent

Mint an ERC-8004 agent identity NFT on Base to give your AI agent an on-chain identity.

## What It Does

Mints a non-fungible token on the ERC-8004 Agent Registry contract on Base, establishing a verifiable on-chain identity for your AI agent. The operation is idempotent — if an NFT already exists for your managed wallet, the existing token ID and metadata are returned without minting again. Minting requires approximately 0.001 ETH on your managed wallet to cover gas.

## Schema

```
name?: str               — Display name for the agent. Default: "KeeperHub Agent".
description?: str        — Short description of the agent's purpose.
capabilities?: list[str] — List of capability tags (e.g. ["defi", "cross-chain", "notifications"]).
```

### Contract Details

| Property | Value |
|---|---|
| Network | Base (chain ID 8453) |
| Contract | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Standard | ERC-8004 |
| Explorer | [basescan.org](https://basescan.org/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) |

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_register_agent")

async def main():
    result = await tool._arun(
        name="NIYAT DeFi Agent",
        description="Autonomous DeFi portfolio management agent with cross-chain capabilities.",
        capabilities=["defi", "aave", "uniswap", "cross-chain", "notifications"]
    )
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const registerTool = tools.find(t => t.name === "keeperhub_register_agent")!;

const result = await registerTool.invoke({
  name: "NIYAT DeFi Agent",
  description: "Autonomous DeFi portfolio management agent.",
  capabilities: ["defi", "aave", "uniswap", "cross-chain"],
});
console.log(result);
```

## Example Output

```json
{
  "tokenId": "42",
  "txHash": "0xf1e2d3c4...b5a6",
  "contract": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  "network": "base",
  "walletAddress": "0xAbCd1234...5678",
  "name": "NIYAT DeFi Agent",
  "capabilities": ["defi", "aave", "uniswap", "cross-chain"],
  "alreadyRegistered": false,
  "basescanUrl": "https://basescan.org/tx/0xf1e2d3c4...b5a6"
}
```

## Notes

- **Idempotent**: calling this tool multiple times for the same managed wallet returns the existing registration without minting a new token.
- Requires ~0.001 ETH on the managed wallet on Base to cover gas. Check with `keeperhub_wallet_balance` first.
- The NFT is minted to the KeeperHub managed wallet address — not to a user-provided address.
- `capabilities` is stored as metadata on-chain. Use it to signal what protocols and features your agent supports.
- `alreadyRegistered: true` in the response means no new transaction was submitted.
