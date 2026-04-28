import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

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

export function createActionSchemaAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_ACTION_SCHEMA",
    similes: [
      "GET_ACTION_SCHEMA",
      "WHAT_PARAMS",
      "ACTION_PARAMS",
      "SEARCH_ACTIONS",
      "FIND_ACTION",
      "WHAT_FIELDS",
    ],
    description:
      "Look up the parameter schema for any KeeperHub action, or search across all 396 actions. " +
      "Use before executing a protocol action to know required fields.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = (message.content?.text ?? "").toLowerCase();
      return (
        (text.includes("schema") ||
          text.includes("params") ||
          text.includes("parameter") ||
          text.includes("what field") ||
          text.includes("how do i call") ||
          text.includes("search action") ||
          text.includes("find action")) &&
        (text.includes("action") ||
          text.includes("protocol") ||
          text.includes("keeperhub"))
      );
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const actionTypeMatch = text.match(
        /['"`]([a-zA-Z0-9-]+\/[a-zA-Z0-9-]+)['"`]/
      );
      const actionType = actionTypeMatch?.[1];

      try {
        if (actionType) {
          const schemas = await kh.mcp.getSchemas(actionType);
          const schemaEntry = schemaEntries(schemas).find(
            ([key, schema]) =>
              key === actionType || schema["actionType"] === actionType
          );

          if (!schemaEntry) {
            await callback?.({
              text: `Action \`${actionType}\` not found. Try \`search actions\` with a keyword.`,
            });
            return false;
          }

          const [, schema] = schemaEntry;
          const lines = [
            `**${schema["label"]}** (\`${actionType}\`)`,
            `${schema["description"] ?? ""}`,
            "",
            "**Required fields:**",
            ...Object.entries(
              (schema["requiredFields"] as Record<string, string>) ?? {}
            ).map(([key, value]) => `- \`${key}\`: ${value}`),
          ];

          const optional = Object.entries(
            (schema["optionalFields"] as Record<string, string>) ?? {}
          );
          if (optional.length > 0) {
            lines.push("", "**Optional fields:**");
            lines.push(
              ...optional
                .slice(0, 5)
                .map(([key, value]) => `- \`${key}\`: ${value}`)
            );
          }

          await callback?.({ text: lines.join("\n") });
          return true;
        }

        const query = text
          .replace(/search|action|schema|find|what|params|fields/gi, "")
          .trim()
          .slice(0, 50);
        const schemas = await kh.mcp.getSchemas(query);
        const results = schemaEntries(schemas).slice(0, 8);

        const lines = [
          `Found **${results.length}** actions for "${query}":`,
          "",
          ...results.map(([matchedActionType, schema]) => {
            return `- **${schema["label"]}** - \`${matchedActionType}\`\n  ${String(
              schema["description"] ?? ""
            ).slice(0, 80)}`;
          }),
          "",
          'Ask for schema: "what params does `aave-v3/supply` need?"',
        ];

        await callback?.({ text: lines.join("\n") });
        return true;
      } catch (err) {
        await callback?.({
          text: `Schema lookup failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: { text: "What params does 'aave-v3/supply' need?" },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "**Aave V3 Supply** (`aave-v3/supply`)",
            action: "KEEPERHUB_ACTION_SCHEMA",
          },
        },
      ],
    ],
  };
}
