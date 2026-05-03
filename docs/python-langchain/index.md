# keeperhub-langchain — Python LangChain Package

Python LangChain integration for KeeperHub. Provides 24 tools as a `KeeperHubToolkit` compatible with LangChain agents and LangGraph graphs.

## Installation

```bash
pip install keeperhub-langchain
```

Requires Python 3.9+ and `langchain-core>=0.2`.

## Authentication

```bash
export KEEPERHUB_API_KEY=your_api_key_here
```

## Quickstart — LangGraph Agent

```python
import asyncio
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from keeperhub_langchain import KeeperHubToolkit

# Initialize toolkit
toolkit = KeeperHubToolkit(api_key="your_api_key")  # or reads KEEPERHUB_API_KEY
tools = toolkit.get_tools()

# Use OpenRouter-compatible model
llm = ChatOpenAI(
    model="openai/gpt-4o",
    base_url="https://openrouter.ai/api/v1",
    api_key="your_openrouter_key",
)

agent = create_react_agent(llm, tools)

async def main():
    result = await agent.ainvoke({
        "messages": [("human", "What is my wallet balance on Base?")]
    })
    print(result["messages"][-1].content)

asyncio.run(main())
```

## Available Tools (24)

| Tool | Description |
|---|---|
| [`keeperhub_wallet_balance`](./tools/wallet-balance.md) | Check managed wallet balances across chains |
| [`keeperhub_transfer_funds`](./tools/transfer.md) | Send ETH or ERC-20 tokens |
| [`keeperhub_generate_workflow`](./tools/generate-workflow.md) | Generate a workflow from natural language |
| [`keeperhub_execute_workflow`](./tools/execute-workflow.md) | Execute a workflow by ID |
| [`keeperhub_list_workflows`](./tools/list-workflows.md) | List org workflows |
| [`keeperhub_get_execution_status`](./tools/check-execution.md) | Check workflow execution status |
| [`keeperhub_protocol_action`](./tools/protocol-action.md) | Execute a DeFi protocol action directly |
| [`keeperhub_list_protocols`](./tools/list-protocols.md) | List all 396 available DeFi actions |
| [`keeperhub_contract_call`](./tools/contract-call.md) | Read or write any smart contract |
| [`keeperhub_ens_resolve`](./tools/ens-resolve.md) | Resolve ENS name to address |
| [`keeperhub_chainlink_price`](./tools/chainlink-price.md) | Read a Chainlink price feed |
| [`keeperhub_pay_and_run`](./tools/pay-and-run.md) | Execute a payment-gated workflow |
| [`keeperhub_register_agent`](./tools/register-agent.md) | Mint an ERC-8004 agent NFT |
| [`keeperhub_notify`](./tools/notify.md) | Send a notification via email, Slack, Discord, Telegram, or webhook |
| [`keeperhub_list_chains`](./tools/list-chains.md) | List all supported chains |
| `keeperhub_create_workflow` | Create a workflow from a node graph definition |
| `keeperhub_update_workflow` | Update an existing workflow |
| `keeperhub_delete_workflow` | Delete a workflow |
| `keeperhub_get_workflow` | Get workflow details by ID |
| `keeperhub_list_projects` | List all projects in the org |
| `keeperhub_create_project` | Create a new project |
| `keeperhub_get_project` | Get project details |
| `keeperhub_list_executions` | List recent workflow executions |
| `keeperhub_cancel_execution` | Cancel a running execution |

## Notes

- All tools support `_arun()` for async execution (preferred in LangGraph).
- The toolkit injects `Authorization: Bearer $KEEPERHUB_API_KEY` on every request.
- Base URL: `https://app.keeperhub.com`
- Tools that perform on-chain writes use the KeeperHub managed wallet associated with your API key.
- Always resolve token symbols to 0x addresses before describing swap/transfer workflows — see [`keeperhub_generate_workflow`](./tools/generate-workflow.md).
