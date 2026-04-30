# @keeperhub/openclaw-langchain

Wraps the `@keeperhub/langchain` TypeScript SDK as native OpenClaw tools.

Each of the 24 KeeperHub LangChain tools becomes an OpenClaw tool. When OpenClaw calls a tool, this adapter invokes the LangChain tool's underlying function and returns the result.

## How It Works

```
OpenClaw agent
  └── @keeperhub/openclaw-langchain (this package)
        └── @keeperhub/langchain (LangChain SDK — 24 tools)
              └── KeeperHub REST API
```

**OpenClaw genuinely uses our LangChain SDK** — not raw API calls.

## Available Tools

All 24 tools from `@keeperhub/langchain` are exposed:

| OpenClaw Tool Name | Description |
|--------------------|-------------|
| `keeperhub_list_chains` | List 19 supported blockchains |
| `keeperhub_fetch_contract_abi` | Fetch verified contract ABI |
| `keeperhub_transfer_funds` | Send ETH or ERC-20 tokens |
| `keeperhub_contract_call` | Read or write any smart contract |
| `keeperhub_check_and_execute` | Atomic condition check + transaction |
| `keeperhub_estimate_gas` | Estimate gas cost |
| `keeperhub_list_workflows` | List KeeperHub workflows |
| `keeperhub_execute_workflow` | Run a workflow by ID |
| `keeperhub_generate_workflow` | Create workflow from plain English |
| `keeperhub_get_execution_status` | Poll execution status + tx hash |
| `keeperhub_list_protocols` | Browse 396 DeFi protocol actions |
| `keeperhub_protocol_action` | Execute any Aave/Uniswap/Lido action |
| `keeperhub_pay_and_run` | Pay via x402/MPP and run workflow |
| `keeperhub_register_agent` | Register on-chain identity (ERC-8004) |
| `keeperhub_wallet_balance` | Check managed wallet balance |
| `keeperhub_provision_wallet` | Provision new agentic wallet |
| `keeperhub_notify` | Send Discord/Slack/email notification |
| `keeperhub_ens_resolve` | Resolve ENS name → address |
| `keeperhub_ens_lookup` | Reverse lookup address → ENS |
| `keeperhub_chainlink_ccip` | Cross-chain transfer via CCIP |
| `keeperhub_math_aggregate` | Sum, average, min, max |
| `keeperhub_get_action_schema` | Get params for any protocol action |
| `keeperhub_search_actions` | Search 396 actions by keyword |
| `keeperhub_run_code` | Execute JavaScript in sandbox |

## Setup

### 1. Install

```bash
npm install @keeperhub/openclaw-langchain
```

### 2. Set environment variable

```bash
export KEEPERHUB_API_KEY=kh_...
```

### 3. Configure OpenClaw

```json
{
  "plugins": {
    "keeperhub-langchain": {
      "apiKey": "${KEEPERHUB_API_KEY}",
      "testnetOnly": true
    }
  }
}
```

### 4. Run

```bash
openclaw run
```

## Use in Code

```typescript
import { createKeeperHubOpenClawTools } from "@keeperhub/openclaw-langchain";

const tools = createKeeperHubOpenClawTools({
  apiKey: process.env.KEEPERHUB_API_KEY!,
  testnetOnly: true,  // block mainnet writes in dev
  // optionally restrict to specific tools:
  tools: ["transfer", "wallet_balance", "list_protocols", "protocol_action"],
});

// Each tool has: name, description, parameters, execute()
for (const tool of tools) {
  console.log(tool.name, "-", tool.description);
}

// Call a tool directly:
const result = await tools
  .find(t => t.name === "keeperhub_list_chains")!
  .execute({});

console.log(result.text);    // human-readable output
console.log(result.success); // true/false
console.log(result.metadata); // full API response
```

## Safety Options

```json
{
  "plugins": {
    "keeperhub-langchain": {
      "apiKey": "${KEEPERHUB_API_KEY}",
      "testnetOnly": true,
      "allowedChainIds": ["11155111", "84532"]
    }
  }
}
```

- `testnetOnly: true` — blocks all mainnet writes (transfer, contract write, check-and-execute)
- `allowedChainIds` — extra allowlist on top of testnetOnly

## Links

- KeeperHub: https://app.keeperhub.com
- Full SDK: https://github.com/dhruv457457/keeperhub-eth-global
