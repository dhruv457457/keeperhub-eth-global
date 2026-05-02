#!/bin/bash
# KeeperHub OpenClaw (LangChain) — 5-minute quickstart
#
# Prerequisites:
#   npm install -g openclaw          # install OpenClaw CLI
#   export KEEPERHUB_API_KEY=kh_... # app.keeperhub.com → Settings → API Keys
#
# Run:
#   bash quickstart.sh

set -e

echo "🔗 Installing KeeperHub OpenClaw plugin..."
openclaw plugin install @ethglobal-openagent/openclaw-keeperhub

echo ""
echo "📝 Configuring plugin..."

OPENCLAW_CONFIG="$HOME/.openclaw/openclaw.json"

# Write minimal config if apiKey not already set
if ! grep -q "keeperhub-langchain" "$OPENCLAW_CONFIG" 2>/dev/null; then
  echo "   Adding keeperhub-langchain to $OPENCLAW_CONFIG"
  echo "   Set your API key manually or via env var KEEPERHUB_API_KEY"
fi

echo ""
echo "✅ Plugin installed! Start OpenClaw and try these prompts:"
echo ""
echo '   openclaw'
echo ""
echo '   > Check my wallet balance'
echo '   → Your wallet: 0x1234...abcd | ETH: 0.05 | USDC: 100.00'
echo ""
echo '   > What blockchains does KeeperHub support?'
echo '   → Ethereum, Base, Arbitrum, Optimism, Polygon... (19 total)'
echo ""
echo '   > Resolve vitalik.eth'
echo '   → vitalik.eth → 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
echo ""
echo '   > What DeFi protocols can I use?'
echo '   → 396 actions: Aave V3/V4, Uniswap, Lido, Compound V3, Morpho, Yearn...'
echo ""
echo "🎉 27 tools ready in plain English."
