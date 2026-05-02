import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Estimate gas cost for a contract call before submitting.
 * Returns estimated gas units, ETH cost, and USD cost (when available).
 */
export function createEstimateGasTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_estimate_gas",
    description:
      "Estimate gas cost for a smart contract function call before executing it. " +
      "Returns estimated gas units, ETH cost, and USD cost when available. " +
      "Use this to check affordability before calling keeperhub_contract_call with callType='write'.",
    schema: z.object({
      network: z.string().describe("Chain ID as string"),
      contract: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .describe("Contract address"),
      function: z.string().describe("Function name to estimate gas for"),
      args: z.array(z.unknown()).optional().describe("Function arguments"),
    }),
    func: async ({ network, contract, function: fn, args }) => {
      try {
        // Fetch ABI first (required for gas estimation)
        let abi: unknown[] = [];
        try {
          abi = await kh.web3.getAbi(contract, Number(network));
        } catch {
          // ABI fetch failed — try without it
        }
        const kh_ = kh as unknown as { _http: { request: (m: string, p: string, o: object) => Promise<unknown> } };
        const estimate = await kh_._http.request("POST", "/api/gas/estimate", {
          body: {
            chainId: network,
            actionSlug: "write-contract",
            contractAddress: contract,
            ...(abi.length ? { abi: JSON.stringify(abi) } : {}),
            abiFunction: fn,
            functionArgs: args ? JSON.stringify(args) : undefined,
            config: { network, contractAddress: contract },
          },
        });

        const e = estimate as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          estimated_gas: e["estimatedGas"],
          estimated_eth: e["estimatedEth"],
          estimated_usd: e["estimatedUsd"],
          gas_price: e["gasPrice"],
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
