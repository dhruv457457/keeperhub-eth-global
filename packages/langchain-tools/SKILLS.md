# @keeperhub/langchain — Agent Skills Reference

This file describes the LangChain toolkit for AI agents. It covers every tool's exact schema, return shape, error behavior, and when to call it vs alternatives.

---

## What This Package Does

Provides 4 `DynamicStructuredTool` instances for LangChain / LangGraph agents that need to discover, execute, and generate KeeperHub onchain automation workflows. Also provides a `buildSystemPrompt()` that primes the agent with context about available capabilities and workflows.

---

## Setup

```typescript
import { KeeperHubToolkit } from "@keeperhub/langchain";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY,

  // Limit which tools are available
  tools: ["execute", "generate", "list", "check"], // default: all 4

  // Session tagging — all API calls tagged in KeeperHub dashboard
  agentContext: {
    sessionId: conversationId,
    goal: "Execute DeFi operations on user's behalf",
  },
});

const agent = await createReactAgent({
  llm,
  tools: toolkit.getTools(),
  messageModifier: await toolkit.buildSystemPrompt({ includeWorkflows: true }),
});
```

---

## Tool: `list_keeperhub_workflows`

**Use when:** The agent needs to discover what workflows exist before deciding whether to execute an existing one or generate a new one. Always call this first before `execute_keeperhub_workflow`.

**Input schema:**
```typescript
{
  projectId?: string, // filter by project folder
  tagId?: string,     // filter by tag
}
```

**Returns (JSON string):**
```json
[
  {
    "id": "wf_abc123",
    "name": "Weekly Compound",
    "description": "Compounds USDC rewards on Aave v3 every Monday",
    "visibility": "private",
    "updatedAt": "2026-04-25T14:00:00Z"
  }
]
```

**On error (JSON string):**
```json
{ "error": "Request failed with status 401" }
```

**Notes:**
- Names and descriptions are sanitized before return (backticks, brackets, braces, backslashes removed, truncated to 80 chars) — prompt injection defense
- Never throws — returns `{ error: "..." }` on any failure
- Returns empty array `[]` if no workflows exist

---

## Tool: `execute_keeperhub_workflow`

**Use when:** You have a workflow ID (from `list_keeperhub_workflows` or known ahead of time) and need to run it.

**DO NOT use** `generate_keeperhub_workflow` when a workflow already exists for the task.

**Input schema:**
```typescript
{
  workflowId: string, // REQUIRED — must match wf_[a-zA-Z0-9_-]{1,64} or UUID format
  input?: Record<string, string | number | boolean | null>, // max 8KB serialized
  wait?: boolean,      // default: true — wait for completion before returning
  mode?: "safe" | "fast", // default: "safe" — safe retries on failure
}
```

**Validation:** `workflowId` is regex-validated at schema level. Invalid formats are rejected by Zod before the API call.

**Returns on success (JSON string):**
```json
{
  "ok": true,
  "summary": "Workflow wf_abc123 completed successfully after 1 attempt. Execution ID: exec_xyz.",
  "executionId": "exec_xyz",
  "status": "completed",
  "attempts": 1,
  "transactionHash": "0xabc...",
  "gasUsedWei": "45230",
  "output": { ... }
}
```

**Returns on failure (JSON string):**
```json
{
  "ok": false,
  "summary": "Workflow wf_abc123 failed: execution timed out — check execution logs for exec_xyz.",
  "error": "Execution timed out after 120000ms",
  "isRetryable": true,
  "suggestion": "Check execution status separately using exec_xyz, then retry if appropriate"
}
```

**Agent behavior rules:**
1. Always surface `summary` to the user — it is written for human consumption
2. If `ok === false` and `isRetryable === true`: retry once after a delay, then give up
3. If `ok === false` and `isRetryable === false`: surface the error to the user, do not retry
4. Never calls `generate_keeperhub_workflow` as a fallback when execution fails — that creates a duplicate workflow

**Never throws** — always returns a string, even on network failure.

---

## Tool: `generate_keeperhub_workflow`

**Use when:** `list_keeperhub_workflows` returned no suitable workflow for the user's task, and you need to create one from a natural-language description.

**DO NOT use** when a suitable workflow already exists — use `execute_keeperhub_workflow` instead.

**Input schema:**
```typescript
{
  prompt: string,   // REQUIRED — max 1000 chars, trimmed
  execute?: boolean, // default: false — if true, generates AND executes immediately
  executionInput?: Record<string, string | number | boolean | null>, // max 8KB
  context?: string,  // optional — wallet/protocol context, max 500 chars
}
```

**Returns when `execute: false` (generate only, JSON string):**
```json
{
  "generated": true,
  "executed": false,
  "workflowId": "wf_new123",
  "name": "Weekly Compound USDC",
  "description": "Compounds USDC rewards on Aave v3 every Monday at 9am UTC",
  "hint": "To execute, call execute_keeperhub_workflow with workflowId=\"wf_new123\""
}
```

**Returns when `execute: true` (generate + execute, JSON string):**
```json
{
  "generated": true,
  "executed": true,
  "executionId": "exec_abc",
  "status": "completed"
}
```

**Agent behavior rules:**
1. When `execute: false`: follow up by calling `execute_keeperhub_workflow` with the returned `workflowId`
2. When `execute: true`: the workflow is already running, check `status` directly
3. If `executionId` is `null` in the `execute: true` response, the status is likely `"pending_approval"` — ask the user to approve payment

---

## Tool: `check_keeperhub_execution`

**Use when:** The user asks about the status of a running or past execution, or when `execute_keeperhub_workflow` returned `status: "running"` (fire-and-forget mode).

**Input schema:**
```typescript
{
  executionId: string,  // REQUIRED — must match exec_[a-zA-Z0-9_-]{1,64} or UUID format
  includeLogs?: boolean, // default: false — set true when debugging a failure
}
```

**Returns on success (JSON string):**
```json
{
  "executionId": "exec_abc",
  "status": "completed",
  "progress": {
    "totalSteps": 3,
    "completedSteps": 3,
    "percentage": 100,
    "currentNodeName": null
  },
  "error": null,
  "failedNodeId": null,
  "logs": [
    { "step": "Swap USDC", "status": "success", "durationMs": 1240, "txHash": "0x..." },
    { "step": "Supply to Aave", "status": "success", "durationMs": 3450, "txHash": "0x..." }
  ]
}
```

**Returns on auth/not-found error (JSON string):**
```json
{ "error": "Execution not found or not accessible with your API key." }
```

**Note:** 401 and 404 errors return the same generic message — no execution ID enumeration.

**Agent behavior rules:**
1. If `status` is `"running"`: call again after 5-10 seconds
2. If `status` is `"failed"` or `"error"`: call with `includeLogs: true` to get step-level detail
3. If `failedNodeId` is present: report the specific failing step to the user

---

## `toolkit.getTools()` — Selective Loading

```typescript
// Read-only toolkit (no execution or generation)
const toolkit = new KeeperHubToolkit({
  apiKey: "kh_...",
  tools: ["list", "check"],
});

// Full toolkit
const toolkit = new KeeperHubToolkit({ apiKey: "kh_..." }); // all 4 by default
```

Available keys: `"execute"`, `"generate"`, `"list"`, `"check"`.

---

## `toolkit.buildSystemPrompt(options?)` — System Prompt Generator

Generates a system prompt fragment that describes KeeperHub capabilities. Uses `kh.capabilities()` from the core SDK — stays in sync automatically as new capabilities are added.

```typescript
const prompt = await toolkit.buildSystemPrompt({
  includeWorkflows: true, // default: true — fetches and injects live workflow list
});
```

**Prompt structure:**
```
You have access to KeeperHub — an onchain workflow automation platform.
...
Capabilities (use these to decide which tool to call):
- execute_workflow [workflows]: Execute an existing workflow by ID and wait for completion.
- generate_and_run_workflow [workflows]: Generate a new workflow from a natural-language prompt...
- transfer_tokens [web3]: Transfer native token or ERC-20 tokens to a recipient address.
[... all 16 capabilities ...]

When a user asks to perform an onchain action:
1. First list workflows to see if one already exists
2. If not, generate one from their description
3. Execute it with the appropriate inputs
4. Check status if they ask about progress
5. If execute returns ok=false with isRetryable=true, retry once before giving up
6. Always surface the summary field to the user — it is written for human consumption

Available workflows (3):
- Weekly Compound [wf_abc]: Compound USDC rewards every Monday
[... live list, sanitized ...]
```

---

## Individual Factory Functions

Use when integrating KeeperHub tools alongside tools from other sources:

```typescript
import {
  createExecuteWorkflowTool,
  createGenerateWorkflowTool,
  createListWorkflowsTool,
  createCheckExecutionTool,
} from "@keeperhub/langchain";
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({ apiKey: "kh_..." });

const tools = [
  createExecuteWorkflowTool(kh),
  createListWorkflowsTool(kh),
  myOtherTool,
];
```

---

## Agent Reasoning Guide

**Standard flow for "execute an onchain action" requests:**
```
1. Call list_keeperhub_workflows
   → If matching workflow found → call execute_keeperhub_workflow(id)
   → If no match → call generate_keeperhub_workflow(prompt, execute: false)
                   → then call execute_keeperhub_workflow(returned workflowId)

2. If execute returns ok: false, isRetryable: true → retry once after 5s
3. If execute returns ok: false, isRetryable: false → surface error.message to user
4. Always show obs.summary to user (it is pre-formatted for human consumption)
```

**When to use `execute: true` in generate:**
- Only when the user explicitly wants immediate execution AND you are confident about the workflow intent
- Prefer `execute: false` + a separate `execute_keeperhub_workflow` call — gives the agent a chance to confirm the generated workflow before running

**Tool selection by user intent:**

| User says | Tool to call |
|---|---|
| "What automations do I have?" | `list_keeperhub_workflows` |
| "Run my compound workflow" | `list` → find ID → `execute_keeperhub_workflow` |
| "Create a workflow to..." | `generate_keeperhub_workflow` |
| "What's the status of exec_abc?" | `check_keeperhub_execution` |
| "Run the workflow I just generated" | `execute_keeperhub_workflow(workflowId)` |
| "Did it work?" | `check_keeperhub_execution(executionId)` |
