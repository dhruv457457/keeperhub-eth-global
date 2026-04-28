import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

/**
 * Parse protocol action spec from a JSON block.
 * Expected: { "protocol": "aave-v3", "action": "supply", "params": { ... } }
 * OR:       { "actionType": "aave-v3/supply", "params": { ... } }
 */
function parseProtocolSpec(
  text: string
): { actionType: string; params: Record<string, unknown> } | null {
  const block = text.match(/```json\s*([\s\S]*?)\s*```/)?.[1];
  if (!block) return null;
  try {
    const parsed = JSON.parse(block) as Record<string, unknown>;
    // Support both formats
    if (parsed["actionType"] && parsed["params"]) {
      return {
        actionType: String(parsed["actionType"]),
        params: parsed["params"] as Record<string, unknown>,
      };
    }
    if (parsed["protocol"] && parsed["action"]) {
      return {
        actionType: `${parsed["protocol"]}/${parsed["action"]}`,
        params: (parsed["params"] as Record<string, unknown>) ?? {},
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Friendly protocol name map for display */
const PROTOCOL_NAMES: Record<string, string> = {
  "aave-v3": "Aave V3",
  "aave-v4": "Aave V4",
  uniswap: "Uniswap",
  lido: "Lido",
  "compound-v3": "Compound V3",
  curve: "Curve",
  morpho: "Morpho",
  "yearn-v3": "Yearn V3",
  aerodrome: "Aerodrome",
  cowswap: "CowSwap",
  "rocket-pool": "Rocket Pool",
  pendle: "Pendle",
  sky: "Sky",
  spark: "Spark",
  ethena: "Ethena",
  safe: "Safe",
};

export function createProtocolActionElizaAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_PROTOCOL_ACTION",
    similes: [
      "DEFI_ACTION",
      "AAVE_ACTION",
      "UNISWAP_ACTION",
      "LIDO_ACTION",
      "COMPOUND_ACTION",
      "CURVE_ACTION",
      "PROTOCOL_EXECUTE",
      "SUPPLY_AAVE",
      "SWAP_UNISWAP",
      "STAKE_LIDO",
    ],
    description:
      "Execute a DeFi protocol action (Aave, Uniswap, Lido, Curve, Compound, Morpho, Yearn, etc.) " +
      "via KeeperHub. Provide a JSON block with protocol, action, and params.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const hasProtocol =
        /aave|uniswap|lido|compound|curve|morpho|yearn|aerodrome|cowswap|rocket.pool|pendle|spark|ethena/i.test(
          text
        );
      const hasAction =
        /supply|borrow|withdraw|repay|swap|stake|wrap|deposit|exchange|harvest/i.test(
          text
        );
      const hasJson = /```json/i.test(text);
      return hasProtocol && (hasAction || hasJson);
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const spec = parseProtocolSpec(text);

      if (!spec) {
        await callback?.({
          text: [
            "❌ Please provide a JSON block with the protocol action spec. Example:",
            "```json",
            JSON.stringify(
              {
                protocol: "aave-v3",
                action: "supply",
                params: {
                  asset: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
                  amount: "1000000000",
                  onBehalfOf: "0xYourWallet",
                },
              },
              null,
              2
            ),
            "```",
            "",
            "Supported protocols: aave-v3, uniswap, lido, compound-v3, curve, morpho, yearn-v3, aerodrome, cowswap, rocket-pool, pendle, sky, spark, ethena",
          ].join("\n"),
        });
        return false;
      }

      const [protocolSlug, actionSlug] = spec.actionType.split("/");
      const protocolName = PROTOCOL_NAMES[protocolSlug] ?? protocolSlug;

      await callback?.({
        text: `⚡ Executing **${protocolName}** \`${actionSlug}\` action via KeeperHub…`,
      });

      try {
        const result = await kh.protocols.execute(spec.actionType, spec.params);
        const r = result as Record<string, unknown>;
        const executionId = r["executionId"];

        const lines = [`✅ **${protocolName}** \`${actionSlug}\` submitted!`];
        if (executionId) {
          lines.push(`🔑 Execution ID: \`${executionId}\``);
          lines.push(`📊 Status: ${r["status"] ?? "pending"}`);
          lines.push(
            `💡 Use \`check execution ${executionId}\` to monitor progress.`
          );
        } else if (r["result"] !== undefined) {
          lines.push(`📊 Result: \`${JSON.stringify(r["result"])}\``);
        }

        await callback?.({ text: lines.join("\n") });
        return true;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Protocol action failed: ${err}`);
        await callback?.({
          text: `❌ Protocol action failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: {
            text: 'Supply USDC to Aave:\n```json\n{"protocol":"aave-v3","action":"supply","params":{"asset":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","amount":"1000000000","onBehalfOf":"0xWallet"}}\n```',
          },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "⚡ Executing **Aave V3** `supply` action via KeeperHub…",
            action: "KEEPERHUB_PROTOCOL_ACTION",
          },
        },
      ],
    ],
  };
}
