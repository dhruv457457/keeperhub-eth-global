/**
 * KeeperHub LangChain → OpenClaw Plugin
 *
 * Registers all KeeperHub LangChain tools as native OpenClaw agent tools.
 * Uses the OpenClaw plugin register() API.
 *
 * Flow:
 *   OpenClaw agent → registerTool → LangChain tool.invoke() → KeeperHub API
 */

import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";

// ─── Config interface matching openclaw.plugin.json schema ───────────────────

interface KeeperHubPluginConfig {
  apiKey: string;
  baseUrl?: string;
  testnetOnly?: boolean;
  allowedChainIds?: string[];
}

// ─── OpenClaw Plugin API (minimal types) ─────────────────────────────────────

interface ToolDef {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(toolCallId: string, params: Record<string, unknown>): Promise<{ content: string; details?: unknown }>;
}

interface PluginApi {
  registrationMode: "full" | "discovery" | "setup-only" | "cli-metadata";
  config: KeeperHubPluginConfig;
  registerTool(tool: ToolDef): void;
}

// ─── Plugin Entry ─────────────────────────────────────────────────────────────

export function register(api: PluginApi): void {
  // Debug: log what OpenClaw actually passes
  console.log("[keeperhub] api keys:", Object.keys(api ?? {}));
  console.log("[keeperhub] api.config:", JSON.stringify(api?.config));
  console.log("[keeperhub] env key exists:", !!process.env.KEEPERHUB_API_KEY);

  const cfg = (api as any).config ?? (api as any).pluginConfig ?? (api as any).settings ?? {};
  const apiKey = cfg.apiKey
    || (api as any).apiKey
    || process.env.KEEPERHUB_API_KEY
    || "";
  const { baseUrl, testnetOnly, allowedChainIds } = cfg;

  if (!apiKey) throw new Error("KeeperHub API key required. Set KEEPERHUB_API_KEY env var.");

  const toolkit = new KeeperHubToolkit({
    apiKey,
    baseUrl,
    testnetOnly: testnetOnly ?? false,
    allowedChainIds: allowedChainIds ? new Set(allowedChainIds) : undefined,
  });

  const tools = toolkit.getTools();

  for (const lcTool of tools) {
    api.registerTool({
      name: lcTool.name,
      label: lcTool.name.replace(/keeperhub_/g, "").replace(/_/g, " "),
      description: lcTool.description,

      // Simple open parameters — OpenClaw passes whatever the LLM decides
      parameters: {
        type: "object",
        additionalProperties: true,
        description: "Parameters for this KeeperHub tool",
      },

      async execute(_toolCallId: string, params: Record<string, unknown>) {
        try {
          const raw = await lcTool.invoke(params);
          const parsed = tryParseJson(raw);

          if (parsed && typeof parsed === "object") {
            const p = parsed as Record<string, unknown>;
            const summary = (p.summary as string) || (p.error as string) || String(raw);
            return {
              content: summary,
              details: p,
            };
          }

          return { content: String(raw) };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { content: `KeeperHub error: ${message}` };
        }
      },
    });
  }
}

// Legacy alias
export { register as activate };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tryParseJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}
