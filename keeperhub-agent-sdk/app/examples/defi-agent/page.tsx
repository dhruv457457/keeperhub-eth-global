import Link from "next/link";
import { JsonAction } from "@/components/json-action";

export default function DefiAgentPage() {
  return (
    <main className="page">
      <section className="section">
        <p className="eyebrow">Example 3</p>
        <h1>DeFi Safety Executor</h1>
        <p className="lead">
          A Python LangChain/LangGraph-oriented agent that proves KeeperHub is
          useful before funds move: inspect chains, ABIs, wallet state, ENS,
          action schemas, payment challenges, and execution status.
        </p>
        <div className="badge-row">
          <span className="badge">Python LangChain</span>
          <span className="badge info">LangGraph</span>
          <span className="badge">DeFi Reads</span>
          <span className="badge warn">Guarded Writes</span>
        </div>
      </section>

      <section className="section grid two">
        <div className="card">
          <h3>Unique Focus</h3>
          <p>
            This demo is the reliability story. It does not lead with payments
            or identity. It shows an agent doing safety checks first, then using
            KeeperHub for execution only when the operation is understood.
          </p>
          <ul className="feature-list">
            <li>Chain discovery and Sepolia support</li>
            <li>USDC ABI fetch and read-only contract calls</li>
            <li>Wallet and token visibility</li>
            <li>ENS resolution and execution status guidance</li>
            <li>Optional tiny Sepolia transfer outside the default path</li>
          </ul>
        </div>
        <div className="card">
          <h3>Python Runner</h3>
          <p>
            The frontend mirrors safe live checks through the TS SDK so it can
            run inside Next. The bundled Python example uses the real
            `langchain-keeperhub` toolkit and can be run from the terminal.
          </p>
          <pre>python examples/python-defi-safety-agent/main.py</pre>
          <Link className="button secondary" href="/docs/python-langchain">
            Read Python Docs
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">Live Demo</p>
            <h2>Run safe DeFi checks</h2>
          </div>
          <p>
            No mainnet write is submitted. Sepolia writes stay behind an
            explicit environment gate.
          </p>
        </div>
        <JsonAction
          endpoint="/api/live/python"
          label="Run DeFi Safety Checks"
        />
      </section>
    </main>
  );
}
