import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

const GenerateWorkflowSchema = z.object({
  prompt: z
    .string()
    .max(1000)
    .trim()
    .describe(
      "Natural language description of what the workflow should do. " +
        "Be VERY specific — include: action, protocol, exact token contract addresses (NOT symbols), " +
        "chain ID, amount in wei or smallest unit, and wallet address. " +
        "Using real addresses prevents placeholder values in the generated workflow. " +
        "Example: 'Swap 0.001 ETH (1000000000000000 wei) to USDC on Uniswap V3 on Sepolia (chain 11155111). " +
        "tokenIn=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14 (WETH), " +
        "tokenOut=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 (USDC), " +
        "recipient=0x554b87f23a9B01bA67B36Ca6B9e46aC5697C58E5'"
    ),
  execute: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, immediately execute the workflow after generating it"),
  executionInput: z
    .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .refine(
      (obj) => !obj || JSON.stringify(obj).length < 8192,
      "Execution input too large (max 8KB)"
    )
    .describe("Runtime inputs to pass to the workflow if execute is true"),
  context: z
    .string()
    .max(500)
    .trim()
    .optional()
    .describe(
      "Additional context about the user's wallet, protocols, or preferences"
    ),
});

/**
 * LangChain tool that generates a KeeperHub workflow from natural language.
 *
 * @example
 * const tool = createGenerateWorkflowTool(kh);
 */
export function createGenerateWorkflowTool(
  kh: KeeperHub
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_generate_workflow",
    description:
      "Generate and optionally execute a KeeperHub onchain workflow from plain English. " +
      "Use this for ANY DeFi action (Aave supply/borrow, Uniswap swap, Lido stake, etc.) — " +
      "especially when protocol_action fails with a _protocolMeta error. " +
      "Set execute=true to generate AND run immediately. " +
      "CRITICAL: Always use actual 0x token addresses in prompt (not symbols like ETH/USDC) to prevent placeholder values. " +
      "First call keeperhub_wallet_balance to get the user's wallet address, then include it in the prompt. " +
      "Example: prompt='Supply 1000000000000000 wei of WETH (0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14) " +
      "to Aave V3 on Sepolia (chain 11155111), onBehalfOf=0x554b...wallet...', execute=true.",
    schema: GenerateWorkflowSchema,
    func: async ({ prompt, execute, executionInput, context }) => {
      try {
        // Call /api/ai/generate directly and assemble workflow from operation events
        const kh_ = kh as unknown as {
          _http: {
            requestResponse: (method: string, path: string, opts: object) => Promise<Response>;
          };
        };

        const response = await kh_._http.requestResponse("POST", "/api/ai/generate", {
          body: { prompt: context ? `${prompt}\nContext: ${context}` : prompt },
        });

        if (!response.body) throw new Error("Empty response from AI generate endpoint");

        // Parse NDJSON stream — assemble workflow from operation events
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

        if (nodes.length === 0) throw new Error("AI did not generate any workflow nodes. Try a more specific prompt describing a scheduled or triggered automation.");

        // Save the assembled workflow
        const saved = await kh.workflows.create({
          name,
          description,
          nodes: nodes as Parameters<typeof kh.workflows.create>[0]["nodes"],
          edges: edges as Parameters<typeof kh.workflows.create>[0]["edges"],
        });

        if (!execute) {
          return JSON.stringify({
            ok: true,
            generated: true,
            executed: false,
            workflowId: saved.id,
            name: saved.name,
            description: saved.description,
            nodeCount: nodes.length,
            hint: `Workflow saved! Execute it with keeperhub_execute_workflow using workflowId="${saved.id}"`,
          });
        }

        // Execute immediately
        const handle = await kh.workflows.execute(saved.id, executionInput ?? {});
        return JSON.stringify({
          ok: true,
          generated: true,
          executed: true,
          workflowId: saved.id,
          executionId: handle.id,
          name: saved.name,
          status: "running",
          hint: `Check status with keeperhub_check_execution using executionId="${handle.id}"`,
        });
      } catch (err) {
        return JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "Failed to generate workflow",
        });
      }
    },
  });
}
