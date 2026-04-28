import { DynamicStructuredTool } from "@langchain/core/tools";
import type { KeeperHub } from "keeperhub-sdk";
import { z } from "zod";

/**
 * 0G Storage tools — permanent decentralized storage for agent data.
 *
 * 0G Galileo Testnet: chainId 16602
 * 0G Storage indexer: https://indexer-storage-testnet-standard.0g.ai
 * 0G RPC: https://evmrpc-testnet.0g.ai
 *
 * Used by: MeritScore, Solace, SwarmNet, CounterAgent — all use 0G for audit trails.
 * Use cases:
 *   - Store workflow execution history permanently
 *   - Agent memory that persists across sessions
 *   - Immutable audit trails for DeFi actions
 *   - Cross-agent shared data
 */

const ZG_INDEXER = "https://indexer-storage-testnet-standard.0g.ai";

export function createZgStoreTool(_kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_0g_store",
    description:
      "Store data permanently on 0G decentralized storage. " +
      "Returns a root hash for retrieval. Data is immutable and permanent. " +
      "Use to store: workflow execution history, agent decisions, DeFi audit trails, agent memory. " +
      "0G Storage is used by MeritScore, Solace, SwarmNet for on-chain audit trails.",
    schema: z.object({
      data: z
        .string()
        .max(100_000)
        .describe("Data to store (JSON string, text, or base64). Max 100KB."),
      tags: z
        .array(z.object({ name: z.string(), value: z.string() }))
        .max(10)
        .optional()
        .describe(
          "Optional metadata tags for indexing e.g. [{ name: 'type', value: 'execution-history' }, { name: 'workflowId', value: 'wf_abc' }]"
        ),
    }),
    func: async ({ data, tags }) => {
      try {
        const body = {
          data: Buffer.from(data).toString("base64"),
          tags: tags ?? [],
        };

        const res = await fetch(`${ZG_INDEXER}/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(
            `0G upload failed (${res.status}): ${err.slice(0, 200)}`
          );
        }

        const result = (await res.json()) as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          root_hash: result["rootHash"] ?? result["root"] ?? result["hash"],
          tx_hash: result["txHash"] ?? result["transactionHash"],
          size_bytes: data.length,
          summary: `Stored ${data.length} bytes on 0G Storage. Root hash: ${result["rootHash"] ?? "pending"}`,
          retrieval:
            "Use keeperhub_0g_retrieve with this root_hash to get the data back.",
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}

export function createZgRetrieveTool(_kh: KeeperHub): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_0g_retrieve",
    description:
      "Retrieve data from 0G decentralized storage by root hash. " +
      "Use with root hashes from keeperhub_0g_store. " +
      "Returns the original stored data (execution history, agent memory, audit logs).",
    schema: z.object({
      root_hash: z
        .string()
        .describe("Root hash returned from keeperhub_0g_store (0x...)"),
    }),
    func: async ({ root_hash }) => {
      try {
        const res = await fetch(
          `${ZG_INDEXER}/file?root=${encodeURIComponent(root_hash)}`
        );

        if (!res.ok) {
          throw new Error(`0G retrieve failed (${res.status})`);
        }

        const raw = await res.text();
        let data: string;
        try {
          data = Buffer.from(raw, "base64").toString("utf-8");
        } catch {
          data = raw;
        }

        return JSON.stringify({
          ok: true,
          root_hash,
          data,
          size_bytes: raw.length,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, root_hash, error: String(err) });
      }
    },
  });
}

export function createZgStoreExecutionTool(
  _kh: KeeperHub
): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "keeperhub_0g_store_execution",
    description:
      "Store a KeeperHub workflow execution result permanently on 0G Storage for audit trail. " +
      "Creates an immutable record with execution ID, status, tx hash, timestamp, and workflow details. " +
      "Use after every important execution to build a permanent on-chain audit trail (like MeritScore).",
    schema: z.object({
      execution_id: z.string().describe("KeeperHub execution ID (exec_xxx)"),
      workflow_id: z.string().describe("Workflow ID (wf_xxx)"),
      status: z
        .enum(["completed", "success", "failed", "error"])
        .describe("Final execution status"),
      tx_hash: z.string().optional().describe("Transaction hash if available"),
      summary: z
        .string()
        .max(500)
        .optional()
        .describe("Human-readable summary of what happened"),
      metadata: z
        .record(z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe("Additional metadata to store (amounts, tokens, addresses)"),
    }),
    func: async ({
      execution_id,
      workflow_id,
      status,
      tx_hash,
      summary,
      metadata,
    }) => {
      try {
        const record = {
          execution_id,
          workflow_id,
          status,
          tx_hash: tx_hash ?? null,
          summary: summary ?? null,
          metadata: metadata ?? {},
          timestamp: new Date().toISOString(),
          stored_by: "keeperhub-sdk",
        };

        const data = JSON.stringify(record);
        const body = {
          data: Buffer.from(data).toString("base64"),
          tags: [
            { name: "type", value: "keeperhub-execution" },
            { name: "execution_id", value: execution_id },
            { name: "workflow_id", value: workflow_id },
            { name: "status", value: status },
          ],
        };

        const res = await fetch(`${ZG_INDEXER}/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`0G store failed (${res.status})`);
        }

        const result = (await res.json()) as Record<string, unknown>;
        return JSON.stringify({
          ok: true,
          root_hash: result["rootHash"] ?? result["root"],
          execution_id,
          workflow_id,
          status,
          summary: `Execution ${execution_id} archived on 0G Storage. Root: ${result["rootHash"] ?? "pending"}`,
        });
      } catch (err) {
        return JSON.stringify({ ok: false, error: String(err) });
      }
    },
  });
}
