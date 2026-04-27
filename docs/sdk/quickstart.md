---
title: "Quickstart"
description: "Install the KeeperHub SDK and execute your first onchain workflow in under 5 minutes."
---

# Quickstart

## 1. Install

```bash
npm install keeperhub-sdk
```

## 2. Get an API Key

1. Log in at [app.keeperhub.com](https://app.keeperhub.com)
2. Go to **Settings → API Keys → Organisation tab**
3. Click **New API Key**, name it, copy it immediately

Store it as `KEEPERHUB_API_KEY` in your environment.

## 3. Initialize

```typescript
import { KeeperHub } from "keeperhub-sdk";

const kh = new KeeperHub({
  apiKey: process.env.KEEPERHUB_API_KEY,
});
```

## 4. Run your first workflow

```typescript
// List your workflows
const workflows = await kh.workflows.list();
console.log(workflows.map(w => `${w.name} — ${w.id}`));

// Execute one and wait for it to complete
const result = await kh.run("wf_your_workflow_id", { wait: true });
console.log(result.status); // "completed"
```

## 5. Generate a workflow from a prompt (AI)

```typescript
const result = await kh
  .pipeline()
  .generate("Check ETH balance of 0xAbC... and send a Discord alert if below 0.1 ETH")
  .wait({ timeout: 60_000 });

console.log(`Execution: ${result.executionId}, Status: ${result.status}`);
```

## Agent-safe execution (never throws)

For AI agents that must not crash their loop on errors:

```typescript
const obs = await kh.tryRun("wf_abc123");

if (obs.ok) {
  console.log(obs.summary); // LLM-ready result text
} else {
  console.log(obs.error?.isRetryable);     // should I retry?
  console.log(obs.error?.suggestedAction); // what to do next
}
```

## Framework integrations

**LangChain:**
```typescript
import { KeeperHubToolkit } from "@keeperhub/langchain";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const agent = await createReactAgent({ llm, tools: toolkit.getTools() });
```

**ElizaOS:**
```typescript
import { createKeeperHubPlugin } from "@keeperhub/elizaos";

// In your AgentRuntime:
plugins: [createKeeperHubPlugin({ apiKey: process.env.KEEPERHUB_API_KEY })]
```

## Next steps

- [Pipeline API](/sdk/pipeline) — fluent execution with payment guardrails
- [Payments](/sdk/payments) — how x402 and MPP work
- [Agent-Native APIs](/sdk/agent-native) — designed for autonomous agents
