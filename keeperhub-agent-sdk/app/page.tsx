import Link from "next/link";
import { AppSwitcher } from "@/components/showcase-ui";

const appCards = [
  {
    title: "Real-Time DeFi Agent Dashboard",
    href: "/examples/react-agent-dashboard",
    eyebrow: "Example 1",
    body: "React hooks, pipeline execution, payment guardrails, live progress tracking, and receipt-style outcomes.",
  },
  {
    title: "Autonomous Agent Operator",
    href: "/examples/eliza-agent-operator",
    eyebrow: "Example 2",
    body: "ElizaOS agent identity, workflow operations, protocol actions, wallet-aware transfers, and callback logs.",
  },
  {
    title: "LangChain Paid Workflow Agent",
    href: "/examples/langchain-paid-agent",
    eyebrow: "Example 3",
    body: "TypeScript LangChain tooling, marketplace discovery, paid workflow challenges, and budget-aware execution.",
  },
  {
    title: "Python Strategy Executor",
    href: "/examples/python-strategy-executor",
    eyebrow: "Example 4",
    body: "A real Python runner using langchain_keeperhub, paired with analytics, tracing, and execution debugging.",
  },
];

export default function Page() {
  return (
    <main className="page">
      <section className="hero hero--landing">
        <div>
          <p className="eyebrow">KeeperHub SDK Hackathon Suite</p>
          <h1>Four products, one execution layer.</h1>
          <p className="lead">
            This showcase turns the KeeperHub SDK into product-shaped apps
            across React hooks, ElizaOS, LangChain, payments, agent identity,
            protocol execution, and Python strategy workflows.
          </p>
          <div className="hero-actions">
            <Link
              className="button primary"
              href="/examples/react-agent-dashboard"
            >
              Open Example 1
            </Link>
            <Link className="button secondary" href="/docs/sdk">
              Read SDK Docs
            </Link>
          </div>
          <AppSwitcher />
        </div>
        <aside className="feature-card feature-card--hero">
          <p className="eyebrow">What judges should feel</p>
          <h3>This SDK is deep, composable, and actually ergonomic.</h3>
          <p>
            Every app includes user interaction, progress visibility, a final
            result, and a contextual developer panel that explains which
            KeeperHub methods or hooks were used at the exact moment they
            mattered.
          </p>
          <div className="badge-row">
            <span className="badge">React Hooks</span>
            <span className="badge">LangChain</span>
            <span className="badge">ElizaOS</span>
            <span className="badge">Python</span>
          </div>
        </aside>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Example Apps</p>
            <h2>Independent apps with shared SDK DNA</h2>
          </div>
          <p>
            Each product shows what developers can actually do with KeeperHub,
            without reducing the SDK to a wall of function names.
          </p>
        </div>
        <div className="grid two">
          {appCards.map((card) => (
            <Link
              className="feature-card feature-card--link"
              href={card.href}
              key={card.href}
            >
              <p className="eyebrow">{card.eyebrow}</p>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <span className="button secondary">Open app</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
