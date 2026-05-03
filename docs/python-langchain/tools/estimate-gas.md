# keeperhub_estimate_gas

Estimate the gas cost of a contract call before executing it.

## What It Does
Simulates a contract function call and returns the estimated gas units, current gas price in Gwei, and the total estimated cost in ETH. Use this before executing any write transaction to give users cost visibility, detect revert conditions early, or decide whether to proceed based on gas price thresholds.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| network | str | yes | Chain name or ID, e.g. `"base"`, `"ethereum"` |
| contract_address | str | yes | Address of the contract to call |
| function_name | str | yes | Name of the function to estimate gas for |
| function_args | str | no | JSON-encoded array of function arguments, e.g. `'["0xAddr", "1000000"]'` |

## Python Example
```python
result = await tool._arun(
    network="base",
    contract_address="0xAavePoolAddress",
    function_name="supply",
    function_args='["0xUSDCAddress", "1000000", "0xUserAddress", 0]'
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
- Gas estimation uses the current network state; actual gas used may vary slightly at execution time.
- If the simulation reverts, an error is returned with the revert reason — useful for catching issues before spending gas.
- `function_args` must be a valid JSON array string; omit entirely for no-argument functions.
- Gas price reflects the base fee at estimation time and does not include priority tip.
