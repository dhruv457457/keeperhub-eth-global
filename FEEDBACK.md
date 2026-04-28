# KeeperHub API — Issues & Questions

Found while building the KeeperHub Agent SDK (LangChain + ElizaOS integrations).
Tested against: `https://app.keeperhub.com` on 2026-04-27.
Test wallet: `0x554bbFF68e21e1A4767247586983f98D41c49b78`

---

## 🔴 Critical Findings (from community + our tests)

### Finding 1 — Two key types, undocumented distinction
Discovered by MeritScore team in Discord:
- `kh_xxx` key → API management operations (list workflows, read chains, etc.)
- `wfb_xxx` key → Webhook trigger for workflow execution (`POST /api/workflows/{id}/webhook`)

**The `kh_` key returns `[]` from `GET /api/workflows` even when workflows exist** — deeply confusing for new developers. We worked around this by using `POST /api/workflow/{id}/execute` which works with `kh_` keys.

**Suggestion:** Document both key types clearly at the top of the API reference. Show which key each endpoint accepts.

### Finding 2 — Many endpoints require session token, not API key
Reported by Devendra (building langchain plugin) and confirmed by KeeperHub team (fix in progress).
Our `GET /api/user/wallet/balances` returns 500 — likely the same session-vs-API-key issue.

---

## 🐛 Bugs (server-side)

### Bug 1 — Gas estimate returns 500 (ethers.js INVALID_ARGUMENT)
**Endpoint:** `POST /api/gas/estimate`
**Error:** `500: unsupported addressable value (argument="target", value={ "from": "0x554bb..." }, code=INVALID_ARGUMENT, version=6.16.0)`
**Request body we sent:**
```json
{
  "chainId": 1,
  "actionSlug": "write-contract",
  "config": {
    "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "abiFunction": "changeAdmin",
    "abi": "[...]",
    "functionArgs": "[]"
  }
}
```
**Question:** What is the correct request body format for `/api/gas/estimate`? The error suggests ethers.js is treating the `from` address as the target contract.

---

### Bug 2 — Wallet balance returns 500 (Prometheus label error)
**Endpoint:** `GET /api/user/wallet/balances`
**Error:** `500: Added label "operation" is not included in initial labelset: ['error_category', 'error_context', 'is_user_error', ...]`
**Question:** This looks like a Prometheus metrics instrumentation bug server-side. Is there a different endpoint for fetching the org wallet's token balances?

---

### Bug 3 — Transfer to Sepolia returns 400 "Missing required field"
**Endpoint:** `POST /api/execute/transfer`
**Error:** `400: Missing required field`
**Request body:**
```json
{ "network": "11155111", "recipientAddress": "0x554bb...", "amount": "0.0001" }
```
**Question:** Is direct execution supported on Sepolia (11155111)? If so, what additional field is required? We also tried `to` instead of `recipientAddress` — same error.

---

## ❓ Questions (unclear behavior / missing docs)

### Q4 — `/api/mcp/schemas` returns empty array
**Endpoint:** `GET /api/mcp/schemas`
**Behavior:** Returns `[]` with no query params. Same with `?category=Aave+V3`.
**Question:** What query parameters does `/api/mcp/schemas` accept? We need to list/search the 396 action schemas for our `get_action_schema` and `search_actions` tools. Is there a different endpoint for schema discovery?

---

### Q5 — Chainlink price feeds return 422 `Invalid _protocolMeta`
**Endpoint:** `POST /api/execute/node`
**Request (after we found correct format from `/api/mcp/schemas`):**
```json
{ "actionType": "chainlink/eth-usd-latest-round-data", "config": { "network": "1" } }
```
**Error:** `422: Invalid _protocolMeta: failed to parse JSON and could not derive from action type`

We also tried: `{ "network": 1 }` (int), `{ "_protocolMeta": "{\"network\":\"1\"}" }` (got `422: Unknown protocol: undefined`).

The action type `chainlink/eth-usd-latest-round-data` exists in `/api/mcp/schemas` with `requiredFields: { network: "string (chain ID)" }` — so the schema is correct but execution fails.

**Question:** What additional fields does the `chainlink/{feed}-latest-round-data` action require? Does it need a `_protocolMeta` field, and if so, what's the correct format? Or is this action only executable via workflows (not direct node execution)?

---

### Q6 — Cancel execution URL
**Found:** SDK calls `POST /api/workflows/executions/{id}/cancel`
**Actual route:** `POST /api/executions/{executionId}/cancel`
**Status:** Fixed in our SDK — documenting for others who hit this.

---

## ✅ What works perfectly

| Feature | Endpoint | Status |
|---------|----------|--------|
| List supported chains | `GET /api/chains` | ✅ 19 chains returned |
| Fetch contract ABI | `GET /api/chains/{chainId}/abi` | ✅ Proxy resolution works |
| Read contract (view) | `POST /api/execute/contract-call` | ✅ USDC totalSupply reads correctly |
| List workflows | `GET /api/workflows` | ✅ 36 workflows returned |
| Execute workflow | `POST /api/workflow/{id}/execute` | ✅ Completed successfully |
| Execution status | `GET /api/workflows/executions/{id}/status` | ✅ Returns correctly |
| ERC-8004 registration | `GET + POST /api/agent-registry` | ✅ Idempotent registration works |
| AI workflow generation | `POST /api/ai/generate` | ✅ |
| Workflow duplication | `POST /api/workflows/{id}/duplicate` | ✅ |

---

## 💡 Suggestions

1. **Document `/api/gas/estimate` request format** — not clear from SDK what `config` object needs
2. **Add Sepolia to direct execution docs** — or explicitly note it's not supported
3. **Document `/api/mcp/schemas`** — key endpoint for agent-native SDKs that need schema discovery
4. **Prometheus label bug** in wallet balance endpoint needs a hotfix
