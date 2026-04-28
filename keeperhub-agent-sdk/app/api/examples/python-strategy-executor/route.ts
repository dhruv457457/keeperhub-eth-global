import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { compactError, publicEnvStatus } from "@/lib/keeperhub";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { strategy?: string };
    const env = publicEnvStatus();

    const scriptPath = path.join(
      process.cwd(),
      "examples",
      "python-strategy-executor",
      "main.py",
    );
    const strategy = body.strategy ?? "wallet-readiness";

    const result = await new Promise<{
      stdout: string;
      stderr: string;
      exitCode: number | null;
    }>((resolve, reject) => {
      const child = spawn("python", [scriptPath, strategy], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PYTHONPATH: [
            path.join(process.cwd(), "..", "packages", "langchain-keeperhub"),
            process.env.PYTHONPATH,
          ]
            .filter(Boolean)
            .join(path.delimiter),
        },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (exitCode) => {
        resolve({ stdout, stderr, exitCode });
      });
    });

    const parsed = result.stdout ? JSON.parse(result.stdout) : {};

    return NextResponse.json({
      env,
      strategy,
      exitCode: result.exitCode,
      stderr: result.stderr.trim(),
      result: parsed,
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary
          : `Python strategy ${strategy} exited with code ${String(result.exitCode)}.`,
    });
  } catch (error) {
    return NextResponse.json({ error: compactError(error) }, { status: 500 });
  }
}
