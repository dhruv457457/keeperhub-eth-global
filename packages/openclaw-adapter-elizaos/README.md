# @keeperhub/openclaw-eliza

Wraps the `@keeperhub/elizaos` plugin as native OpenClaw tools using `@elizaos/openclaw-adapter`.

All 19 KeeperHub ElizaOS actions become OpenClaw tools — DeFi protocols, token transfers, workflow execution, contract reads, ENS resolution, and agent identity.

## How It Works

```
OpenClaw agent
  └── @elizaos/openclaw-adapter
        └── @keeperhub/elizaos plugin (19 actions)
              └── KeeperHub REST API
```

OpenClaw calls our ElizaOS actions. Our ElizaOS actions use our SDK. **OpenClaw genuinely uses our SDK** — not just raw API calls.

## Available Tools (from ElizaOS actions)

| OpenClaw Tool | Source Action | What It Does |
|---------------|---------------|--------------|
| `eliza_keeperhub_transfer` | `KEEPERHUB_TRANSFER` | Transfer ETH or ERC-20 tokens |
| `eliza_keeperhub_contract_read` | `KEEPERHUB_CONTRACT_READ` | Read any smart contract |
| `eliza_keeperhub_list_workflows` | `KEEPERHUB_LIST_WORKFLOWS` | List available workflows |
| `eliza_keeperhub_execute_workflow` | `KEEPERHUB_EXECUTE_WORKFLOW` | Run a workflow by ID |
| `eliza_keeperhub_generate_workflow` | `KEEPERHUB_GENERATE_WORKFLOW` | Create workflow from plain English |
| `eliza_keeperhub_check_execution` | `KEEPERHUB_CHECK_EXECUTION` | Poll execution status + tx hash |
| `eliza_keeperhub_protocol_action` | `KEEPERHUB_PROTOCOL_ACTION` | Execute any DeFi protocol action |
| `eliza_keeperhub_list_chains` | `KEEPERHUB_LIST_CHAINS` | List supported blockchains |
| `eliza_keeperhub_register_agent` | `KEEPERHUB_REGISTER_AGENT` | Register on-chain identity (ERC-8004) |
| `eliza_keeperhub_pay_and_run` | `KEEPERHUB_PAY_AND_RUN` | Run paid workflow via x402/MPP |
| `eliza_keeperhub_notify` | `KEEPERHUB_NOTIFY` | Send Discord/Slack/email notification |
| `eliza_keeperhub_chainlink_ccip` | `KEEPERHUB_CHAINLINK_CCIP` | Cross-chain transfer via CCIP |
| `eliza_keeperhub_run_code` | `KEEPERHUB_RUN_CODE` | Execute JavaScript in sandbox |

## Setup

### 1. Install

```bash
npm install @elizaos/openclaw-adapter @keeperhub/elizaos
```

### 2. Set environment variables

```bash
export KEEPERHUB_API_KEY=kh_...
```

### 3. Configure OpenClaw

Copy `openclaw.config.example.json` → `openclaw.config.json` in your project:

```json
{
  "plugins": {
    "eliza-adapter": {
      "plugins": ["@keeperhub/elizaos"],
      "settings": {
        "KEEPERHUB_API_KEY": "${KEEPERHUB_API_KEY}",
        "KEEPERHUB_BASE_URL": "https://app.keeperhub.com"
      },
      "agentName": "KeeperHub DeFi Agent"
    }
  }
}
```

### 4. Run

```bash
openclaw run
```

Your OpenClaw agent now has all 19 KeeperHub actions available as tools.

## Safety Options

To block mainnet writes during development, add `testnetOnly` to the plugin config or set it in your ElizaOS plugin options before the adapter wraps it.

## Links

- KeeperHub: https://app.keeperhub.com
- ElizaOS adapter docs: https://github.com/elizaOS/openclaw-adapter
- Full SDK: https://github.com/dhruv457457/keeperhub-eth-global
