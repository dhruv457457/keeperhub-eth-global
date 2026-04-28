import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Check the KeeperHub managed wallet balance — tokens across all chains.
 * Also checks USDC balance for x402/MPP payment readiness.
 */
export function createWalletBalanceTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_wallet_balance",
    description:
      "Check the KeeperHub managed wallet balance across all chains. " +
      "Returns token balances including USDC (for x402 payments on Base) " +
      "and USDC.e (for MPP payments on Tempo). " +
      "Use before pay_and_run to confirm sufficient funds.",
    schema: z.object({
      chainId: z
        .number()
        .optional()
        .describe(
          "Filter by chain ID. Omit for all chains. Base=8453, Tempo=4217"
        ),
    }),
    func: async ({ chainId }) => {
      try {
        const wallet = await kh.wallet.getWallet();
        const w = wallet as Record<string, unknown>;

        // Try to get token balances
        let balances: unknown[] = [];
        try {
          const tokenData = await kh.wallet.getTokenBalances(
            chainId ? String(chainId) : undefined
          );
          balances = Array.isArray(tokenData) ? tokenData : [];
        } catch {
          // balances optional
        }

        // Highlight USDC balances for payment readiness
        const usdcBase = (balances as Record<string, unknown>[]).find(
          (b) =>
            String(b["address"]).toLowerCase() ===
            "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
        );
        const usdcTempo = (balances as Record<string, unknown>[]).find(
          (b) =>
            String(b["address"]).toLowerCase() ===
            "0x20c000000000000000000000b9537d11c60e8b50"
        );

        return JSON.stringify({
          ok: true,
          wallet_address: w["address"],
          balances: balances.slice(0, 20),
          payment_readiness: {
            x402_base_usdc: usdcBase
              ? {
                  balance: usdcBase["balance"],
                  symbol: "USDC",
                  chain: "Base (8453)",
                }
              : {
                  balance: "0",
                  symbol: "USDC",
                  chain: "Base (8453)",
                  hint: "Fund with USDC on Base for x402 payments",
                },
            mpp_tempo_usdce: usdcTempo
              ? {
                  balance: usdcTempo["balance"],
                  symbol: "USDC.e",
                  chain: "Tempo (4217)",
                }
              : {
                  balance: "0",
                  symbol: "USDC.e",
                  chain: "Tempo (4217)",
                  hint: "Fund with USDC.e on Tempo for MPP payments",
                },
          },
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
