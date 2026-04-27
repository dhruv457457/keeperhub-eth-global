---
title: "LangChain Integration"
description: "KeeperHubToolkit for LangChain — 4 structured tools and a system prompt builder for ReAct agents."
---

# LangChain Integration

`@keeperhub/langchain` provides a `KeeperHubToolkit` that bundles 4 `DynamicStructuredTool` instances for use with any LangChain or LangGraph agent.

## Install

```bash
npm install @keeperhub/langchain keeperhub-sdk
```

## Setup

```typescript
import { KeeperHubToolkit } from "@keeperhub/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY,
  agentContext: {
    sessionId: sessionId,
    goal: "Execute DeFi operations on behalf of the user",
  },
});

const tools = toolkit.getTools();
const systemPrompt = await toolkit.buildSystemPrompt({ includeWorkflows: true });

const agent = await createReactAgent({
  llm: new ChatOpenAI({ model: "gpt-4o-mini" }),
  tools,
  messageModifier: systemPrompt,
});
```

## Tools

### `list_keeperhub_workflows`

Lists available KeeperHub workflows for the authenticated org. Returns workflow IDs, names, and descriptions — sanitized before injection into LLM context.

**Schema:**
```typescript
{ projectId?: string, tagId?: string }
```

**Returns:** JSON array of `{ id, name, description, visibility, updatedAt }`

### `execute_keeperhub_workflow`

Executes a workflow by ID. Uses `kh.tryRun()` internally — never throws, always returns a structured response including `ok`, `summary`, `isRetryable`, and `suggestion`.

**Schema:**
```typescript
{
  workflowId: string, // regex-validated: wf_xxx or UUID format
  input?: Record<string, string | number | boolean | null>, // max 8KB
  wait?: boolean,     // default true
  mode?: "safe" | "fast", // default "safe"
}
```

**Returns:**
```json
{
  "ok": true,
  "summary": "Workflow completed successfully after 1 attempt. Execution ID: exec_abc.",
  "executionId": "exec_abc",
  "status": "completed",
  "attempts": 1,
  "transactionHash": "0x..."
}
```

On failure:
```json
{
  "ok": false,
  "summary": "Workflow wf_abc failed: execution timed out — check execution logs.",
  "error": "Execution timed out",
  "isRetryable": true,
  "suggestion": "Check execution status separately using exec_abc"
}
```

### `generate_keeperhub_workflow`

Generates a workflow from a natural-language prompt. Optionally executes it immediately.

**Schema:**
```typescript
{
  prompt: string,            // max 1000 chars
  execute?: boolean,         // default false
  executionInput?: Record<string, string | number | boolean | null>,
  context?: string,          // max 500 chars — wallet/protocol context
}
```

### `check_keeperhub_execution`

Checks the status and progress of an execution. Returns structured JSON with status, progress, and optional step-level logs.

**Schema:**
```typescript
{
  executionId: string, // regex-validated: exec_xxx or UUID format
  includeLogs?: boolean,
}
```

Auth/not-found errors return a generic message — no execution ID enumeration.

## `buildSystemPrompt(options?)`

Generates a system prompt fragment that describes KeeperHub capabilities. Uses `kh.capabilities()` internally so the prompt stays in sync with the SDK.

```typescript
const prompt = await toolkit.buildSystemPrompt({ includeWorkflows: true });
// Includes: tool descriptions, all 16 capabilities by category,
// agent reasoning guide, and a live list of the org's workflows (sanitized)
```

Sample output:
```
You have access to KeeperHub — an onchain workflow automation platform.
...
Capabilities (use these to decide which tool to call):
- execute_workflow [workflows]: Execute an existing workflow by ID and wait for completion.
- generate_and_run_workflow [workflows]: Generate a new workflow from a natural-language prompt...
- transfer_tokens [web3]: Transfer native token or ERC-20 tokens to a recipient address.
...

When a user asks to perform an onchain action:
1. First list workflows to see if one already exists
2. If not, generate one from their description
3. Execute it with the appropriate inputs
4. Check status if they ask about progress
5. If execute returns ok=false with isRetryable=true, retry once before giving up
6. Always surface the summary field to the user — it is written for human consumption

Available workflows (3):
- Compound USDC on Aave [wf_abc]: Weekly compounding strategy on Base
...
```

## Selective Tool Loading

```typescript
const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY,
  tools: ["list", "check"], // read-only — no execution or generation
});
```

Available keys: `"execute"`, `"generate"`, `"list"`, `"check"`.

## Individual Tool Factories

Use individual factories to mix KeeperHub tools with tools from other sources:

```typescript
import {
  createExecuteWorkflowTool,
  createListWorkflowsTool,
} from "@keeperhub/langchain";
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({ apiKey: "..." });
const tools = [
  createExecuteWorkflowTool(kh),
  createListWorkflowsTool(kh),
  myOtherTool,
];
```
