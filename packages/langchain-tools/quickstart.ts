/**
 * KeeperHub TypeScript LangChain -- 5-minute quickstart
 *
 * Setup (one time):
 *   npm install @ethglobal-openagent/langchain-keeperhub @langchain/openai @langchain/langgraph tsx
 *
 *   export KEEPERHUB_API_KEY=kh_...      # app.keeperhub.com -> Settings -> API Keys
 *   export OPENROUTER_API_KEY=sk-or-...  # openrouter.ai -- free models available
 *   # OR: export OPENAI_API_KEY=sk-...
 *
 * Run:
 *   npx tsx quickstart.ts
 */

import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// -- LLM config (OpenRouter supports 100+ models, free tier available) ----------
const LLM_MODEL   = "anthropic/claude-haiku-4-5";
const LLM_API_KEY = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
const LLM_BASE_URL = "https://openrouter.ai/api/v1";

async function main() {
  // 1. Load KeeperHub tools
  console.log("[1/3] Loading KeeperHub tools...");
  const toolkit = new KeeperHubToolkit({
    apiKey: process.env.KEEPERHUB_API_KEY!,
    testnetOnly: true, // blocks mainnet writes in dev
  });
  const tools = toolkit.getTools();
  console.log(`      ${tools.length} tools ready (DeFi, transfers, ENS, workflows...)\n`);

  // 2. Connect LLM
  console.log(`[2/3] Connecting LLM (${LLM_MODEL})...`);
  const llm = new ChatOpenAI({
    model: LLM_MODEL,
    configuration: { baseURL: LLM_BASE_URL, apiKey: LLM_API_KEY },
  });
  const agent = createReactAgent({ llm, tools });
  console.log("      Agent ready\n");
  console.log("=".repeat(60));

  // 3. Run three real queries
  const queries = [
    "What blockchains does KeeperHub support? List the mainnets.",
    "What is my KeeperHub wallet address?",
    "Resolve the ENS name vitalik.eth and tell me the address.",
  ];

  for (const q of queries) {
    console.log(`\n> ${q}`);
    const result = await agent.invoke({
      messages: [{ role: "user", content: q }],
    });
    console.log(result.messages.at(-1)?.content);
    console.log("-".repeat(60));
  }

  console.log("\n[DONE] Onchain agent working.");
  console.log("       Swap the queries above for anything:");
  console.log("       'Supply 100 USDC to Aave on Base'");
  console.log("       'What is the best USDC yield right now?'");
  console.log("       'Send 0.001 ETH to vitalik.eth on Sepolia'");
}

main().catch(console.error);
