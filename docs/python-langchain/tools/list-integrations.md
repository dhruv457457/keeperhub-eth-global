# keeperhub_list_integrations

List all configured integrations for the current KeeperHub project.

## What It Does
Returns all integrations currently configured in the project, grouped by category: wallets (agentic and connected), DeFi protocol connections, and notification channels. Use this to discover what resources are available before building or executing workflows, and to confirm that required wallets or notification channels are set up.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters required |

## Python Example
```python
result = await tool._arun()
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What integrations do I have configured?" }]
});
```

## Example Output
```json
{
  "wallets": [
    {
      "address": "0xAbCd1234...",
      "label": "yield-bot-wallet",
      "type": "agentic"
    }
  ],
  "protocols": [
    { "id": "aave-v3", "name": "Aave V3", "network": "base" }
  ],
  "notifications": [
    { "channel": "slack", "configured": true },
    { "channel": "email", "configured": true }
  ]
}
```

## Notes
- Returns only integrations scoped to the authenticated project/API key.
- Use this before `keeperhub_provision_wallet` to check if a wallet already exists.
- An empty `notifications` array means no notification channels have been configured in the KeeperHub dashboard.
- Protocol integrations listed here are pre-configured connections; ad-hoc protocol calls do not require a listed integration.
