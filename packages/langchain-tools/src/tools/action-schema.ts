import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

function schemaEntries(
  schemas: unknown
): Array<[string, Record<string, unknown>]> {
  const actions =
    schemas && typeof schemas === "object"
      ? (schemas as { actions?: Record<string, unknown> }).actions
      : undefined;
  return Object.entries(actions ?? {}).map(([actionType, schema]) => [
    actionType,
    schema as Record<string, unknown>,
  ]);
}

/**
 * Get the full schema for any KeeperHub action: required fields, optional fields,
 * and output fields. Agents use this before calling keeperhub_protocol_action
 * to know exactly what parameters are needed.
 */
export function createGetActionSchemaTool(
  kh: KeeperHub
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_get_action_schema",
    description:
      "Get the full parameter schema for any KeeperHub action before calling it. " +
      "Returns required fields, optional fields, output fields, and descriptions. " +
      "Use this BEFORE keeperhub_protocol_action so you know exactly what params to pass. " +
      "Covers all 396 actions: aave-v3/supply, uniswap/swap-exact-input, chainlink/ccip-send, " +
      "lido/wrap, code/run-code, math/aggregate, discord/send-message, etc.",
    schema: z.object({
      actionType: z
        .string()
        .describe(
          "Action type to look up. Format: 'protocol/action' or 'plugin/action'. " +
            "Examples: 'aave-v3/supply', 'uniswap/swap-exact-input', 'chainlink/ccip-send', " +
            "'lido/wrap', 'code/run-code', 'math/aggregate', 'discord/send-message', " +
            "'ajna/get-borrower-info', 'morpho/supply', 'cowswap/create-order'"
        ),
    }),
    func: async ({ actionType }) => {
      try {
        const schemas = await kh.mcp.getSchemas({ query: actionType });
        const match = schemaEntries(schemas).find(
          ([key, schema]) =>
            key === actionType ||
            schema["actionType"] === actionType ||
            schema["type"] === actionType ||
            key.endsWith(`/${actionType}`)
        );

        if (!match) {
          const allSchemas = await kh.mcp.getSchemas({});
          const found = schemaEntries(allSchemas).find(([key]) =>
            key.toLowerCase().includes(actionType.toLowerCase())
          );

          if (!found) {
            return JSON.stringify({
              ok: false,
              error: `Action '${actionType}' not found.`,
              hint: "Use keeperhub_list_protocols to discover valid action types.",
            });
          }

          return JSON.stringify({
            ok: true,
            action_type: found[0],
            schema: { actionType: found[0], ...found[1] },
            note: "Fuzzy match",
          });
        }

        const [matchedActionType, s] = match;
        return JSON.stringify({
          ok: true,
          action_type: matchedActionType,
          label: s["label"],
          description: s["description"],
          category: s["category"],
          requires_credentials: s["requiresCredentials"],
          required_fields: s["requiredFields"] ?? {},
          optional_fields: s["optionalFields"] ?? {},
          output_fields: s["outputFields"] ?? {},
          hint: `Call keeperhub_protocol_action with action_type='${matchedActionType}' and the required_fields above.`,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}

/**
 * Search across all KeeperHub actions by keyword.
 */
export function createSearchActionsTool(kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_search_actions",
    description:
      "Search all 396 KeeperHub actions by keyword, protocol, or category. " +
      "Returns matching actions with required fields and descriptions. " +
      "Use before keeperhub_protocol_action to discover the right action type. " +
      "Example queries: 'supply', 'swap', 'bridge', 'stake', 'send message', 'aggregate'",
    schema: z.object({
      query: z
        .string()
        .min(2)
        .describe("Search keyword e.g. 'supply', 'swap', 'ccip', 'stake'"),
      category: z
        .string()
        .optional()
        .describe(
          "Filter by category e.g. 'Aave V3', 'Uniswap', 'Chainlink', 'Code', 'Math', 'Discord'"
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe("Max results (default 10)"),
    }),
    func: async ({ query, category, limit }) => {
      try {
        const schemas = await kh.mcp.getSchemas({ query, category });
        const entries = schemaEntries(schemas);
        const results = entries.slice(0, limit);

        return JSON.stringify({
          ok: true,
          query,
          total_found: entries.length,
          results: results.map(([actionType, r]) => ({
            action_type: actionType,
            label: r["label"],
            category: r["category"],
            description: r["description"],
            required_fields: r["requiredFields"] ?? {},
            requires_credentials: r["requiresCredentials"],
          })),
          hint: "Use keeperhub_get_action_schema for full details on a specific action.",
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
