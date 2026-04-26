/**
 * Example: Autonomous DeFi Agent
 *
 * Demonstrates the core KeeperHub SDK flow:
 *   1. Check wallet balance
 *   2. List existing workflows
 *   3. Generate a new workflow from a natural language prompt
 *   4. Execute it with payment guardrails
 *   5. Report the outcome using the agent-native API
 *
 * Run: KEEPERHUB_API_KEY=kh_xxx npx tsx examples/defi-agent.ts
 */

import { KeeperHub } from "../src/core/index.js";

const kh = new KeeperHub({
  agentContext: {
    sessionId: `demo-${Date.now()}`,
    goal: "Compound Aave USDC rewards autonomously",
  },
});

async function main() {
  // 1. Check wallet balance before spending
  const balance = await kh.wallet.balances();
  const usdc = balance.find((b) => b.token === "USDC");
  console.log(`Wallet USDC balance: ${usdc?.balance ?? "0"}`);

  // 2. List existing workflows — reuse if one already exists
  const workflows = await kh.workflows.list();
  const existing = workflows.find((w) =>
    w.name.toLowerCase().includes("compound")
  );

  if (existing) {
    console.log(`Found existing workflow: ${existing.name} (${existing.id})`);
  } else {
    console.log("No compound workflow found — generating one from prompt...");
  }

  // 3. Execute via pipeline — generates if needed, pays via x402/MPP, waits for result
  const obs = await kh
    .pipeline()
    .generate("Compound my Aave USDC rewards on Base and reinvest", {
      context: "User has USDC deposited in Aave v3 on Base mainnet",
    })
    .pay({
      budget: "0.10",        // hard cap per execution
      dailyBudget: "1.00",   // rolling 24h spend cap
      requireApprovalAbove: "0.05", // pause for human sign-off above $0.05
    })
    .retry({ attempts: 2, delayMs: 3_000 })
    .safeWait({ timeout: 120_000 }); // never throws — always returns observation

  // 4. Agent-native result handling
  if (!obs.ok) {
    console.error("Execution failed:", obs.summary);
    if (obs.error?.isRetryable) {
      console.log("Suggested action:", obs.error.suggestedAction);
    }
    process.exit(1);
  }

  console.log("✅", obs.summary);

  if (obs.result?.execution?.transactionHash) {
    console.log("Transaction:", obs.result.execution.transactionHash);
  }

  // 5. Check creator earnings (if you publish workflows)
  const earnings = await kh.earnings.summary();
  if (Number(earnings.totalEarned) > 0) {
    console.log(`Creator earnings: ${earnings.totalEarned} USDC`);
  }
}

main().catch(console.error);
