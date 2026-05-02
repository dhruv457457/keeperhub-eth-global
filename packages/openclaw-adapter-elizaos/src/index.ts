/**
 * KeeperHub ElizaOS → OpenClaw Adapter
 *
 * Wraps KeeperHub's ElizaOS actions as native OpenClaw tools.
 * Uses the ElizaOS plugin's action definitions for descriptions/naming,
 * but executes via the underlying KeeperHub toolkit for OpenClaw compatibility.
 *
 * Flow:
 *   OpenClaw agent → registerTool → KeeperHub API
 *   (named after ElizaOS actions for consistency with @ethglobal-openagent/elizaos-keeperhub)
 */

import { KeeperHubToolkit } from "@ethglobal-openagent/langchain-keeperhub";
import { zodToJsonSchema } from "zod-to-json-schema";

// ─── Config ──────────────────────────────────────────────────────────────────

interface ElizaKeeperHubConfig {
  apiKey: string;
  baseUrl?: string;
  testnetOnly?: boolean;
  allowedChainIds?: string[];
}

// ─── OpenClaw Plugin API ──────────────────────────────────────────────────────

interface ToolDef {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  execute(toolCallId: string, params: Record<string, unknown>): Promise<{ content: string; details?: unknown }>;
}

interface PluginApi {
  registrationMode: "full" | "discovery" | "setup-only" | "cli-metadata";
  config: Record<string, unknown>;
  registerTool(tool: ToolDef): void;
}

// ─── ElizaOS Action name mappings → tool descriptions ────────────────────────
// Maps our toolkit tool names to ElizaOS-style action names and descriptions

const ELIZA_TOOL_MAP: Record<string, { elizaName: string; label: string }> = {
  "keeperhub_transfer_funds":      { elizaName: "eliza_keeperhub_transfer",        label: "Transfer Tokens" },
  "keeperhub_contract_call":       { elizaName: "eliza_keeperhub_contract_read",   label: "Read/Write Contract" },
  "keeperhub_list_workflows":      { elizaName: "eliza_keeperhub_list_workflows",  label: "List Workflows" },
  "keeperhub_execute_workflow":    { elizaName: "eliza_keeperhub_execute_workflow", label: "Execute Workflow" },
  "keeperhub_generate_workflow":   { elizaName: "eliza_keeperhub_generate_workflow", label: "Generate Workflow" },
  "keeperhub_get_execution_status": { elizaName: "eliza_keeperhub_check_execution", label: "Check Execution" },
  "keeperhub_protocol_action":     { elizaName: "eliza_keeperhub_protocol_action", label: "DeFi Protocol Action" },
  "keeperhub_list_chains":         { elizaName: "eliza_keeperhub_list_chains",     label: "List Chains" },
  "keeperhub_register_agent":      { elizaName: "eliza_keeperhub_register_agent",  label: "Register Agent (ERC-8004)" },
  "keeperhub_pay_and_run":         { elizaName: "eliza_keeperhub_pay_and_run",     label: "Pay & Run Workflow" },
  "keeperhub_notify":              { elizaName: "eliza_keeperhub_notify",          label: "Send Notification" },
  "keeperhub_chainlink_ccip":      { elizaName: "eliza_keeperhub_chainlink_ccip",  label: "Cross-Chain Transfer (CCIP)" },
  "keeperhub_run_code":            { elizaName: "eliza_keeperhub_run_code",        label: "Execute Code" },
  "keeperhub_wallet_balance":      { elizaName: "eliza_keeperhub_wallet_balance",  label: "Check Wallet Balance" },
  "keeperhub_ens_resolve":         { elizaName: "eliza_keeperhub_ens_resolve",     label: "Resolve ENS Name" },
  "keeperhub_list_protocols":      { elizaName: "eliza_keeperhub_list_protocols",  label: "List DeFi Protocols" },
  "keeperhub_get_action_schema":   { elizaName: "eliza_keeperhub_action_schema",   label: "Get Action Schema" },
  "keeperhub_estimate_gas":        { elizaName: "eliza_keeperhub_estimate_gas",    label: "Estimate Gas" },
  "keeperhub_check_and_execute":   { elizaName: "eliza_keeperhub_check_and_execute", label: "Check & Execute" },
};

// ─── Plugin Entry ─────────────────────────────────────────────────────────────

export function register(api: PluginApi): void {
  // Read plugin config from the full OpenClaw config
  const pluginEntry = (api.config as any)?.plugins?.entries?.["keeperhub-eliza"]?.config ?? {};
  const apiKey = pluginEntry.apiKey || process.env.KEEPERHUB_API_KEY || "";
  const baseUrl = pluginEntry.baseUrl;
  const testnetOnly = pluginEntry.testnetOnly ?? false;
  const allowedChainIds = pluginEntry.allowedChainIds;

  if (!apiKey) throw new Error("KeeperHub API key required. Set KEEPERHUB_API_KEY env var.");

  const toolkit = new KeeperHubToolkit({
    apiKey,
    baseUrl,
    testnetOnly,
    allowedChainIds: allowedChainIds ? new Set(allowedChainIds) : undefined,
  });

  const lcTools = toolkit.getTools();

  for (const lcTool of lcTools) {
    const mapping = ELIZA_TOOL_MAP[lcTool.name];
    const toolName = mapping?.elizaName ?? `eliza_${lcTool.name}`;
    const label = mapping?.label ?? lcTool.name.replace(/keeperhub_/g, "").replace(/_/g, " ");

    api.registerTool({
      name: toolName,
      label,
      description: `[ElizaOS] ${lcTool.description}`,
      parameters: (() => {
        try {
          const s = lcTool.schema;
          if (s) {
            const schema = zodToJsonSchema(s as Parameters<typeof zodToJsonSchema>[0], {
              target: "jsonSchema7",
              $refStrategy: "none",
            }) as Record<string, unknown>;
            // Remove $schema — Claude requires clean schema without meta fields
            delete schema["$schema"];
            return schema;
          }
        } catch {}
        return { type: "object", additionalProperties: true };
      })(),
      async execute(_toolCallId: string, params: Record<string, unknown>) {
        try {
          const raw = await lcTool.invoke(params);
          const parsed = tryParseJson(raw);

          if (parsed && typeof parsed === "object") {
            const p = parsed as Record<string, unknown>;
            const summary = (p.summary as string) || (p.error as string) || String(raw);
            return { content: summary, details: p };
          }

          return { content: String(raw) };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return { content: `KeeperHub ElizaOS error: ${message}` };
        }
      },
    });
  }
}

export { register as activate };

function tryParseJson(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try { return JSON.parse(raw); } catch { return null; }
}
