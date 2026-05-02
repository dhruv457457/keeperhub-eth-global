/**
 * Test all ElizaOS OpenClaw tools directly
 * Run: npx tsx test-eliza-openclaw.ts
 */
import { KeeperHubToolkit } from "./packages/langchain-tools/src/toolkit.js";

const API_KEY = "kh_NggwOag7aZD25r_VOSJn7GyvJtTTaqRd";

const TESTS = [
  // Wallet
  { name: "wallet_balance",     tool: "keeperhub_wallet_balance",     input: {} },

  // Chains
  { name: "list_chains",        tool: "keeperhub_list_chains",        input: {} },

  // ENS
  { name: "ens_resolve",        tool: "keeperhub_ens_resolve",        input: { name: "vitalik.eth" } },
  { name: "ens_lookup",         tool: "keeperhub_ens_lookup",         input: { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" } },

  // Workflows
  { name: "list_workflows",     tool: "keeperhub_list_workflows",     input: {} },

  // Protocols
  { name: "list_protocols",     tool: "keeperhub_list_protocols",     input: {} },
  { name: "search_actions",     tool: "keeperhub_search_actions",     input: { query: "aave supply" } },
  { name: "get_action_schema",  tool: "keeperhub_get_action_schema",  input: { action_type: "aave-v3/supply" } },

  // Protocol action (read - safe)
  { name: "protocol_action_read", tool: "keeperhub_protocol_action", input: {
    action_type: "aave-v3/supply",
    config: { network: "11155111", asset: "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5", amount: "0.001", onBehalfOf: "0x554bbff68e21e1a4767247586983f98d41c49b78" }
  }},

  // Math
  { name: "math_aggregate",     tool: "keeperhub_math_aggregate",    input: { operation: "average", values: [4.84, 4.79, 3.72, 3.21] } },

  // Code execution
  { name: "run_code",           tool: "keeperhub_run_code",          input: { code: "return 2 + 2" } },

  // Gas estimate
  { name: "estimate_gas",       tool: "keeperhub_estimate_gas",      input: { network: "11155111", to: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", value: "0.001" } },

  // Chainlink price
  { name: "chainlink_price",    tool: "keeperhub_chainlink_price",   input: { pair: "ETH/USD" } },

  // Notifications
  { name: "notify",             tool: "keeperhub_notify",            input: { message: "test" } },
];

async function main() {
  const toolkit = new KeeperHubToolkit({ apiKey: API_KEY, testnetOnly: false });
  const tools = Object.fromEntries(toolkit.getTools().map(t => [t.name, t]));

  console.log(`\nTesting ${TESTS.length} ElizaOS OpenClaw tools\n${"=".repeat(60)}`);

  const results: { name: string; status: string; detail: string }[] = [];

  for (const test of TESTS) {
    process.stdout.write(`[${test.name}] ... `);
    try {
      const raw = await tools[test.tool].invoke(test.input);
      const result = JSON.parse(raw);
      if (result.ok) {
        console.log("✅ PASS");
        results.push({ name: test.name, status: "PASS", detail: "" });
      } else {
        console.log(`❌ FAIL — ${result.error}`);
        results.push({ name: test.name, status: "FAIL", detail: result.error });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`💥 ERROR — ${msg.slice(0, 80)}`);
      results.push({ name: test.name, status: "ERROR", detail: msg.slice(0, 80) });
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  const pass = results.filter(r => r.status === "PASS").length;
  const fail = results.filter(r => r.status !== "PASS").length;
  console.log(`Results: ${pass} PASS, ${fail} FAIL\n`);

  for (const r of results.filter(r => r.status !== "PASS")) {
    console.log(`  ❌ ${r.name}: ${r.detail}`);
  }
}

main().catch(console.error);
