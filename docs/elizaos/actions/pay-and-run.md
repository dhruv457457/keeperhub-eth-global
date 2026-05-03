# KEEPERHUB_PAY_AND_RUN

Execute a paid workflow or marketplace listing, with automatic payment via x402 or MPP.

## What It Does
Triggers a paid workflow execution, handling the payment flow automatically using either the x402 micropayment protocol (Base USDC) or the MPP protocol (Tempo USDC.e). Designed for accessing marketplace-listed automations or premium KeeperHub workflows that charge per execution. Returns the execution result and payment details.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| workflowId | string | no | KeeperHub workflow ID (use either workflowId or listedSlug) |
| listedSlug | string | no | Marketplace listing slug |
| input | Record\<string, any\> | no | Runtime input parameters |
| maxBudgetUsd | number | no | Maximum USD to spend on this execution |
| preferMpp | boolean | no | Prefer MPP (Tempo USDC.e) over x402 (Base USDC) if `true` |

## Python Example
```python
result = await tool._arun(
    listedSlug="yield-optimizer-pro",
    input={"network": "base"},
    maxBudgetUsd=0.25
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Pay and run the yield-optimizer-pro workflow" }]
});
```

## Example Output
```json
{
  "executionId": "exec_paid_abc123",
  "status": "completed",
  "amountPaidUsd": "0.10",
  "paymentProtocol": "x402",
  "output": { "bestYield": "5.8%" }
}
```

## Notes
- Trigger phrases: "pay and run", "paid workflow", "execute paid automation", "run marketplace workflow"
- Provide either `workflowId` or `listedSlug`, not both.
- x402 uses Base USDC; MPP uses Tempo USDC.e — the agentic wallet must hold the appropriate token.
- If `maxBudgetUsd` is set and the cost exceeds it, execution is aborted before payment is made.
- Use `KEEPERHUB_CHECK_EXECUTION` with the returned `executionId` to poll long-running paid workflows.
