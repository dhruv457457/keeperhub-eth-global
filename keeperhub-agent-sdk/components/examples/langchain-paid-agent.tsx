"use client";
import {
  useExecutionStatus,
  useKeeperHub,
  useWalletBalances,
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

const DEFAULT_INSIGHT: DeveloperInsight = {
  title: "Discover paid workflow surfaces",
  sdk: ["kh.payments.catalog()", "kh.wallet.balances()"],
  hooks: ["useWalletBalances()"],
  explanation:
    "The LangChain app starts with real marketplace inventory and payment readiness, then hands paid execution to a toolkit-driven agent path.",
  snippet: `const catalog = await kh.payments.catalog({ limit: 8 });\nconst balances = useWalletBalances();`,
};

type LangChainResponse = {
  summary: string;
  payResult?: Record<string, unknown>;
  tools?: string[];
  listedSlug?: string;
};

export function LangChainPaidAgentExample() {
  const kh = useKeeperHub();
  const balances = useWalletBalances();
  const [catalog, setCatalog] = useState<{
    items: Array<{
      name: string;
      listedSlug: string | null;
      priceUsdcPerCall?: string | null;
    }>;
  }>();

  useEffect(() => {
    let active = true;

    void kh.payments.catalog({ limit: 12 }).then((nextCatalog) => {
      if (active) {
        setCatalog(nextCatalog);
      }
    });

    return () => {
      active = false;
    };
  }, [kh]);

  const [mode, setMode] = useState<"user" | "developer">("user");
  const [selectedSlug, setSelectedSlug] = useState("microtip");
  const [budget, setBudget] = useState("0.05");
  const [preferMpp, setPreferMpp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<LangChainResponse>();
  const [error, setError] = useState<string>();
  const [executionId, setExecutionId] = useState<string>();
  const [insight, setInsight] = useState<DeveloperInsight>(DEFAULT_INSIGHT);

  const executionStatus = useExecutionStatus(executionId);

  const paidItems =
    catalog?.items?.filter((item) => item.priceUsdcPerCall !== "0") ?? [];

  const metrics = [
    { label: "Paid workflows", value: String(paidItems.length) },
    { label: "Wallet balances", value: String(balances.data?.length ?? 0) },
    {
      label: "Preferred rail",
      value: preferMpp ? "MPP" : "x402",
      tone: "good" as const,
    },
  ];

  const feedItems = useMemo(() => {
    const items: Array<{ label: string; meta?: string; status?: string }> = [];
    if (response?.tools?.length) {
      items.push({
        label: "Toolkit ready",
        meta: `${response.tools.length} LangChain tools loaded.`,
        status: "success",
      });
    }
    if (response?.payResult?.payment_required) {
      items.push({
        label: "Payment challenge",
        meta: String(response.payResult.protocol ?? "Payment required"),
        status: "running",
      });
    }
    if (executionStatus.data) {
      items.push({
        label: "Execution status",
        meta: executionStatus.data.status,
        status: String(executionStatus.data.status),
      });
    }
    return items;
  }, [executionStatus.data, response?.payResult, response?.tools]);

  async function runAgent() {
    setBusy(true);
    setError(undefined);
    setResponse(undefined);
    setExecutionId(undefined);
    setInsight({
      title: "Run LangChain paid workflow agent",
      sdk: [
        "new KeeperHubToolkit(...)",
        "toolkit.getTools()",
        "pay_and_run tool.invoke(...)",
      ],
      tools: ["keeperhub_list_workflows", "keeperhub_pay_and_run"],
      explanation:
        "This route spins up the TypeScript LangChain toolkit, loads the live tool belt, and exercises the payment-aware workflow path with a user-defined budget guard.",
      snippet: `const toolkit = new KeeperHubToolkit({ apiKey, baseUrl });\nconst payTool = toolkit.getTools().find((tool) => tool.name === "keeperhub_pay_and_run");\nconst result = await payTool.invoke({ listed_slug: "${selectedSlug}", max_budget_usd: "${budget}", prefer_mpp: ${String(preferMpp)} });`,
    });

    try {
      const result = (await fetch("/api/examples/langchain-paid-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selectedSlug,
          budget,
          preferMpp,
        }),
      }).then((res) => res.json())) as LangChainResponse;
      setResponse(result);
      const execId = result.payResult?.execution_id;
      if (typeof execId === "string") {
        setExecutionId(execId);
      }
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

  return (
    <main className="page">
      <ExampleHero
        badges={["LangChain", "x402", "MPP", "Budget Guardrails"]}
        eyebrow="Example 3 · Paid Workflows"
        lead="A workflow discovery and payment console that wraps KeeperHub's paid execution path in a TypeScript LangChain toolkit, complete with budgets and challenge visibility."
        title="LangChain Paid Workflow Agent"
      />

      <SectionCard
        actions={<ModeToggle mode={mode} onChange={setMode} />}
        eyebrow="Marketplace"
        title="Choose the workflow the agent should buy and run"
      >
        <MetricGrid metrics={metrics} />
      </SectionCard>

      <div className="showcase-grid">
        <SectionCard eyebrow="Input" title="Workflow + budget">
          <label className="form-field">
            <span>Listed workflow</span>
            <select
              onChange={(event) => setSelectedSlug(event.target.value)}
              value={selectedSlug}
            >
              {paidItems.map((item) => (
                <option
                  key={item.listedSlug ?? item.name}
                  value={item.listedSlug ?? ""}
                >
                  {item.name} · {item.priceUsdcPerCall} USDC
                </option>
              ))}
            </select>
          </label>
          <label className="form-field form-field--inline">
            <span>Budget (USDC)</span>
            <input
              onChange={(event) => setBudget(event.target.value)}
              type="number"
              value={budget}
            />
          </label>
          <label className="checkbox-row">
            <input
              checked={preferMpp}
              onChange={(event) => setPreferMpp(event.target.checked)}
              type="checkbox"
            />
            <span>Prefer Tempo / MPP when available</span>
          </label>
          <ActionButton
            disabled={busy || paidItems.length === 0}
            label={busy ? "Running agent..." : "Execute with LangChain toolkit"}
            onClick={() => void runAgent()}
          />
          {error ? <p className="error-callout">{error}</p> : null}
        </SectionCard>

        <div className="stack-column">
          <ProgressFeed items={feedItems} title="Agent activity" />
          <ReceiptPanel
            rows={[
              {
                label: "Workflow",
                value: response?.listedSlug ?? selectedSlug,
              },
              { label: "Budget", value: `${budget} USDC` },
              { label: "Execution ID", value: executionId ?? "Not started" },
            ]}
            summary={
              response?.summary ??
              "Run the agent to inspect payment-required handling."
            }
            title="Result"
          />
        </div>

        <DeveloperPanel insight={insight} mode={mode} />
      </div>
    </main>
  );
}
