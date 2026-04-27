# @keeperhub/elizaos — Agent Skills Reference

This file describes the ElizaOS plugin for AI agents that need to understand its capabilities, trigger conditions, action behavior, and constraints.

---

## What This Plugin Does

Gives an ElizaOS agent the ability to:
- List, execute, and generate KeeperHub onchain automation workflows
- Check execution status and logs
- Register itself on-chain as an ERC-8004 agent identity
- Inject live wallet balance and workflow context into every conversation

---

## Setup

```typescript
import { createKeeperHubPlugin } from "@keeperhub/elizaos";

const plugin = createKeeperHubPlugin({
  apiKey: process.env.KEEPERHUB_API_KEY,

  // Security: only these workflow IDs can be executed via chat
  allowedWorkflowIds: ["wf_abc123", "wf_xyz456"],

  // Session tagging — surfaced in KeeperHub dashboard
  agentContext: {
    sessionId: runtime.agentId,
    goal: character.bio[0],
  },

  // Disable providers if context injection is not needed
  enableWalletProvider: true,   // default: true
  enableWorkflowsProvider: true, // default: true
});

// In AgentRuntime:
plugins: [plugin]
```

---

## Actions

### `EXECUTE_KEEPERHUB_WORKFLOW`

**Triggered by:** Message containing a `wf_xxx` ID + execution intent ("run", "execute", "trigger", "start").

**What it does:**
1. Extracts `wf_[a-zA-Z0-9_-]{1,64}` from message text via regex — only this format is matched
2. Extracts JSON input from ` ```json ``` ` blocks or `input: {...}` patterns
3. Checks allowlist if configured — rejects at both validate and handler time
4. Rejects input > 8KB with a clear user message (does NOT silently drop to `{}`)
5. Emits progress callbacks every step change (`🔄 2/5: Swap USDC…`) — no silent 2-minute waits
6. Uses `kh.tryRun()` — never throws, never crashes the agent loop

**Trigger examples:**
```
"Run workflow wf_abc123"
"Execute wf_xyz with input: {"amount": "100"}"
"Trigger wf_abc123 ```json {"asset": "USDC", "amount": "1000"} ```"
```

**Allowlist behavior:**
- If `allowedWorkflowIds` is set: any `wf_xxx` ID not in the set is ignored at validate time — no error shown, action simply doesn't fire
- If not set: any `wf_xxx` ID in the message is executable

**Callbacks emitted:**
```
"⚙️ Executing KeeperHub workflow `wf_abc123` with provided inputs…"
"🔄 1/3: Swap USDC…"
"🔄 2/3: Supply to Aave…"
"✅ Workflow `wf_abc123` finished with status completed.
🔗 Transaction: `0xabc...`
⛽ Gas used: 45230 wei
🔁 Attempts: 1"
```

On failure:
```
"❌ Workflow wf_abc123 failed: execution timed out (retryable)"
```

---

### `GENERATE_KEEPERHUB_WORKFLOW`

**Triggered by:** Workflow-creation phrases — "create a workflow", "generate a workflow", "build a workflow", "automate", "create automation", "new workflow".

**What it does:**
1. Extracts intent from message (strips "create a workflow to", "automate", etc.)
2. Enforces 1000-character prompt limit — rejects with message if exceeded
3. If `execute: true` in action options AND `allowedWorkflowIds` is NOT set: generates and immediately executes
4. If `allowedWorkflowIds` is set: generate-and-execute path is blocked (generated IDs not in the list)
5. Uses `pipeline().generate().safeWait()` — `pending_approval` status is surfaced explicitly
6. Emits progress callbacks during execution

**Trigger examples:**
```
"Create a workflow to compound my Aave USDC rewards every Monday"
"Generate a workflow that monitors my vault health factor"
"Automate weekly portfolio rebalancing"
"Build me an onchain automation for token swaps"
```

**Callbacks emitted (generate only):**
```
"🧠 Generating KeeperHub workflow for: "compound my Aave USDC..."…"
"✅ Workflow created: Weekly Compound
🆔 ID: `wf_abc123`
📝 Compounds USDC rewards on Aave v3 every Monday
To run it, say: "Execute workflow wf_abc123""
```

**Callbacks emitted (generate + execute):**
```
"🧠 Generating KeeperHub workflow for: "..."…"
"🔄 1/2: Generate workflow spec…"
"🔄 2/2: Execute on Aave…"
"✅ Workflow generated and executed successfully!
📋 Execution ID: `exec_abc`
📊 Status: completed"
```

**`pending_approval` response:**
```
"⏸ Execution paused — payment approval required. Estimated cost: 0.05 USDC. Approval URL: https://..."
```

---

### `CHECK_KEEPERHUB_EXECUTION`

**Triggered by:** Status-check phrases + execution ID.
- Phrases: "check execution", "execution status", "status of execution", "what happened with", "how is execution", "get logs", "show logs"
- ID formats: `exec_[a-zA-Z0-9_-]+` or UUID `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**What it does:**
- Fetches execution status and optional logs
- Returns sanitized progress info
- For auth/not-found errors: returns `"Execution not found or not accessible with your API key."` — does NOT reveal whether the ID exists (prevents enumeration)

**Trigger examples:**
```
"Check execution status exec_abc123"
"What happened with exec_xyz"
"Show logs for exec_abc"
"Get execution status for 550e8400-e29b-41d4-a716-446655440000"
```

**Callbacks emitted:**
```
"✅ Execution `exec_abc123` — completed
📊 Progress: 3/3 steps (100%)
🔧 Current step: Complete
```
With logs:
```
✅ Execution `exec_abc123` — completed

Step logs:
✅ `Swap USDC` — completed (1240ms)
✅ `Supply to Aave` — completed (3450ms)
   🔗 tx: `0xabc...`"
```

---

### `LIST_KEEPERHUB_WORKFLOWS`

**Triggered by:** Listing phrases — ("list" OR "show" OR "what" OR "available") AND ("workflow" OR "automation").

**What it does:**
- Fetches all workflows for the org
- Returns up to 15 with name, ID, optional description
- Tells user the exact phrase to execute any listed workflow

**Callbacks emitted:**
```
"📋 5 workflows available:

• Weekly Compound — `wf_abc`
  Compounds USDC rewards on Aave every Monday
• Portfolio Rebalance — `wf_xyz`
  ...

To run one, say: "Execute workflow wf_xxx""
```

---

### `REGISTER_KEEPERHUB_AGENT`

**Triggered by:** ERC-8004 registration phrases — "register agent", "register on chain", "register onchain", "onchain identity", "erc-8004", "agent registry", "register myself".

**What it does:**
1. Calls `kh.agent.getRegistrations()` first to check for existing identity
2. If already registered: returns existing identity, skips minting — NO duplicate NFT
3. If not registered: calls `kh.agent.register()`, mints ERC-8004 NFT on-chain

**Callbacks emitted (new registration):**
```
"🔗 Registering AgentName on-chain via KeeperHub ERC-8004 registry…"
"✅ Agent registered on-chain!
🆔 Agent ID: `agent_abc123`
⛓ Chain ID: 1
🔗 Transaction: `0xabc...`
📅 Registered: 2026-04-25T14:23:00.000Z"
```

**Callbacks emitted (already registered):**
```
"✅ AgentName is already registered on-chain.
🆔 Agent ID: `agent_abc123`
⛓ Chain ID: 1
📅 Originally registered: 2026-04-20T09:00:00.000Z"
```

---

## Context Providers

Providers run on every incoming message and inject context into the agent's system prompt.

### `wallet-provider`

Injects:
```
KeeperHub Wallet:
- Address: 0x1234...abcd   ← truncated, not full address
- Provider: turnkey
- Active: true

Token Balances:
- USDC: 45.23 (~$45.23)
- ETH: 0.12 (~$380.00)
```

- Zero-balance tokens are filtered out
- Address is truncated to `0xXXXX...xxxx` — full address not leaked into logs
- On API failure: returns `"KeeperHub Wallet: (unavailable — check API key)"` — does not crash

### `workflows-provider`

Injects up to 20 workflows with sanitized names and descriptions:
```
KeeperHub Workflows (5 available):
- Weekly Compound (ID: wf_abc): Compound USDC rewards every Monday
- Portfolio Rebalance (ID: wf_xyz): Rebalance to target weights
...
```

- Names/descriptions sanitized: backticks, brackets, braces, backslashes removed, truncated to 80 chars
- On API failure: returns `"KeeperHub Workflows: (unavailable — check API key)"` — does not crash

---

## Security Constraints

| Constraint | Behavior |
|---|---|
| `allowedWorkflowIds` set | Only listed IDs can be executed; generate-and-execute path also blocked |
| JSON input > 8KB | Rejected with user message, NOT silently dropped |
| Prompt > 1000 chars | Rejected with user message |
| `__proto__` in nested JSON input | Stripped via JSON round-trip before processing |
| Workflow metadata in context | Sanitized before injection — prompt injection defense |
| `getStatus` 404/401 | Returns generic "not found or not accessible" — no ID enumeration |

---

## Individual Factory Functions

For custom plugin assembly without the full factory:

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

const kh = new KeeperHub({ apiKey: "kh_..." });
const allowed = new Set(["wf_abc", "wf_xyz"]);

const plugin = {
  name: "custom-keeperhub",
  actions: [
    createExecuteWorkflowAction(kh, { allowedWorkflowIds: allowed }),
    createGenerateWorkflowAction(kh, { allowedWorkflowIds: allowed }),
    createCheckExecutionAction(kh),
  ],
  providers: [createWalletProvider(kh)],
  evaluators: [],
  services: [],
};
```
