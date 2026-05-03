# keeperhub_provision_wallet

Create a new Turnkey-backed agentic wallet for the project.

## What It Does
Provisions a new non-custodial wallet secured by Turnkey's secure enclave infrastructure. Returns the wallet address and sub-organization ID. Each provisioned wallet is isolated under its own Turnkey sub-org for independent key management and signing authority.

## Schema
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters required (empty object `{}`) |

## Python Example
```python
result = await tool._arun()
print(result)
```

## TypeScript Example
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "Create a new agentic wallet for my project" }]
});
```

## Example Output
```json
{
  "wallet_address": "0xAbCd1234567890EfGh...",
  "sub_org_id": "sub-org-uuid-abcd-1234"
}
```

## Notes
- WARNING: Only call this tool when the user explicitly asks to create a new wallet.
- Always call `keeperhub_wallet_balance` or `keeperhub_list_integrations` first to check if a wallet already exists.
- Provisioning is irreversible — each call creates a distinct wallet with a new sub-org.
- The provisioned wallet address must be funded with ETH before it can submit transactions.
