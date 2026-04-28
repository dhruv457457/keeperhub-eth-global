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
    const [chains, wallet, schemas] = await Promise.all([
      kh.chains.list(),
      kh.wallet.getWallet(),
      kh.mcp.getSchemas("aave-v3/supply"),
    ]);

    const abi = await kh.chains.getAbi(
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      1,
    );
    const ens = await kh.protocols.execute("web3/check-balance", {
      network: "11155111",
      address: process.env.KEEPERHUB_WALLET,
    });

    return NextResponse.json({
      env,
      liveChecks: {
        chains: chains.length,
        hasSepolia: chains.some(
          (chain) => String(chain.chainId) === "11155111",
        ),
        walletLoaded: Boolean(wallet),
        abiEntries: abi.length,
        schemaMatches: Object.keys(schemas.actions ?? {}).length,
        checkBalanceStatus: ens.status,
      },
      pythonRunner: {
        package: "langchain-keeperhub",
        command: "cd packages/langchain-keeperhub && python tests/run_all.py",
        note: "The interactive app mirrors the safe reads with the TS SDK. The Python example script uses the actual langchain-keeperhub toolkit.",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: compactError(error) }, { status: 500 });
  }
}
