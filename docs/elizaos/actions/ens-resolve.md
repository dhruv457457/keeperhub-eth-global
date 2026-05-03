# KEEPERHUB_ENS_RESOLVE

Resolve an ENS name to its underlying Ethereum address.

## What It Does

Automatically detects `.eth` names in user messages and resolves them to their 0x Ethereum addresses using the ENS mainnet registry. Useful before transfer operations or when the user asks what address a name maps to.

## Trigger Phrases

The action matches any message containing a string ending in `.eth`, including:
- Direct questions: "what address is vitalik.eth?"
- Transfer context: "send ETH to bob.eth" (resolved before the transfer action runs)
- Lookup requests: "resolve uniswap.eth", "look up alice.eth"

## Schema

```typescript
// Extracted from message — no explicit parameters required
{
  name: string  // ENS name detected in the message (e.g. "vitalik.eth")
}
```

## Example Conversation

```
User: What address is vitalik.eth?

Agent: Resolving vitalik.eth...

ENS Resolution:
• Name: vitalik.eth
• Address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
• Resolved via: Ethereum Mainnet ENS Registry
```

### Used Implicitly During Transfer

```
User: Send 0.01 ETH to vitalik.eth on Base

Agent: Resolving vitalik.eth... → 0xd8dA6BF...96045

Sending 0.01 ETH to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on Base...
```

## Example Output (action result)

```json
{
  "name": "vitalik.eth",
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "resolvedAt": "2026-05-03T10:05:00Z"
}
```

## Notes

- Resolution always uses Ethereum mainnet ENS registry (chain 1), regardless of the target network for other operations.
- If the name is not registered or has no resolver, the action returns an error: `"ENS name not found: xyz.eth"`.
- ENS names are case-insensitive.
- The `KEEPERHUB_TRANSFER` action uses this resolver automatically when an ENS name is provided as the recipient.
- This action is read-only — it does not modify any on-chain state.
