# keeperhub_contract_call

Read from or write to any smart contract function directly.

## What It Does
Executes an arbitrary read or write call against any deployed smart contract on a supported network. For read calls, returns the decoded return value. For write calls, submits a transaction and returns the transaction hash. Handles ABI resolution automatically when the contract is verified. Supports passing ETH value with payable function calls.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | yes | Chain name or ID, e.g. `"base"`, `"ethereum"` |
| contractAddress | string | yes | Address of the contract to interact with |
| functionName | string | yes | Name of the function to call |
| functionArgs | string | no | JSON-encoded array of arguments, e.g. `'["0xAddr", "1000"]'` |
| callType | string | yes | `"read"` for view/pure functions, `"write"` for state-changing calls |
| value | string | no | ETH value to send with a payable function (in ETH units, not wei) |

## Python Example
```python
result = await tool._arun(
    network="base",
    contractAddress="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    functionName="balanceOf",
    functionArgs='["0xUserAddress"]',
    callType="read"
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Read the USDC balance of 0xUserAddress on Base" }]
});
```

## Example Output
```json
{
  "result": "1000000",
  "decoded": "1.0 USDC",
  "callType": "read",
  "network": "base"
}
```

## Notes
- For write calls, the agentic wallet must have sufficient ETH balance for gas.
- `functionArgs` must be a valid JSON array string; omit for zero-argument functions.
- If the contract is not verified, provide the ABI using `keeperhub_fetch_abi` first.
- Use `callType: "read"` for `view` and `pure` functions; these do not cost gas.
- `value` is only relevant for `payable` functions; including it for non-payable functions will cause a revert.
