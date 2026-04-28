import { createKeeperHubPlugin } from "@keeperhub/elizaos";
import { NextResponse } from "next/server";
import { callAction, compactError, publicEnvStatus } from "@/lib/keeperhub";

type PluginAction = {
  name: string;
  handler: (
    runtime: unknown,
    message: { content: { text: string } },
    state: unknown,
    options: Record<string, unknown> | undefined,
    callback: (message: { text?: string }) => void,
  ) => Promise<boolean>;
};

const DEFAULT_TRANSFER_RECIPIENT =
  process.env.TEST_RECIPIENT ?? process.env.KEEPERHUB_WALLET ?? "";

const ACTION_INPUTS: Record<string, string> = {
  "list-workflows": "What workflows are available to this operator right now?",
  "protocol-action":
    'Run this KeeperHub action:\n```json\n{"actionType":"web3/check-balance","params":{"network":"11155111","address":"' +
    (process.env.KEEPERHUB_WALLET ??
      "0x0000000000000000000000000000000000000000") +
    '"}}\n```',
  transfer: `Send ${process.env.TEST_AMOUNT ?? "0.0001"} ETH to ${DEFAULT_TRANSFER_RECIPIENT} on chain ${
    process.env.TEST_NETWORK ?? "11155111"
  }`,
};

function extractExecutionId(callbacks: string[]) {
  for (const callback of callbacks) {
    const match = callback.match(/Execution ID:\s*`?([A-Za-z0-9_-]+)`?/i);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string };
    const actionKey = body.action ?? "list-workflows";

    const env = publicEnvStatus();
    if (!env.hasApiKey) {
      return NextResponse.json(
        {
          env,
          summary:
            "KeeperHub API credentials are missing for the ElizaOS operator.",
        },
        { status: 400 },
      );
    }

    const plugin = createKeeperHubPlugin({
      apiKey: process.env.KEEPERHUB_API_KEY,
      baseUrl: process.env.KEEPERHUB_BASE_URL ?? "https://app.keeperhub.com",
    });

    const actions = (plugin.actions ?? []) as unknown as PluginAction[];
    const actionMap = new Map(actions.map((action) => [action.name, action]));

    const selected =
      actionKey === "list-workflows"
        ? actionMap.get("LIST_KEEPERHUB_WORKFLOWS")
        : actionKey === "protocol-action"
          ? actionMap.get("KEEPERHUB_PROTOCOL_ACTION")
          : actionMap.get("KEEPERHUB_TRANSFER");

    if (!selected) {
      return NextResponse.json(
        { env, summary: `Eliza action "${actionKey}" is not available.` },
        { status: 404 },
      );
    }

    if (actionKey === "transfer" && !DEFAULT_TRANSFER_RECIPIENT) {
      return NextResponse.json({
        env,
        summary:
          "Transfer action is configured, but TEST_RECIPIENT or KEEPERHUB_WALLET is missing.",
        result: { skipped: true },
      });
    }

    const result = await callAction(selected, ACTION_INPUTS[actionKey]);
    const executionId = extractExecutionId(result.callbacks);

    return NextResponse.json({
      env,
      action: actionKey,
      summary:
        result.callbacks.at(-1) ??
        `ElizaOS action ${selected.name} completed with ok=${String(result.ok)}.`,
      callbacks: result.callbacks,
      executionId,
      result,
    });
  } catch (error) {
    return NextResponse.json({ error: compactError(error) }, { status: 500 });
  }
}
