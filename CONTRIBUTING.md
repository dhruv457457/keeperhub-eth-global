# Contributing to the KeeperHub Agent SDK

This guide shows how to add a new KeeperHub API endpoint as a tool across all three framework packages — Python LangChain, TypeScript LangChain, and ElizaOS. Each package follows the same pattern so adding one tool means adding it three times in roughly the same shape.

---

## Architecture Overview

```
KeeperHub REST API
       │
       ▼
keeperhub-sdk          (TypeScript — direct API client, all packages depend on this)
       │
       ├── packages/langchain-keeperhub/        (Python LangChain — 24 tools)
       ├── packages/langchain-tools/            (TypeScript LangChain — 27 tools)
       ├── packages/elizaos-plugin/             (ElizaOS — 19 actions)
       ├── packages/openclaw-adapter-langchain/ (OpenClaw wraps langchain-tools)
       └── packages/openclaw-adapter-elizaos/   (OpenClaw wraps elizaos-plugin)
```

The OpenClaw adapters automatically pick up any new tools added to `langchain-tools` or `elizaos-plugin` — no changes needed there.

---

## Adding a New Tool — Step by Step

### Example: `keeperhub_get_earnings`

Suppose KeeperHub adds a new endpoint:
```
GET /api/user/earnings?chainId=<id>
Returns: { total_earned, by_protocol: [...] }
```

---

## 1. Python LangChain (`packages/langchain-keeperhub/`)

Create `langchain_keeperhub/tools/earnings.py`:

```python
import json
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field
from typing import Optional
from ..client import KeeperHubClient


class _EarningsInput(BaseModel):
    chain_id: Optional[str] = Field(
        default=None,
        description="Filter by chain ID. Omit for all chains."
    )


class GetEarningsTool(BaseTool):
    name: str = "keeperhub_get_earnings"
    description: str = (
        "Get total earnings from KeeperHub managed wallet across all protocols. "
        "Returns earnings by protocol (Aave, Uniswap, etc.) and total earned. "
        "Use when the user asks how much they have earned or what yield was generated."
    )
    args_schema: type[BaseModel] = _EarningsInput
    client: KeeperHubClient

    async def _arun(self, chain_id: str | None = None) -> str:
        try:
            params = {}
            if chain_id:
                params["chainId"] = chain_id
            data = await self.client.get("/api/user/earnings", params=params)
            return json.dumps({
                "ok": True,
                "total_earned": data.get("total_earned"),
                "by_protocol": data.get("by_protocol", []),
            })
        except Exception as err:
            return json.dumps({"ok": False, "error": str(err)})
```

Register in `langchain_keeperhub/tools/__init__.py`:
```python
from .earnings import GetEarningsTool
```

Add to `langchain_keeperhub/toolkit.py` inside `_build_native_tools()`:
```python
GetEarningsTool(client=self.client),
```

---

## 2. TypeScript LangChain (`packages/langchain-tools/`)

Create `src/tools/earnings.ts`:

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

export function createGetEarningsTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_get_earnings",
    description:
      "Get total earnings from KeeperHub managed wallet across all protocols. " +
      "Returns earnings by protocol (Aave, Uniswap, etc.) and total earned. " +
      "Use when the user asks how much they have earned or what yield was generated.",
    schema: z.object({
      chainId: z
        .number()
        .optional()
        .describe("Filter by chain ID. Omit for all chains."),
    }),
    func: async ({ chainId }) => {
      try {
        const data = await kh.earnings.get(chainId ? String(chainId) : undefined);
        return JSON.stringify({
          ok: true,
          total_earned: data.totalEarned,
          by_protocol: data.byProtocol ?? [],
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
  });
}
```

Register in `src/tools/index.ts`:
```typescript
export { createGetEarningsTool } from "./earnings.js";
```

Add to `src/toolkit.ts` inside `getTools()`:
```typescript
createGetEarningsTool(this.kh),
```

---

## 3. ElizaOS (`packages/elizaos-plugin/`)

Create `src/actions/get-earnings.ts`:

```typescript
import type { Action, HandlerCallback, IAgentRuntime, Memory, State } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

export function createGetEarningsAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_GET_EARNINGS",
    similes: ["GET_EARNINGS", "MY_EARNINGS", "YIELD_EARNED", "HOW_MUCH_EARNED"],
    description:
      "Get total earnings from KeeperHub wallet across all protocols. " +
      "Use when user asks how much they earned, what yield was generated, or wants a profit summary.",

    validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
      const text = (message.content?.text ?? "").toLowerCase();
      return text.includes("earn") || text.includes("yield") || text.includes("profit");
    },

    handler: async (
      _runtime: IAgentRuntime,
      _message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      try {
        const data = await kh.earnings.get();
        const lines = [
          `Total Earned: ${data.totalEarned} USDC`,
          "",
          "By Protocol:",
          ...(data.byProtocol ?? []).map(
            (p: { name: string; earned: string }) => `• ${p.name}: ${p.earned}`
          ),
        ];
        await callback?.({ text: lines.join("\n") });
        return true;
      } catch (err) {
        await callback?.({
          text: `Failed to fetch earnings: ${err instanceof Error ? err.message : String(err)}`,
        });
        return false;
      }
    },

    examples: [[
      { user: "{{user1}}", content: { text: "How much have I earned?" } },
      {
        user: "{{agentName}}",
        content: {
          text: "Total Earned: 12.5 USDC\n\nBy Protocol:\n• Aave: 8.2\n• Morpho: 4.3",
          action: "KEEPERHUB_GET_EARNINGS",
        },
      },
    ]],
  };
}
```

Register in `src/plugin.ts`:
```typescript
import { createGetEarningsAction } from "./actions/get-earnings.js";

// inside createKeeperHubPlugin(), add to actions array:
createGetEarningsAction(kh),
```

---

## Rules Every Tool Must Follow

### 1. Always return `ok` field
```typescript
// Success
return JSON.stringify({ ok: true, ...data });

// Failure  
return JSON.stringify({ ok: false, error: "message" });
```

### 2. Never throw — always catch
Every `func` / `_arun` / `handler` must have a top-level try/catch. The agent must always receive a JSON string back, never an exception.

### 3. Testnet guard for write tools
If your tool executes a transaction, check the guard before calling the API:

```python
# Python
TESTNET_IDS = {"11155111", "84532", "80002", "421614", "43113", "4217"}
if self._options.get("testnet_only") and str(network) not in TESTNET_IDS:
    return json.dumps({"ok": False, "error": "testnet_only mode — mainnet write blocked."})
```

```typescript
// TypeScript
const TESTNET_IDS = new Set(["11155111","84532","80002","421614","43113","4217"]);
if (this.options.testnetOnly && !TESTNET_IDS.has(String(chainId))) {
  return JSON.stringify({ ok: false, error: "testnet_only mode — mainnet write blocked." });
}
```

### 4. Naming convention
| Package | Format | Example |
|---|---|---|
| Python / TS LangChain | `keeperhub_verb_noun` | `keeperhub_get_earnings` |
| ElizaOS action name | `KEEPERHUB_VERB_NOUN` | `KEEPERHUB_GET_EARNINGS` |
| ElizaOS similes | common phrases user might say | `["MY_EARNINGS", "HOW_MUCH_EARNED"]` |

### 5. Description must answer "when should the agent call this?"
```
Bad:  "Gets earnings"
Good: "Get total earnings from KeeperHub wallet. Use when the user asks how much
       they have earned, what yield was generated, or wants a profit summary."
```

---

## Running Tests

```bash
# Python — run all 24 tool tests
cd packages/langchain-keeperhub
python -m pytest tests/ -v

# TypeScript — type check + tests
cd packages/langchain-tools
npx tsc --noEmit

# ElizaOS — type check
cd packages/elizaos-plugin
npx tsc --noEmit
```

---

## Checklist Before Adding a New Tool

- [ ] Added to Python toolkit (`tools/xxx.py` + `__init__.py` + `toolkit.py`)
- [ ] Added to TS toolkit (`src/tools/xxx.ts` + `index.ts` + `toolkit.ts`)
- [ ] Added to ElizaOS plugin (`src/actions/xxx.ts` + `plugin.ts`)
- [ ] Returns `{ ok: true, ... }` on success
- [ ] Returns `{ ok: false, error: "..." }` on failure
- [ ] Has top-level try/catch — never throws
- [ ] Testnet guard added if tool executes transactions
- [ ] Description answers "when should the agent call this?"
- [ ] OpenClaw adapters updated automatically (no extra changes needed)

---

## Package Names for Official Adoption

| Hackathon name | Official `@keeperhub` name |
|---|---|
| `keeperhub-langchain` (PyPI) | `keeperhub-langchain` — already correct |
| `@ethglobal-openagent/langchain-keeperhub` | `@keeperhub/langchain` |
| `@ethglobal-openagent/elizaos-keeperhub` | `@keeperhub/elizaos` |
| `@ethglobal-openagent/openclaw-keeperhub` | `@keeperhub/openclaw` |
| `keeperhub-sdk` | `keeperhub-sdk` — already correct |

Only the `name` field in `package.json` needs to change — the code is identical.
