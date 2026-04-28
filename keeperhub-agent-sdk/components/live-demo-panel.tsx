"use client";

import { useState } from "react";

type DemoKey = "payments" | "eliza" | "python";

const endpoints: Record<DemoKey, string> = {
  payments: "/api/live/payments",
  eliza: "/api/live/eliza",
  python: "/api/live/python",
};

const labels: Record<DemoKey, string> = {
  payments: "Run x402 and MPP Demo",
  eliza: "Run ElizaOS Plugin Demo",
  python: "Run Python Safety Demo",
};

export function LiveDemoPanel({ demo }: { demo: DemoKey }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function runDemo() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(endpoints[demo], { cache: "no-store" });
      const json = await response.json();
      setResult(json);
    } catch (error) {
      setResult({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel">
      <button className="button primary" disabled={loading} onClick={runDemo}>
        {loading ? "Running live checks" : labels[demo]}
      </button>
      <div aria-live="polite" className="result-box">
        <pre>
          {result
            ? JSON.stringify(result, null, 2)
            : "Live-safe output will appear here. API keys stay server-side."}
        </pre>
      </div>
    </div>
  );
}
