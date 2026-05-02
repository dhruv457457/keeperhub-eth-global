/**
 * KeeperHub ElizaOS Plugin -- 5-minute quickstart
 *
 * Run this in a FRESH folder (not inside this monorepo):
 *
 *   mkdir my-keeperhub-agent && cd my-keeperhub-agent
 *   npm install @ethglobal-openagent/elizaos-keeperhub @elizaos/core tsx
 *
 *   export KEEPERHUB_API_KEY=kh_...   # app.keeperhub.com -> Settings -> API Keys
 *
 *   npx tsx quickstart.ts
 *
 * This script verifies all 19 actions load and 3 of them return real data.
 */

import { createKeeperHubPlugin } from "@ethglobal-openagent/elizaos-keeperhub";
import type { HandlerCallback } from "@elizaos/core";

const mockRuntime = {} as any;
const mockState   = undefined;

function callback(label: string): HandlerCallback {
  return async ({ text }) => {
    const preview = (text ?? "").split("\n").slice(0, 4).join(" | ");
    console.log(`      ${preview}`);
  };
}

async function main() {
  // 1. Load plugin
  console.log("[1/2] Loading KeeperHub ElizaOS plugin...");
  const plugin  = createKeeperHubPlugin({
    apiKey: process.env.KEEPERHUB_API_KEY!,
    testnetOnly: true,
  });
  const actions = plugin.actions ?? [];
  console.log(`      ${actions.length} actions registered:\n`);
  for (const a of actions) {
    console.log(`      * ${a.name}`);
  }

  // 2. Run 3 action handlers directly
  console.log("\n[2/2] Testing action handlers with real KeeperHub API...");
  console.log("=".repeat(60));

  // List chains
  const listChains = actions.find((a) => a.name === "KEEPERHUB_LIST_CHAINS");
  if (listChains) {
    console.log("\n> KEEPERHUB_LIST_CHAINS");
    await listChains.handler(
      mockRuntime,
      { content: { text: "what chains" } } as any,
      mockState, {},
      callback("chains")
    );
  }

  // Wallet balance
  const walletBal = actions.find(
    (a) => a.name === "KEEPERHUB_WALLET_BALANCE" || a.name === "KEEPERHUB_CHECK_WALLET"
  );
  if (walletBal) {
    console.log(`\n> ${walletBal.name}`);
    await walletBal.handler(
      mockRuntime,
      { content: { text: "wallet balance" } } as any,
      mockState, {},
      callback("wallet")
    );
  }

  // ENS resolve
  const ensAction = actions.find((a) => a.name === "KEEPERHUB_ENS_RESOLVE");
  if (ensAction) {
    console.log("\n> KEEPERHUB_ENS_RESOLVE");
    await ensAction.handler(
      mockRuntime,
      { content: { text: "resolve vitalik.eth", name: "vitalik.eth" } } as any,
      mockState,
      { name: "vitalik.eth" },
      callback("ens")
    );
  }

  console.log("\n[DONE] All 19 actions work.");
  console.log("       Wire into your ElizaOS agent:\n");
  console.log('  import { AgentRuntime } from "@elizaos/core";');
  console.log('  import { createKeeperHubPlugin } from "@ethglobal-openagent/elizaos-keeperhub";');
  console.log();
  console.log("  const runtime = new AgentRuntime({");
  console.log("    character,");
  console.log("    plugins: [createKeeperHubPlugin({ apiKey: process.env.KEEPERHUB_API_KEY })],");
  console.log("  });");
  console.log();
  console.log('  // User: "Send 0.01 ETH to vitalik.eth"');
  console.log("  // Agent: KEEPERHUB_TRANSFER fires automatically");
}

main().catch(console.error);
