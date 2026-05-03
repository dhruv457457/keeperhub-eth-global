# keeperhub_protocol_action

Execute a DeFi protocol action directly using KeeperHub's 396 pre-built action library.

## What It Does

Invokes a specific DeFi protocol action (e.g. Aave supply, Uniswap swap, Compound borrow) from the KeeperHub protocol action library. Actions are identified by a `protocol/action` slug. The tool attempts a direct on-chain write via the KeeperHub API. If the direct write fails with a server error, fall back to `keeperhub_generate_workflow` with `execute=True`.

## Schema

```
action_type: str  — Protocol action slug in "protocol/action" format (e.g. "aave-v3/supply").
params: dict      — Action-specific parameters. Keys vary by action — use keeperhub_list_protocols to inspect.
```

### Common Action Examples

| Slug | Required params |
|---|---|
| `aave-v3/supply` | `network`, `asset`, `amount` |
| `aave-v3/borrow` | `network`, `asset`, `amount`, `interestRateMode` |
| `uniswap/swap-exact-input` | `network`, `tokenIn`, `tokenOut`, `amountIn`, `recipient` |
| `uniswap/add-liquidity` | `network`, `token0`, `token1`, `amount0`, `amount1` |
| `compound-v3/supply` | `network`, `asset`, `amount` |
| `curve/exchange` | `network`, `pool`, `fromToken`, `toToken`, `amount` |

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_protocol_action")

async def main():
    # Supply 100 USDC to Aave V3 on Base
    result = await tool._arun(
        action_type="aave-v3/supply",
        params={
            "network": "base",
            "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # USDC on Base
            "amount": "100.0"
        }
    )
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const actionTool = tools.find(t => t.name === "keeperhub_protocol_action")!;

const result = await actionTool.invoke({
  action_type: "uniswap/swap-exact-input",
  params: {
    network: "base",
    tokenIn: "0x4200000000000000000000000000000000000006",  // WETH on Base
    tokenOut: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    amountIn: "0.01",
    recipient: "0xYourAddress...",
  },
});
console.log(result);
```

## Example Output

```json
{
  "executionId": "exec_3c4d5e6f7g",
  "actionType": "aave-v3/supply",
  "status": "submitted",
  "txHash": "0x7b8c9d0e...1a2b",
  "network": "base",
  "params": {
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "amount": "100.0"
  }
}
```

## Notes

- **Direct writes may fail with a 500 server error** for some actions. If this happens, use `keeperhub_generate_workflow` with `execute=True` as a reliable fallback.
- The library covers 396 DeFi actions across 20+ protocols. Use `keeperhub_list_protocols` to discover available actions and their parameter schemas.
- Always pass token addresses as 0x hex strings — ticker symbols are not accepted in `params`.
- Protocol action calls use the KeeperHub managed wallet automatically.
- Use `keeperhub_get_execution_status` with the returned `executionId` to confirm on-chain settlement.
