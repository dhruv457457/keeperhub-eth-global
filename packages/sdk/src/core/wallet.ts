import type { Wallet, WalletBalance, WalletToken } from "../types/index.js";
import { validateBaseUrl } from "./client.js";
import type { HttpClient } from "./client.js";

export class WalletModule {
  constructor(private readonly client: HttpClient) {}

  /** Get the active wallet for the org */
  async get(): Promise<Wallet> {
    return this.client.request<Wallet>("GET", "/api/user/wallet/active");
  }

  /** Get all token balances across chains */
  async balances(): Promise<WalletBalance[]> {
    return this.client.request<WalletBalance[]>(
      "GET",
      "/api/user/wallet/balances"
    );
  }

  /** List all tracked tokens */
  async tokens(): Promise<WalletToken[]> {
    return this.client.request<WalletToken[]>("GET", "/api/user/wallet/tokens");
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
