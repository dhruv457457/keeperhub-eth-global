import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Provision a new KeeperHub agentic wallet (Turnkey-backed, no key on disk).
 * Used when an agent needs its own payment identity for x402/MPP calls.
 */
export function createProvisionWalletTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_provision_wallet",
    description:
      "Provision a new KeeperHub agentic wallet for this agent. " +
      "Server-side Turnkey custody — no private key lands on disk. " +
      "Returns walletAddress and subOrgId. Fund with USDC on Base (x402) " +
      "or USDC.e on Tempo (MPP) to enable paid workflow calls. " +
      "Only call this once — save the wallet address for future use.",
    schema: z.object({
      label: z
        .string()
        .max(64)
        .optional()
        .describe("Optional label for this wallet (e.g. agent name or session ID)"),
    }),
    func: async ({ label }) => {
      try {
        const result = await kh["_http"].request("POST", "/api/agentic-wallet/provision", {
          body: { label },
        });
        const r = result as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          wallet_address: r["walletAddress"],
          sub_org_id: r["subOrgId"],
          summary: `Agentic wallet provisioned at ${r["walletAddress"]}. Fund with USDC on Base (chain 8453) for x402 payments, or USDC.e on Tempo (chain 4217) for MPP payments.`,
          next_steps: [
            `Fund wallet: send USDC to ${r["walletAddress"]} on Base mainnet`,
            "Check balance: keeperhub_wallet_balance",
            "Run paid workflow: keeperhub_pay_and_run",
          ],
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
