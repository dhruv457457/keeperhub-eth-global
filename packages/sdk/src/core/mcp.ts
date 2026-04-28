import type { McpSchemaCatalog } from "../types/index.js";
import type { HttpClient } from "./client.js";

/**
 * AI-facing discovery helpers — schema catalog and OpenAPI spec.
 *
 * To search and call listed workflows use kh.payments.catalog() and
 * kh.payments.execute() — those are the canonical payment-aware APIs.
 * McpModule only covers schema/spec discovery used by MCP tool builders.
 */
export class McpModule {
  constructor(private readonly client: HttpClient) {}

  /** Get the action/trigger JSON schema catalog. Filters are applied client-side. */
  async getSchemas(
    input?:
      | string
      | {
          category?: string;
          query?: string;
          protocol?: string;
        }
  ): Promise<McpSchemaCatalog> {
    const catalog = await this.client.request<McpSchemaCatalog>(
      "GET",
      "/api/mcp/schemas"
    );
    const filters =
      typeof input === "string" ? { query: input } : (input ?? {});
    const category = filters.category?.toLowerCase();
    const query = filters.query?.toLowerCase();
    const protocol = filters.protocol?.toLowerCase();

    if (!(category || query || protocol)) {
      return catalog;
    }

    const actions = Object.fromEntries(
      Object.entries(catalog.actions ?? {}).filter(([actionType, schema]) => {
        const details = schema as Record<string, unknown>;
        const haystack = [
          actionType,
          details["label"],
          details["name"],
          details["description"],
          details["category"],
          details["protocol"],
        ]
          .filter((value) => value !== undefined)
          .join(" ")
          .toLowerCase();
        const actionProtocol = actionType.split("/")[0]?.toLowerCase();
        return (
          (!category ||
            String(details["category"] ?? "")
              .toLowerCase()
              .includes(category)) &&
          (!protocol ||
            actionProtocol === protocol ||
            String(details["protocol"] ?? "").toLowerCase() === protocol) &&
          (!query || haystack.includes(query))
        );
      })
    );

    return { ...catalog, actions };
  }

  /** Get the full KeeperHub OpenAPI spec — useful for generating typed clients */
  async getOpenApiSpec(): Promise<Record<string, unknown>> {
    return this.client.request<Record<string, unknown>>("GET", "/api/openapi");
  }
}
