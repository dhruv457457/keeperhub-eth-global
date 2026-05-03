# KEEPERHUB_PROTOCOL_ACTION

Execute a DeFi protocol action such as supplying to Aave, swapping on Uniswap, or staking on Lido.

## What It Does
Dispatches one of 396 supported DeFi protocol actions using a structured action type and parameter map. Handles ABI encoding, transaction submission, and result formatting. Covers lending, DEX swaps, staking, liquidity provision, and more across all major DeFi protocols on supported chains.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| actionType | string | yes | Protocol action identifier, e.g. `"aave-v3/supply"`, `"uniswap-v3/swap"` |
| params | Record\<string, any\> | yes | Action-specific parameters (network, asset addresses, amounts, etc.) |

## Python Example
```python
result = await tool._arun(
    actionType="lido/stake",
    params={"network": "ethereum", "amount": "0.1"}
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Supply 100 USDC to Aave V3 on Base" }]
});
```

## Example Output
```json
{
  "ok": true,
  "tx_hash": "0xabc123...",
  "actionType": "aave-v3/supply",
  "network": "base"
}
```

## Notes
- Trigger phrases: "supply to Aave", "swap on Uniswap", "stake on Lido", "borrow from Compound", "add liquidity to Curve"
- 396 action types available across protocols including Aave, Uniswap, Lido, Compound, Curve, Balancer, and more.
- Use `KEEPERHUB_LIST_PROTOCOLS` to explore available actions, and `KEEPERHUB_GET_ACTION_SCHEMA` to confirm required params.
- For actions not covered by the 396 types, fall back to `KEEPERHUB_CONTRACT_CALL` or `KEEPERHUB_GENERATE_WORKFLOW`.
