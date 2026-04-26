/**
 * Example: LangChain ReAct Agent with KeeperHub
 *
 * A LangChain agent that can discover, generate, and execute
 * onchain workflows autonomously using the KeeperHub toolkit.
 *
 * Run: KEEPERHUB_API_KEY=kh_xxx OPENAI_API_KEY=sk_xxx npx tsx examples/langchain-agent.ts
 */

import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { KeeperHubToolkit } from "../../langchain-tools/src/toolkit.js";

async function main() {
  const toolkit = new KeeperHubToolkit({
    agentContext: {
      sessionId: `langchain-${Date.now()}`,
      goal: "Execute DeFi operations on behalf of the user",
    },
  });

  const tools = toolkit.getTools();
  const systemPrompt = await toolkit.buildSystemPrompt({ includeWorkflows: true });

  const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
  const agent = await createReactAgent({
    llm,
    tools,
    messageModifier: systemPrompt,
  });

  const result = await agent.invoke({
    messages: [
      new HumanMessage(
        "Check my available KeeperHub workflows, then generate and run one that checks the ETH/USDC price on Base."
      ),
    ],
  });

  const last = result.messages.at(-1);
  console.log("Agent response:", last?.content);
}

main().catch(console.error);
