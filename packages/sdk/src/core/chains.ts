import type { Chain } from "../types/index.js";
import type { HttpClient } from "./client.js";

export class ChainsModule {
  constructor(private readonly client: HttpClient) {}

  /** List all supported blockchain networks */
  async list(options?: { includeDisabled?: boolean }): Promise<Chain[]> {
    return this.client.request<Chain[]>("GET", "/api/chains", {
      query: { includeDisabled: options?.includeDisabled },
    });
  }

  /** Fetch ABI for a verified contract from the block explorer */
  async getAbi(contractAddress: string, chainId: number): Promise<unknown[]> {
    const res = await this.client.request<{ abi: unknown[] }>(
      "GET",
      `/api/chains/${chainId}/abi`,
      { query: { address: contractAddress } }
    );
    return res.abi;
  }
}
