import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

function isWorkflowGenerationRequest(text: string): boolean {
  const lower = text.toLowerCase();
  const buildKeywords = [
    "create a workflow",
    "generate a workflow",
    "build a workflow",
    "make a workflow",
    "set up a workflow",
    "automate",
    "create automation",
    "build automation",
    "new workflow",
    "create workflow",
  ];
  return buildKeywords.some((kw) => lower.includes(kw));
}

function cleanPrompt(text: string): string {
  return text
    .replace(
      /^(create|build|generate|make|set up)\s+(a\s+)?workflow\s+(to|that|for)?\s*/i,
      ""
    )
    .replace(/^(automate|create automation for|build automation for)\s*/i, "")
    .trim();
}

export interface GenerateWorkflowActionOptions {
  /**
   * When set, the generate-and-execute path is blocked entirely.
   * Generated workflows won't be in the allowlist, so auto-executing them
   * would bypass the access control that `allowedWorkflowIds` is meant to enforce.
   * Users can still generate (save) workflows — they just can't immediately run them.
   */
  allowedWorkflowIds?: Set<string>;
}

export function createGenerateWorkflowAction(
  kh: KeeperHub,
  options: GenerateWorkflowActionOptions = {}
): Action {
  return {
    name: "GENERATE_KEEPERHUB_WORKFLOW",
    similes: [
      "CREATE_WORKFLOW",
      "BUILD_WORKFLOW",
      "NEW_WORKFLOW",
      "KEEPERHUB_GENERATE",
      "AUTOMATE_TASK",
    ],
    description:
      "Generate a new KeeperHub onchain automation workflow from a natural-language description using AI, then optionally execute it.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      return isWorkflowGenerationRequest(text);
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      handlerOptions: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const rawText = message.content?.text ?? "";
      const prompt = cleanPrompt(rawText);
      // If an allowlist is configured, block immediate execution of generated workflows.
      // A freshly generated workflow ID won't be in the allowlist, so auto-running it
      // would silently bypass the access control the allowlist is meant to enforce.
      const shouldExecute =
        handlerOptions?.execute === true && !options.allowedWorkflowIds?.size;

      const MAX_PROMPT = 1000;
      if (prompt.length > MAX_PROMPT) {
        await callback?.({
          text: `❌ Prompt too long (${prompt.length} chars). Please keep workflow descriptions under ${MAX_PROMPT} characters.`,
        });
        return false;
      }

      await callback?.({
        text: `🧠 Generating KeeperHub workflow for: *"${prompt}"*…`,
      });

      try {
        // Call /api/ai/generate directly — it streams NDJSON operation events
        // (setName, setDescription, addNode, addEdge). Assemble then save.
        const kh_ = kh as unknown as {
          _http: {
            requestResponse: (method: string, path: string, opts: object) => Promise<Response>;
          };
        };

        const response = await kh_._http.requestResponse("POST", "/api/ai/generate", {
          body: { prompt },
        });

        if (!response.body) throw new Error("Empty response from AI generate endpoint");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let name = prompt.slice(0, 60);
        let description = "";
        const nodes: unknown[] = [];
        const edges: unknown[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line) as { type: string; operation?: Record<string, unknown> };
              if (event.type === "operation" && event.operation) {
                const op = event.operation;
                if (op["op"] === "setName") name = String(op["name"] ?? name);
                else if (op["op"] === "setDescription") description = String(op["description"] ?? "");
                else if (op["op"] === "addNode") nodes.push(op["node"]);
                else if (op["op"] === "addEdge") edges.push(op["edge"]);
              }
            } catch { /* skip malformed lines */ }
          }
        }
        reader.releaseLock();

        if (nodes.length === 0) {
          throw new Error("AI did not generate any workflow nodes. Try a more specific prompt.");
        }

        const saved = await kh.workflows.create({
          name,
          description,
          nodes: nodes as Parameters<typeof kh.workflows.create>[0]["nodes"],
          edges: edges as Parameters<typeof kh.workflows.create>[0]["edges"],
        });

        if (shouldExecute) {
          const handle = await kh.workflows.execute(saved.id, {});
          await callback?.({
            text: [
              "✅ Workflow generated and executing!",
              `📋 Workflow: **${saved.name}**`,
              `🆔 Execution ID: \`${handle.id}\``,
              `📊 Status: **running**`,
              "",
              `Check progress: *"Check execution ${handle.id}"*`,
            ].join("\n"),
          });
          return true;
        }

        await callback?.({
          text: [
            `✅ Workflow created: **${saved.name}**`,
            `🆔 ID: \`${saved.id}\``,
            saved.description ? `📝 ${saved.description}` : null,
            "",
            `To run it, say: *"Execute workflow ${saved.id}"*`,
          ]
            .filter(Boolean)
            .join("\n"),
        });

        return true;
      } catch (err) {
        elizaLogger.error(
          `[KeeperHub] Workflow generation failed: ${err instanceof Error ? err.message : String(err)}`
        );
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        await callback?.({
          text: `❌ Workflow generation failed: ${errorMessage}`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: {
            text: "Create a workflow to compound my Aave USDC rewards every Monday",
          },
        },
        {
          user: "{{agentName}}",
          content: {
            text: '🧠 Generating KeeperHub workflow for: *"compound my Aave USDC rewards every Monday"*…',
            action: "GENERATE_KEEPERHUB_WORKFLOW",
          },
        },
      ],
    ],
  };
}
