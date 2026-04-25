import type {
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
    return this.client.request<ProtocolAction[]>("GET", "/api/mcp/schemas", {
      query: {
        category: "protocol",
        q: input.query,
        protocol: input.protocol,
      },
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
      body: { actionType: `protocol/${actionType}`, params },
    });
  }
}
