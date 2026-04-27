---
title: "Framework Integrations"
description: "First-class integrations for LangChain and ElizaOS — add KeeperHub to any AI agent in minutes."
---

# Framework Integrations

The SDK ships two ready-to-use framework integrations. Both wrap the same `keeperhub-sdk` core and expose identical functionality — the same workflows, payments, and agent-native APIs — in each framework's native pattern.

| Integration | Package | Agent Framework | Install |
|---|---|---|---|
| LangChain Toolkit | `@keeperhub/langchain` | LangChain / LangGraph | `npm install @keeperhub/langchain` |
| ElizaOS Plugin | `@keeperhub/elizaos` | ElizaOS | `npm install @keeperhub/elizaos` |

## Capability Comparison

| Capability | LangChain | ElizaOS |
|---|---|---|
| List workflows | `list_keeperhub_workflows` tool | `LIST_KEEPERHUB_WORKFLOWS` action |
| Execute workflow | `execute_keeperhub_workflow` tool | `EXECUTE_KEEPERHUB_WORKFLOW` action |
| Generate workflow from prompt | `generate_keeperhub_workflow` tool | `GENERATE_KEEPERHUB_WORKFLOW` action |
| Check execution status | `check_keeperhub_execution` tool | `CHECK_KEEPERHUB_EXECUTION` action |
| Register agent on-chain (ERC-8004) | — | `REGISTER_KEEPERHUB_AGENT` action |
| Wallet context in system prompt | `buildSystemPrompt()` | `wallet-provider` context provider |
| Workflows context in system prompt | `buildSystemPrompt()` | `workflows-provider` context provider |
| Workflow allowlist | — | `allowedWorkflowIds` option |
| Agent context session tagging | `agentContext` config | `agentContext` config |

## Shared Design Principles

**Tools never throw.** Both integrations catch all errors and return them as strings (LangChain) or callback messages (ElizaOS). The agent loop never crashes from a failed workflow execution.

**Progress callbacks.** Long-running workflow executions (up to 2 minutes) emit intermediate step messages so users see activity rather than silence.

**Prompt injection defense.** Workflow names and descriptions from the API are sanitized before injection into system prompts or context providers.

**Allowlist enforcement.** When `allowedWorkflowIds` is configured in the ElizaOS plugin, it gates both the execute action AND the generate-and-execute path — a freshly generated workflow cannot bypass the list.

## Choosing an Integration

Use **LangChain** when:
- Building a ReAct or tool-use agent with LangChain / LangGraph
- You want structured JSON tool responses the LLM can reason about
- You need a `buildSystemPrompt()` to inject KeeperHub context at session start

Use **ElizaOS** when:
- Building a character-based conversational agent
- Users interact through chat (Discord, Telegram, web)
- You want the agent to respond to natural-language phrases like "execute workflow wf_abc" without explicit tool calls

Both integrate with the same KeeperHub account and API key.

## Detailed Guides

- [LangChain Integration](/sdk/framework-integrations/langchain)
- [ElizaOS Integration](/sdk/framework-integrations/elizaos)
