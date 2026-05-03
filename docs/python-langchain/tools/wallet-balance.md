# keeperhub_wallet_balance

Check the KeeperHub managed wallet balance across one or all supported chains.

## What It Does

Returns the token balances held in the KeeperHub-managed wallet for your account. When `chain_id` is omitted, balances are returned for all supported chains. The response includes a `payment_readiness` flag that indicates whether the wallet holds sufficient USDC on Base (for x402 payments) or USDC.e on Tempo (for MPP payments).

## Schema

```
chain_id?: int — Chain ID to filter (e.g. 8453 for Base). Omit for all chains.
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_wallet_balance")

# Check balance on Base (chain_id 8453)
async def main():
    result = await tool._arun(chain_id=8453)
    print(result)

asyncio.run(main())
```

### Via LangGraph Agent

```python
result = await agent.ainvoke({
    "messages": [("human", "What is my wallet balance on Base?")]
})
```

## Example Output

```json
{
  "wallet_address": "0xAbCd1234...5678",
  "balances": [
    {
      "chain_id": 8453,
      "chain_name": "Base",
      "symbol": "ETH",
      "balance": "0.042",
      "balance_usd": "142.80"
    },
    {
      "chain_id": 8453,
      "chain_name": "Base",
      "symbol": "USDC",
      "token_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "balance": "25.00",
      "balance_usd": "25.00"
    }
  ],
  "payment_readiness": {
    "x402_ready": true,
    "x402_balance_usdc": "25.00",
    "mpp_ready": false,
    "mpp_balance_usdce": "0.00"
  }
}
```

## Notes

- Use endpoint `/api/user/wallet/balances` — **not** `/api/user/wallet/tokens` (which is deprecated).
- `payment_readiness.x402_ready` is `true` when USDC on Base (chain 8453) is available.
- `payment_readiness.mpp_ready` is `true` when USDC.e on Tempo is available.
- The managed wallet address is deterministic per API key and does not change.
- Native chain currency (ETH, MATIC, etc.) is always included; ERC-20 tokens are listed if the balance is non-zero.
