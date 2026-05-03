# keeperhub_notify

Send a notification message to a configured channel.

## What It Does
Dispatches a notification message to a specified channel such as email, Slack, Discord, Telegram, or a custom webhook URL. Use this to alert users when workflow conditions are met, transactions complete, or errors occur. Supports attaching structured data payloads for rich message formatting.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| channel | string | yes | Notification channel. Built-in: `"email"`, `"slack"`, `"discord"`, `"telegram"`. Or a full webhook URL |
| message | string | yes | Text content of the notification |
| data | object | no | Optional structured data to attach (rendered as JSON in the notification) |

## Python Example
```python
result = await tool._arun(
    channel="slack",
    message="Yield rebalancer completed: moved 500 USDC to Aave V3",
    data={"tx_hash": "0xabc123", "newApy": "5.8%"}
)
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Send a Slack notification that the rebalancing workflow completed" }]
});
```

## Example Output
```json
{
  "ok": true,
  "channel": "slack",
  "deliveredAt": "2026-05-03T12:01:00Z"
}
```

## Notes
- Built-in channels (`email`, `slack`, `discord`, `telegram`) must be configured in the KeeperHub dashboard before use.
- Use `keeperhub_list_integrations` to check which notification channels are configured.
- Custom webhook URLs are supported directly — no prior configuration needed.
- `data` is serialized as JSON and appended to the notification body; keep it concise for readability.
