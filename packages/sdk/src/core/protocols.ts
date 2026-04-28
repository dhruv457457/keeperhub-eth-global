import type {
  McpSchemaCatalog,
  Protocol,
  ProtocolAction,
  SearchProtocolActionsInput,
} from "../types/index.js";
import type { HttpClient } from "./client.js";

export class ProtocolsModule {
  constructor(private readonly client: HttpClient) {}

  /** List all available DeFi protocols */
  async list(): Promise<Protocol[]> {
    return this.client.request<Protocol[]>("GET", "/api/protocols");
  }

  /** Get a single protocol and its actions */
  async get(slug: string): Promise<Protocol> {
    return this.client.request<Protocol>("GET", `/api/protocols/${slug}`);
  }

  /** Search protocol actions by keyword or protocol name */
  async search(
    input: SearchProtocolActionsInput = {}
  ): Promise<ProtocolAction[]> {
    const catalog = await this.client.request<McpSchemaCatalog>(
      "GET",
      "/api/mcp/schemas"
    );
    const actions = Object.entries(catalog.actions ?? {}).map(
      ([actionType, schema]) => {
        const details = schema as Record<string, unknown>;
        const protocol = actionType.split("/")[0] ?? "";
        return {
          ...details,
          id: String(details["id"] ?? actionType),
          slug: actionType,
          actionType,
          label: String(details["label"] ?? details["name"] ?? actionType),
          protocol: String(details["protocol"] ?? protocol),
          type: String(details["type"] ?? "write"),
          inputs: [],
        } as ProtocolAction & { actionType: string; category?: string };
      }
    );

    const query = input.query?.toLowerCase();
    const protocol = input.protocol?.toLowerCase();

    return actions.filter((action) => {
      const actionType = action.actionType.toLowerCase();
      const label = action.label.toLowerCase();
      const description = String(action.description ?? "").toLowerCase();
      const actionProtocol = action.protocol.toLowerCase();
      return (
        (!protocol ||
          actionProtocol === protocol ||
          actionType.startsWith(`${protocol}/`)) &&
        (!query ||
          actionType.includes(query) ||
          label.includes(query) ||
          description.includes(query))
      );
    });
  }

  /**
   * Execute a DeFi protocol action.
   *
   * @param actionType  e.g. "aave/supply", "lido/wrap", "uniswap/exactInputSingle"
   * @param params      key/value inputs matching the action's schema
   *
   * @example
   * await kh.protocols.execute("aave/supply", {
   *   asset: "0xUSDC...",
   *   amount: "1000000000",
   *   onBehalfOf: "0xMyWallet...",
   * })
   */
  async execute(
    actionType: string,
    params: Record<string, unknown>
  ): Promise<{ executionId?: string; result?: unknown; status: string }> {
    return this.client.request("POST", "/api/execute/node", {
      body: { actionType, config: params },
    });
  }
}
