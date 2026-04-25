import type { KeeperHubConfig } from "../types/index.js";
import { KeeperHubAuthError } from "./errors.js";

type ProcessWithBuiltins = NodeJS.Process & {
  getBuiltinModule?: (id: string) => unknown;
};

type GlobalWithProcess = typeof globalThis & {
  process?: ProcessWithBuiltins;
};

type ResolvedApiKey = {
  apiKey: string;
  source: "explicit" | "env" | "config";
};

let warnedImplicitApiKey = false;

function getProcess(): ProcessWithBuiltins | undefined {
  return (globalThis as GlobalWithProcess).process;
}

function getBuiltin<T>(id: string): T | undefined {
  const proc = getProcess();
  if (typeof proc?.getBuiltinModule !== "function") {
    return undefined;
  }
  return proc.getBuiltinModule(id) as T | undefined;
}

function getEnvApiKey(): string | undefined {
  return getProcess()?.env?.KEEPERHUB_API_KEY;
}

function getConfigApiKey(): string | undefined {
  const fs = getBuiltin<typeof import("node:fs")>("node:fs");
  const os = getBuiltin<typeof import("node:os")>("node:os");
  const path = getBuiltin<typeof import("node:path")>("node:path");

  if (!(fs && os && path)) {
    return undefined;
  }

  try {
    const configPath = path.join(os.homedir(), ".keeperhub", "config.json");
    if (!fs.existsSync(configPath)) {
      return undefined;
    }

    const content = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(content) as { apiKey?: string };
    return parsed.apiKey;
  } catch {
    return undefined;
  }
}

function warnImplicitSource(source: "env" | "config"): void {
  if (warnedImplicitApiKey) {
    return;
  }
  warnedImplicitApiKey = true;
  console.warn(
    source === "env"
      ? "[keeperhub-sdk] Loaded API key from KEEPERHUB_API_KEY."
      : "[keeperhub-sdk] Loaded API key from ~/.keeperhub/config.json."
  );
}

export function resolveKeeperHubConfig(
  config: KeeperHubConfig
): KeeperHubConfig & { apiKey: string } {
  const explicitApiKey = config.apiKey?.trim();
  if (explicitApiKey) {
    return {
      ...config,
      apiKey: explicitApiKey,
    };
  }

  const envApiKey = getEnvApiKey()?.trim();
  if (envApiKey) {
    warnImplicitSource("env");
    return {
      ...config,
      apiKey: envApiKey,
    };
  }

  const configApiKey = getConfigApiKey()?.trim();
  if (configApiKey) {
    warnImplicitSource("config");
    return {
      ...config,
      apiKey: configApiKey,
    };
  }

  throw new KeeperHubAuthError(
    "KeeperHub API key missing. Pass { apiKey }, set KEEPERHUB_API_KEY, or run `npx keeperhub login`. Get a key at https://app.keeperhub.com/api-keys"
  );
}

export function describeResolvedApiKey(
  config: KeeperHubConfig
): ResolvedApiKey | null {
  const explicitApiKey = config.apiKey?.trim();
  if (explicitApiKey) {
    return { apiKey: explicitApiKey, source: "explicit" };
  }

  const envApiKey = getEnvApiKey()?.trim();
  if (envApiKey) {
    return { apiKey: envApiKey, source: "env" };
  }

  const configApiKey = getConfigApiKey()?.trim();
  if (configApiKey) {
    return { apiKey: configApiKey, source: "config" };
  }

  return null;
}
