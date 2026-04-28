"use client";

import {
  useAnalyticsNetworks,
  useAnalyticsRuns,
  useAnalyticsSummary,
  useGasCredits,
  useKeeperHub,
  useWallet,
} from "keeperhub-sdk/react";
import { useMemo, useState } from "react";
import {
  ActionButton,
  DeveloperPanel,
  type DeveloperInsight,
  ExampleHero,
  MetricGrid,
  ModeToggle,
  ProgressFeed,
  ReceiptPanel,
  SectionCard,
} from "@/components/showcase-ui";

const DEFAULT_INSIGHT: DeveloperInsight = {
  title: "Python strategy with observability",
  sdk: [
    "langchain_keeperhub.KeeperHubToolkit",
    "kh.analytics.summary()",
    "kh.debug.trace()",
  ],
  hooks: [
    "useAnalyticsSummary()",
    "useAnalyticsRuns()",
    "useAnalyticsNetworks()",
    "useGasCredits()",
  ],
  explanation:
    "This surface pairs a real Python runner with first-party observability hooks so a developer can watch strategy outputs and inspect execution telemetry in the same place.",
  snippet: `toolkit = KeeperHubToolkit(tools=["wallet_balance", "protocol_action", "estimate_gas"])\nsummary = useAnalyticsSummary()\ntrace = await kh.debug.trace(executionId)`,
};

type PythonResponse = {
  summary: string;
  strategy: string;
  result?: {
    command?: string;
    steps?: string[];
  };
  stderr?: string;
};

export function PythonStrategyExecutorExample() {
  const kh = useKeeperHub();
  const wallet = useWallet();
  const walletAddress =
    typeof wallet.data?.address === "string" ? wallet.data.address : "";
  const analyticsSummary = useAnalyticsSummary();
  const analyticsRuns = useAnalyticsRuns();
  const analyticsNetworks = useAnalyticsNetworks();
  const gasCredits = useGasCredits();

  const [mode, setMode] = useState<"user" | "developer">("user");
  const [strategy, setStrategy] = useState("wallet-readiness");
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<PythonResponse>();
  const [traceId, setTraceId] = useState("");
  const [traceResult, setTraceResult] = useState<Record<string, unknown>>();
  const [error, setError] = useState<string>();
  const [insight, setInsight] = useState<DeveloperInsight>(DEFAULT_INSIGHT);

  const metrics = [
    {
      label: "Managed wallet",
      value: walletAddress ? walletAddress.slice(0, 10) : "Loading",
    },
    { label: "30d executions", value: String(analyticsRuns.data?.length ?? 0) },
    {
      label: "Observed networks",
      value: String(analyticsNetworks.data?.length ?? 0),
    },
    {
      label: "Gas credits left",
      value:
        gasCredits.data?.remaining !== undefined
          ? String(gasCredits.data.remaining)
          : "--",
      tone: "good" as const,
    },
  ];

  const feedItems = useMemo(() => {
    const items: Array<{ label: string; meta?: string; status?: string }> = [];
    for (const step of response?.result?.steps ?? []) {
      items.push({ label: step, status: "success" });
    }
    if (traceResult?.summary) {
      items.push({
        label: "Trace summary",
        meta: String(traceResult.summary),
        status: "running",
      });
    }
    return items;
  }, [response?.result?.steps, traceResult]);

  async function runPython() {
    setBusy(true);
    setError(undefined);
    setResponse(undefined);
    setInsight({
      title: "Run Python strategy executor",
      sdk: [
        "langchain_keeperhub.KeeperHubToolkit",
        "WalletBalanceTool",
        "ProtocolActionTool",
        "EstimateGasTool",
      ],
      explanation:
        "The frontend spawns a real Python script that imports langchain_keeperhub, runs structured tools, and returns JSON back into the product shell.",
      snippet: `python examples/python-strategy-executor/main.py ${strategy}\n\nresult = await protocol_action_tool._arun(\n  action_type="web3/check-balance",\n  params={"network": "11155111", "address": wallet_address},\n)`,
    });

    try {
      const result = (await fetch("/api/examples/python-strategy-executor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy }),
      }).then((res) => res.json())) as PythonResponse;
      setResponse(result);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError),
      );
    } finally {
      setBusy(false);
    }
  }

  async function traceExecution() {
    if (!traceId) {
      return;
    }

    setError(undefined);
    setInsight({
      title: "Inspect debug + analytics",
      sdk: [
        "kh.debug.trace(executionId)",
        "kh.debug.explainFailure(executionId)",
        "kh.analytics.summary()",
      ],
      hooks: [
        "useAnalyticsSummary()",
        "useAnalyticsRuns()",
        "useAnalyticsNetworks()",
        "useGasCredits()",
      ],
      explanation:
        "This panel keeps Python-oriented developers in one place: run the script, then inspect execution traces, failures, and org-level telemetry without leaving the app.",
      snippet: `const trace = await kh.debug.trace(traceId);\nconst failure = await kh.debug.explainFailure(traceId);`,
    });

    try {
      const [trace, failure] = await Promise.all([
        kh.debug.trace(traceId),
        kh.debug.explainFailure(traceId).catch(() => undefined),
      ]);
      setTraceResult({
        summary: failure?.summary ?? "Trace loaded successfully.",
        trace,
        failure,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError),
      );
    }
  }

  return (
    <main className="page">
      <ExampleHero
        badges={["Python", "langchain_keeperhub", "Debug", "Analytics"]}
        eyebrow="Example 4 · Python + Observability"
        lead="A Python-first strategy surface with real toolkit execution, then live debug and analytics context so developers can inspect outcomes without context switching."
        title="Python Strategy Executor"
      />

      <SectionCard
        actions={<ModeToggle mode={mode} onChange={setMode} />}
        eyebrow="Telemetry"
        title="Strategy run plus developer insight"
      >
        <MetricGrid metrics={metrics} />
      </SectionCard>

      <div className="showcase-grid">
        <SectionCard eyebrow="Runner" title="Execute Python strategy">
          <label className="form-field">
            <span>Strategy</span>
            <select
              onChange={(event) => setStrategy(event.target.value)}
              value={strategy}
            >
              <option value="wallet-readiness">Wallet readiness</option>
              <option value="yield-scout">Yield scout</option>
              <option value="gas-check">Gas check</option>
            </select>
          </label>
          <ActionButton
            disabled={busy}
            label={busy ? "Running Python..." : "Run Python strategy"}
            onClick={() => void runPython()}
          />
          <label className="form-field">
            <span>Inspect execution ID</span>
            <input
              onChange={(event) => setTraceId(event.target.value)}
              placeholder="Paste an execution ID from any example"
              value={traceId}
            />
          </label>
          <ActionButton
            label="Trace execution"
            onClick={() => void traceExecution()}
            tone="secondary"
          />
          {error ? <p className="error-callout">{error}</p> : null}
        </SectionCard>

        <div className="stack-column">
          <ProgressFeed items={feedItems} title="Python + observability feed" />
          <ReceiptPanel
            rows={[
              { label: "Strategy", value: response?.strategy ?? strategy },
              {
                label: "30d runs",
                value: String(analyticsSummary.data?.usage.totalRuns ?? 0),
              },
              {
                label: "Command",
                value: response?.result?.command ?? "Not run yet",
              },
            ]}
            summary={
              response?.summary ??
              "Run a strategy to capture a Python-side result."
            }
            title="Result"
          />
        </div>

        <DeveloperPanel insight={insight} mode={mode} />
      </div>
    </main>
  );
}
