# keeperhub_generate_workflow

Generate a KeeperHub workflow from a plain-English description and optionally execute it immediately.

## What It Does

Sends a natural-language prompt to the KeeperHub AI workflow builder, which constructs a directed graph of on-chain actions. The generated workflow is saved to your account and can be executed immediately by setting `execute=True`. The tool returns the new workflow ID, its name, node count, and (if executed) an execution ID.

## Schema

```
prompt: str       — Natural language description of the workflow. Max 1000 characters.
execute?: bool    — If true, run the workflow immediately after generation. Default: false.
context?: str     — Optional additional context (e.g. "use chain id 8453", "max slippage 0.5%").
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()

# IMPORTANT: resolve token symbols first
token_tool = None  # Python package uses contract addresses directly
workflow_tool = toolkit.get_tool("keeperhub_generate_workflow")

async def main():
    result = await workflow_tool._arun(
        prompt=(
            "Supply 100 USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913) "
            "to Aave V3 on Base (chain 8453), then notify me via email."
        ),
        execute=True,
        context="Use my managed wallet. Max gas: 0.001 ETH."
    )
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();

// Step 1: resolve USDC address on Base first
const tokenTool = tools.find(t => t.name === "keeperhub_token_address")!;
const usdcAddress = await tokenTool.invoke({ symbol: "USDC", chainId: "8453" });

// Step 2: generate workflow using resolved address
const genTool = tools.find(t => t.name === "keeperhub_generate_workflow")!;
const result = await genTool.invoke({
  prompt: `Supply 100 USDC (${usdcAddress}) to Aave V3 on Base (8453), then notify via email.`,
  execute: true,
});
console.log(result);
```

## Example Output

```json
{
  "workflowId": "wf_a1b2c3d4e5f6",
  "name": "Supply USDC to Aave V3 on Base",
  "description": "Supply 100 USDC to Aave V3 on Base mainnet, then send email notification.",
  "nodeCount": 3,
  "nodes": ["fetch-balance", "aave-v3-supply", "notify-email"],
  "executionId": "exec_9z8y7x6w5v",
  "status": "running"
}
```

## Notes

- **Always call `keeperhub_token_address` first** (TypeScript) or use explicit 0x addresses (Python) before mentioning swaps or token interactions in the prompt. The AI builder does not reliably resolve ticker symbols to contract addresses.
- The `prompt` field is limited to 1000 characters. Use `context` for supplementary constraints.
- If `execute=True` and the workflow requires funds, ensure the managed wallet is topped up before calling.
- Generated workflows are persisted to your account and visible in the KeeperHub dashboard.
- Use `keeperhub_get_execution_status` with the returned `executionId` to monitor progress.
