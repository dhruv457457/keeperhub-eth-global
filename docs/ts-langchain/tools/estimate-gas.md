# keeperhub_estimate_gas

Estimate the gas cost of a contract function call before executing it.

## What It Does
Simulates a contract function call against current network state and returns the estimated gas units required, the current gas price in Gwei, and the total expected cost in ETH. Use this to provide cost transparency to users, detect reverts before spending gas, or implement gas price guards in automated workflows.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | string | yes | Chain name or ID, e.g. `"base"`, `"ethereum"` |
| contractAddress | string | yes | Address of the contract to call |
| functionName | string | yes | Name of the function to estimate gas for |
| functionArgs | string | no | JSON-encoded array of function arguments, e.g. `'["0xAddr", "1000"]'` |

## Python Example
```python
result = await tool._arun(
    network="base",
    contractAddress="0xAavePool",
    functionName="supply",
    functionArgs='["0xUSDC", "1000000", "0xUser", 0]'
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Estimate gas for supplying USDC to Aave on Base" }]
});
```

## Example Output
```json
{
  "gasEstimate": 185000,
  "gasPriceGwei": "0.052",
  "estimatedCostEth": "0.000009620"
}
```

## Notes
- Estimation uses the current network base fee and does not include the priority tip.
- If the simulated call reverts, an error is returned with the revert reason before any gas is spent.
- `functionArgs` must be a valid JSON array string; omit entirely for no-argument functions.
- Actual gas used at execution time may differ slightly from the estimate due to state changes.
