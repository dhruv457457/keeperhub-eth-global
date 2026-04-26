import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

const API_KEYS_URL = "https://app.keeperhub.com/api-keys";
const CONFIG_DIR = join(homedir(), ".keeperhub");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

type KeeperHubCliConfig = {
  apiKey: string;
};

async function ensureConfigDir(): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
}

async function saveConfig(apiKey: string): Promise<void> {
  await ensureConfigDir();
  await writeFile(CONFIG_PATH, JSON.stringify({ apiKey }, null, 2), "utf8");
}

async function loadConfig(): Promise<KeeperHubCliConfig | null> {
  try {
    const content = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(content) as KeeperHubCliConfig;
  } catch {
    return null;
  }
}

function openBrowser(url: string): void {
  const platform = process.platform;
  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true });
    return;
  }
  if (platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", detached: true });
    return;
  }
  spawn("xdg-open", [url], { stdio: "ignore", detached: true });
}

async function promptForApiKey(
  promptLabel = "Paste your API key here"
): Promise<string> {
  const rl = createInterface({ input, output });
  try {
    const apiKey = (await rl.question(`${promptLabel}:\n> `)).trim();
    if (!apiKey) {
      throw new Error("API key is required.");
    }
    return apiKey;
  } finally {
    rl.close();
  }
}

async function runLogin(): Promise<void> {
  console.log("KeeperHub login\n");
  console.log(`Get your API key here:\n${API_KEYS_URL}\n`);

  try {
    console.log("Opening browser...\n");
    openBrowser(API_KEYS_URL);
  } catch {
    console.log("Could not open a browser automatically.\n");
  }

  const apiKey = await promptForApiKey();
  await saveConfig(apiKey);

  console.log(`\nSaved to ${CONFIG_PATH}`);
  console.log(
    "You can now use `new KeeperHub()` without passing an API key in Node environments."
  );
}

async function upsertEnvFile(
  targetPath: string,
  apiKey: string
): Promise<void> {
  const absolutePath = resolve(targetPath);
  let current = "";
  try {
    current = await readFile(absolutePath, "utf8");
  } catch {
    current = "";
  }

  const line = `KEEPERHUB_API_KEY=${apiKey}`;
  const hasExisting = /^KEEPERHUB_API_KEY=.*$/m.test(current);
  const next = hasExisting
    ? current.replace(/^KEEPERHUB_API_KEY=.*$/m, line)
    : `${current}${current && !current.endsWith("\n") ? "\n" : ""}${line}\n`;

  await writeFile(absolutePath, next, "utf8");
}

async function runInit(): Promise<void> {
  console.log("KeeperHub init\n");

  const existing = await loadConfig();
  const apiKey =
    existing?.apiKey ?? (await promptForApiKey("Paste your API key"));

  await saveConfig(apiKey);
  await upsertEnvFile(".env", apiKey);

  console.log(`\nSaved API key to ${CONFIG_PATH}`);
  console.log(`Updated ${resolve(".env")}`);
  console.log(
    "You can now use `new KeeperHub()` or rely on KEEPERHUB_API_KEY in your app."
  );
}

function printHelp(): void {
  console.log(`keeperhub

Usage:
  npx keeperhub login
  npx keeperhub init
  npx keeperhub whoami
`);
}

async function runWhoAmI(): Promise<void> {
  const config = await loadConfig();
  if (!config?.apiKey) {
    console.log(`No saved API key found at ${CONFIG_PATH}`);
    return;
  }

  const visiblePrefix = config.apiKey.slice(0, 8);
  console.log(`Saved API key: ${visiblePrefix}...`);
  console.log(`Config path: ${CONFIG_PATH}`);
}

async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case "login":
      await runLogin();
      return;
    case "init":
      await runInit();
      return;
    case "whoami":
      await runWhoAmI();
      return;
    case undefined:
    case "--help":
    case "-h":
      printHelp();
      return;
    default:
      console.error(`Unknown command: ${command}\n`);
      printHelp();
      process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
