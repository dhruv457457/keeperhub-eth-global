# keeperhub_register_agent (TypeScript)

Mint an ERC-8004 agent identity NFT on Base to give your AI agent an on-chain identity.

## What It Does

Mints a non-fungible token on the ERC-8004 Agent Registry contract on Base, establishing a verifiable on-chain identity for your AI agent. The operation is idempotent — if an NFT already exists for your managed wallet, the existing registration is returned without minting a new token. Requires approximately 0.001 ETH on the managed wallet for gas.

## Schema

```typescript
{
  name?: string           // Agent display name. Default: "KeeperHub Agent".
  description?: string    // Short description of the agent's purpose.
  capabilities?: string[] // Capability tags (e.g. ["defi", "cross-chain", "notifications"]).
}
```

### Contract Details

| Property | Value |
|---|---|
| Network | Base (chain ID 8453) |
| Contract | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Standard | ERC-8004 |
| Explorer | [basescan.org/address/0x8004...](https://basescan.org/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) |

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();
const registerTool = tools.find(t => t.name === "keeperhub_register_agent")!;

const result = await registerTool.invoke({
  name: "NIYAT DeFi Agent",
  description: "Autonomous DeFi portfolio management agent with cross-chain capabilities.",
  capabilities: ["defi", "aave", "uniswap", "cross-chain", "notifications"],
});
console.log(result);
```

### Check Balance First

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const tools = toolkit.getTools();

const balanceTool = tools.find(t => t.name === "keeperhub_wallet_balance")!;
const registerTool = tools.find(t => t.name === "keeperhub_register_agent")!;

// Check ETH balance on Base first
const balances = await balanceTool.invoke({ chain_id: 8453 });
const ethBalance = (balances as any).balances?.find((b: any) => b.symbol === "ETH");

if (parseFloat(ethBalance?.balance ?? "0") < 0.001) {
  console.error("Insufficient ETH on Base. Need ~0.001 ETH for gas.");
  process.exit(1);
}

const result = await registerTool.invoke({
  name: "My Agent",
  capabilities: ["defi", "monitoring"],
});
console.log(result);
```

## Example Output

```json
{
  "tokenId": "42",
  "txHash": "0xf1e2d3c4...b5a6",
  "contract": "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
  "network": "base",
  "walletAddress": "0xAbCd1234...5678",
  "name": "NIYAT DeFi Agent",
  "capabilities": ["defi", "aave", "uniswap", "cross-chain"],
  "alreadyRegistered": false,
  "basescanUrl": "https://basescan.org/tx/0xf1e2d3c4...b5a6"
}
```

## Notes

- **Idempotent**: calling this tool multiple times for the same managed wallet returns the existing registration (`alreadyRegistered: true`) without minting a new NFT or spending gas.
- Requires ~0.001 ETH on the managed wallet on Base. Check with `keeperhub_wallet_balance` first.
- The NFT is minted to the KeeperHub managed wallet address — not to an arbitrary user address.
- `capabilities` is stored as on-chain metadata. Use descriptive tags to help other agents and protocols discover your agent's skills.
- Even when `testnetOnly: true` is set on the toolkit, this tool targets Base mainnet (ERC-8004 registry is mainnet only).
