import type { CreateIntegrationInput, Integration } from "../types/index.js";
import type { HttpClient } from "./client.js";

export class IntegrationsModule {
  constructor(private readonly client: HttpClient) {}

  async list(): Promise<Integration[]> {
    return this.client.request<Integration[]>("GET", "/api/integrations");
  }

  async get(integrationId: string): Promise<Integration> {
    return this.client.request<Integration>(
      "GET",
      `/api/integrations/${integrationId}`
    );
  }

  async create(input: CreateIntegrationInput): Promise<Integration> {
    return this.client.request<Integration>("POST", "/api/integrations", {
      body: input,
    });
  }

  /** Test an integration connection */
  async test(
    input: CreateIntegrationInput
  ): Promise<{ success: boolean; error?: string }> {
    return this.client.request("POST", "/api/integrations/test", {
      body: input,
    });
  }

  /** Test an existing integration by ID */
  async testById(
    integrationId: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.client.request(
      "POST",
      `/api/integrations/${integrationId}/test`
    );
  }
}
