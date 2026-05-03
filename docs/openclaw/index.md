# OpenClaw KeeperHub Adapters

KeeperHub provides two OpenClaw adapters:

- **`@ethglobal-openagent/openclaw-keeperhub`** — LangChain adapter exposing all 25 tools
- **`@ethglobal-openagent/openclaw-eliza-keeperhub`** — ElizaOS adapter exposing all 17 actions

OpenClaw is a tool-calling framework that routes AI agent tool calls to external service providers via a declarative JSON config. These adapters allow any OpenClaw-compatible agent to use KeeperHub without writing SDK code.

## Installation

```bash
# LangChain adapter (25 tools)
npm install @ethglobal-openagent/openclaw-keeperhub

# ElizaOS adapter (17 actions)
npm install @ethglobal-openagent/openclaw-eliza-keeperhub
```

## Configuration

Add KeeperHub to your OpenClaw config at `~/.openclaw/openclaw.json`:

```json
{
  "providers": {
    "keeperhub": {
      "package": "@ethglobal-openagent/openclaw-keeperhub",
      "apiKey": "${KEEPERHUB_API_KEY}",
      "baseUrl": "https://app.keeperhub.com",
      "options": {
        "testnetOnly": false,
        "allowedChainIds": [1, 8453, 137, 42161, 10]
      }
    }
  },
  "model": {
    "provider": "openrouter",
    "model": "openai/gpt-4o",
    "apiKey": "${OPENROUTER_API_KEY}",
    "baseUrl": "https://openrouter.ai/api/v1"
  }
}
```

For the ElizaOS adapter:

```json
{
  "providers": {
    "keeperhub-eliza": {
      "package": "@ethglobal-openagent/openclaw-eliza-keeperhub",
      "apiKey": "${KEEPERHUB_API_KEY}",
      "baseUrl": "https://app.keeperhub.com",
      "options": {
        "testnetOnly": false
      }
    }
  }
}
```

## Environment Variables

```bash
export KEEPERHUB_API_KEY=your_keeperhub_api_key
export OPENROUTER_API_KEY=your_openrouter_api_key
```

## LangChain Adapter — Tool List (25)

| Tool | Description |
|---|---|
| `keeperhub_wallet_balance` | Check managed wallet balances |
| `keeperhub_transfer_funds` | Send ETH or ERC-20 tokens |
| `keeperhub_generate_workflow` | Generate workflow from natural language |
| `keeperhub_execute_workflow` | Run a workflow by ID |
| `keeperhub_list_workflows` | List org workflows |
| `keeperhub_get_execution_status` | Check execution status |
| `keeperhub_protocol_action` | Execute DeFi protocol action |
| `keeperhub_list_protocols` | List all 396 DeFi actions |
| `keeperhub_contract_call` | Read/write any smart contract |
| `keeperhub_ens_resolve` | Resolve ENS name to address |
| `keeperhub_chainlink_price` | Read Chainlink price feed |
| `keeperhub_pay_and_run` | Payment-gated workflow execution |
| `keeperhub_register_agent` | Mint ERC-8004 agent NFT |
| `keeperhub_notify` | Send notification |
| `keeperhub_list_chains` | List supported chains |
| `keeperhub_token_address` | Resolve token symbol to contract address |
| `keeperhub_create_workflow` | Create workflow from node graph |
| `keeperhub_update_workflow` | Update existing workflow |
| `keeperhub_delete_workflow` | Delete a workflow |
| `keeperhub_get_workflow` | Get workflow by ID |
| `keeperhub_list_projects` | List all org projects |
| `keeperhub_create_project` | Create a new project |
| `keeperhub_get_project` | Get project details |
| `keeperhub_list_executions` | List recent executions |
| `keeperhub_cancel_execution` | Cancel running execution |

## ElizaOS Adapter — Action List (17)

| Action | Trigger |
|---|---|
| `KEEPERHUB_TRANSFER` | "send", "transfer", "pay" |
| `KEEPERHUB_WALLET_BALANCE` | "wallet balance", "how much", "my balance" |
| `KEEPERHUB_GENERATE_WORKFLOW` | "create a workflow", "automate", "build workflow" |
| `KEEPERHUB_EXECUTE_WORKFLOW` | "run", "execute" + wf_xxx ID |
| `KEEPERHUB_REGISTER_AGENT` | "register agent", "ERC-8004", "onchain identity" |
| `KEEPERHUB_ENS_RESOLVE` | message contains ".eth" |
| `KEEPERHUB_CHAINLINK_PRICE` | "price", "ETH price", "Chainlink" |
| `KEEPERHUB_LIST_WORKFLOWS` | "list workflows", "show workflows" |
| `KEEPERHUB_GET_EXECUTION` | "execution status", "check execution" |
| `KEEPERHUB_PROTOCOL_ACTION` | "supply to aave", "swap on uniswap" |
| `KEEPERHUB_CONTRACT_CALL` | "call contract", "read contract" |
| `KEEPERHUB_PAY_AND_RUN` | "pay and run", "payment workflow" |
| `KEEPERHUB_LIST_PROTOCOLS` | "list protocols", "available protocols" |
| `KEEPERHUB_LIST_CHAINS` | "list chains", "supported chains" |
| `KEEPERHUB_NOTIFY` | "notify", "send alert", "ping me" |
| `KEEPERHUB_CREATE_PROJECT` | "create project", "new project" |
| `KEEPERHUB_LIST_PROJECTS` | "list projects", "my projects" |

## Example Prompts

After configuring OpenClaw with KeeperHub, you can prompt your agent with natural language:

```
What is my wallet balance on Base?
```

```
Swap 0.01 WETH for USDC on Uniswap V3 on Base.
```

```
Create and run a workflow that supplies 100 USDC to Aave V3 on Base.
```

```
Register this agent on-chain with the name "My OpenClaw Agent".
```

```
What's the current ETH/USD price from Chainlink?
```

## Notes

- Both adapters read `KEEPERHUB_API_KEY` from the environment by default. The `apiKey` field in `openclaw.json` supports `${VAR}` substitution for security.
- `testnetOnly: true` restricts all tools/actions to testnet chains. Useful for development and staging.
- `allowedChainIds` (LangChain adapter only) restricts which chains the agent may target.
- The OpenClaw config `model` section sets the LLM used for tool-call routing. OpenRouter is recommended for access to multiple models.
- See individual tool docs in [ts-langchain/tools/](../ts-langchain/) and action docs in [elizaos/actions/](../elizaos/actions/) for full schemas and examples.
