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
      "Check the KeeperHub managed wallet balance and get the wallet address. " +
      "ALWAYS use this first when the user asks for their wallet address, balance, or funds. " +
      "Returns wallet_address (the existing wallet), token balances, " +
      "USDC (for x402 payments on Base) and USDC.e (for MPP payments on Tempo). " +
      "Do NOT use keeperhub_provision_wallet unless this returns no wallet_address.",
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
        // Get wallet address
        const walletInfo = await kh.wallet.getWallet();
        const w = walletInfo as Record<string, unknown>;
        const walletAddress = String(w["walletAddress"] ?? w["address"] ?? "");

        // /api/user/wallet/balances is the correct endpoint (tokens returns empty)
        const kh_ = kh as unknown as {
          _http: { request: (m: string, p: string) => Promise<unknown> }
        };
        const balData = await kh_._http.request("GET", "/api/user/wallet/balances") as Record<string, unknown>;
        const allChains = (balData["balances"] as Record<string, unknown>[]) ?? [];

        // Filter by chainId if specified, otherwise all chains with balance
        const chains = chainId
          ? allChains.filter(c => String(c["chainId"]) === String(chainId))
          : allChains;

        // Build per-chain summary
        const summary = chains.map(chain => {
          const tokens = (chain["tokens"] as Record<string, unknown>[]) ?? [];
          const supported = (chain["supportedTokens"] as Record<string, unknown>[]) ?? [];
          const allTokens = tokens.length > 0 ? tokens : supported;
          return {
            chainId: chain["chainId"],
            chain: chain["chainName"],
            native: {
              symbol: chain["symbol"],
              balance: chain["nativeBalance"] ?? chain["nativeBal"] ?? "0",
            },
            tokens: allTokens
              .filter(t => parseFloat(String(t["balance"] ?? "0")) > 0)
              .map(t => ({ symbol: t["symbol"], balance: t["balance"], address: t["tokenAddress"] })),
          };
        });

        // Chains with any balance
        const funded = summary.filter(c =>
          parseFloat(String(c.native.balance)) > 0 || c.tokens.length > 0
        );

        // USDC on Base for x402
        const baseChain = allChains.find(c => String(c["chainId"]) === "8453");
        const baseTokens = ((baseChain?.["tokens"] ?? baseChain?.["supportedTokens"]) as Record<string,unknown>[] ?? []);
        const usdcBase = baseTokens.find(t => String(t["tokenAddress"]).toLowerCase() === "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913");
        const tempoChain = allChains.find(c => String(c["chainId"]) === "4217");
        const tempoTokens = ((tempoChain?.["tokens"] ?? tempoChain?.["supportedTokens"]) as Record<string,unknown>[] ?? []);
        const usdcTempo = tempoTokens.find(t => String(t["tokenAddress"]).toLowerCase() === "0x20c000000000000000000000b9537d11c60e8b50");

        return JSON.stringify({
          ok: true,
          wallet_address: walletAddress,
          funded_chains: funded,
          all_chains: summary,
          payment_readiness: {
            x402_base_usdc: {
              balance: String(usdcBase?.["balance"] ?? "0"),
              symbol: "USDC",
              chain: "Base (8453)",
              hint: parseFloat(String(usdcBase?.["balance"] ?? "0")) === 0
                ? "Fund with USDC on Base for x402 payments" : undefined,
            },
            mpp_tempo_usdce: {
              balance: String(usdcTempo?.["balance"] ?? "0"),
              symbol: "USDC.e",
              chain: "Tempo (4217)",
              hint: parseFloat(String(usdcTempo?.["balance"] ?? "0")) === 0
                ? "Fund with USDC.e on Tempo for MPP payments" : undefined,
            },
          },
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
