# @ethglobal-openagent/openclaw-eliza-keeperhub

[![npm](https://img.shields.io/npm/v/@ethglobal-openagent/openclaw-eliza-keeperhub)](https://www.npmjs.com/package/@ethglobal-openagent/openclaw-eliza-keeperhub)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

KeeperHub's ElizaOS actions as native OpenClaw tools — install once, use from any OpenClaw agent in plain English.

---

## Skill Install

```bash
npx agentskills install keeperhub
```

---

## 5-Minute Quickstart

**Step 1: Install the plugin**

```bash
openclaw plugin install @ethglobal-openagent/openclaw-eliza-keeperhub
```

**Step 2: Configure** (`~/.openclaw/openclaw.json` — OpenClaw sets this automatically, you can set `apiKey` manually)

```json
{
  "plugins": {
    "entries": {
      "keeperhub-eliza": {
        "config": {
          "apiKey": "kh_...",
          "testnetOnly": true
        },
        "enabled": true
      }
    }
  }
}
```

**Step 3: Start OpenClaw and talk to it**

```
openclaw
> Check my wallet balance on Base
→ Your Base wallet: 0x1234...abcd
  ETH: 0.05 | USDC: 100.00

> Supply 50 USDC to Aave on Base
→ Executing aave-v3/supply... tx: 0xabc...
```

Get your API key at [app.keeperhub.com](https://app.keeperhub.com) → Settings → API Keys.

---

## Architecture

```
OpenClaw agent
  └── @ethglobal-openagent/openclaw-eliza-keeperhub
        └── @keeperhub/elizaos (ElizaOS actions)
              └── KeeperHub REST API
```

OpenClaw genuinely uses the ElizaOS plugin — not raw API calls.

---

## All 23 Tools

Tools are exposed with the `eliza_` prefix, sourced from the underlying `@keeperhub/elizaos` plugin actions.

| OpenClaw Tool | Source ElizaOS Action | What It Does |
|---------------|----------------------|--------------|
| `eliza_keeperhub_transfer` | `KEEPERHUB_TRANSFER` | Transfer ETH or ERC-20 tokens |
| `eliza_keeperhub_contract_read` | `KEEPERHUB_CONTRACT_READ` | Read any smart contract |
| `eliza_keeperhub_list_workflows` | `KEEPERHUB_LIST_WORKFLOWS` | List available workflows |
| `eliza_keeperhub_execute_workflow` | `KEEPERHUB_EXECUTE_WORKFLOW` | Run a workflow by ID |
| `eliza_keeperhub_generate_workflow` | `KEEPERHUB_GENERATE_WORKFLOW` | Create workflow from plain English |
| `eliza_keeperhub_check_execution` | `KEEPERHUB_CHECK_EXECUTION` | Poll execution status + tx hash |
| `eliza_keeperhub_protocol_action` | `KEEPERHUB_PROTOCOL_ACTION` | Execute any DeFi protocol action |
| `eliza_keeperhub_list_chains` | `KEEPERHUB_LIST_CHAINS` | List 19 supported blockchains |
| `eliza_keeperhub_register_agent` | `KEEPERHUB_REGISTER_AGENT` | Register on-chain identity (ERC-8004) |
| `eliza_keeperhub_pay_and_run` | `KEEPERHUB_PAY_AND_RUN` | Run paid workflow via x402/MPP |
| `eliza_keeperhub_notify` | `KEEPERHUB_NOTIFY` | Send Discord/Slack/email notification |
| `eliza_keeperhub_chainlink_ccip` | `KEEPERHUB_CHAINLINK_CCIP` | Cross-chain transfer via CCIP |
| `eliza_keeperhub_run_code` | `KEEPERHUB_RUN_CODE` | Execute JavaScript in sandbox |
| `eliza_keeperhub_action_schema` | `KEEPERHUB_ACTION_SCHEMA` | Get schema for any protocol action |
| `eliza_keeperhub_wallet_balance` | `KEEPERHUB_WALLET_BALANCE` | Check wallet balance across chains |
| `eliza_keeperhub_ens_resolve` | `KEEPERHUB_ENS_RESOLVE` | Resolve ENS name → address |
| `eliza_keeperhub_estimate_gas` | `KEEPERHUB_ESTIMATE_GAS` | Estimate gas before a transaction |
| `eliza_keeperhub_check_and_execute` | `KEEPERHUB_CHECK_AND_EXECUTE` | Atomic condition check + transaction |
| `eliza_keeperhub_list_protocols` | `KEEPERHUB_LIST_PROTOCOLS` | Browse 396 DeFi protocol actions |
| `eliza_keeperhub_search_actions` | `KEEPERHUB_SEARCH_ACTIONS` | Search protocol actions by keyword |
| `eliza_keeperhub_workflow_version` | `KEEPERHUB_WORKFLOW_VERSION` | Get workflow version history |
| `eliza_keeperhub_provision_wallet` | `KEEPERHUB_PROVISION_WALLET` | Provision new agentic wallet |
| `eliza_keeperhub_chainlink_price` | `KEEPERHUB_CHAINLINK_PRICE` | Get latest Chainlink oracle price |

---

## Links

- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/packages/openclaw-adapter-elizaos
- **KeeperHub platform:** https://app.keeperhub.com
- **ElizaOS plugin (direct):** `npm install @keeperhub/elizaos`
- **OpenClaw LangChain adapter:** `openclaw plugin install @ethglobal-openagent/openclaw-keeperhub`
- **Python version:** `pip install keeperhub-langchain`

---

## License

MIT
