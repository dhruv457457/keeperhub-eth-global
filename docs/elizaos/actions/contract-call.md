# KEEPERHUB_CONTRACT_CALL

Read from or write to any smart contract function directly.

## What It Does
Executes an arbitrary read or write call against any deployed smart contract on a supported network. Read calls return the decoded on-chain value; write calls submit a transaction and return the hash. Handles ABI resolution automatically for verified contracts. Supports passing ETH value with payable calls.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | yes | Chain name or ID, e.g. `"base"`, `"ethereum"` |
| contractAddress | string | yes | Address of the contract to call |
| functionName | string | yes | Name of the function to invoke |
| functionArgs | string | no | JSON-encoded array of arguments, e.g. `'["0xAddr", "1000"]'` |
| callType | string | yes | `"read"` for view/pure, `"write"` for state-changing calls |

## Python Example
```python
result = await tool._arun(
    network="ethereum",
    contractAddress="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    functionName="balanceOf",
    functionArgs='["0xUserAddress"]',
    callType="read"
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Read the USDC balance of 0xUserAddress on Ethereum" }]
});
```

## Example Output
```json
{
  "result": "5000000",
  "decoded": "5.0 USDC",
  "callType": "read",
  "network": "ethereum"
}
```

## Notes
- Trigger phrases: "call contract", "read contract", "write to contract", "check the value of", "call the function"
- For write calls, the agentic wallet must hold ETH for gas fees.
- Use `callType: "read"` for `view` and `pure` functions — these do not cost gas.
- Use `KEEPERHUB_FETCH_ABI` to inspect available functions if the contract's interface is unknown.
