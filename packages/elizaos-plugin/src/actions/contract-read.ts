import type {
  Action,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
import type { KeeperHub } from "keeperhub-sdk";

/** Extract contract address */
function extractContractAddress(text: string): string | null {
  const match = text.match(/\b(0x[0-9a-fA-F]{40})\b/);
  return match ? match[1] : null;
}

/** Extract function name from "call balanceOf", "read totalSupply", "function transfer" etc. */
function extractFunctionName(text: string): string | null {
  const patterns = [
    /(?:call|read|function|method|fn)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
    /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/, // "balanceOf(" pattern
    /`([a-zA-Z_][a-zA-Z0-9_]*)`/, // backtick-quoted function name
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1] && m[1].length > 1) return m[1];
  }
  return null;
}

/** Extract chain ID from text */
function extractNetwork(text: string): string {
  const map: Record<string, string> = {
    ethereum: "1",
    mainnet: "1",
    base: "8453",
    polygon: "137",
    arbitrum: "42161",
    optimism: "10",
  };
  const lower = text.toLowerCase();
  for (const [name, id] of Object.entries(map)) {
    if (lower.includes(name)) return id;
  }
  return "1"; // default Ethereum
}

/** Parse args from a JSON array in the message (e.g. args: ["0xABC"]) */
function extractArgs(text: string): unknown[] | undefined {
  const match = text.match(/args?\s*:\s*(\[[\s\S]*?\])/i);
  if (!match) return undefined;
  try {
    return JSON.parse(match[1]) as unknown[];
  } catch {
    return undefined;
  }
}

export function createContractReadAction(kh: KeeperHub): Action {
  return {
    name: "KEEPERHUB_CONTRACT_READ",
    similes: [
      "READ_CONTRACT",
      "CALL_CONTRACT",
      "QUERY_CONTRACT",
      "CONTRACT_READ",
      "GET_CONTRACT_VALUE",
      "READ_ONCHAIN",
    ],
    description:
      "Read a value from any smart contract (view/pure function, no gas cost). " +
      "Provide the contract address, function name, and optionally args and network.",

    validate: async (
      _runtime: IAgentRuntime,
      message: Memory
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";
      const hasAddress = /\b0x[0-9a-fA-F]{40}\b/.test(text);
      const hasFunction =
        /(?:call|read|function|method|fn|`)\s*[a-zA-Z_][a-zA-Z0-9_]*/i.test(
          text
        );
      return hasAddress && hasFunction;
    },

    handler: async (
      _runtime: IAgentRuntime,
      message: Memory,
      _state: State | undefined,
      _options: Record<string, unknown> | undefined,
      callback: HandlerCallback | undefined
    ): Promise<boolean> => {
      const text = message.content?.text ?? "";

      const contract = extractContractAddress(text);
      if (!contract) {
        await callback?.({
          text: "❌ Please include a contract address (0x...).",
        });
        return false;
      }

      const fn = extractFunctionName(text);
      if (!fn) {
        await callback?.({
          text: "❌ Please specify the function name (e.g. 'call balanceOf').",
        });
        return false;
      }

      const network = extractNetwork(text);
      const args = extractArgs(text);

      await callback?.({
        text: `📖 Reading \`${fn}\` on contract \`${contract}\`…`,
      });

      try {
        const result = await kh.web3.read({
          network,
          contract,
          function: fn,
          args,
        });
        await callback?.({
          text: `✅ \`${fn}\` returned: \`${JSON.stringify(result)}\``,
        });
        return true;
      } catch (err) {
        elizaLogger.error(`[KeeperHub] Contract read failed: ${err}`);
        await callback?.({
          text: `❌ Contract read failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return false;
      }
    },

    examples: [
      [
        {
          user: "{{user1}}",
          content: {
            text: 'Read balanceOf on 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 for args: ["0xMyWallet"] on Ethereum',
          },
        },
        {
          user: "{{agentName}}",
          content: {
            text: "📖 Reading `balanceOf` on contract `0xA0b8...eB48`…",
            action: "KEEPERHUB_CONTRACT_READ",
          },
        },
      ],
    ],
  };
}
