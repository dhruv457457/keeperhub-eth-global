# @ethglobal-openagent/openclaw-keeperhub

[![npm](https://img.shields.io/npm/v/@ethglobal-openagent/openclaw-keeperhub)](https://www.npmjs.com/package/@ethglobal-openagent/openclaw-keeperhub)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

KeeperHub's 27 LangChain tools as native OpenClaw tools — install once, use from any OpenClaw agent in plain English.

---

## Skill Install

```bash
npx agentskills install keeperhub
```

---

## 5-Minute Quickstart

**Step 1: Install the plugin**

```bash
openclaw plugin install @ethglobal-openagent/openclaw-keeperhub
```

**Step 2: Configure** (`~/.openclaw/openclaw.json` — OpenClaw sets this automatically, you can set `apiKey` manually)

```json
{
  "plugins": {
    "entries": {
      "keeperhub-langchain": {
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
  └── @ethglobal-openagent/openclaw-keeperhub
        └── @ethglobal-openagent/langchain-keeperhub (27 tools)
              └── KeeperHub REST API
```

OpenClaw genuinely uses the LangChain SDK — not raw API calls.

---

## All 27 Tools

| Tool | Description |
|------|-------------|
| `keeperhub_list_chains` | List all 19 supported blockchains |
| `keeperhub_fetch_contract_abi` | Fetch verified ABI, auto-resolves proxies |
| `keeperhub_transfer_funds` | Send ETH or any ERC-20 token |
| `keeperhub_contract_call` | Read or write any smart contract function |
| `keeperhub_check_and_execute` | Atomic condition check + transaction |
| `keeperhub_estimate_gas` | Estimate gas cost before submitting |
| `keeperhub_list_workflows` | List all org workflows |
| `keeperhub_execute_workflow` | Run a workflow by ID |
| `keeperhub_generate_workflow` | Create a workflow from plain English |
| `keeperhub_get_execution_status` | Poll status, get tx hash |
| `keeperhub_list_executions` | Query execution history |
| `keeperhub_list_protocols` | Browse all 396 available protocol actions |
| `keeperhub_protocol_action` | Execute any action — Aave, Uniswap, Lido, Compound, Morpho |
| `keeperhub_get_action_schema` | Get required params for any action |
| `keeperhub_search_actions` | Search 396 actions by keyword |
| `keeperhub_pay_and_run` | Execute a paid workflow via x402/MPP |
| `keeperhub_register_agent` | Register agent on-chain (ERC-8004) |
| `keeperhub_wallet_balance` | Check managed wallet balance across all chains |
| `keeperhub_provision_wallet` | Provision new Turnkey-backed agentic wallet |
| `keeperhub_notify` | Send Discord/Slack/email notification |
| `keeperhub_ens_resolve` | Resolve ENS name → address |
| `keeperhub_ens_text_record` | Read ENS text records |
| `keeperhub_ens_lookup` | Reverse lookup — address → ENS name |
| `keeperhub_chainlink_ccip` | Cross-chain token transfer via Chainlink CCIP |
| `keeperhub_chainlink_price` | Get latest price from Chainlink oracle |
| `keeperhub_run_code` | Execute custom JavaScript in KeeperHub sandbox |
| `keeperhub_math_aggregate` | Sum, average, median, min, max |

---

## Links

- **GitHub:** https://github.com/dhruv457457/keeperhub-eth-global/tree/staging/packages/openclaw-adapter-langchain
- **KeeperHub platform:** https://app.keeperhub.com
- **LangChain toolkit (direct):** `npm install @ethglobal-openagent/langchain-keeperhub`
- **OpenClaw ElizaOS adapter:** `openclaw plugin install @ethglobal-openagent/openclaw-eliza-keeperhub`
- **Python version:** `pip install keeperhub-langchain`

---

## License

MIT
