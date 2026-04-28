import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Execute any DeFi protocol action directly — Aave, Uniswap, Lido, Curve,
 * Compound, Morpho, Yearn, and 14 more — without writing a workflow first.
 *
 * actionType format: "protocol/action"
 * Examples:
 *   aave-v3/supply          aave-v3/withdraw         aave-v3/borrow
 *   uniswap/swap-exact-input lido/wrap                compound-v3/supply
 *   curve/exchange           morpho/supply            yearn-v3/deposit
 *   cowswap/create-order     rocket-pool/stake        pendle/swap
 */
export function createProtocolActionTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_protocol_action",
    description:
      "Execute a DeFi protocol action directly — Aave, Uniswap, Lido, Curve, Compound, Morpho, Yearn, " +
      "Aerodrome, CowSwap, Rocket Pool, Pendle, Sky, Spark, Ethena, and more. " +
      "Format: actionType='protocol/action' e.g. 'aave-v3/supply', 'uniswap/swap-exact-input', 'lido/wrap'. " +
      "Returns execution_id for write actions. Use keeperhub_list_protocols to discover available actions.",
    schema: z.object({
      actionType: z
        .string()
        .min(3)
        .describe(
          "Protocol action in 'protocol/action' format. Examples: " +
            "'aave-v3/supply', 'aave-v3/borrow', 'aave-v3/withdraw', " +
            "'uniswap/swap-exact-input', 'lido/wrap', 'compound-v3/supply', " +
            "'curve/exchange', 'morpho/supply', 'yearn-v3/deposit', " +
            "'cowswap/create-order', 'rocket-pool/stake', 'pendle/swap'"
        ),
      params: z
        .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
        .describe("Action parameters matching the protocol's input schema"),
    }),
    func: async ({ actionType, params }) => {
      try {
        const result = await kh.protocols.execute(actionType, params);
        const r = result as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          execution_id: r["executionId"],
          status: r["status"],
          result: r["result"],
          hint: r["executionId"]
            ? "Call check_keeperhub_execution to get the tx hash."
            : undefined,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}

/**
 * List all available DeFi protocols and their actions.
 * Use this to discover valid actionType values before calling keeperhub_protocol_action.
 */
export function createListProtocolsTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_list_protocols",
    description:
      "List all available DeFi protocols and their actions. " +
      "Returns protocol slugs, names, and available actions with parameter schemas. " +
      "Use this to discover valid actionType values for keeperhub_protocol_action.",
    schema: z.object({
      query: z
        .string()
        .optional()
        .describe("Optional search query e.g. 'supply' or 'aave'"),
      protocol: z
        .string()
        .optional()
        .describe("Filter by protocol slug e.g. 'aave-v3'"),
    }),
    func: async ({ query, protocol }) => {
      try {
        const actions = await kh.protocols.search({ query, protocol });
        return JSON.stringify({
          ok: true,
          count: actions.length,
          actions: actions.slice(0, 20).map((a) => {
            const action = a as Record<string, unknown>;
            return {
              actionType: action["actionType"] ?? action["slug"],
              name: action["name"],
              protocol: action["protocol"],
              description: action["description"],
            };
          }),
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
