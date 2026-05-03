# KEEPERHUB_GENERATE_WORKFLOW

Generate a KeeperHub workflow from a natural language description.

## What It Does

Extracts a workflow description from the user's message and sends it to the KeeperHub AI workflow builder. The generated workflow is saved to the account. The action can optionally execute the workflow immediately if the user requests it.

## Trigger Phrases

The action matches messages containing:
- "create a workflow" (e.g. "create a workflow that supplies USDC to Aave daily")
- "automate" (e.g. "automate my DeFi rebalancing")
- "build workflow" (e.g. "build a workflow for cross-chain bridging")
- "set up automation"
- "create an automation"

## Schema

```typescript
// Extracted from message — no explicit parameters required
{
  prompt: string     // Extracted workflow description. Max 1000 characters.
  execute?: boolean  // True if user says "and run it" or "execute it now"
  context?: string   // Additional constraints extracted from message
}
```

## Example Conversation

```
User: Create a workflow that supplies 100 USDC to Aave V3 on Base every Monday

Agent: I'll build that workflow for you.

Generated: "Weekly USDC Aave Supply on Base"
• Nodes: 3 (trigger, aave-v3-supply, notify)
• Workflow ID: wf_a1b2c3d4e5f6

The workflow has been saved. Would you like me to run it now, or schedule it?
```

## Example Output (action result)

```json
{
  "workflowId": "wf_a1b2c3d4e5f6",
  "name": "Weekly USDC Aave Supply on Base",
  "description": "Supply 100 USDC to Aave V3 on Base every Monday.",
  "nodeCount": 3,
  "nodes": ["schedule-trigger", "aave-v3-supply", "notify-email"],
  "executionId": null,
  "status": "saved"
}
```

## Notes

- The prompt passed to the workflow builder is limited to 1000 characters. Longer messages are truncated with the most important details preserved.
- The action does **not** pre-resolve token symbols to 0x addresses automatically (unlike the TS LangChain package with `keeperhub_token_address`). For best results, include explicit contract addresses in your message, or use well-known token names that the builder recognizes (USDC, WETH, DAI, etc.).
- If the user's message includes "run it now", "execute it", or similar phrases, `execute` is set to `true` and the workflow starts immediately after generation.
- The action will ask for confirmation before executing a workflow that involves on-chain writes.
