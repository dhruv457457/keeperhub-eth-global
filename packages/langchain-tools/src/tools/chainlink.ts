import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Chainlink CCIP — cross-chain token transfers between 5+ chains.
 * Full flow: check fee → approve bridge token → approve fee token → send.
 *
 * Supported chains for CCIP: Ethereum (1), Base (8453), Arbitrum (42161),
 * Optimism (10), Polygon (137), Avalanche (43114), BNB (56)
 */
export function createChainlinkCcipTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_chainlink_ccip",
    description:
      "Send tokens cross-chain using Chainlink CCIP (Cross-Chain Interoperability Protocol). " +
      "Supports Ethereum, Base, Arbitrum, Optimism, Polygon, Avalanche, BNB. " +
      "Handles the full flow: fee quote → approve bridge token → approve fee token → send. " +
      "Set feeToken='LINK' to pay fees in LINK, or 'native' for native gas token.",
    schema: z.object({
      action: z
        .enum([
          "ccip-send",
          "ccip-get-fee",
          "ccip-approve-bridge-token",
          "ccip-approve-fee-token",
          "ccip-check-bridge-balance",
          "ccip-check-bridge-allowance",
          "ccip-check-fee-balance",
          "ccip-check-fee-allowance",
        ])
        .describe(
          "CCIP action to perform. Start with 'ccip-get-fee' to quote, then 'ccip-send' to execute."
        ),
      params: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .describe(
          "Action parameters. For ccip-send: { destinationChainSelector, receiver, tokenAmounts, data, feeToken }. " +
            "For ccip-get-fee: same fields. For approve: { spender, amount }. For check: { account, owner }"
        ),
    }),
    func: async ({ action, params }) => {
      try {
        const result = await kh.protocols.execute(
          `chainlink/${action}`,
          params
        );
        const r = result as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          action: `chainlink/${action}`,
          execution_id: r["executionId"],
          status: r["status"],
          result: r["result"],
          hint: r["executionId"]
            ? "Call check_keeperhub_execution to get the tx hash."
            : undefined,
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          action: `chainlink/${action}`,
          error: String(err),
        });
      }
    },
  });
}

/**
 * Chainlink Price Feeds — get latest price for any asset pair.
 * Returns the current price from on-chain Chainlink aggregators.
 */
export function createChainlinkPriceFeedTool(
  kh: KeeperHub
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_chainlink_price",
    description:
      "Get the latest price from a Chainlink oracle price feed using a contract address. " +
      "Common ETH mainnet feeds: ETH/USD=0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419, " +
      "BTC/USD=0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88b. " +
      "Base mainnet: ETH/USD=0x71041dddad3595F9CEd3dCCFBe3D1F4b0a16Bb70. " +
      "Returns price, roundId, and timestamp from the on-chain aggregator.",
    schema: z.object({
      contractAddress: z
        .string()
        .describe("Chainlink price feed contract address (0x...). E.g. ETH/USD on mainnet: 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"),
      network: z
        .string()
        .default("1")
        .describe("Chain ID. Ethereum=1, Base=8453, Arbitrum=42161. Default: 1 (Ethereum mainnet)"),
    }),
    func: async ({ contractAddress, network }) => {
      try {
        // Call latestRoundData() directly on the Chainlink aggregator contract
        const net = network ?? "1";
        const result = await kh.web3.read({
          network: net,
          contract: contractAddress,
          function: "latestRoundData",
          args: [],
        });
        const r = result as Record<string, unknown> ?? {};
        // latestRoundData returns (roundId, answer, startedAt, updatedAt, answeredInRound)
        const answer = r["answer"] ?? r["1"] ?? r["result"];
        return JSON.stringify({
          ok: true,
          contract: contractAddress,
          network: net,
          raw_answer: answer,
          note: "Divide raw_answer by 10^8 for USD price (Chainlink uses 8 decimals for USD pairs)",
          price_usd: answer ? (Number(answer) / 1e8).toFixed(2) : null,
          round_id: r["roundId"] ?? r["0"],
          updated_at: r["updatedAt"] ?? r["3"],
        });
      } catch (err) {
        return JSON.stringify({ ok: false, contractAddress, error: String(err) });
      }
    },
  });
}
