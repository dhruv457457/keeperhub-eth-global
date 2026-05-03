# @ethglobal-openagent/langchain-keeperhub — TypeScript LangChain Package

TypeScript LangChain integration for KeeperHub. Provides 25 tools as a `KeeperHubToolkit` compatible with LangChain agents, LangGraph, and any LangChain-compatible orchestration layer.

## Installation

```bash
npm install @ethglobal-openagent/langchain-keeperhub
```

Requires Node.js 18+ and `langchain>=0.2`.

## Authentication

```bash
export KEEPERHUB_API_KEY=your_api_key_here
```

## Quickstart — createReactAgent with OpenRouter

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY,
  // Safety options:
  testnetOnly: false,       // Set true to restrict to testnets only
  allowedChainIds: [1, 8453, 137],  // Allowlist specific chain IDs (optional)
});

const tools = toolkit.getTools();

const llm = new ChatOpenAI({
  model: "openai/gpt-4o",
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  },
});

const agent = createReactAgent({ llm, tools });

const result = await agent.invoke({
  messages: [{ role: "human", content: "What is my wallet balance on Base?" }],
});
console.log(result.messages.at(-1)?.content);
```

## Safety Options

| Option | Type | Description |
|---|---|---|
| `testnetOnly` | `boolean` | When `true`, rejects any tool call targeting a mainnet chain. |
| `allowedChainIds` | `number[]` | If set, rejects tool calls targeting chains not in the list. |

## Available Tools (25)

| Tool | Description |
|---|---|
| [`keeperhub_wallet_balance`](./tools/wallet-balance.md) | Check managed wallet balances |
| [`keeperhub_transfer_funds`](../python-langchain/tools/transfer.md) | Send ETH or ERC-20 tokens |
| [`keeperhub_generate_workflow`](./tools/generate-workflow.md) | Generate workflow from natural language |
| [`keeperhub_execute_workflow`](../python-langchain/tools/execute-workflow.md) | Run a workflow by ID |
| [`keeperhub_list_workflows`](../python-langchain/tools/list-workflows.md) | List org workflows |
| [`keeperhub_get_execution_status`](../python-langchain/tools/check-execution.md) | Check execution status |
| [`keeperhub_protocol_action`](../python-langchain/tools/protocol-action.md) | Execute a DeFi protocol action |
| [`keeperhub_list_protocols`](../python-langchain/tools/list-protocols.md) | List all 396 DeFi actions |
| [`keeperhub_contract_call`](../python-langchain/tools/contract-call.md) | Read/write any smart contract |
| [`keeperhub_ens_resolve`](../python-langchain/tools/ens-resolve.md) | Resolve ENS name to address |
| [`keeperhub_chainlink_price`](../python-langchain/tools/chainlink-price.md) | Read Chainlink price feed |
| [`keeperhub_pay_and_run`](../python-langchain/tools/pay-and-run.md) | Payment-gated workflow execution |
| [`keeperhub_register_agent`](./tools/register-agent.md) | Mint ERC-8004 agent NFT |
| [`keeperhub_notify`](../python-langchain/tools/notify.md) | Send notification |
| [`keeperhub_list_chains`](../python-langchain/tools/list-chains.md) | List supported chains |
| [`keeperhub_token_address`](./tools/token-address.md) | Resolve token symbol to contract address *(TS only)* |
| `keeperhub_create_workflow` | Create workflow from node graph |
| `keeperhub_update_workflow` | Update existing workflow |
| `keeperhub_delete_workflow` | Delete a workflow |
| `keeperhub_get_workflow` | Get workflow by ID |
| `keeperhub_list_projects` | List all org projects |
| `keeperhub_create_project` | Create a new project |
| `keeperhub_get_project` | Get project details |
| `keeperhub_list_executions` | List recent executions |
| `keeperhub_cancel_execution` | Cancel running execution |

## Notes

- `keeperhub_token_address` is available in the TS package but **not** in the Python package. In Python, use explicit 0x contract addresses.
- The toolkit automatically injects `Authorization: Bearer $KEEPERHUB_API_KEY` on every API call.
- All tools are async-compatible and work with both LangGraph and vanilla LangChain `AgentExecutor`.
