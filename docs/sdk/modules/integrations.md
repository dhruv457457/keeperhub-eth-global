# kh.integrations

List configured integrations — wallets, protocols, notification channels.

## Methods

### `kh.integrations.list()`
```typescript
const integrations = await kh.integrations.list();
// {
//   wallets: [{ id, name, address, chainId }],
//   protocols: [{ id, name, actionType }],
//   notifications: [{ id, channel, name }]
// }
```

## Example Output

```json
{
  "wallets": [
    { "id": "w_abc", "name": "Main Wallet", "address": "0x554b...", "chainId": 8453 }
  ],
  "protocols": [
    { "id": "p_aave", "name": "Aave V3", "actionType": "aave-v3/supply" }
  ],
  "notifications": [
    { "id": "n_slack", "channel": "slack", "name": "Team Slack" }
  ]
}
```

## Use Case

Call this first to check which notification channels are available before calling `keeperhub_notify`.
