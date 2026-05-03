import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

/**
 * Injects KeeperHub wallet context: address and real native token balances.
 * Uses /api/user/wallet/balances — the correct endpoint.
 * /api/user/wallet/tokens always returns empty (broken endpoint).
 */
export function createWalletProvider(kh: KeeperHub): Provider {
  return {
    get: async (
      _runtime: IAgentRuntime,
      _message: Memory,
      _state?: State
    ): Promise<string> => {
      try {
        const walletInfo = await kh.wallet.get();
        const addr = walletInfo.address ?? "";
        const shortAddr =
          addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

        // Use correct balances endpoint — /tokens always returns []
        const kh_ = kh as unknown as {
          _http: { request: (m: string, p: string) => Promise<unknown> }
        };
        const balData = await kh_._http.request("GET", "/api/user/wallet/balances") as Record<string, unknown>;
        const chains = (balData["balances"] as Record<string, unknown>[]) ?? [];

        // Build balance lines: native ETH/MATIC per chain + ERC-20 tokens
        const lines: string[] = [];
        for (const chain of chains) {
          const nativeBal = String(chain["nativeBalance"] ?? chain["nativeBal"] ?? "0");
          const symbol = String(chain["symbol"] ?? "");
          const chainName = String(chain["chainName"] ?? chain["chainId"] ?? "");
          if (parseFloat(nativeBal) > 0) {
            lines.push(`- ${chainName}: ${nativeBal} ${symbol}`);
          }
          const tokens = (chain["tokens"] as Record<string, unknown>[]) ?? [];
          for (const tok of tokens) {
            const bal = String(tok["balance"] ?? "0");
            if (parseFloat(bal) > 0) {
              lines.push(`- ${chainName}: ${bal} ${tok["symbol"]}`);
            }
          }
        }

        return [
          "KeeperHub Managed Wallet:",
          `- Address: ${shortAddr}`,
          `- Active: ${walletInfo.isActive ?? true}`,
          lines.length > 0
            ? `\nBalances:\n${lines.join("\n")}`
            : "\nBalances: (all chains empty — fund wallet to execute transactions)",
        ].join("\n");
      } catch (err) {
        elizaLogger.warn(
          `[KeeperHub] Wallet provider failed: ${err instanceof Error ? err.message : String(err)}`
        );
        return "KeeperHub Wallet: (unavailable — check API key)";
      }
    },
  };
}
