import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

// ERC-8004 AgentIdentity contract — deployed on mainnet, Base, Arbitrum, Polygon
// register() selector: 0x1aa3a008 — no args, mints to msg.sender (KH managed wallet)
const REGISTRY_CONTRACT = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

const SUPPORTED_CHAINS: Record<string, { label: string; nativeSymbol: string; explorer: string }> = {
  "8453":  { label: "Base",             nativeSymbol: "ETH",   explorer: "https://basescan.org" },
  "1":     { label: "Ethereum Mainnet", nativeSymbol: "ETH",   explorer: "https://etherscan.io" },
  "42161": { label: "Arbitrum One",     nativeSymbol: "ETH",   explorer: "https://arbiscan.io" },
  "137":   { label: "Polygon",          nativeSymbol: "MATIC",  explorer: "https://polygonscan.com" },
};

// Minimum ETH/gas to have before attempting registration (0.0001 ETH buffer)
const MIN_GAS_WEI = BigInt("100000000000000"); // 0.0001 ETH

export function createRegisterAgentTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_register_agent",
    description:
      "Register this AI agent on-chain as an ERC-8004 AgentIdentity NFT. " +
      "Mints a real NFT on Base (recommended — cheapest gas ~$0.01) or Ethereum mainnet/Arbitrum/Polygon. " +
      "Requires a tiny amount of ETH in the KH managed wallet for gas. " +
      "Call keeperhub_wallet_balance first to get the managed wallet address and check balance. " +
      "If wallet has no ETH, tell the user to send 0.001 ETH to the wallet address on Base, then retry. " +
      "Once funded, this mints a real NFT — idempotent if already registered on that chain.",
    schema: z.object({
      chainId: z
        .string()
        .optional()
        .default("8453")
        .describe(
          "Chain to register on. '8453' = Base (recommended, ~$0.01 gas). " +
          "'1' = Ethereum (~$10-50). '42161' = Arbitrum (~$0.05). '137' = Polygon (~$0.01 MATIC). " +
          "Default: '8453' (Base mainnet)."
        ),
    }),
    func: async ({ chainId = "8453" }) => {
      const chain = SUPPORTED_CHAINS[chainId];
      if (!chain) {
        return JSON.stringify({
          ok: false,
          error: `Chain ${chainId} not supported for registration. Use: ${Object.keys(SUPPORTED_CHAINS).join(", ")}`,
        });
      }

      try {
        // ── Step 1: Check current balance ──────────────────────────────────
        let walletAddress: string | undefined;
        let nativeBalance = "0";
        try {
          const balResult = await (kh.web3 as unknown as { getWallet: () => Promise<unknown> }).getWallet() as Record<string, unknown>;
          walletAddress = String(balResult["address"] ?? balResult["walletAddress"] ?? "");
          const tokens = (balResult["tokens"] as Array<Record<string, unknown>>) ?? [];
          const native = tokens.find(t =>
            String(t["chainId"]) === chainId &&
            (t["isNative"] === true || String(t["symbol"]).toUpperCase() === chain.nativeSymbol)
          );
          nativeBalance = String(native?.["balanceWei"] ?? native?.["balance"] ?? "0");
        } catch {
          // wallet() might not exist — continue anyway, let the call fail with clear message
        }

        // ── Step 2: Warn if balance looks too low ──────────────────────────
        const balWei = BigInt(nativeBalance.replace(/\D/g, "") || "0");
        if (walletAddress && balWei < MIN_GAS_WEI) {
          return JSON.stringify({
            ok: false,
            needs_funding: true,
            chain: chain.label,
            chainId,
            wallet_address: walletAddress,
            current_balance_wei: nativeBalance,
            error:
              `Managed wallet has insufficient ${chain.nativeSymbol} for gas on ${chain.label}. ` +
              `Send at least 0.001 ${chain.nativeSymbol} to ${walletAddress} on ${chain.label}, then retry.`,
            funding_hint:
              `Minimum needed: ~0.0001 ${chain.nativeSymbol} (~$0.01 on Base). ` +
              `Recommended: 0.001 ${chain.nativeSymbol} for safety.`,
            explorer_address: `${chain.explorer}/address/${walletAddress}`,
          });
        }

        // ── Step 3: Check if already registered ───────────────────────────
        // ownerOf(tokenId) would tell us, but we don't know our tokenId yet.
        // Just attempt register() — the contract is idempotent (won't duplicate).

        // ── Step 4: Call register() on the contract ────────────────────────
        const execResult = await kh.web3.write({
          network: chainId,
          contract: REGISTRY_CONTRACT,
          function: "register",
          args: [],
        }) as Record<string, unknown>;

        const txHash = String(execResult["transactionHash"] ?? execResult["tx_hash"] ?? "");
        const tokenId = String(execResult["result"] ?? execResult["tokenId"] ?? "");

        if (!txHash && !tokenId) {
          return JSON.stringify({
            ok: false,
            chain: chain.label,
            chainId,
            raw: execResult,
            error: "Registration call succeeded but no transaction hash returned. Check block explorer.",
          });
        }

        return JSON.stringify({
          ok: true,
          registered: true,
          chain: chain.label,
          chainId,
          contract: REGISTRY_CONTRACT,
          token_id: tokenId || "pending",
          transaction_hash: txHash,
          transaction_link: txHash ? `${chain.explorer}/tx/${txHash}` : null,
          wallet_address: walletAddress,
          nft_standard: "ERC-8004 AgentIdentity",
          summary:
            `✅ Agent registered on ${chain.label}! ` +
            (txHash ? `Tx: ${chain.explorer}/tx/${txHash}` : "Token minted."),
        });

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const needsFunding = msg.includes("insufficient funds");

        if (needsFunding) {
          return JSON.stringify({
            ok: false,
            needs_funding: true,
            chain: chain.label,
            chainId,
            contract: REGISTRY_CONTRACT,
            error:
              `KH managed wallet has no ${chain.nativeSymbol} on ${chain.label} for gas. ` +
              `Call keeperhub_wallet_balance to get your wallet address, ` +
              `then send 0.001 ${chain.nativeSymbol} to it on ${chain.label}.`,
            gas_estimate: chainId === "8453"
              ? "~0.0000037 ETH (~$0.01) needed, send 0.001 ETH to be safe"
              : chainId === "1"
              ? "~0.002-0.01 ETH needed on mainnet"
              : `~0.0001 ${chain.nativeSymbol} needed`,
          });
        }

        return JSON.stringify({ ok: false, chain: chain.label, chainId, error: msg });
      }
    },
  });
}
