import type { ApiKey, CreatedApiKey } from "../types/index.js";
import type { HttpClient } from "./client.js";

export class ApiKeysModule {
  constructor(private readonly client: HttpClient) {}

  async list(): Promise<ApiKey[]> {
    return this.client.request<ApiKey[]>("GET", "/api/api-keys");
  }

  /** Create a new API key. The full key is only returned once. */
  async create(input?: { name?: string }): Promise<CreatedApiKey> {
    return this.client.request<CreatedApiKey>("POST", "/api/api-keys", {
      body: input,
    });
  }

  /** Revoke an API key permanently */
  async revoke(keyId: string): Promise<void> {
    await this.client.request("DELETE", `/api/api-keys/${keyId}`);
  }
}
