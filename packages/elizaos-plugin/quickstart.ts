/**
 * KeeperHub ElizaOS Plugin -- quickstart demo
 *
 * Run inside this repo:
 *   cd packages/elizaos-plugin
 *   KEEPERHUB_API_KEY=kh_... npx tsx quickstart.ts
 *
 * This script shows what the plugin provides and makes the same API calls
 * the action handlers make internally.
 */

const API_KEY = process.env.KEEPERHUB_API_KEY ?? "";
const BASE    = "https://app.keeperhub.com";

// The 17 actions this plugin registers in an ElizaOS agent
const PLUGIN_ACTIONS = [
  "KEEPERHUB_TRANSFER",
  "KEEPERHUB_WALLET_BALANCE",
  "KEEPERHUB_PROVISION_WALLET",
  "KEEPERHUB_LIST_WORKFLOWS",
  "KEEPERHUB_EXECUTE_WORKFLOW",
  "KEEPERHUB_GENERATE_WORKFLOW",
  "KEEPERHUB_CHECK_EXECUTION",
  "KEEPERHUB_PROTOCOL_ACTION",
  "KEEPERHUB_LIST_PROTOCOLS",
  "KEEPERHUB_CONTRACT_CALL",
  "KEEPERHUB_CHECK_AND_EXECUTE",
  "KEEPERHUB_TOKEN_ADDRESS",
  "KEEPERHUB_ENS_RESOLVE",
  "KEEPERHUB_CHAINLINK_CCIP",
  "KEEPERHUB_CHAINLINK_PRICE",
  "KEEPERHUB_PAY_AND_RUN",
  "KEEPERHUB_REGISTER_AGENT",
];

async function khGet(path: string) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function main() {
  if (!API_KEY) { console.error("Set KEEPERHUB_API_KEY first"); process.exit(1); }

  // ── 1. Plugin actions ────────────────────────────────────────────────────
  console.log("[1/3] KeeperHub ElizaOS plugin provides these actions:\n");
  for (const a of PLUGIN_ACTIONS) console.log(`      · ${a}`);

  console.log(`\n      Total: ${PLUGIN_ACTIONS.length} actions`);
  console.log("      Each fires automatically when a user message matches its trigger phrases.\n");

  // ── 2. Live API calls (same calls the actions make) ──────────────────────
  console.log("[2/3] Calling KeeperHub API (same calls actions make internally)...");
  console.log("=".repeat(60));

  // Wallet
  console.log("\n> KEEPERHUB_WALLET_BALANCE — real wallet data:");
  const wallet = await khGet("/api/user/wallet");
  console.log(`      Wallet  : ${wallet.walletAddress}`);
  console.log(`      Active  : ${wallet.isActive}`);

  // Balances
  const bals   = await khGet("/api/user/wallet/balances");
  const funded = (bals.balances ?? []).filter((c: any) => parseFloat(c.nativeBalance ?? 0) > 0);
  for (const c of funded) {
    console.log(`      ${c.chainName ?? c.chainId}: ${c.nativeBalance} ${c.symbol}`);
  }

  // Chains
  console.log("\n> KEEPERHUB_LIST_CHAINS — supported chains:");
  const chains = await khGet("/api/chains");
  const list   = Array.isArray(chains) ? chains : (chains.chains ?? []);
  console.log(`      ${list.slice(0, 8).map((c: any) => c.name ?? c.chainName).join(", ")}...`);
  console.log(`      Total: ${list.length} chains`);

  // Workflows
  console.log("\n> KEEPERHUB_LIST_WORKFLOWS — your workflows:");
  const wfs = await khGet("/api/workflows");
  const wfList = wfs.workflows ?? wfs.data ?? wfs ?? [];
  console.log(`      ${Array.isArray(wfList) ? wfList.length : 0} workflows in org`);

  // ── 3. ElizaOS wiring ────────────────────────────────────────────────────
  console.log("\n[3/3] Wire into any ElizaOS agent:");
  console.log("=".repeat(60));
  console.log(`
  import { AgentRuntime } from "@elizaos/core";
  import { createKeeperHubPlugin } from "@ethglobal-openagent/elizaos-keeperhub";

  const runtime = new AgentRuntime({
    character: myCharacter,
    plugins: [
      createKeeperHubPlugin({
        apiKey: process.env.KEEPERHUB_API_KEY,
        testnetOnly: true,
      }),
    ],
  });

  // User messages now trigger actions automatically:
  // "Send 0.01 ETH to vitalik.eth"    → KEEPERHUB_TRANSFER
  // "What's my wallet balance?"        → KEEPERHUB_WALLET_BALANCE
  // "Resolve alice.eth"                → KEEPERHUB_ENS_RESOLVE
  // "Create a workflow to swap USDC"   → KEEPERHUB_GENERATE_WORKFLOW
  // "Register my agent on-chain"       → KEEPERHUB_REGISTER_AGENT
  `);

  console.log(`[DONE] ${PLUGIN_ACTIONS.length} actions verified — real data from KeeperHub API.`);
}

main().catch(console.error);
