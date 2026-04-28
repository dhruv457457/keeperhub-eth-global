import Link from "next/link";
import { JsonAction } from "@/components/json-action";

export default function X402AgentPage() {
  return (
    <main className="page">
      <section className="section">
        <p className="eyebrow">Example 1</p>
        <h1>Paid Workflow Agent</h1>
        <p className="lead">
          A TypeScript LangChain agent that discovers KeeperHub marketplace
          workflows, executes free listed tools, and reaches the real x402/MPP
          challenge for paid execution.
        </p>
        <div className="badge-row">
          <span className="badge">TypeScript LangChain</span>
          <span className="badge">x402</span>
          <span className="badge">MPP</span>
          <span className="badge info">Marketplace</span>
        </div>
      </section>

      <section className="section grid two">
        <div className="card">
          <h3>What This Uses</h3>
          <ul className="feature-list">
            <li>`@keeperhub/langchain` tool surface</li>
            <li>
              `keeperhub-sdk` payments catalog and listed workflow execution
            </li>
            <li>Free listed workflow: `helloworld`</li>
            <li>Paid listed workflow: `microtip`</li>
            <li>Real MPP header and x402 payment requirements</li>
          </ul>
        </div>
        <div className="card">
          <h3>Why It Wins</h3>
          <p>
            It demonstrates the highest-value KeeperHub integration path: agents
            can discover paid work, understand the price, and hand off execution
            to KeeperHub payment rails without inventing payment infrastructure.
          </p>
          <Link className="button secondary" href="/docs/typescript-langchain">
            Read TypeScript Docs
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Live Demo</p>
            <h2>Run the paid-workflow flow</h2>
          </div>
          <p>
            This calls the live KeeperHub API. Without a signer, the paid call
            stops at the real payment challenge.
          </p>
        </div>
        <JsonAction
          endpoint="/api/live/payments"
          label="Run Marketplace Agent"
        />
      </section>
    </main>
  );
}
