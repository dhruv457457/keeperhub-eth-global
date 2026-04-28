import type { Wallet, WalletBalance, WalletToken } from "../types/index.js";
import type { HttpClient } from "./client.js";
import { validateBaseUrl } from "./client.js";

export class WalletModule {
  constructor(private readonly client: HttpClient) {}

  /** Get the active wallet for the org */
  async get(): Promise<Wallet> {
    return this.client.request<Wallet>("GET", "/api/user/wallet");
  }

  /** Alias for agent integrations that use the API naming. */
  async getWallet(): Promise<Wallet> {
    return this.get();
  }

  /** Get all token balances across chains */
  async balances(): Promise<WalletBalance[]> {
    const tokens = await this.tokens();
    return tokens.map((token) => ({
      token: token.symbol || token.address,
      balance: token.balance ?? "0",
      chainId: token.chainId,
    }));
  }

  /** List all tracked tokens */
  async tokens(): Promise<WalletToken[]> {
    const response = await this.client.request<
      WalletToken[] | { tokens?: WalletToken[] }
    >("GET", "/api/user/wallet/tokens");
    return Array.isArray(response) ? response : (response.tokens ?? []);
  }

  /** Alias for agent integrations that use the API naming. */
  async getTokenBalances(chainId?: string): Promise<WalletToken[]> {
    const tokens = await this.tokens();
    return chainId
      ? tokens.filter((token) => String(token.chainId) === chainId)
      : tokens;
  }

  /** Withdraw funds from the managed wallet */
  async withdraw(params: {
    to: string;
    amount: string;
    chainId: number;
    token?: string;
  }): Promise<{ success: boolean; txHash?: string }> {
    return this.client.request("POST", "/api/user/wallet/withdraw", {
      body: params,
    });
  }

  /** Set a custom RPC for a chain */
  async setRpc(chainId: number, rpcUrl: string): Promise<void> {
    // Validate before sending — prevents SSRF via malicious RPC URLs
    validateBaseUrl(rpcUrl);
    await this.client.request("POST", "/api/user/rpc-preferences", {
      body: { chainId, rpcUrl },
    });
  }

  /** Remove custom RPC for a chain (revert to default) */
  async removeRpc(chainId: number): Promise<void> {
    await this.client.request("DELETE", `/api/user/rpc-preferences/${chainId}`);
  }

  /** Get custom RPC preferences */
  async getRpcPreferences(): Promise<Record<string, string>> {
    return this.client.request("GET", "/api/user/rpc-preferences");
  }
}
