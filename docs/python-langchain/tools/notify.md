# keeperhub_notify

Send a notification through email, Slack, Discord, Telegram, or a custom webhook.

## What It Does

Delivers a message via a configured notification channel. Useful for alerting users after a workflow completes, a transaction is confirmed, or a condition is met. Supports structured `data` payload alongside the human-readable `message`.

## Schema

```
channel: str   — Notification target. One of: "email", "slack", "discord", "telegram", or a full webhook URL.
message: str   — Human-readable notification text.
data?: dict    — Optional structured payload to include alongside the message (e.g. tx details, amounts).
```

## Python Example

```python
import asyncio
from keeperhub_langchain import KeeperHubToolkit

toolkit = KeeperHubToolkit()
tool = toolkit.get_tool("keeperhub_notify")

async def main():
    # Email notification
    result = await tool._arun(
        channel="email",
        message="Your Aave supply of 100 USDC on Base has completed.",
        data={"txHash": "0x4a2f8c1e...9d3b", "amount": "100 USDC", "protocol": "Aave V3"}
    )
    print(result)

    # Telegram notification
    result = await tool._arun(
        channel="telegram",
        message="ETH price alert: ETH is now above $3,500.",
        data={"price": "3501.22", "timestamp": "2026-05-03T10:00:00Z"}
    )
    print(result)

    # Custom webhook
    result = await tool._arun(
        channel="https://hooks.example.com/my-webhook-id",
        message="Workflow completed successfully.",
        data={"workflowId": "wf_a1b2c3d4e5f6", "status": "completed"}
    )
    print(result)

asyncio.run(main())
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const notifyTool = tools.find(t => t.name === "keeperhub_notify")!;

const result = await notifyTool.invoke({
  channel: "slack",
  message: "DeFi rebalancing workflow completed.",
  data: { executionId: "exec_9z8y7x6w5v", duration: "47s" },
});
console.log(result);
```

## Example Output

```json
{
  "delivered": true,
  "channel": "email",
  "messageId": "msg_1a2b3c4d",
  "sentAt": "2026-05-03T10:01:00Z"
}
```

## Notes

- Notification channels must be configured in the KeeperHub dashboard under Settings → Integrations before use.
- For `"email"`, the notification is sent to the email address associated with your KeeperHub account.
- For `"slack"` and `"discord"`, a webhook URL must be configured in Settings.
- For `"telegram"`, a Telegram bot token and chat ID must be configured in Settings.
- Passing a full HTTPS URL as `channel` sends a raw HTTP POST with the message and data as JSON body.
- The `data` dict is included as a JSON block in the notification body (for Slack/Discord: as an attachment; for email: as a code block).
