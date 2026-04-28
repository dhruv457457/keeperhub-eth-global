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
 * Parses a check-and-execute spec from a JSON block in the message.
 *
 * Expected format (in a ```json block):
 * {
 *   "network": "8453",
 *   "check": {
 *     "contract": "0x...",
 *     "function": "healthFactor",
 *     "args": ["0xWallet"],
 *     "condition": { "operator": "lt", "value": "1200000000000000000" }
 *   },
 *   "action": {
 *     "contract": "0x...",
 *     "function": "repayWithATokens",
 *     "args": ["0xUSDC", "1000000000", 0]
 *   }
 * }
 */
function parseCheckAndExecuteSpec(
  text: string
): Record<string, unknown> | null {
  const block = text.match(/```json\s*([\s\S]*?)\s*```/)?.[1];
  if (!block) return null;
  try {
    const parsed = JSON.parse(block);
    // Validate required shape
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.check &&
      parsed.action &&
      parsed.check.contract &&
      parsed.check.function &&
      parsed.check.condition &&
      parsed.action.contract &&
      parsed.action.function
    ) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function createCheckAndExecuteAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_CHECK_AND_EXECUTE",
    similes: [
      "CHECK_AND_EXECUTE",
      "CONDITIONAL_EXECUTE",
      "IF_THEN_EXECUTE",
      "ATOMIC_CONDITION",
      "GUARDED_EXECUTE",
    ],
    description:
      "Read an onchain condition and execute a transaction only if the condition is met. " +
      "Atomic — prevents race conditions between check and action. " +
      "Provide a JSON block with check (contract, function, condition) and action (contract, function) fields.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const hasJsonBlock = /```json/i.test(text);
      const hasConditionKeyword = /check|condition|if.*then|guard|atomic/i.test(
        text
      );
      if (!(hasJsonBlock && hasConditionKeyword)) return false;
      return parseCheckAndExecuteSpec(text) !== null;
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const spec = parseCheckAndExecuteSpec(text);

      if (!spec) {
        await callback?.({
          text: [
            "❌ I need a JSON block with the check-and-execute spec. Example:",
            "```json",
            JSON.stringify(
              {
                network: "8453",
                check: {
                  contract: "0xAavePool...",
                  function: "getUserAccountData",
                  args: ["0xYourWallet"],
                  condition: { operator: "lt", value: "1200000000000000000" },
                },
                action: {
                  contract: "0xAavePool...",
                  function: "repayWithATokens",
                  args: ["0xUSDC", "1000000000", 0],
                },
              },
              null,
              2
            ),
            "```",
          ].join("\n"),
        });
        return false;
      }

      const check = spec["check"] as Record<string, unknown>;
      const action = spec["action"] as Record<string, unknown>;
      const condition = check["condition"] as Record<string, unknown>;
      const network = (spec["network"] as string) ?? "1";

      await callback?.({
        text:
          `🔍 Checking \`${check["function"]}\` on \`${check["contract"]}\`…\n` +
          `⚡ Will execute \`${action["function"]}\` if condition is met.`,
      });

      try {
        const result = await kh.web3.checkAndExecute({
          network,
          check: {
            contract: check["contract"] as string,
            function: check["function"] as string,
            args: check["args"] as unknown[],
            abi: check["abi"] as string | undefined,
            condition: {
              operator: condition["operator"] as
                | "gt"
                | "lt"
                | "eq"
                | "neq"
                | "gte"
                | "lte",
              value: condition["value"] as string,
            },
          },
          action: {
            contract: action["contract"] as string,
            function: action["function"] as string,
            args: action["args"] as unknown[],
            abi: action["abi"] as string | undefined,
            gasLimitMultiplier: action["gasLimitMultiplier"] as
              | string
              | undefined,
          },
        });

        const r = result as Record<string, unknown>;
        const conditionMet = r["conditionMet"] !== false;

        if (!conditionMet) {
          await callback?.({
            text: "✅ Condition check complete — condition was **not met**. No action was taken.",
          });
          return true;
        }

        await callback?.({
          text: [
            "✅ Condition met! Action submitted.",
            `🔑 Execution ID: \`${r["executionId"]}\``,
            `📊 Status: ${r["status"]}`,
            `💡 Use \`check execution ${r["executionId"]}\` to monitor progress.`,
          ].join("\n"),
        });
        return true;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Check-and-execute failed: ${err}`);
        await callback?.({
          text: `❌ Check-and-execute failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: {
            text: 'Check and execute:\n```json\n{"network":"1","check":{"contract":"0xPool","function":"healthFactor","args":["0xWallet"],"condition":{"operator":"lt","value":"1200000000000000000"}},"action":{"contract":"0xPool","function":"repay","args":[]}}\n```',
          },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "🔍 Checking `healthFactor` on `0xPool`…",
            action: "KEEPERHUB_CHECK_AND_EXECUTE",
          },
        },
      ],
    ],
  };
}
