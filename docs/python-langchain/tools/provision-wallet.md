# keeperhub_provision_wallet

Create a new Turnkey-backed agentic wallet for use in automated workflows.

## What It Does
Provisions a new non-custodial wallet backed by Turnkey's secure enclave infrastructure. Returns the wallet address and sub-organization ID that can be used for subsequent signing and transaction operations. Each provisioned wallet is isolated under its own sub-org for key management.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| label | str | no | Human-readable label for the wallet (e.g. "yield-bot-wallet") |

## Python Example
```python
result = await tool._arun(label="yield-bot-wallet")
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Create a new agentic wallet labeled yield-bot-wallet" }]
});
```

## Example Output
```json
{
  "wallet_address": "0xAbCd1234...",
  "sub_org_id": "sub-org-uuid-5678"
}
```

## Notes
- WARNING: Only call this tool when the user explicitly asks to create a new wallet. Do not call proactively.
- Always call `keeperhub_wallet_balance` first to check if a wallet already exists before provisioning.
- Provisioning is irreversible — each call creates a new wallet and sub-org.
- Endpoint: POST /api/agentic-wallet/provision
