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
        const result = await kh.protocols.execute(`chainlink/${action}`, params);
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
        return JSON.stringify({ ok: false, action: `chainlink/${action}`, error: String(err) });
      }
    },
  });
}

/**
 * Chainlink Price Feeds — get latest price for any asset pair.
 * Returns the current price from on-chain Chainlink aggregators.
 */
export function createChainlinkPriceFeedTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_chainlink_price",
    description:
      "Get the latest price from a Chainlink oracle price feed. " +
      "Common feeds: eth-usd, btc-usd, link-usd, usdc-usd, matic-usd, avax-usd. " +
      "Returns price, decimals, and timestamp from the on-chain aggregator.",
    schema: z.object({
      feed: z
        .string()
        .describe(
          "Price feed slug e.g. 'eth-usd', 'btc-usd', 'link-usd', 'matic-usd'. " +
          "Format: {asset}-{quote} in lowercase."
        ),
    }),
    func: async ({ feed }) => {
      try {
        const result = await kh.protocols.execute(
          `chainlink/${feed}-latest-round-data`,
          {}
        );
        const r = result as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          feed,
          price: r["result"] ?? r["answer"],
          result: r["result"],
          execution_id: r["executionId"],
        });
      } catch (err) {
        return JSON.stringify({ ok: false, feed, error: String(err) });
      }
    },
  });
}
