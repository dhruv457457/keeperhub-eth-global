/**
 * KeeperHub LangChain → OpenClaw Adapter
 *
 * Wraps each @keeperhub/langchain tool as a native OpenClaw tool.
 * When OpenClaw calls a tool, this adapter invokes the LangChain tool's
 * underlying function and returns the result formatted for OpenClaw.
 *
 * Flow:
 *   OpenClaw agent → OpenClaw tool → LangChain tool._arun() → KeeperHub API
 */

import { KeeperHubToolkit } from "@keeperhub/langchain";
import type { ToolKey } from "@keeperhub/langchain";

export interface OpenClawToolResult {
  text: string;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface OpenClawTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(params: Record<string, unknown>): Promise<OpenClawToolResult>;
}

export interface KeeperHubOpenClawConfig {
  apiKey: string;
  baseUrl?: string;
  testnetOnly?: boolean;
  allowedChainIds?: string[];
  tools?: ToolKey[];
}

/**
 * Create OpenClaw-compatible tools from the KeeperHub LangChain SDK.
 *
 * Usage in openclaw.config.json:
 * ```json
 * {
 *   "plugins": {
 *     "keeperhub-langchain": {
 *       "apiKey": "${KEEPERHUB_API_KEY}",
 *       "testnetOnly": true
 *     }
 *   }
 * }
 * ```
 *
 * Or use directly in code:
 * ```typescript
 * import { createKeeperHubOpenClawTools } from "@keeperhub/openclaw-langchain";
 *
 * const tools = createKeeperHubOpenClawTools({
 *   apiKey: process.env.KEEPERHUB_API_KEY!,
 *   testnetOnly: true,
 * });
 * ```
 */
export function createKeeperHubOpenClawTools(
  config: KeeperHubOpenClawConfig
): OpenClawTool[] {
  const toolkit = new KeeperHubToolkit({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    testnetOnly: config.testnetOnly,
    allowedChainIds: config.allowedChainIds
      ? new Set(config.allowedChainIds)
      : undefined,
    tools: config.tools,
  });

  const langchainTools = toolkit.getTools();

  return langchainTools.map((lcTool) => {
    // Build OpenClaw parameter schema from LangChain tool schema
    const parameters = buildParameterSchema(lcTool);

    return {
      name: lcTool.name,           // e.g. "keeperhub_transfer_funds"
      description: lcTool.description,

      parameters,

      async execute(
        params: Record<string, unknown>
      ): Promise<OpenClawToolResult> {
        try {
          // Call the LangChain tool — returns a JSON string
          const raw = await lcTool.invoke(params);
          const parsed = tryParseJson(raw);

          if (parsed && typeof parsed === "object") {
            const ok = (parsed as Record<string, unknown>).ok !== false;
            const summary =
              (parsed as Record<string, unknown>).summary as string |
              (parsed as Record<string, unknown>).error as string |
              raw;

            return {
              text: String(summary || raw),
              success: ok,
              metadata: parsed as Record<string, unknown>,
            };
          }

          return { text: String(raw), success: true };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            text: `KeeperHub error: ${message}`,
            success: false,
            metadata: { error: message },
          };
        }
      },
    };
  });
}

/**
 * OpenClaw plugin entry point.
 * Called by the OpenClaw runtime when loading this plugin.
 */
export function createPlugin(config: KeeperHubOpenClawConfig) {
  const tools = createKeeperHubOpenClawTools(config);
  return { tools };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tryParseJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Build a simple OpenClaw parameter schema from a LangChain tool.
 * Falls back to a generic { input: string } if schema is unavailable.
 */
function buildParameterSchema(
  tool: ReturnType<KeeperHubToolkit["getTools"]>[number]
): Record<string, unknown> {
  try {
    // LangChain StructuredTool has schema property
    const schema = (tool as unknown as { schema?: { shape?: unknown } }).schema;
    if (schema && typeof schema === "object") {
      return {
        type: "object",
        properties: extractProperties(schema),
        additionalProperties: false,
      };
    }
  } catch {
    // ignore
  }

  // Generic fallback
  return {
    type: "object",
    properties: {
      input: {
        type: "string",
        description: `Input for ${tool.name}`,
      },
    },
  };
}

function extractProperties(schema: unknown): Record<string, unknown> {
  if (!schema || typeof schema !== "object") return {};
  const shape = (schema as Record<string, unknown>).shape;
  if (!shape || typeof shape !== "object") return {};

  const props: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(shape as Record<string, unknown>)) {
    props[key] = zodToJsonSchema(val);
  }
  return props;
}

function zodToJsonSchema(zodField: unknown): Record<string, unknown> {
  if (!zodField || typeof zodField !== "object") return { type: "string" };
  const f = zodField as Record<string, unknown>;
  const typeName = (f._def as Record<string, unknown>)?.typeName as string;

  switch (typeName) {
    case "ZodString": return { type: "string" };
    case "ZodNumber": return { type: "number" };
    case "ZodBoolean": return { type: "boolean" };
    case "ZodOptional": return { ...zodToJsonSchema((f._def as Record<string, unknown>)?.innerType), nullable: true };
    case "ZodArray": return { type: "array", items: zodToJsonSchema((f._def as Record<string, unknown>)?.type) };
    case "ZodRecord": return { type: "object", additionalProperties: true };
    default: return { type: "string" };
  }
}
