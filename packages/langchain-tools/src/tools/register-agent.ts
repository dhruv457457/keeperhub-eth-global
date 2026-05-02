import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Get KeeperHub's ERC-8004 agent registry card.
 *
 * NOTE: /api/agent-registry is a GET-only endpoint that returns KeeperHub's
 * own ERC-8004 agent card (agentId 31875 on Ethereum mainnet). It does NOT
 * register a new agent for the caller — POST returns 405.
 *
 * For actual on-chain user agent registration, the caller would need to call
 * the ERC-8004 registry contract (0x8004A169FB4a3325136EB29fA0ceB6D2e539a432)
 * directly via keeperhub_contract_call with a funded wallet.
 */
export function createRegisterAgentTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_register_agent",
    description:
      "Get KeeperHub's ERC-8004 agent registry info — the on-chain identity card for " +
      "the KeeperHub platform (agentId 31875 on Ethereum mainnet). " +
      "Returns the MCP endpoint, ENS name (keeperhub.eth), supported services, and registry address. " +
      "Use this to discover KeeperHub's on-chain identity and MCP connection details. " +
      "NOTE: This does NOT register YOUR agent — it reads KeeperHub's existing registry card. " +
      "To register your own agent on-chain, use keeperhub_contract_call with the ERC-8004 " +
      "registry contract (0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) on a funded wallet.",
    schema: z.object({}),
    func: async () => {
      try {
        const raw = await (kh as unknown as {
          _http: { request: (m: string, p: string) => Promise<unknown> }
        })._http.request("GET", "/api/agent-registry");
        const r = raw as Record<string, unknown>;
        const registrations = (r["registrations"] as Array<Record<string, unknown>>) ?? [];
        const services = (r["services"] as Array<Record<string, unknown>>) ?? [];
        const mcpEndpoint = services.find(s => s["name"] === "mcp")?.["endpoint"];
        const ensName = services.find(s => s["name"] === "ens")?.["endpoint"];
        const latest = registrations[registrations.length - 1];

        return JSON.stringify({
          ok: true,
          platform: r["name"],
          description: r["description"],
          ens: ensName,
          mcp_endpoint: mcpEndpoint,
          agent_id: latest?.["agentId"],
          registry_address: latest?.["agentRegistry"],
          x402_support: r["x402Support"],
          note: "This is KeeperHub's platform identity (ERC-8004). To register YOUR OWN agent on-chain, call the registry contract at 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 with a funded wallet.",
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
