"use client";

import {
  useExecutionLogs,
  useExecutionStatus,
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
  title: "Autonomous operator surface",
  sdk: ["kh.agent.getRegistry()", "kh.wallet.get()"],
  hooks: ["useWallet()"],
  explanation:
    "The operator starts from identity and wallet context, then reaches into ElizaOS-backed actions only when the user asks for a specific autonomous move.",
  snippet: `const wallet = useWallet();\nconst registry = await kh.agent.getRegistry();`,
};

type ElizaResponse = {
  action: string;
  summary: string;
  callbacks?: string[];
  executionId?: string;
};

export function ElizaAgentOperatorExample() {
  const kh = useKeeperHub();
  const wallet = useWallet();
  const walletAddress =
    typeof wallet.data?.address === "string" ? wallet.data.address : "";
  const [mode, setMode] = useState<"user" | "developer">("user");
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<ElizaResponse>();
  const [error, setError] = useState<string>();
  const [executionId, setExecutionId] = useState<string>();
  const [insight, setInsight] = useState<DeveloperInsight>(DEFAULT_INSIGHT);

  const executionStatus = useExecutionStatus(executionId);
  const executionLogs = useExecutionLogs(executionId);

  const metrics = [
    {
      label: "Managed wallet",
      value: walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : "Loading",
    },
    {
      label: "Operator identity",
      value: response?.action === "register-agent" ? "Registered" : "Ready",
      tone: "good" as const,
    },
  ];

  const feedItems = useMemo(() => {
    const items: Array<{ label: string; meta?: string; status?: string }> = [];
    for (const callback of response?.callbacks ?? []) {
      items.push({
        label: "Eliza callback",
        meta: callback,
        status: "success",
      });
    }
    for (const log of executionLogs.data ?? []) {
      items.push({
        label: log.step ?? log.nodeName ?? log.nodeId ?? "Execution step",
        meta: log.error ?? log.txHash ?? "Wallet-aware action completed.",
        status: log.status,
      });
    }
    if (executionStatus.data) {
      items.unshift({
        label: "Execution status",
        meta: executionStatus.data.status,
        status: String(executionStatus.data.status),
      });
    }
    return items;
  }, [executionLogs.data, executionStatus.data, response?.callbacks]);

  async function registerAgent() {
    setBusy(true);
    setError(undefined);
    setResponse(undefined);
    setExecutionId(undefined);
    setInsight({
      title: "Register ERC-8004 identity",
      sdk: ["kh.agent.ensureRegistered(...)"],
      hooks: ["useWallet()"],
      explanation:
        "This uses the raw KeeperHub agent module to idempotently register the operator before any autonomous workflow action gets handed to Eliza.",
      snippet: `const registration = await kh.agent.ensureRegistered({\n  name: "KeeperHub Autonomous Operator",\n  capabilities: ["keeperhub.workflow.execute", "keeperhub.protocol.action"],\n});`,
    });

    try {
      const registration = await kh.agent.ensureRegistered({
        name: "KeeperHub Autonomous Operator",
        description:
          "Hackathon control-plane agent for ElizaOS workflow operations.",
        capabilities: [
          "keeperhub.workflow.execute",
          "keeperhub.protocol.action",
          "keeperhub.web3.transfer",
        ],
      });
      setResponse({
        action: "register-agent",
        summary: `Agent ready: ${registration.name ?? "Operator"} (${registration.id ?? "existing registration"}).`,
      });
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

  async function runAction(
    action: "list-workflows" | "protocol-action" | "transfer",
  ) {
    setBusy(true);
    setError(undefined);
    setResponse(undefined);
    setExecutionId(undefined);
    setInsight({
      title:
        action === "list-workflows"
          ? "Run Eliza workflow discovery"
          : action === "protocol-action"
            ? "Run Eliza protocol action"
            : "Run Eliza transfer action",
      sdk: ["createKeeperHubPlugin(...)", "plugin.actions[n].handler(...)"],
      tools:
        action === "list-workflows"
          ? ["LIST_KEEPERHUB_WORKFLOWS"]
          : action === "protocol-action"
            ? ["KEEPERHUB_PROTOCOL_ACTION"]
            : ["KEEPERHUB_TRANSFER"],
      explanation:
        "These controls hit a real ElizaOS plugin instance, then surface the plugin callbacks and any KeeperHub execution ID back into the product UI.",
      snippet: `const response = await fetch("/api/examples/eliza-agent-operator", {\n  method: "POST",\n  body: JSON.stringify({ action: "${action}" }),\n});`,
    });

    try {
      const result = (await fetch("/api/examples/eliza-agent-operator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }).then((res) => res.json())) as ElizaResponse;
      setResponse(result);
      setExecutionId(result.executionId);
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
        badges={["ElizaOS", "ERC-8004", "Automation", "Wallet-aware"]}
        eyebrow="Example 2 · Agent + Identity"
        lead="A production-flavored operator console that registers agent identity, dispatches Eliza-backed actions, and reflects execution state back into a product UI."
        title="Autonomous Agent Operator"
      />

      <SectionCard
        actions={<ModeToggle mode={mode} onChange={setMode} />}
        eyebrow="Identity"
        title="Run the operator like a control plane"
      >
        <MetricGrid metrics={metrics} />
      </SectionCard>

      <div className="showcase-grid">
        <SectionCard eyebrow="Controls" title="Autonomous actions">
          <div className="action-row action-row--stack">
            <ActionButton
              disabled={busy}
              label={
                busy ? "Registering..." : "Register / Verify Agent Identity"
              }
              onClick={() => void registerAgent()}
            />
            <ActionButton
              disabled={busy}
              label="List KeeperHub Workflows"
              onClick={() => void runAction("list-workflows")}
              tone="secondary"
            />
            <ActionButton
              disabled={busy}
              label="Run Safe Protocol Action"
              onClick={() => void runAction("protocol-action")}
              tone="secondary"
            />
            <ActionButton
              disabled={busy}
              label="Queue Tiny Transfer"
              onClick={() => void runAction("transfer")}
              tone="secondary"
            />
          </div>
          {error ? <p className="error-callout">{error}</p> : null}
        </SectionCard>

        <div className="stack-column">
          <ProgressFeed items={feedItems} title="Operator logs" />
          <ReceiptPanel
            rows={[
              { label: "Action", value: response?.action ?? "Waiting" },
              { label: "Execution ID", value: executionId ?? "Not started" },
              {
                label: "Status",
                value: String(executionStatus.data?.status ?? "Idle"),
              },
            ]}
            summary={
              response?.summary ??
              "Choose an operator action to create a live receipt."
            }
            title="Latest result"
          />
        </div>

        <DeveloperPanel insight={insight} mode={mode} />
      </div>
    </main>
  );
}
