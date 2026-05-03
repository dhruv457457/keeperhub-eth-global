# KEEPERHUB_PROVISION_WALLET

Create a new Turnkey-backed agentic wallet for the KeeperHub project.

## What It Does
Provisions a new non-custodial wallet secured by Turnkey's secure enclave infrastructure. Each provisioned wallet is isolated under its own sub-organization for independent key management. Returns the wallet address and sub-org ID for use in subsequent actions.

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
  messages: [{ role: "user", content: "Create a new agentic wallet" }]
});
```

## Example Output
```json
{
  "wallet_address": "0xAbCd1234567890...",
  "sub_org_id": "sub-org-uuid-abcd-1234"
}
```

## Notes
- Trigger phrases: "create wallet", "new wallet", "provision wallet", "set up a wallet"
- WARNING: Only trigger when the user explicitly asks to create a wallet — never call proactively.
- Always check for an existing wallet first using the wallet_balance action before provisioning.
- Each call creates a new, distinct wallet; provisioning is not reversible.
- The new wallet must be funded with ETH before it can send transactions.
