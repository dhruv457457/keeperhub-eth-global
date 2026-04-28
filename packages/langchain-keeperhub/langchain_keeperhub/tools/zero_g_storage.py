"""0G Storage tools — permanent decentralized storage for agent data and audit trails."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient

ZG_INDEXER = "https://indexer-storage-testnet-standard.0g.ai"


# ─── Store Data ───────────────────────────────────────────────────────────────

class _ZgStoreInput(BaseModel):
    data: str = Field(max_length=100_000, description="Data to store (JSON string, text). Max 100KB.")
    tags: Optional[list[dict[str, str]]] = Field(
        default=None,
        description="Metadata tags e.g. [{'name': 'type', 'value': 'execution-history'}]"
    )


class ZgStoreTool(BaseTool):
    """Store data permanently on 0G decentralized storage."""

    name: str = "keeperhub_0g_store"
    description: str = (
        "Store data permanently on 0G decentralized storage. "
        "Returns a root hash for retrieval. Data is immutable and permanent. "
        "Use for: workflow execution history, agent decisions, DeFi audit trails, agent memory. "
        "0G Storage is used by MeritScore, Solace, SwarmNet for on-chain audit trails. "
        "Network: 0G Galileo testnet (chainId 16602)."
    )
    args_schema: type[BaseModel] = _ZgStoreInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, data: str, tags: list[dict[str, str]] | None = None) -> str:  # type: ignore[override]
        import httpx
        try:
            body = {
                "data": data.encode().hex(),
                "tags": tags or [],
            }
            async with httpx.AsyncClient(timeout=30) as http:
                r = await http.post(f"{ZG_INDEXER}/upload", json=body)

            if not r.is_success:
                raise Exception(f"0G upload failed ({r.status_code}): {r.text[:200]}")

            result = r.json() if r.text else {}
            root = result.get("rootHash") or result.get("root") or result.get("hash")
            return json.dumps({
                "ok": True,
                "root_hash": root,
                "tx_hash": result.get("txHash"),
                "size_bytes": len(data),
                "summary": f"Stored {len(data)} bytes on 0G Storage.",
                "hint": f"Use keeperhub_0g_retrieve with root_hash='{root}' to retrieve.",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Retrieve Data ────────────────────────────────────────────────────────────

class _ZgRetrieveInput(BaseModel):
    root_hash: str = Field(description="Root hash from keeperhub_0g_store (0x...)")


class ZgRetrieveTool(BaseTool):
    """Retrieve data from 0G decentralized storage by root hash."""

    name: str = "keeperhub_0g_retrieve"
    description: str = (
        "Retrieve data from 0G decentralized storage by root hash. "
        "Use root hashes returned from keeperhub_0g_store or keeperhub_0g_store_execution. "
        "Returns the original stored data."
    )
    args_schema: type[BaseModel] = _ZgRetrieveInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, root_hash: str) -> str:  # type: ignore[override]
        import httpx
        try:
            async with httpx.AsyncClient(timeout=30) as http:
                r = await http.get(f"{ZG_INDEXER}/file", params={"root": root_hash})

            if not r.is_success:
                raise Exception(f"0G retrieve failed ({r.status_code})")

            raw = r.text
            try:
                data = bytes.fromhex(raw).decode("utf-8")
            except Exception:
                data = raw

            return json.dumps({
                "ok": True,
                "root_hash": root_hash,
                "data": data,
                "size_bytes": len(raw),
            })
        except Exception as e:
            return json.dumps({"ok": False, "root_hash": root_hash, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Store Execution (audit trail) ───────────────────────────────────────────

class _ZgStoreExecutionInput(BaseModel):
    execution_id: str = Field(description="KeeperHub execution ID (exec_xxx)")
    workflow_id: str = Field(description="Workflow ID (wf_xxx)")
    status: str = Field(description="Final status: completed | success | failed | error")
    tx_hash: Optional[str] = Field(default=None, description="Transaction hash if available")
    summary: Optional[str] = Field(default=None, max_length=500)
    metadata: Optional[dict[str, Any]] = Field(default=None, description="Amounts, tokens, addresses")


class ZgStoreExecutionTool(BaseTool):
    """Store a KeeperHub execution result permanently on 0G for audit trail."""

    name: str = "keeperhub_0g_store_execution"
    description: str = (
        "Store a KeeperHub workflow execution result permanently on 0G Storage. "
        "Creates an immutable audit record with execution ID, status, tx hash, and timestamp. "
        "Use after every important execution to build a permanent on-chain audit trail. "
        "Returns root hash for future retrieval. "
        "Pattern used by MeritScore for verifiable execution history."
    )
    args_schema: type[BaseModel] = _ZgStoreExecutionInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        execution_id: str,
        workflow_id: str,
        status: str,
        tx_hash: str | None = None,
        summary: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        import httpx
        try:
            record = {
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "status": status,
                "tx_hash": tx_hash,
                "summary": summary,
                "metadata": metadata or {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "stored_by": "langchain-keeperhub",
            }

            data = json.dumps(record)
            body = {
                "data": data.encode().hex(),
                "tags": [
                    {"name": "type", "value": "keeperhub-execution"},
                    {"name": "execution_id", "value": execution_id},
                    {"name": "workflow_id", "value": workflow_id},
                    {"name": "status", "value": status},
                ],
            }

            async with httpx.AsyncClient(timeout=30) as http:
                r = await http.post(f"{ZG_INDEXER}/upload", json=body)

            if not r.is_success:
                raise Exception(f"0G store failed ({r.status_code}): {r.text[:200]}")

            result = r.json() if r.text else {}
            root = result.get("rootHash") or result.get("root")
            return json.dumps({
                "ok": True,
                "root_hash": root,
                "execution_id": execution_id,
                "workflow_id": workflow_id,
                "status": status,
                "summary": f"Execution {execution_id} archived on 0G. Root: {root}",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
