"use client";

import Link from "next/link";

export type DeveloperInsight = {
  title: string;
  sdk: string[];
  hooks?: string[];
  tools?: string[];
  explanation: string;
  snippet: string;
};

export function ExampleHero({
  eyebrow,
  title,
  lead,
  badges,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  badges: string[];
}) {
  return (
    <section className="example-hero">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{lead}</p>
      </div>
      <div className="badge-row">
        {badges.map((badge) => (
          <span className="badge" key={badge}>
            {badge}
          </span>
        ))}
      </div>
    </section>
  );
}

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: "user" | "developer";
  onChange: (mode: "user" | "developer") => void;
}) {
  return (
    <div className="mode-toggle" role="tablist" aria-label="Audience mode">
      <button
        aria-selected={mode === "user"}
        className={mode === "user" ? "active" : undefined}
        onClick={() => onChange("user")}
        type="button"
      >
        User Mode
      </button>
      <button
        aria-selected={mode === "developer"}
        className={mode === "developer" ? "active" : undefined}
        onClick={() => onChange("developer")}
        type="button"
      >
        Developer Mode
      </button>
    </div>
  );
}

export function SectionCard({
  title,
  eyebrow,
  children,
  actions,
}: Readonly<{
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}>) {
  return (
    <section className="feature-card">
      <div className="feature-card__head">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function MetricGrid({
  metrics,
}: {
  metrics: Array<{ label: string; value: string; tone?: "good" | "warn" }>;
}) {
  return (
    <div className="metric-grid">
      {metrics.map((metric) => (
        <div className="metric-card" key={metric.label}>
          <span>{metric.label}</span>
          <strong className={metric.tone ? `tone-${metric.tone}` : undefined}>
            {metric.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function ProgressFeed({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; meta?: string; status?: string }>;
}) {
  return (
    <div className="console-card">
      <div className="console-card__head">
        <h3>{title}</h3>
      </div>
      <ul className="timeline">
        {items.length === 0 ? (
          <li className="timeline__empty">No activity yet.</li>
        ) : null}
        {items.map((item, index) => (
          <li className="timeline__item" key={`${item.label}-${index}`}>
            <div className="timeline__dot" />
            <div>
              <strong>{item.label}</strong>
              {item.meta ? <p>{item.meta}</p> : null}
            </div>
            {item.status ? (
              <span className={`status-pill status-pill--${item.status}`}>
                {item.status}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReceiptPanel({
  title,
  summary,
  rows,
}: {
  title: string;
  summary: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="console-card receipt-card">
      <div className="console-card__head">
        <h3>{title}</h3>
      </div>
      <p>{summary}</p>
      <dl className="receipt-grid">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DeveloperPanel({
  mode,
  insight,
}: {
  mode: "user" | "developer";
  insight: DeveloperInsight;
}) {
  if (mode === "user") {
    return null;
  }

  return (
    <aside className="developer-panel">
      <div className="developer-panel__head">
        <p className="eyebrow">Developer Mode</p>
        <h3>{insight.title}</h3>
      </div>
      <div className="developer-panel__group">
        <span>SDK Methods</span>
        <ul>
          {insight.sdk.map((item) => (
            <li key={item}>
              <code>{item}</code>
            </li>
          ))}
        </ul>
      </div>
      {insight.hooks?.length ? (
        <div className="developer-panel__group">
          <span>React Hooks</span>
          <ul>
            {insight.hooks.map((item) => (
              <li key={item}>
                <code>{item}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {insight.tools?.length ? (
        <div className="developer-panel__group">
          <span>Agent Tools</span>
          <ul>
            {insight.tools.map((item) => (
              <li key={item}>
                <code>{item}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="developer-panel__group">
        <span>Code Path</span>
        <pre className="result-json">{insight.snippet}</pre>
      </div>
      <div className="developer-panel__group">
        <span>Why it matters</span>
        <p>{insight.explanation}</p>
      </div>
    </aside>
  );
}

export function ActionButton({
  label,
  onClick,
  disabled,
  tone = "primary",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "secondary";
}) {
  return (
    <button
      className={`button ${tone === "secondary" ? "secondary" : "primary"}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function AppSwitcher() {
  const links = [
    ["Dashboard", "/examples/react-agent-dashboard"],
    ["ElizaOS", "/examples/eliza-agent-operator"],
    ["LangChain", "/examples/langchain-paid-agent"],
    ["Python", "/examples/python-strategy-executor"],
  ] as const;

  return (
    <div className="app-switcher">
      {links.map(([label, href]) => (
        <Link href={href} key={href}>
          {label}
        </Link>
      ))}
    </div>
  );
}
