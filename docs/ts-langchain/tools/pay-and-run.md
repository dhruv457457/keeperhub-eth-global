# keeperhub_pay_and_run

Execute a paid workflow or marketplace listing, paying automatically via x402 or MPP.

## What It Does
Triggers execution of a workflow that requires payment, handling the payment flow automatically. Supports two payment protocols: x402 (HTTP 402 micropayments using Base USDC) and MPP (Tempo USDC.e). Useful for accessing marketplace-listed automations or premium KeeperHub workflows that charge per execution.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| workflowId | string | no | ID of a KeeperHub workflow to execute (use either workflowId or listedSlug) |
| listedSlug | string | no | Slug of a marketplace-listed workflow |
| input | Record\<string, any\> | no | Runtime input parameters to pass to the workflow |
| maxBudgetUsd | number | no | Maximum USD amount to spend on this execution (default: no limit) |
| preferMpp | boolean | no | If `true`, prefer MPP (Tempo USDC.e) over x402 (Base USDC) for payment (default: `false`) |

## Python Example
```python
result = await tool._arun(
    listedSlug="yield-optimizer-pro",
    input={"network": "base", "asset": "USDC"},
    maxBudgetUsd=0.50
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Pay and run the yield-optimizer-pro workflow with max budget of $0.50" }]
});
```

## Example Output
```json
{
  "executionId": "exec_paid_abc123",
  "status": "completed",
  "amountPaidUsd": "0.10",
  "paymentProtocol": "x402",
  "output": { "optimizedYield": "5.8%" }
}
```

## Notes
- Provide either `workflowId` or `listedSlug`, not both.
- x402 payments use Base USDC; MPP payments use Tempo USDC.e on the MPP network.
- If `maxBudgetUsd` is set and the workflow cost exceeds it, execution is aborted before payment.
- The agentic wallet must hold sufficient USDC (or USDC.e for MPP) to cover the execution fee.
- Use `keeperhub_check_execution` with the returned `executionId` to poll long-running paid workflows.
