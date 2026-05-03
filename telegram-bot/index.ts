/**
 * KeeperHub Telegram Bot
 *
 * Stack:
 *  - grammy          — Telegram bot framework
 *  - KeeperHubToolkit (@ethglobal-openagent/langchain-keeperhub) — 32 onchain tools
 *  - LangChain ReAct agent — LLM picks tools, executes them, replies
 *
 * Each user provides their own KeeperHub API key.
 * The bot creates a separate agent per user.
 */

import "dotenv/config";
import { Bot, type Context } from "grammy";
import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

// ── Config ───────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const LLM_KEY   = process.env.OPENROUTER_API_KEY ?? process.env.OPENAI_API_KEY!;
const LLM_BASE  = process.env.OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : undefined;

if (!BOT_TOKEN) throw new Error("Set TELEGRAM_BOT_TOKEN");
if (!LLM_KEY)   throw new Error("Set OPENROUTER_API_KEY or OPENAI_API_KEY");

// ── Per-user session storage ─────────────────────────────────────────────────
interface UserSession {
  apiKey: string;
  agent: ReturnType<typeof createReactAgent>;
  toolCount: number;
  waitingForKey: boolean;
}

const sessions = new Map<number, UserSession>();
const busy     = new Set<number>();

function buildAgent(apiKey: string) {
  const toolkit = new KeeperHubToolkit({ apiKey, testnetOnly: false });
  const tools   = toolkit.getTools();

  const llm = new ChatOpenAI({
    model: "anthropic/claude-haiku-4-5",
    configuration: { baseURL: LLM_BASE, apiKey: LLM_KEY },
  });

  const agent = createReactAgent({
    llm,
    tools,
    messageModifier: `You are KeeperHub Agent — an onchain DeFi assistant on Telegram.

You have ${tools.length} tools from the KeeperHub SDK covering:
wallet balance, token transfers, ENS resolution, Chainlink price feeds,
DeFi protocols (Aave, Uniswap, Lido, Compound, 392 more), smart contract calls,
workflow generation & execution, ERC-8004 agent identity, Chainlink CCIP, and more.

Rules:
- Be concise. Show real data directly.
- Default chain: Base (8453) unless user says otherwise.
- For token addresses call keeperhub_token_address before workflow generation.
- For prices use keeperhub_chainlink_price.
- Truncate addresses: 0x1234...abcd format.
- Before any transfer, confirm amount + recipient before executing.`,
  });

  return { agent, toolCount: tools.length };
}

// ── Telegram bot ─────────────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

bot.command("start", async (ctx: Context) => {
  const uid = ctx.from?.id;
  if (!uid) return;

  const existing = sessions.get(uid);

  if (existing && !existing.waitingForKey) {
    await ctx.reply(
      `✅ You're already connected with your KeeperHub API key.\n\n` +
      `${existing.toolCount} tools loaded. Just send a message!\n\n` +
      `Type /reset to connect a different API key.\n` +
      `Type /tools to see all available tools.`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Ask for API key
  sessions.set(uid, { apiKey: "", agent: null as any, toolCount: 0, waitingForKey: true });
  await ctx.reply(
    `👋 Welcome to *KeeperHub Agent*!\n\n` +
    `I can execute onchain DeFi operations across 19 blockchains using your KeeperHub account.\n\n` +
    `To get started, please send your *KeeperHub API key*.\n\n` +
    `Get one at: app.keeperhub.com → Settings → API Keys\n` +
    `(It starts with \`kh_\`)`,
    { parse_mode: "Markdown" }
  );
});

bot.command("reset", async (ctx: Context) => {
  const uid = ctx.from?.id;
  if (!uid) return;
  sessions.delete(uid);
  await ctx.reply(
    `🔄 Session cleared.\n\nSend /start to connect a new KeeperHub API key.`
  );
});

bot.command("tools", async (ctx: Context) => {
  const uid  = ctx.from?.id;
  if (!uid) return;
  const sess = sessions.get(uid);
  if (!sess || sess.waitingForKey) {
    await ctx.reply("Send /start first to connect your KeeperHub API key.");
    return;
  }
  const toolkit = new KeeperHubToolkit({ apiKey: sess.apiKey });
  const names   = toolkit.getTools().map(t => `• \`${t.name}\``).join("\n");
  await ctx.reply(`*${sess.toolCount} KeeperHub tools:*\n\n${names}`, { parse_mode: "Markdown" });
});

bot.command("help", async (ctx: Context) => {
  await ctx.reply(
    `*KeeperHub Agent — example prompts:*\n\n` +
    `• What is my wallet balance?\n` +
    `• Resolve vitalik.eth\n` +
    `• What is the ETH/USD price?\n` +
    `• What DeFi protocols can I use?\n` +
    `• What blockchains do you support?\n` +
    `• Generate a workflow to supply USDC to Aave on Base\n` +
    `• Register my agent on-chain (ERC-8004)\n` +
    `• Send 0.001 ETH to 0x... on Base\n\n` +
    `_/reset — connect a different API key_\n` +
    `_/tools — list all loaded tools_`,
    { parse_mode: "Markdown" }
  );
});

bot.on("message:text", async (ctx: Context) => {
  const uid  = ctx.from?.id;
  if (!uid) return;

  const text = ctx.message!.text.trim();
  const sess = sessions.get(uid);

  // ── Waiting for API key ──────────────────────────────────────────────────
  if (!sess || sess.waitingForKey) {
    if (!text.startsWith("kh_")) {
      await ctx.reply(
        `That doesn't look like a KeeperHub API key.\n\n` +
        `It should start with \`kh_\`. Get one at app.keeperhub.com → Settings → API Keys`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    await ctx.reply("🔄 Connecting to KeeperHub...");

    try {
      const { agent, toolCount } = buildAgent(text);
      sessions.set(uid, { apiKey: text, agent, toolCount, waitingForKey: false });
      await ctx.reply(
        `✅ *Connected!* ${toolCount} KeeperHub tools loaded.\n\n` +
        `*Try:*\n` +
        `• What is my wallet balance?\n` +
        `• Resolve vitalik.eth\n` +
        `• What is the ETH price?\n` +
        `• Generate a workflow to supply USDC to Aave\n\n` +
        `_Type /help for more examples · /reset to change key_`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      await ctx.reply(`❌ Failed to connect: ${err instanceof Error ? err.message : String(err)}\n\nPlease check your API key and try again.`);
      sessions.delete(uid);
    }
    return;
  }

  // ── Normal message → agent ───────────────────────────────────────────────
  if (busy.has(uid)) {
    await ctx.reply("Still processing your last request... ⏳");
    return;
  }

  busy.add(uid);
  await ctx.api.sendChatAction(ctx.chat!.id, "typing").catch(() => {});

  try {
    const result  = await sess.agent.invoke({ messages: [new HumanMessage(text)] });
    const content = result.messages.at(-1)?.content;
    const reply   = (typeof content === "string" ? content : JSON.stringify(content)).slice(0, 4000);
    await ctx.reply(reply, { parse_mode: "Markdown" }).catch(() => ctx.reply(reply));
  } catch (err) {
    console.error(err);
    await ctx.reply("Something went wrong — please try again.");
  } finally {
    busy.delete(uid);
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
console.log("Starting @khethworkbot...");
bot.start({ onStart: () => console.log("✅ Bot live → https://t.me/khethworkbot") });
