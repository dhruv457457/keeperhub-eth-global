import type { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

/**
 * Injects a summary of available KeeperHub workflows into the agent's context.
 * This lets the agent know what automations exist without being asked explicitly.
 */
export function createWorkflowsProvider(kh: KeeperHub): Provider {
  return {
    get: async (
      _runtime: IAgentRuntime,
      _message: Memory,
      _state?: State
    ): Promise<string> => {
      try {
        const workflows = await kh.workflows.list();

        if (workflows.length === 0) {
          return "KeeperHub Workflows: No workflows configured yet. The user can ask me to create one.";
        }

        // Sanitize names/descriptions before injecting into agent context
        // to prevent prompt injection via malicious workflow metadata
        const sanitize = (s: string) =>
          s.replace(/[`[\]{}\\]/g, "").slice(0, 80);

        const wfList = workflows
          .slice(0, 20)
          .map(
            (wf) =>
              `- ${sanitize(wf.name)} (ID: ${wf.id})${wf.description ? `: ${sanitize(wf.description)}` : ""}`
          )
          .join("\n");

        return [
          `KeeperHub Workflows (${workflows.length} available):`,
          wfList,
          workflows.length > 20 ? `…and ${workflows.length - 20} more.` : null,
        ]
          .filter(Boolean)
          .join("\n");
      } catch (err) {
        elizaLogger.warn(
          `[KeeperHub] Workflows provider failed: ${err instanceof Error ? err.message : String(err)}`
        );
        return "KeeperHub Workflows: (unavailable — check API key)";
      }
    },
  };
}
