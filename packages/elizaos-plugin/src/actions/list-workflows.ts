import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

function isListWorkflowsRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes("list") ||
      lower.includes("show") ||
      lower.includes("what") ||
      lower.includes("available")) &&
    (lower.includes("workflow") || lower.includes("automation"))
  );
}

export function createListWorkflowsAction(kh: KeeperHub): Action {
  return {
    name: "LIST_KEEPERHUB_WORKFLOWS",
    similes: [
      "SHOW_WORKFLOWS",
      "GET_WORKFLOWS",
      "AVAILABLE_WORKFLOWS",
      "MY_WORKFLOWS",
    ],
    description: "List all available KeeperHub workflows the agent can execute.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      return isListWorkflowsRequest(message.content?.text ?? "");
    },

    handler: async (
      _runtime: IAgentRuntime,
      _message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      try {
        const workflows = await kh.workflows.list();

        if (workflows.length === 0) {
          await callback?.({
            text: "📋 No workflows found. You can create one by saying *\"Create a workflow to...\"*",
          });
          return true;
        }

        const lines = [
          `📋 **${workflows.length} workflow${workflows.length > 1 ? "s" : ""} available:**`,
          "",
        ];

        for (const wf of workflows.slice(0, 15)) {
          lines.push(
            `• **${wf.name}** — \`${wf.id}\`${wf.description ? `\n  ${wf.description}` : ""}`
          );
        }

        if (workflows.length > 15) {
          lines.push(`\n_…and ${workflows.length - 15} more._`);
        }

        lines.push("\nTo run one, say: *\"Execute workflow wf_xxx\"*");

        await callback?.({ text: lines.join("\n") });
        return true;
      } catch (err) {
        elizaLogger.error(
          `[KeeperHub] Failed to list workflows: ${err instanceof Error ? err.message : String(err)}`
        );
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        await callback?.({
          text: `❌ Failed to list workflows: ${errorMessage}`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: { text: "What workflows are available?" },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "📋 **3 workflows available:**\n\n• **Compound USDC** — `wf_abc123`",
            action: "LIST_KEEPERHUB_WORKFLOWS",
          },
        },
      ],
    ],
  };
}
