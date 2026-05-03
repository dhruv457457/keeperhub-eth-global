# keeperhub_wallet_balance (TypeScript)

Check the KeeperHub managed wallet balance across one or all supported chains.

## What It Does

Returns token balances held in the KeeperHub-managed wallet for your account. When `chain_id` is omitted, balances are returned for all supported chains. The response includes `payment_readiness` flags for x402 (Base USDC) and MPP (Tempo USDC.e) payment protocols.

## Schema

```typescript
{
  chain_id?: number  // Chain ID to filter (e.g. 8453 for Base). Omit for all chains.
}
```

## TypeScript Example

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

const toolkit = new KeeperHubToolkit({
  apiKey: process.env.KEEPERHUB_API_KEY,
});

// Get all tools and find wallet balance
const tools = toolkit.getTools();
const balanceTool = tools.find(t => t.name === "keeperhub_wallet_balance")!;

// Check balance on Base
const result = await balanceTool.invoke({ chain_id: 8453 });
console.log(result);

// Check all chains
const allBalances = await balanceTool.invoke({});
console.log(allBalances);
```

### Via createReactAgent

```typescript
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const toolkit = new KeeperHubToolkit({ apiKey: process.env.KEEPERHUB_API_KEY });
const agent = createReactAgent({
  llm: new ChatOpenAI({
    model: "openai/gpt-4o",
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    },
  }),
  tools: toolkit.getTools(),
});

const result = await agent.invoke({
  messages: [{ role: "human", content: "What is my ETH balance on Base?" }],
});
console.log(result.messages.at(-1)?.content);
```

## Example Output

```json
{
  "wallet_address": "0xAbCd1234...5678",
  "balances": [
    {
      "chain_id": 8453,
      "chain_name": "Base",
      "symbol": "ETH",
      "balance": "0.042",
      "balance_usd": "142.80"
    },
    {
      "chain_id": 8453,
      "chain_name": "Base",
      "symbol": "USDC",
      "token_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "balance": "25.00",
      "balance_usd": "25.00"
    }
  ],
  "payment_readiness": {
    "x402_ready": true,
    "x402_balance_usdc": "25.00",
    "mpp_ready": false,
    "mpp_balance_usdce": "0.00"
  }
}
```

## Notes

- Uses endpoint `/api/user/wallet/balances` — **not** `/api/user/wallet/tokens` (deprecated).
- `payment_readiness.x402_ready` is `true` when USDC on Base (chain 8453) is available.
- `payment_readiness.mpp_ready` is `true` when USDC.e on Tempo is available.
- When using the `testnetOnly` safety option, this tool only shows testnet balances.
- The managed wallet address is deterministic per API key.
