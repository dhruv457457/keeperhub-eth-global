import type {
  McpSchemaCatalog,
} from "../types/index.js";
import type { HttpClient } from "./client.js";

/**
 * AI-facing discovery helpers — schema catalog and OpenAPI spec.
 *
 * To search and call listed workflows use kh.payments.catalog() and
 * kh.payments.execute() — those are the canonical payment-aware APIs.
 * McpModule only covers schema/spec discovery used by MCP tool builders.
 */
export class McpModule {
  constructor(
    private readonly client: HttpClient
  ) {}

  /** Get the action/trigger JSON schema catalog, optionally filtered by category */
  async getSchemas(category?: string): Promise<McpSchemaCatalog> {
    return this.client.request<McpSchemaCatalog>("GET", "/api/mcp/schemas", {
      query: { category },
    });
  }

  /** Get the full KeeperHub OpenAPI spec — useful for generating typed clients */
  async getOpenApiSpec(): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>("GET", "/api/openapi");
  }
}
