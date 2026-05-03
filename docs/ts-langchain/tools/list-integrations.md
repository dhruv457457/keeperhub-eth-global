# keeperhub_list_integrations

List all configured integrations for the current KeeperHub project.

## What It Does
Returns all integrations currently set up in the project, grouped into three categories: wallets (agentic and externally connected), DeFi protocol connections, and notification channels. Use this to discover available resources before building or executing workflows, and to confirm that required wallets or channels are configured.

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
  messages: [{ role: "user", content: "What integrations are configured in my project?" }]
});
```

## Example Output
```json
{
  "wallets": [
    {
      "address": "0xAbCd1234...",
      "label": "main-agent-wallet",
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
- Always call this (or `keeperhub_wallet_balance`) before `keeperhub_provision_wallet` to check if a wallet already exists.
- An empty `notifications` array indicates no channels have been configured in the dashboard.
- Protocol entries here are pre-configured connections; you can call most protocols without a listed integration.
