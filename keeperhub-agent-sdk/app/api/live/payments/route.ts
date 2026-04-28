import { KeeperHubToolkit } from "@keeperhub/langchain";
import { KeeperHubPaymentRequiredError } from "keeperhub-sdk";
import { NextResponse } from "next/server";
import {
  compactError,
  keeperHubClient,
  missingEnvPayload,
  publicEnvStatus,
} from "@/lib/keeperhub";

export async function GET() {
  try {
    const env = publicEnvStatus();
    if (!env.hasApiKey) {
      return NextResponse.json(missingEnvPayload());
    }

    const kh = keeperHubClient();
    const catalog = await kh.payments.catalog({ limit: 12 });
    const paid = catalog.items?.filter((item) => item.priceUsdcPerCall !== "0");
    const freeCall = await kh.payments.execute("helloworld", {});

    const toolkit = new KeeperHubToolkit({
      apiKey: process.env.KEEPERHUB_API_KEY,
      baseUrl: process.env.KEEPERHUB_BASE_URL || "https://app.keeperhub.com",
    });
    const payTool = toolkit
      .getTools()
      .find((tool) => tool.name === "keeperhub_pay_and_run");
    const paidRaw = payTool
      ? await payTool.invoke({
          listedSlug: "microtip",
          maxBudgetUsd: "0.01",
          preferMpp: true,
        })
      : JSON.stringify({ ok: false, error: "pay_and_run tool not found" });
    const paidChallenge = JSON.parse(String(paidRaw)) as Record<
      string,
      unknown
    >;

    return NextResponse.json({
      env,
      catalog: {
        total: catalog.total,
        paidCount: paid?.length ?? 0,
        items: catalog.items?.slice(0, 8).map((item) => ({
          name: item.name,
          slug: item.listedSlug,
          price: item.priceUsdcPerCall,
          type: item.workflowType,
        })),
      },
      freeCall: {
        slug: "helloworld",
        status: freeCall.status,
        executionId: freeCall.executionId,
        output: (freeCall as unknown as Record<string, unknown>).output,
      },
      paidChallenge,
    });
  } catch (error) {
    if (error instanceof KeeperHubPaymentRequiredError) {
      return NextResponse.json(
        {
          env: publicEnvStatus(),
          paymentRequired: true,
          challenge: error.paymentRequirements,
          headers: error.responseHeaders,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ error: compactError(error) }, { status: 500 });
  }
}
