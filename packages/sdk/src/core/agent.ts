import type {
  AgentRegistration,
  AgentRegistryResponse,
} from "../types/index.js";
import type { HttpClient } from "./client.js";

export class AgentModule {
  constructor(private readonly client: HttpClient) {}

  /**
   * Get KeeperHub's ERC-8004 agent registry info.
   * Returns the public discovery payload including services + on-chain registrations.
   */
  async getRegistry(): Promise<AgentRegistryResponse> {
    return this.client.request<AgentRegistryResponse>(
      "GET",
      "/api/agent-registry"
    );
  }

  /** List all agent registrations for the org */
  async getRegistrations(): Promise<AgentRegistration[]> {
    const registry = await this.getRegistry();
    return registry.registrations;
  }

  /**
   * Register a workflow as an on-chain ERC-8004 agent.
   * Mints an ERC-721 NFT on Ethereum Mainnet to represent the agent.
   *
   * **Prefer `ensureRegistered()` over this method** — calling `register()`
   * directly on every agent startup creates duplicate on-chain registrations.
   */
  async register(input: {
    name?: string;
    description?: string;
    capabilities?: string[];
    workflowId?: string;
  }): Promise<AgentRegistration> {
    return this.client.request<AgentRegistration>(
      "POST",
      "/api/agent-registry",
      { body: input }
    );
  }

  /**
   * Register the agent only if no existing registrations are found.
   * Safe to call on every agent startup — will not create duplicates.
   *
   * @example
   * // In your agent's initialization:
   * const registration = await kh.agent.ensureRegistered({
   *   name: "My DeFi Agent",
   *   description: "Automates Aave compounding strategies",
   *   capabilities: ["aave/supply", "aave/borrow", "uniswap/swap"],
   * });
   */
  async ensureRegistered(input: {
    name?: string;
    description?: string;
    capabilities?: string[];
    workflowId?: string;
  }): Promise<AgentRegistration> {
    const existing = await this.getRegistrations().catch(
      () => [] as AgentRegistration[]
    );
    if (existing.length > 0) {
      // Return the most recent registration rather than creating a duplicate
      return existing[existing.length - 1];
    }
    return this.register(input);
  }
}
