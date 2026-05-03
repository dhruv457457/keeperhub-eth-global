# keeperhub_generate_workflow (TypeScript)

Generate a KeeperHub workflow from a plain-English description and optionally execute it immediately.

## What It Does

Sends a natural-language prompt to the KeeperHub AI workflow builder, which constructs a directed graph of on-chain actions. The workflow is saved to your account and can be executed immediately. In TypeScript, always call `keeperhub_token_address` first to resolve ticker symbols to 0x contract addresses before constructing the prompt.

## Schema

```typescript
{
  prompt: string      // Natural language workflow description. Max 1000 characters.
  execute?: boolean   // Run immediately after generation. Default: false.
  context?: string    // Additional constraints (e.g. "max slippage 0.5%", "use chain 8453").
}
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();

// Step 1: resolve token address first (TS-only tool)
const tokenTool = tools.find(t => t.name === "keeperhub_token_address")!;
const usdcResult = await tokenTool.invoke({ symbol: "USDC", chainId: "8453" });
const usdcAddress = typeof usdcResult === "string"
  ? JSON.parse(usdcResult).address
  : usdcResult.address;

// Step 2: generate the workflow with explicit address
const genTool = tools.find(t => t.name === "keeperhub_generate_workflow")!;
const result = await genTool.invoke({
  prompt: `Supply 100 USDC (${usdcAddress}) to Aave V3 on Base (chainId 8453), then notify me via email.`,
  execute: true,
  context: "Use my managed wallet. Accept default slippage.",
});
console.log(result);
```

### Via Agent (recommended)

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const agent = createReactAgent({
  llm: new ChatOpenAI({
    model: "openai/gpt-4o",
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    },
  }),
  tools: toolkit.getTools(),
  // The agent will automatically call keeperhub_token_address before generating the workflow
});

const result = await agent.invoke({
  messages: [{
    role: "human",
    content: "Create and run a workflow that supplies 100 USDC to Aave V3 on Base."
  }],
});
console.log(result.messages.at(-1)?.content);
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

- **Always resolve token symbols to contract addresses first** using `keeperhub_token_address` before mentioning swaps or token interactions in the prompt. The workflow builder requires explicit 0x addresses.
- The `prompt` field is capped at 1000 characters. Use `context` for additional constraints.
- When `execute: true`, the tool starts execution and returns immediately with `status: "running"`. Poll with `keeperhub_get_execution_status` for the final result.
- Generated workflows persist in your KeeperHub dashboard and can be re-run with `keeperhub_execute_workflow`.
- The `testnetOnly` safety option blocks generating workflows with mainnet chain references when enabled.
