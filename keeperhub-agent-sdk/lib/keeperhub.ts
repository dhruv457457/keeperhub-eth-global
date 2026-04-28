import { KeeperHub } from "keeperhub-sdk";

export function keeperHubClient() {
  const apiKey = process.env.KEEPERHUB_API_KEY;
  if (!apiKey) {
    throw new Error("Missing KEEPERHUB_API_KEY");
  }

  return new KeeperHub({
    apiKey,
    baseUrl: process.env.KEEPERHUB_BASE_URL || "https://app.keeperhub.com",
  });
}

export function publicEnvStatus() {
  return {
    hasApiKey: Boolean(process.env.KEEPERHUB_API_KEY),
    baseUrl: process.env.KEEPERHUB_BASE_URL || "https://app.keeperhub.com",
    wallet: process.env.KEEPERHUB_WALLET || null,
    sepoliaWritesEnabled: process.env.ENABLE_SEPOLIA_WRITES === "true",
    paymentSignerConfigured: Boolean(process.env.KEEPERHUB_PAYMENT_SIGNER),
  };
}

export function missingEnvPayload() {
  return {
    env: publicEnvStatus(),
    setupRequired: true,
    error: {
      name: "MissingEnv",
      message:
        "Set KEEPERHUB_API_KEY in keeperhub-agent-sdk/.env.local to enable live KeeperHub demo calls.",
    },
  };
}

export function compactError(error: unknown) {
  return {
    name:
      error && typeof error === "object" && "name" in error
        ? String(error.name)
        : "Error",
    message: error instanceof Error ? error.message : String(error),
  };
}

export async function callAction(
  action: {
    handler: (
      runtime: unknown,
      message: { content: { text: string } },
      state: unknown,
      options: Record<string, unknown> | undefined,
      callback: (message: { text?: string }) => void,
    ) => Promise<boolean>;
  },
  text: string,
) {
  const callbacks: string[] = [];
  const ok = await action.handler(
    {},
    { content: { text } },
    undefined,
    undefined,
    (message) => {
      callbacks.push(message.text ?? "");
    },
  );
  return { ok, callbacks };
}
