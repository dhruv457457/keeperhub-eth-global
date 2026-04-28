import { type NextRequest, NextResponse } from "next/server";
import {
  compactError,
  keeperHubClient,
  missingEnvPayload,
  publicEnvStatus,
} from "@/lib/keeperhub";

const defaultCapabilities = [
  "keeperhub.workflow.execute",
  "keeperhub.web3.transfer",
  "keeperhub.protocol.action",
  "keeperhub.payment.x402",
  "keeperhub.payment.mpp",
  "keeperhub.notification.dispatch",
];

export async function GET() {
  try {
    const env = publicEnvStatus();
    if (!env.hasApiKey) {
      return NextResponse.json(missingEnvPayload());
    }

    const kh = keeperHubClient();
    const registry = await kh.agent.getRegistry();
    return NextResponse.json({
      env,
      registry: {
        type: registry.type,
        name: registry.name,
        active: registry.active,
        x402Support: registry.x402Support,
        services: registry.services,
        registrations: registry.registrations?.slice(-5),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: compactError(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const env = publicEnvStatus();
    if (!env.hasApiKey) {
      return NextResponse.json(missingEnvPayload());
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      description?: string;
      capabilities?: string[];
    };
    const kh = keeperHubClient();
    const registration = await kh.agent.ensureRegistered({
      name: body.name || "KeeperHub ElizaOS Operator",
      description:
        body.description ||
        "ElizaOS agent that operates KeeperHub workflows, plugins, payments, and web3 execution.",
      capabilities:
        Array.isArray(body.capabilities) && body.capabilities.length > 0
          ? body.capabilities
          : defaultCapabilities,
    });
    return NextResponse.json({
      env,
      registration,
      capabilities: body.capabilities ?? defaultCapabilities,
      note: "ensureRegistered returns an existing registration when one is already present.",
    });
  } catch (error) {
    return NextResponse.json({ error: compactError(error) }, { status: 500 });
  }
}
