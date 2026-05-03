# keeperhub_transfer_funds

Send ETH or any ERC-20 token from the KeeperHub managed wallet to any address.

## What It Does

Initiates a transfer from the KeeperHub-managed wallet. Supports native ETH transfers and ERC-20 token transfers across all supported chains. Returns an `execution_id` for tracking and a `tx_hash` once the transaction is confirmed.

## Schema

```
network: str     — Network name (e.g. "base", "ethereum", "polygon") or chain ID as string
to: str          — Recipient address (0x...) or ENS name
amount: str      — Amount as a decimal string (e.g. "0.1", "100.0")
token_address?: str — ERC-20 contract address. Omit to transfer native ETH/chain currency.
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_transfer_funds")

async def main():
    # Transfer 0.01 ETH on Base
    result = await tool._arun(
        network="base",
        to="0xRecipientAddress...",
        amount="0.01"
    )
    print(result)

    # Transfer 10 USDC on Base
    result = await tool._arun(
        network="base",
        to="0xRecipientAddress...",
        amount="10.0",
        token_address="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    )
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const transferTool = tools.find(t => t.name === "keeperhub_transfer_funds")!;

// Transfer 0.01 ETH on Base
const result = await transferTool.invoke({
  network: "base",
  to: "0xRecipientAddress...",
  amount: "0.01",
});
console.log(result);
```

## Example Output

```json
{
  "execution_id": "exec_7f3a9b12c4d5",
  "status": "submitted",
  "tx_hash": "0x4a2f8c1e...9d3b",
  "network": "base",
  "from": "0xAbCd1234...5678",
  "to": "0xRecipientAddress...",
  "amount": "0.01",
  "token": "ETH",
  "explorer_url": "https://basescan.org/tx/0x4a2f8c1e...9d3b"
}
```

## Notes

- Omit `token_address` to send native chain currency (ETH on Ethereum/Base, MATIC on Polygon, etc.).
- `amount` is always a human-readable decimal string — the SDK handles wei/unit conversion internally.
- ENS names in `to` are automatically resolved before submission.
- Use `keeperhub_get_execution_status` with the returned `execution_id` to poll for confirmation.
- Transfers are irreversible — double-check `to` and `amount` before invoking.
