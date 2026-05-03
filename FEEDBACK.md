# KeeperHub — Unified Builder Feedback

This feedback is based on building a full multi-framework integration (OpenClaw, LangChain, ElizaOS, Telegram) on top of KeeperHub during ETHGlobal OpenAgents.

---

## 🟢 What Worked Well

- **Core execution layer is powerful**  
  KeeperHub reliably executes real on-chain transactions without requiring agents to manage private keys.

- **MCP + tool abstraction is excellent**  
  Tool discovery (`tools/list`) and structured execution make integration with LLM agents straightforward.

- **Multi-protocol support is strong**  
  DeFi actions (Uniswap, transfers, workflows) worked with minimal setup.

- **AI workflow generation is impressive**  
  `ai_generate_workflow` produces usable multi-step workflows quickly.

- **Fast iteration loop**  
  We were able to build a working multi-framework SDK in a short time.

---

## 🔴 Key Issues & Friction

### 1. Documentation gaps (major)
- Workflow JSON structure is not documented clearly  
- Node config schemas missing (write-contract, transfer, etc.)  
- No clear “Direct Execution vs Workflow” explanation  
- Missing quickstart for common use cases  

👉 Builders often had to reverse-engineer from UI or API responses  

---

### 2. API inconsistencies
- Inconsistent field naming (e.g., `recipient`, `recipient_address`, `recipientAddress`) :contentReference[oaicite:0]{index=0}  
- `transactionHash` appears in multiple formats / nested locations :contentReference[oaicite:1]{index=1}  
- `network` vs `chain` naming inconsistency  
- Some endpoints return HTML 404 with HTTP 200 (very confusing for debugging) :contentReference[oaicite:2]{index=2}  

---

### 3. Workflow generation & execution issues
- Generated workflows sometimes have **broken node links**
- Difficult to reference outputs from previous steps reliably  
- Template system (`{{...}}`) fails in some cases for dynamic inputs :contentReference[oaicite:3]{index=3}  
- API allows invalid workflows that fail only at runtime  

---

### 4. Execution & debugging limitations
- Error messages lack context (missing revert reason, contract info)
- No clear distinction between:
  - workflow execution status  
  - direct execution status  
- Missing public execution proof endpoint for demos :contentReference[oaicite:4]{index=4}  

---

### 5. Developer experience gaps
- No simulation / dry-run mode before executing workflows  
- No local development environment  
- No webhook / event streaming (requires polling) :contentReference[oaicite:5]{index=5}  
- Workflow updates don’t migrate existing executions  

---

### 6. Wallet & execution clarity
- Not obvious which wallet pays gas vs holds assets :contentReference[oaicite:6]{index=6}  
- Relayer wallet funding not clearly surfaced in UI :contentReference[oaicite:7]{index=7}  

---

## 🟡 Additional Friction Observed

- MCP endpoint confusion (`/mcp` vs `/api/mcp`)  
- Missing Accept headers cause unexpected responses  
- Lack of action schema discovery (hard to build programmatically)  
- No easy way to update workflow configs or callback URLs  
- Marketplace/bazaar filtering is limited  

---

## 💡 Suggestions for Improvement

### 1. Documentation
- Add a **clear quickstart for direct execution**
- Publish **JSON schemas for workflows and nodes**
- Provide **end-to-end examples (agent → execution)**

---

### 2. Developer Experience
- Add **workflow simulation / dry-run mode**
- Provide **local dev environment or CLI**
- Add **webhook or event streaming support**

---

### 3. API Improvements
- Standardize:
  - field names (`recipientAddress`, `txHash`)  
  - response formats  
- Return proper HTTP error codes (no HTML 404s)
- Improve error messages with context  

---

### 4. Workflow System
- Validate workflows at creation time  
- Improve node linking and output referencing  
- Fix template variable resolution  

---

### 5. Execution & Visibility
- Public execution proof endpoint (for demos & users)  
- Better wallet visibility (gas payer vs asset holder)  
- Clear execution lifecycle documentation  

---

## 🚀 Overall

KeeperHub solves a real and important problem:  
**reliable execution for AI agents on-chain.**

The core architecture is strong and production-ready, but improving:
- documentation  
- consistency  
- developer tooling  

would significantly accelerate adoption.

---

## 🧠 Final Take

> KeeperHub is a powerful execution layer for AI agents — with a few DX improvements, it can become the standard infrastructure for on-chain agent systems.