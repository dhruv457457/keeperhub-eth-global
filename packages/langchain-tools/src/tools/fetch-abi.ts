import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Fetches the verified ABI for a smart contract.
 * KeeperHub automatically resolves proxy patterns so the agent always gets the
 * implementation ABI (EIP-1967, UUPS, Transparent Proxy, Diamond, Gnosis Safe).
 */
export function createFetchAbiTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_fetch_contract_abi",
    description:
      "Fetch the verified ABI for a smart contract on any supported network. " +
      "Automatically resolves proxy contracts (EIP-1967, UUPS, Transparent Proxy, Diamond) " +
      "to return the implementation ABI. " +
      "Use this before calling a contract to discover its available functions.",
    schema: z.object({
      chainId: z
        .number()
        .int()
        .positive()
        .describe("Chain ID (e.g. 8453 for Base, 1 for Ethereum)"),
      contractAddress: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid 0x address")
        .describe("Smart contract address (0x...)"),
    }),
    func: async ({ chainId, contractAddress }) => {
      try {
        const abi = await kh.chains.getAbi(contractAddress, chainId);
        return JSON.stringify({ ok: true, abi });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
