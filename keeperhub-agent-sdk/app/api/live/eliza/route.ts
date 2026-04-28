import { createKeeperHubPlugin } from "@keeperhub/elizaos";
import { type NextRequest, NextResponse } from "next/server";
import {
  callAction,
  compactError,
  keeperHubClient,
  missingEnvPayload,
  publicEnvStatus,
} from "@/lib/keeperhub";

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

type PluginProvider = {
  get: (
    runtime: unknown,
    message: { content: { text: string } },
    state: unknown,
  ) => Promise<string>;
};

export async function GET(request: NextRequest) {
  try {
    const env = publicEnvStatus();
    if (!env.hasApiKey) {
      return NextResponse.json(missingEnvPayload());
    }

    const kh = keeperHubClient();
    const plugin = createKeeperHubPlugin({
      apiKey: process.env.KEEPERHUB_API_KEY,
      baseUrl: process.env.KEEPERHUB_BASE_URL || "https://app.keeperhub.com",
    });

    const actions = (plugin.actions ?? []) as unknown as PluginAction[];
    const actionMap = new Map(actions.map((action) => [action.name, action]));
    const listChains = actionMap.get("KEEPERHUB_LIST_CHAINS");
    const schema = actionMap.get("KEEPERHUB_ACTION_SCHEMA");
    const protocol = actionMap.get("KEEPERHUB_PROTOCOL_ACTION");
    const transfer = actionMap.get("KEEPERHUB_TRANSFER");

    const results: Record<string, unknown> = {
      plugin: {
        name: plugin.name,
        actions: plugin.actions?.length ?? 0,
        providers: plugin.providers?.length ?? 0,
        evaluators: plugin.evaluators?.length ?? 0,
      },
    };

    if (listChains) {
      results.listChains = await callAction(
        listChains,
        "What chains does KeeperHub support?",
      );
    }
    if (schema) {
      results.actionSchema = await callAction(
        schema,
        "What params does `aave-v3/supply` need?",
      );
    }
    if (protocol) {
      results.codeRun = await callAction(
        protocol,
        'Run this KeeperHub action:\n```json\n{"actionType":"code/run-code","params":{"code":"return 42"}}\n```',
      );
    }

    const providers = (plugin.providers ?? []) as PluginProvider[];
    results.providers = [];
    for (const provider of providers) {
      const text = await provider.get({}, { content: { text: "" } }, undefined);
      (results.providers as unknown[]).push({
        textLength: text.length,
        preview: text.slice(0, 180),
      });
    }

    const integrations = await kh.integrations.list();
    const workflows = await kh.workflows.list();
    results.notifications = {
      apiVisibleIntegrations: integrations.map((integration) => ({
        id: integration.id,
        type: integration.type,
        name: integration.name,
      })),
      notificationWorkflowMatches: workflows
        .filter((workflow) =>
          JSON.stringify(workflow)
            .toLowerCase()
            .match(/discord|telegram|sendgrid|webhook|notify|notification/),
        )
        .slice(0, 8)
        .map((workflow) => ({ id: workflow.id, name: workflow.name })),
      note: integrations.some((integration) =>
        ["discord", "telegram", "sendgrid", "webhook"].includes(
          String(integration.type).toLowerCase(),
        ),
      )
        ? "Notification credentials are visible to the API key."
        : "No Discord, Telegram, SendGrid, or Webhook connection is visible to this API key.",
    };

    const shouldWrite =
      env.sepoliaWritesEnabled &&
      request.nextUrl.searchParams.get("write") === "true";
    if (shouldWrite && transfer && process.env.TEST_RECIPIENT) {
      results.sepoliaTransfer = await callAction(
        transfer,
        `Send ${process.env.TEST_AMOUNT || "0.0001"} ETH to ${
          process.env.TEST_RECIPIENT
        } on chain ${process.env.TEST_NETWORK || "11155111"}`,
      );
    } else {
      results.sepoliaTransfer = {
        skipped: true,
        reason:
          "Set ENABLE_SEPOLIA_WRITES=true and call with ?write=true to submit a tiny Sepolia transfer.",
      };
    }

    return NextResponse.json({ env, results });
  } catch (error) {
    return NextResponse.json({ error: compactError(error) }, { status: 500 });
  }
}
