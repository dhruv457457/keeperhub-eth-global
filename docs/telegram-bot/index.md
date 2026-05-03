# KeeperHub Telegram Bot

Telegram bot that lets you interact with KeeperHub directly from Telegram. Chat with your AI agent to check wallet balances, run DeFi workflows, transfer tokens, and more.

**Bot:** [@khethworkbot](https://t.me/khethworkbot)

## Stack

| Component | Technology |
|---|---|
| Bot framework | [grammY](https://grammy.dev/) |
| AI tools | `@ethglobal-openagent/langchain-keeperhub` (`KeeperHubToolkit`) |
| LLM inference | OpenAI SDK via [OpenRouter](https://openrouter.ai/) |
| Runtime | Node.js 20 |
| Hosting | [Railway](https://railway.app/) |

## How It Works

1. User sends a message to [@khethworkbot](https://t.me/khethworkbot) on Telegram.
2. The bot prompts the user for their `KEEPERHUB_API_KEY` on first use. The key is stored per Telegram chat ID (not shared).
3. The message is passed to a `createReactAgent` powered by `KeeperHubToolkit` and OpenRouter.
4. The agent selects and calls the appropriate KeeperHub tools.
5. The result is formatted and sent back to the Telegram chat.

### API Key Flow

```
User: /start

Bot: Welcome to KeeperHub! To get started, please send your KeeperHub API key.
     You can find it at https://app.keeperhub.com under Settings → API Keys.

User: khub_sk_1234abcd...

Bot: API key saved! You're ready to go. Try asking:
     • "What's my wallet balance on Base?"
     • "What's the current ETH price?"
     • "Create a workflow that..."
```

Keys are stored per-session and are not persisted after bot restart unless a database is configured.

## Commands

| Command | Description |
|---|---|
| `/start` | Initialize the bot, set up API key |
| `/tools` | List all available KeeperHub tools |
| `/help` | Show usage guide and example prompts |
| `/reset` | Clear stored API key and conversation history |

## Example Interactions

```
User: What's my wallet balance?

Bot: Here's your KeeperHub wallet balance:

Wallet: 0xAbCd1234...5678

Base (8453):
  • ETH: 0.042 (~$142.80)
  • USDC: 25.00 (~$25.00)

Payment Status:
  ✓ x402 ready (25.00 USDC on Base)
  ✗ MPP not ready
```

```
User: What's the ETH price?

Bot: ETH/USD (Chainlink on Base):
  • Price: $3,034.12
  • Last updated: 2 minutes ago ✓
```

```
User: Create and run a workflow that supplies 50 USDC to Aave V3 on Base

Bot: Generating workflow...

Created: "Supply USDC to Aave V3 on Base"
Nodes: fetch-balance → aave-v3-supply → notify-email

Starting execution...
Execution ID: exec_9z8y7x6w5v

I'll notify you when it completes.
```

## Deploy to Railway

### Prerequisites

- [Railway account](https://railway.app/)
- KeeperHub API key from [app.keeperhub.com](https://app.keeperhub.com)
- OpenRouter API key from [openrouter.ai](https://openrouter.ai)
- Telegram bot token from [@BotFather](https://t.me/BotFather)

### Steps

1. Fork or clone the bot repository.

2. Create a new Railway project and connect your repository.

3. Set environment variables in Railway:

```bash
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o          # or any OpenRouter model
# KEEPERHUB_API_KEY is set per-user at runtime, not as an env var
```

4. Deploy. Railway auto-detects Node.js and runs `npm start`.

### Local Development

```bash
git clone https://github.com/your-org/keeperhub-telegram-bot
cd keeperhub-telegram-bot
npm install

cp .env.example .env
# Edit .env with your tokens

npm run dev
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from @BotFather |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for LLM inference |
| `OPENROUTER_MODEL` | No | LLM model slug. Default: `openai/gpt-4o` |
| `PORT` | No | HTTP port for webhook mode. Default: `3000` |
| `WEBHOOK_URL` | No | Public HTTPS URL for Telegram webhook. Omit to use polling. |

## Architecture

```
Telegram Update
     │
     ▼
grammY bot handler
     │
     ▼
Per-chat session (API key + message history)
     │
     ▼
createReactAgent (LangGraph)
     │  ├─ KeeperHubToolkit (25 tools)
     │  └─ OpenRouter LLM
     │
     ▼
Tool calls → https://app.keeperhub.com API
     │
     ▼
Formatted response → Telegram chat
```

## Notes

- Each Telegram chat ID gets an independent session with its own API key and message history.
- Message history is kept in memory by default. For persistence across restarts, configure a Redis or PostgreSQL adapter.
- The bot uses polling mode by default. For production, set `WEBHOOK_URL` to switch to webhook mode (lower latency, required for Railway's sleep-on-idle feature).
- All KeeperHub API calls are made server-side — the user's API key is never exposed to Telegram's servers.
