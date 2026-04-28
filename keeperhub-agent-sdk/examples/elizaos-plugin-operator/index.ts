import { createKeeperHubPlugin } from "@keeperhub/elizaos";

const apiKey = process.env.KEEPERHUB_API_KEY;
const baseUrl = process.env.KEEPERHUB_BASE_URL || "https://app.keeperhub.com";

if (!apiKey) {
  throw new Error("Set KEEPERHUB_API_KEY before running this demo.");
}

const plugin = createKeeperHubPlugin({ apiKey, baseUrl });

console.log("Plugin loaded:", {
  name: plugin.name,
  actions: plugin.actions?.length ?? 0,
  providers: plugin.providers?.length ?? 0,
  evaluators: plugin.evaluators?.length ?? 0,
});

const action = plugin.actions?.find(
  (candidate) => candidate.name === "KEEPERHUB_PAY_AND_RUN",
);

if (!action) {
  throw new Error("KEEPERHUB_PAY_AND_RUN action not found.");
}

const callbacks: string[] = [];
const ok = await (
  action.handler as unknown as (
    runtime: unknown,
    message: { content: { text: string } },
    state: unknown,
    options: Record<string, unknown> | undefined,
    callback: (message: { text?: string }) => void,
  ) => Promise<boolean>
)(
  {},
  {
    content: { text: "Pay and run slug microtip with $0.01 budget using MPP" },
  },
  undefined,
  undefined,
  (message) => {
    callbacks.push(message.text ?? "");
  },
);

console.log("Action result:", { ok, callbacks });
