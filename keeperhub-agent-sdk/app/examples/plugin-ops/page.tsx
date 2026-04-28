import Link from "next/link";
import { JsonAction } from "@/components/json-action";

export default function PluginOpsPage() {
  return (
    <main className="page">
      <section className="section">
        <p className="eyebrow">Example 2</p>
        <h1>Agent Plugin Control Room</h1>
        <p className="lead">
          An ElizaOS operator that proves KeeperHub can become a chat-native
          action layer: plugin tools, wallet and workflow providers, execution
          evaluator, payment challenges, and ERC-8004 style agent identity.
        </p>
        <div className="badge-row">
          <span className="badge info">ElizaOS</span>
          <span className="badge">Agent Identity</span>
          <span className="badge">Plugins</span>
          <span className="badge warn">Notifications</span>
        </div>
      </section>

      <section className="section grid two">
        <div className="card">
          <h3>Unique Focus</h3>
          <p>
            This is the only demo that includes agent identity registration. It
            shows the agent as an entity with capabilities, then proves the
            ElizaOS package exposes real KeeperHub actions and providers.
          </p>
          <ul className="feature-list">
            <li>Register or verify agent identity</li>
            <li>List chains and action schemas</li>
            <li>Run `code/run-code` through protocol actions</li>
            <li>Read wallet and workflow provider context</li>
            <li>Check whether notification credentials are API-visible</li>
          </ul>
        </div>
        <div className="card">
          <h3>SDK Coverage</h3>
          <p>
            Covers agent registry, integrations, workflows, MCP schemas,
            protocols, wallet, and ElizaOS action/provider/evaluator packaging.
          </p>
          <Link className="button secondary" href="/docs/elizaos">
            Read ElizaOS Docs
          </Link>
        </div>
      </section>

      <section className="section grid two">
        <div>
          <div className="section-head">
            <div>
              <p className="eyebrow">Identity</p>
              <h2>Register or verify the operator</h2>
            </div>
          </div>
          <JsonAction
            body={{
              name: "KeeperHub ElizaOS Operator",
              description:
                "Demo agent for plugins, payments, workflows, and web3 execution.",
            }}
            endpoint="/api/live/agent"
            label="Register / Verify Agent"
            method="POST"
          />
        </div>
        <div>
          <div className="section-head">
            <div>
              <p className="eyebrow">Plugin</p>
              <h2>Run plugin checks</h2>
            </div>
          </div>
          <JsonAction endpoint="/api/live/eliza" label="Run ElizaOS Operator" />
        </div>
      </section>
    </main>
  );
}
