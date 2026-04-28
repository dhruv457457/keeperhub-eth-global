"use client";

import { useState } from "react";

export function JsonAction({
  label,
  endpoint,
  method = "GET",
  body,
}: {
  label: string;
  endpoint: string;
  method?: "GET" | "POST";
  body?: unknown;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(endpoint, {
        method,
        headers:
          method === "POST"
            ? { "Content-Type": "application/json" }
            : undefined,
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
        cache: "no-store",
      });
      setResult(await response.json());
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
      <button
        className="button primary"
        disabled={loading}
        onClick={run}
        type="button"
      >
        {loading ? "Running" : label}
      </button>
      <div className="result-box">
        <pre className="result-json">
          {result ? JSON.stringify(result, null, 2) : "No run yet."}
        </pre>
      </div>
    </div>
  );
}
