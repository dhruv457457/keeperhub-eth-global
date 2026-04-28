import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

/**
 * Injects KeeperHub wallet context: address and top token balances.
 * Lets the agent know its wallet state so it can make informed decisions.
 */
export function createWalletProvider(kh: KeeperHub): Provider {
  return {
    get: async (
      _runtime: IAgentRuntime,
      _message: Memory,
      _state?: State
    ): Promise<string> => {
      try {
        const [wallet, balances] = await Promise.all([
          kh.wallet.get(),
          kh.wallet.balances(),
        ]);

        // Truncate address to 0x1234...abcd to avoid leaking full address into logs/context
        const addr = wallet.address ?? "";
        const shortAddr =
          addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

        const topBalances = balances
          .filter((b) => Number(b.balance) > 0)
          .slice(0, 10)
          .map(
            (b) =>
              `- ${b.token}: ${b.balance}${b.usdValue ? ` (~$${b.usdValue})` : ""}`
          )
          .join("\n");

        return [
          "KeeperHub Wallet:",
          `- Address: ${shortAddr}`,
          `- Provider: ${wallet.provider}`,
          `- Active: ${wallet.isActive}`,
          balances.length > 0
            ? `\nToken Balances:\n${topBalances || "  (all zero)"}`
            : "No balances loaded.",
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
