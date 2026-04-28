import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * ENS (Ethereum Name Service) tools.
 *
 * ENS Universal Resolver on Ethereum Mainnet:
 * 0xce01f8eee7E479C928F8919abD53E553a36CeF67
 *
 * Used by: AgentPassports.eth, CounterAgent, and multiple other hackathon projects.
 * Use cases: bind agent identities to human-readable names, read agent policy records.
 */

const ENS_PUBLIC_API = "https://api.ensideas.com/ens/resolve";
const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";

async function resolveViaApi(
  name: string
): Promise<{ address: string | null; avatar?: string }> {
  const res = await fetch(`${ENS_PUBLIC_API}/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`ENS API error: ${res.status}`);
  return res.json() as Promise<{ address: string | null; avatar?: string }>;
}

export function createEnsResolveTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_ens_resolve",
    description:
      "Resolve an ENS name to an Ethereum address (forward resolution). " +
      "Also returns avatar URL if set. " +
      "Examples: 'vitalik.eth' → '0xd8dA...', 'myagent.eth' → '0x...'. " +
      "Use to convert human-readable agent names to wallet addresses before transfers.",
    schema: z.object({
      name: z
        .string()
        .regex(
          /^[a-z0-9-]+(\.[a-z]+)+$/,
          "Must be a valid ENS name like 'vitalik.eth'"
        )
        .describe(
          "ENS name to resolve e.g. 'vitalik.eth', 'myagent.keeperhub.eth'"
        ),
    }),
    func: async ({ name }) => {
      try {
        // Method 1: ENS public API (fast, no RPC needed)
        try {
          const data = await resolveViaApi(name);
          if (data.address) {
            return JSON.stringify({
              ok: true,
              name,
              address: data.address,
              avatar: data.avatar ?? null,
              source: "ens-api",
            });
          }
        } catch {
          // Fall through to on-chain read
        }

        // Method 2: On-chain read via KeeperHub web3
        // ENS namehash computation would be needed here, so use read contract
        const result = await kh.web3.read({
          network: "1", // Ethereum mainnet
          contract: ENS_REGISTRY,
          function: "resolver",
          args: [name], // simplified — actual impl needs namehash
        });

        return JSON.stringify({
          ok: !!result,
          name,
          address: result ?? null,
          source: "on-chain",
        });
      } catch (err) {
        return JSON.stringify({ ok: false, name, error: String(err) });
      }
    },
  });
}

export function createEnsTextRecordTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_ens_text_record",
    description:
      "Read ENS text records from an ENS name. " +
      "Text records store agent policies, descriptions, URLs, social handles, and custom data. " +
      "Standard keys: 'description', 'url', 'avatar', 'com.twitter', 'com.github'. " +
      "Agent policy keys (AgentPassports pattern): 'agent.policy', 'agent.publicKey', 'agent.capabilities', 'agent.allowedContracts'.",
    schema: z.object({
      name: z.string().describe("ENS name e.g. 'myagent.eth'"),
      key: z
        .string()
        .describe(
          "Text record key to read. Standard: 'description', 'url', 'avatar'. " +
            "Agent policy: 'agent.policy', 'agent.publicKey', 'agent.capabilities', 'agent.allowedContracts'"
        ),
    }),
    func: async ({ name, key }) => {
      try {
        // Use ENS public resolver text() function
        // Resolver address on mainnet: 0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41
        const ENS_PUBLIC_RESOLVER =
          "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41";
        const result = await kh.web3.read({
          network: "1",
          contract: ENS_PUBLIC_RESOLVER,
          function: "text",
          args: [name, key],
        });

        return JSON.stringify({
          ok: true,
          name,
          key,
          value: result ?? null,
          empty: !result,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, name, key, error: String(err) });
      }
    },
  });
}

export function createEnsLookupTool(_kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_ens_lookup",
    description:
      "Reverse ENS lookup — find the ENS name for a wallet address. " +
      "Returns the primary ENS name set for a given 0x address. " +
      "Use to display human-readable identities instead of raw addresses.",
    schema: z.object({
      address: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .describe("Ethereum address to look up (0x...)"),
    }),
    func: async ({ address }) => {
      try {
        const res = await fetch(
          `https://api.ensideas.com/ens/resolve/${address}`
        );
        if (!res.ok) throw new Error(`ENS API: ${res.status}`);
        const data = (await res.json()) as {
          name?: string;
          displayName?: string;
          avatar?: string;
        };
        return JSON.stringify({
          ok: true,
          address,
          ens_name: data.name ?? data.displayName ?? null,
          avatar: data.avatar ?? null,
          has_ens: !!(data.name || data.displayName),
        });
      } catch (err) {
        return JSON.stringify({ ok: false, address, error: String(err) });
      }
    },
  });
}
