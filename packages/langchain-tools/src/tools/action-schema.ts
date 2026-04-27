import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * Get the full schema for any KeeperHub action — required fields, optional fields,
 * and output fields. Agents use this BEFORE calling keeperhub_protocol_action
 * to know exactly what parameters are needed.
 *
 * Covers all 396 actions across 20+ protocols + utility plugins.
 */
export function createGetActionSchemaTool(kh: KeeperHub): DynamicStructuredTool {
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
        // Search MCP schemas for the specific action
        const schemas = await kh.mcp.getSchemas({ query: actionType });
        const schema = Array.isArray(schemas)
          ? schemas.find(
              (s) =>
                (s as Record<string, unknown>)["actionType"] === actionType ||
                (s as Record<string, unknown>)["type"] === actionType ||
                String((s as Record<string, unknown>)["actionType"]).endsWith(`/${actionType}`)
            )
          : null;

        if (!schema) {
          // Try broader search
          const allSchemas = await kh.mcp.getSchemas({});
          const found = Array.isArray(allSchemas)
            ? allSchemas.find(
                (s) =>
                  String((s as Record<string, unknown>)["actionType"])
                    .toLowerCase()
                    .includes(actionType.toLowerCase())
              )
            : null;

          if (!found) {
            return JSON.stringify({
              ok: false,
              error: `Action '${actionType}' not found.`,
              hint: "Use keeperhub_list_protocols to discover valid action types.",
            });
          }

          return JSON.stringify({ ok: true, schema: found, note: "Fuzzy match" });
        }

        const s = schema as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          action_type: s["actionType"] ?? actionType,
          label: s["label"],
          description: s["description"],
          category: s["category"],
          requires_credentials: s["requiresCredentials"],
          required_fields: s["requiredFields"] ?? {},
          optional_fields: s["optionalFields"] ?? {},
          output_fields: s["outputFields"] ?? {},
          hint: `Call keeperhub_protocol_action with action_type='${actionType}' and the required_fields above.`,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}

/**
 * Search across all 396 KeeperHub actions by keyword.
 * Returns matching actions with their schemas.
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
      query: z.string().min(2).describe("Search keyword e.g. 'supply', 'swap', 'ccip', 'stake'"),
      category: z
        .string()
        .optional()
        .describe("Filter by category e.g. 'Aave V3', 'Uniswap', 'Chainlink', 'Code', 'Math', 'Discord'"),
      limit: z.number().int().min(1).max(20).default(10).describe("Max results (default 10)"),
    }),
    func: async ({ query, category, limit }) => {
      try {
        const schemas = await kh.mcp.getSchemas({ query, category });
        const results = Array.isArray(schemas) ? schemas.slice(0, limit) : [];

        return JSON.stringify({
          ok: true,
          query,
          total_found: Array.isArray(schemas) ? schemas.length : 0,
          results: results.map((s) => {
            const r = s as Record<string, unknown>;
            return {
              action_type: r["actionType"],
              label: r["label"],
              category: r["category"],
              description: r["description"],
              required_fields: r["requiredFields"] ?? {},
              requires_credentials: r["requiresCredentials"],
            };
          }),
          hint: "Use keeperhub_get_action_schema for full details on a specific action.",
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
