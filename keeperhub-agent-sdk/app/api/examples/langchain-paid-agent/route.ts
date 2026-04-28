import { KeeperHubToolkit } from "@keeperhub/langchain";
import { NextResponse } from "next/server";
import { compactError, publicEnvStatus } from "@/lib/keeperhub";

function parseToolPayload(raw: unknown) {
  try {
    return JSON.parse(String(raw)) as Record<string, unknown>;
  } catch {
    return { raw: String(raw) };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      slug?: string;
      budget?: string;
      preferMpp?: boolean;
    };

    const env = publicEnvStatus();
    if (!env.hasApiKey) {
      return NextResponse.json(
        {
          env,
          summary:
            "KeeperHub API credentials are missing for the LangChain app.",
        },
        { status: 400 },
      );
    }

    const toolkit = new KeeperHubToolkit({
      apiKey: process.env.KEEPERHUB_API_KEY,
      baseUrl: process.env.KEEPERHUB_BASE_URL ?? "https://app.keeperhub.com",
    });
    const tools = toolkit.getTools();
    const listTool = tools.find(
      (tool) => tool.name === "keeperhub_list_workflows",
    );
    const payTool = tools.find((tool) => tool.name === "keeperhub_pay_and_run");

    if (!payTool) {
      return NextResponse.json(
        { env, summary: "The pay_and_run LangChain tool is not available." },
        { status: 500 },
      );
    }

    const listedSlug = body.slug ?? "microtip";
    const budget = body.budget ?? "0.05";
    const preferMpp = body.preferMpp ?? true;

    const discovered = listTool
      ? parseToolPayload(await listTool.invoke({}))
      : { skipped: true };

    const payResult = parseToolPayload(
      await payTool.invoke({
        listedSlug,
        maxBudgetUsd: budget,
        preferMpp,
      }),
    );

    return NextResponse.json({
      env,
      listedSlug,
      budget,
      preferMpp,
      summary:
        typeof payResult.summary === "string"
          ? payResult.summary
          : payResult.payment_required
            ? `Payment challenge returned for ${listedSlug}.`
            : `LangChain tool run completed for ${listedSlug}.`,
      discovered,
      payResult,
      tools: tools.map((tool) => tool.name),
    });
  } catch (error) {
    return NextResponse.json({ error: compactError(error) }, { status: 500 });
  }
}
