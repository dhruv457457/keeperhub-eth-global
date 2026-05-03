# keeperhub_pay_and_run

Execute a payment-gated workflow using x402 (Base USDC) or MPP (Tempo USDC.e).

## What It Does

Triggers a workflow that requires payment to execute. KeeperHub supports two payment protocols: x402 (HTTP 402 Payment Required, settled in USDC on Base) and MPP (Multi-Party Payment, settled in USDC.e on Tempo). The tool handles the payment flow automatically using the managed wallet, then runs the workflow and returns the execution ID.

## Schema

```
workflow_id?: str      — ID of a saved workflow to execute with payment.
listed_slug?: str      — Slug of a workflow listed on the KeeperHub marketplace.
input?: dict           — Runtime parameters to pass into the workflow.
max_budget_usd?: str   — Maximum amount in USD you authorize for this call. Default: "1.00".
prefer_mpp?: bool      — Prefer MPP (Tempo USDC.e) over x402 (Base USDC). Default: false.
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_pay_and_run")

async def main():
    # Run a marketplace workflow by slug
    result = await tool._arun(
        listed_slug="defi-rebalancer",
        input={"target_allocation": {"ETH": 0.6, "USDC": 0.4}},
        max_budget_usd="2.50"
    )
    print(result)

    # Run a saved workflow with MPP payment
    result = await tool._arun(
        workflow_id="wf_a1b2c3d4e5f6",
        prefer_mpp=True,
        max_budget_usd="0.50"
    )
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const payTool = tools.find(t => t.name === "keeperhub_pay_and_run")!;

const result = await payTool.invoke({
  listed_slug: "defi-rebalancer",
  input: { target_allocation: { ETH: 0.6, USDC: 0.4 } },
  max_budget_usd: "2.50",
  prefer_mpp: false,
});
console.log(result);
```

## Example Output

```json
{
  "executionId": "exec_pay_7h8i9j0k",
  "workflowId": "wf_listed_defi-rebalancer",
  "paymentProtocol": "x402",
  "amountPaid": "1.50",
  "currency": "USDC",
  "network": "base",
  "paymentTxHash": "0xaabbcc...ddeeff",
  "status": "running"
}
```

## Notes

- **x402** settles in USDC on Base (chain 8453). Ensure your managed wallet holds USDC on Base before calling.
- **MPP** settles in USDC.e on Tempo. Ensure your managed wallet holds USDC.e on Tempo before calling.
- Use `keeperhub_wallet_balance` to check `payment_readiness` before calling this tool.
- Provide either `workflow_id` or `listed_slug`, not both. `listed_slug` is for marketplace workflows.
- If the actual cost exceeds `max_budget_usd`, the call is rejected before any payment is sent.
- Use `keeperhub_get_execution_status` with the returned `executionId` to poll for completion.
