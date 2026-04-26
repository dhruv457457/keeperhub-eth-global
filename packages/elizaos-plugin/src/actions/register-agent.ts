import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

function isRegisterRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("register agent") ||
    lower.includes("register on chain") ||
    lower.includes("register onchain") ||
    lower.includes("onchain identity") ||
    lower.includes("erc-8004") ||
    lower.includes("agent registry") ||
    lower.includes("register myself")
  );
}

export function createRegisterAgentAction(kh: KeeperHub): Action {
  return {
    name: "REGISTER_KEEPERHUB_AGENT",
    similes: [
      "REGISTER_AGENT",
      "ONCHAIN_IDENTITY",
      "AGENT_REGISTRY",
      "ERC8004_REGISTER",
      "KEEPERHUB_REGISTER",
    ],
    description:
      "Register this AI agent on-chain via KeeperHub's ERC-8004 agent identity registry. Establishes a verifiable onchain identity for the agent.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      return isRegisterRequest(message.content?.text ?? "");
    },

    handler: async (
      runtime: IAgentRuntime,
      _message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const agentName = runtime.character?.name ?? "ElizaOS Agent";
      const agentDescription =
        (Array.isArray(runtime.character?.bio)
          ? (runtime.character.bio as string[]).join(" ")
          : (runtime.character?.bio as string | undefined)) ??
        "An autonomous AI agent powered by ElizaOS";

      await callback?.({
        text: `🔗 Registering **${agentName}** on-chain via KeeperHub ERC-8004 registry…`,
      });

      try {
        // Check for existing registrations first to avoid duplicate on-chain mints
        const existing = await kh.agent.getRegistrations().catch(() => []);
        const alreadyRegistered = existing.length > 0;
        const registration = alreadyRegistered
          ? existing[existing.length - 1]
          : await kh.agent.register({
              name: agentName,
              description: agentDescription,
              capabilities: ["workflow-execution", "onchain-automation"],
            });

        await callback?.({
          text: [
            alreadyRegistered
              ? `✅ **${agentName}** is already registered on-chain.`
              : `✅ Agent registered on-chain!`,
            `🆔 Agent ID: \`${registration.agentId}\``,
            `⛓ Chain ID: ${registration.chainId}`,
            !alreadyRegistered && registration.txHash
              ? `🔗 Transaction: \`${registration.txHash}\``
              : null,
            registration.registeredAt
              ? `📅 ${alreadyRegistered ? "Originally registered" : "Registered"}: ${new Date(registration.registeredAt).toISOString()}`
              : null,
          ]
            .filter(Boolean)
            .join("\n"),
        });

        return true;
      } catch (err) {
        elizaLogger.error(
          `[KeeperHub] Agent registration failed: ${err instanceof Error ? err.message : String(err)}`
        );
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        await callback?.({
          text: `❌ Agent registration failed: ${errorMessage}`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: { text: "Register this agent on-chain" },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "🔗 Registering **{{agentName}}** on-chain via KeeperHub ERC-8004 registry…",
            action: "REGISTER_KEEPERHUB_AGENT",
          },
        },
      ],
    ],
  };
}
