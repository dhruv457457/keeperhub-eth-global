/**
 * KeeperHub SDK — 5-minute quickstart
 *
 * Setup (one time):
 *   npm install keeperhub-sdk tsx
 *   export KEEPERHUB_API_KEY=kh_...   # app.keeperhub.com → Settings → API Keys
 *
 * Run:
 *   npx tsx quickstart.ts
 */

import { KeeperHub } from "keeperhub-sdk";

async function main() {
  console.log("🔗 Connecting to KeeperHub SDK...");
  const kh = new KeeperHub({ apiKey: process.env.KEEPERHUB_API_KEY! });
  console.log("✅ Connected\n");

  // ── 1. Wallet ──────────────────────────────────────────────────────────────
  console.log("💼 Wallet...");
  const wallet = await kh.wallet.getWallet();
  const addr = (wallet as Record<string, unknown>)["walletAddress"] as string;
  console.log(`   ${addr}`);

  // ── 2. Token balances ──────────────────────────────────────────────────────
  console.log("\n💰 Token balances (Base)...");
  const tokens = await kh.wallet.getTokenBalances("8453");
  const list = Array.isArray(tokens) ? tokens : [];
  if (list.length === 0) {
    console.log("   No tokens yet — fund via app.keeperhub.com");
  } else {
    for (const t of list.slice(0, 3) as Record<string, unknown>[]) {
      console.log(`   ${t["symbol"]} — ${t["balance"]}`);
    }
  }

  // ── 3. Supported chains ────────────────────────────────────────────────────
  console.log("\n⛓️  Supported chains...");
  const chains = await kh.chains.getChains();
  const chainList = Array.isArray(chains) ? chains : [];
  const names = chainList.slice(0, 6).map((c: Record<string, unknown>) => c["name"]);
  console.log(`   ${names.join(", ")} … (${chainList.length} total)`);

  // ── 4. Workflows ───────────────────────────────────────────────────────────
  console.log("\n⚙️  Workflows...");
  const workflows = await kh.workflows.list();
  const wfList = Array.isArray(workflows) ? workflows : [];
  if (wfList.length === 0) {
    console.log("   No workflows yet — create one at app.keeperhub.com");
  } else {
    for (const wf of wfList.slice(0, 3) as Record<string, unknown>[]) {
      console.log(`   • ${wf["name"]} [${wf["id"]}]`);
    }
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log("\n🎉 SDK connected. Build anything.");
  console.log("   All 5 other packages (Python, LangChain, ElizaOS, OpenClaw) run on top of this.");
}

main().catch(console.error);
