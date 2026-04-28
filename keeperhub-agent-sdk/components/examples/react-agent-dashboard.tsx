"use client";
import {
  useAnalyticsSummary,
  useChains,
  useExecution,
  useExecutionLogs,
  useExecutionStatus,
  useKeeperHub,
  useWallet,
  useWalletBalances,
  useWorkflows,
} from "keeperhub-sdk/react";
import { useEffect, useMemo, useState } from "react";
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

const PRESETS = [
  "Swap ETH to USDC using the safest low-slippage route.",
  "Compound rewards from my active lending positions.",
  "Rebalance my portfolio toward stablecoin yield with minimal churn.",
] as const;

const DEFAULT_INSIGHT: DeveloperInsight = {
  title: "Plan a DeFi objective",
  sdk: ["kh.wallet.get()", "kh.wallet.balances()", "kh.chains.list()"],
  hooks: [
    "useWallet()",
    "useWalletBalances()",
    "useChains()",
    "useWorkflows()",
  ],
  explanation:
    "The dashboard starts with wallet, balance, and network context so a user can frame an action before KeeperHub touches an execution path.",
  snippet: `const wallet = useWallet();\nconst balances = useWalletBalances();\nconst chains = useChains();`,
};

function toCurrency(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "--";
  }

  return `$${value.toFixed(2)}`;
}

export function ReactAgentDashboardExample() {
  const kh = useKeeperHub();
  const wallet = useWallet();
  const balances = useWalletBalances();
  const chains = useChains();
  const analytics = useAnalyticsSummary();
  const workflows = useWorkflows();
  const walletAddress =
    typeof wallet.data?.address === "string" ? wallet.data.address : "";

  const [mode, setMode] = useState<"user" | "developer">("user");
  const [intent, setIntent] = useState<string>(PRESETS[0]);
  const [budget, setBudget] = useState("0.08");
  const [executionId, setExecutionId] = useState<string>();
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Record<string, unknown>>();
  const [insight, setInsight] = useState<DeveloperInsight>(DEFAULT_INSIGHT);
  const [listedCatalog, setListedCatalog] = useState<{
    total: number;
    items: Array<{
      name: string;
      listedSlug: string | null;
      priceUsdcPerCall?: string | null;
    }>;
  }>();

  const executionStatus = useExecutionStatus(executionId);
  const execution = useExecution(executionId);
  const executionLogs = useExecutionLogs(executionId);

  useEffect(() => {
    let active = true;

    void kh.payments.catalog({ limit: 6 }).then((catalog) => {
      if (active) {
        setListedCatalog(catalog);
      }
    });

    return () => {
      active = false;
    };
  }, [kh]);

  const metrics = [
    {
      label: "Managed wallet",
      value: walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : "Loading",
    },
    {
      label: "Token balances",
      value: String(balances.data?.length ?? 0),
    },
    {
      label: "Supported chains",
      value: String(chains.data?.length ?? 0),
    },
    {
      label: "30d runs",
      value: String(analytics.data?.usage.totalRuns ?? 0),
      tone: "good" as const,
    },
  ];

  const progressItems = useMemo(() => {
    const items: Array<{ label: string; meta?: string; status?: string }> = [];

    if (result) {
      items.push({
        label: "Pipeline created execution plan",
        meta:
          typeof result.status === "string"
            ? `Pipeline status: ${result.status}`
            : "Execution queued.",
        status: "success",
      });
    }

    if (executionStatus.data) {
      items.push({
        label: "Execution status update",
        meta:
          executionStatus.data.progress !== undefined
            ? `Progress ${String(executionStatus.data.progress)}%`
            : "KeeperHub is advancing the workflow.",
        status: String(executionStatus.data.status),
      });
    }

    for (const log of executionLogs.data ?? []) {
      items.push({
        label: log.step ?? log.nodeName ?? log.nodeId ?? "Workflow step",
        meta: log.error ?? log.txHash ?? "Execution event received.",
        status: log.status,
      });
    }

    if (items.length === 0 && isRunning) {
      items.push({
        label: "Submitting workflow",
        meta: "KeeperHub is building a receipt-aware execution plan.",
        status: "running",
      });
    }

    return items;
  }, [executionLogs.data, executionStatus.data, isRunning, result]);

  async function runPipeline() {
    setError(undefined);
    setExecutionId(undefined);
    setResult(undefined);
    setIsRunning(true);
    setInsight({
      title: "Execute safe pipeline",
      sdk: [
        "kh.pipeline().generate(prompt)",
        "pipeline.pay({ budget, requireApprovalAbove })",
        "pipeline.retry({ attempts, delayMs })",
        "pipeline.run()",
      ],
      hooks: [
        "useExecutionStatus(executionId)",
        "useExecutionLogs(executionId)",
        "useAnalyticsSummary()",
      ],
      explanation:
        "This app turns a user goal into a KeeperHub pipeline, applies payment guardrails up front, then follows the execution until a receipt-worthy result comes back.",
      snippet: `const outcome = await kh\n  .pipeline()\n  .generate(intent, { context: "User-triggered DeFi action" })\n  .pay({ budget, requireApprovalAbove: "0.04" })\n  .retry({ attempts: 2, delayMs: 1200 })\n  .run();`,
    });

    try {
      const outcome = await kh
        .pipeline()
        .generate(intent, {
          context:
            "Produce a conservative plan with explicit runtime steps and clear output.",
        })
        .pay({ budget, requireApprovalAbove: "0.04" })
        .retry({ attempts: 2, delayMs: 1200 })
        .run();

      setExecutionId(outcome.executionId);
      setResult(outcome as unknown as Record<string, unknown>);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : String(caughtError),
      );
    } finally {
      setIsRunning(false);
    }
  }

  const receiptRows = [
    { label: "Execution ID", value: executionId ?? "Pending" },
    {
      label: "Status",
      value: String(
        execution.data?.status ??
          executionStatus.data?.status ??
          result?.status ??
          "--",
      ),
    },
    {
      label: "Budget",
      value: `${budget} USDC`,
    },
    {
      label: "Marketplace samples",
      value: String(listedCatalog?.items?.length ?? 0),
    },
  ];

  return (
    <main className="page">
      <ExampleHero
        badges={["React Hooks", "Payments", "Pipeline", "Receipts"]}
        eyebrow="Example 1 · Core Flow"
        lead="A real-time DeFi command desk that converts user intent into a KeeperHub execution pipeline, prices the call, tracks progress, and lands on a receipt-style outcome."
        title="Real-Time DeFi Agent Dashboard"
      />

      <SectionCard
        actions={<ModeToggle mode={mode} onChange={setMode} />}
        eyebrow="Wallet Context"
        title="Operator-ready execution state"
      >
        <MetricGrid metrics={metrics} />
      </SectionCard>

      <div className="showcase-grid">
        <SectionCard eyebrow="Input" title="Describe the job">
          <div className="preset-row">
            {PRESETS.map((preset) => (
              <button
                className={`preset-chip ${intent === preset ? "active" : ""}`}
                key={preset}
                onClick={() => {
                  setIntent(preset);
                  setInsight(DEFAULT_INSIGHT);
                }}
                type="button"
              >
                {preset}
              </button>
            ))}
          </div>
          <label className="form-field">
            <span>Intent</span>
            <textarea
              onChange={(event) => setIntent(event.target.value)}
              rows={4}
              value={intent}
            />
          </label>
          <label className="form-field form-field--inline">
            <span>Budget ceiling (USDC)</span>
            <input
              onChange={(event) => setBudget(event.target.value)}
              type="number"
              value={budget}
            />
          </label>
          <div className="action-row">
            <ActionButton
              disabled={isRunning}
              label={
                isRunning
                  ? "Running pipeline..."
                  : "Run safe execution pipeline"
              }
              onClick={() => void runPipeline()}
            />
          </div>
          {error ? <p className="error-callout">{error}</p> : null}
        </SectionCard>

        <div className="stack-column">
          <ProgressFeed items={progressItems} title="Live progress" />
          <ReceiptPanel
            rows={receiptRows}
            summary={
              typeof result?.status === "string"
                ? `Latest pipeline result: ${String(result.status)}.`
                : "Run a strategy to generate a KeeperHub receipt."
            }
            title="Final result"
          />
        </div>

        <DeveloperPanel insight={insight} mode={mode} />
      </div>

      <SectionCard eyebrow="Depth" title="What this app is actively using">
        <div className="detail-grid">
          <div className="detail-panel">
            <h3>Live workflow data</h3>
            <p>
              {String(workflows.data?.length ?? 0)} org workflows are visible to
              this SDK session.
            </p>
          </div>
          <div className="detail-panel">
            <h3>Marketplace coverage</h3>
            <p>
              {String(listedCatalog?.total ?? 0)} listed workflows are
              discoverable for x402-style execution paths.
            </p>
          </div>
          <div className="detail-panel">
            <h3>Receipt richness</h3>
            <p>
              {String(executionLogs.data?.length ?? 0)} step events are attached
              to the current receipt view.
            </p>
          </div>
        </div>
      </SectionCard>
    </main>
  );
}
