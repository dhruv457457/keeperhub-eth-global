---
title: "ElizaOS Integration"
description: "KeeperHub plugin for ElizaOS — 5 actions and 2 context providers that give any ElizaOS agent full onchain workflow capabilities."
---

# ElizaOS Integration

`@keeperhub/elizaos` is a fully-featured ElizaOS plugin. One line of setup gives an ElizaOS agent the ability to list, execute, and generate KeeperHub workflows, check execution status, register itself on-chain via ERC-8004, and inject wallet and workflow context into every conversation.

## Install

```bash
npm install @keeperhub/elizaos keeperhub-sdk
```

## Setup

```typescript
import { createKeeperHubPlugin } from "@keeperhub/elizaos";

const runtime = new AgentRuntime({
  character,
  plugins: [
    createKeeperHubPlugin({
      apiKey: process.env.KEEPERHUB_API_KEY,
    }),
  ],
});
```

## Production Setup

```typescript
createKeeperHubPlugin({
  apiKey: process.env.KEEPERHUB_API_KEY,

  // Allowlist — only these workflow IDs can be executed via chat
  allowedWorkflowIds: ["wf_compound_usdc", "wf_rebalance_portfolio"],

  // Session tagging — ties all API calls to this agent instance in the dashboard
  agentContext: {
    sessionId: runtime.agentId,
    goal: character.bio[0],
  },

  // Disable providers if you don't want wallet/workflow context in every message
  enableWalletProvider: true,
  enableWorkflowsProvider: true,
});
```

## Actions

### `EXECUTE_KEEPERHUB_WORKFLOW`

Triggered when the user's message contains a `wf_xxx` workflow ID and an execution-intent phrase ("run", "execute", "trigger", "start").

- Extracts workflow ID via regex — only matches `wf_[a-zA-Z0-9_-]{1,64}` format
- Extracts JSON input from ` ```json ``` ` code blocks or `input: {...}` patterns
- Rejects oversized input (> 8KB) with a clear error message rather than silently dropping it
- Emits intermediate progress callbacks during execution (`🔄 2/5: Swap USDC…`) — no silent 2-minute wait
- Uses `kh.tryRun()` internally — never crashes the agent loop
- When `allowedWorkflowIds` is set, enforces it at both `validate` and `handler` time

**Example trigger phrases:**
```
"Run workflow wf_abc123"
"Execute wf_xyz with input: {"amount": "100", "token": "USDC"}"
"Trigger wf_abc123 ```json {"asset": "USDC"} ```"
```

### `GENERATE_KEEPERHUB_WORKFLOW`

Triggered by workflow-creation phrases ("create a workflow", "automate", "build workflow", etc.).

- Extracts the intent from the message and cleans filler phrases ("create a workflow to" → the actual intent)
- Enforces 1000-character prompt limit
- When `execute: true` in options AND no `allowedWorkflowIds` is set, generates and immediately executes
- When `allowedWorkflowIds` is set, blocks the generate-and-execute path (generated IDs are not in the list)
- Uses `pipeline().generate().safeWait()` — surfaces `pending_approval` status when payment approval is required
- Emits progress callbacks during execution

### `CHECK_KEEPERHUB_EXECUTION`

Triggered by status-check phrases ("check execution", "execution status", "get logs") combined with an execution ID.

- Matches both `exec_xxx` and UUID formats
- Optionally fetches step-level logs when the user mentions "log"
- Returns a generic "not found or not accessible" message for both 404 and 401 — prevents execution ID enumeration

### `LIST_KEEPERHUB_WORKFLOWS`

Triggered by listing phrases ("list workflows", "show automations", "what workflows are available").

- Returns up to 15 workflows with name, ID, and description
- Tells the user the exact phrase to execute any listed workflow

### `REGISTER_KEEPERHUB_AGENT`

Triggered by ERC-8004 identity phrases ("register agent", "onchain identity", "register on chain").

- Uses `kh.agent.getRegistrations()` to check for existing registrations before calling `register()`
- If already registered: returns existing identity with "already registered" message — no duplicate NFT mint
- If new: mints on-chain, returns agent ID, chain ID, and transaction hash

## Context Providers

Providers inject context into the agent's system prompt for every incoming message.

### `wallet-provider`

Injects the KeeperHub wallet state so the agent knows its balance before taking action.

```
KeeperHub Wallet:
- Address: 0x1234...abcd    ← truncated — full address not leaked into logs
- Provider: turnkey
- Active: true

Token Balances:
- USDC: 45.23 (~$45.23)
- ETH: 0.12 (~$380.00)
```

Zero-balance tokens are filtered out. The address is truncated to `0xXXXX...xxxx` format to prevent full address leakage into conversation logs.

### `workflows-provider`

Injects a list of available workflows so the agent can suggest relevant automations without first calling the list action.

```
KeeperHub Workflows (5 available):
- Compound USDC on Aave (ID: wf_abc): Weekly compounding on Base
- Portfolio Rebalance (ID: wf_xyz): Rebalance ETH/USDC to target weights
...
```

Workflow names and descriptions are sanitized before injection (`/[`\[\]{}\\]/g → ""`) to prevent prompt injection via malicious workflow metadata.

Both providers fail gracefully — if the API is unavailable, they return a single fallback line rather than crashing the agent.

## Individual Factories

For custom plugin assembly:

```typescript
import {
  createExecuteWorkflowAction,
  createGenerateWorkflowAction,
  createCheckExecutionAction,
  createListWorkflowsAction,
  createRegisterAgentAction,
  createWalletProvider,
  createWorkflowsProvider,
} from "@keeperhub/elizaos";
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({ apiKey: "..." });
const allowedIds = new Set(["wf_abc", "wf_xyz"]);

const myPlugin = {
  name: "my-keeperhub-plugin",
  actions: [
    createExecuteWorkflowAction(kh, { allowedWorkflowIds: allowedIds }),
    createGenerateWorkflowAction(kh, { allowedWorkflowIds: allowedIds }),
    createCheckExecutionAction(kh),
  ],
  providers: [createWalletProvider(kh)],
  evaluators: [],
  services: [],
};
```
