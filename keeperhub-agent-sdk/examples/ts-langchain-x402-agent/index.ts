import { KeeperHubToolkit } from "@keeperhub/langchain";
import { KeeperHub } from "keeperhub-sdk";

const apiKey = process.env.KEEPERHUB_API_KEY;
const baseUrl = process.env.KEEPERHUB_BASE_URL || "https://app.keeperhub.com";

if (!apiKey) {
  throw new Error("Set KEEPERHUB_API_KEY before running this demo.");
}

const kh = new KeeperHub({ apiKey, baseUrl });
const catalog = await kh.payments.catalog({ limit: 10 });

console.log("Listed workflows:");
for (const item of catalog.items ?? []) {
  console.log(`- ${item.listedSlug}: $${item.priceUsdcPerCall} ${item.name}`);
}

const free = await kh.payments.execute("helloworld", {});
console.log("Free listed workflow:", {
  status: free.status,
  executionId: free.executionId,
});

const toolkit = new KeeperHubToolkit({ apiKey, baseUrl });
const payTool = toolkit
  .getTools()
  .find((tool) => tool.name === "keeperhub_pay_and_run");

if (!payTool) {
  throw new Error("keeperhub_pay_and_run tool not found.");
}

const paid = await payTool.invoke({
  listedSlug: "microtip",
  maxBudgetUsd: "0.01",
  preferMpp: true,
});

console.log("Paid workflow challenge:");
console.log(paid);
