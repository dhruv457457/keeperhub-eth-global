"""Workflow tools — list, execute, generate, and check executions."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient

_SANITIZE_CHARS = str.maketrans({"`": "", "[": "", "]": "", "{": "", "}": "", "\\": ""})


def _sanitize(s: str, max_len: int = 80) -> str:
    """Strip characters that could cause prompt injection."""
    return s.translate(_SANITIZE_CHARS)[:max_len]


# ─── List Workflows ───────────────────────────────────────────────────────────

class _ListWorkflowsInput(BaseModel):
    project_id: Optional[str] = Field(default=None, description="Filter by project folder ID")
    tag_id: Optional[str] = Field(default=None, description="Filter by tag ID")


class ListWorkflowsTool(BaseTool):
    """List all KeeperHub workflows in the authenticated org."""

    name: str = "keeperhub_list_workflows"
    description: str = (
        "List all available KeeperHub onchain automation workflows. "
        "Call this first to see if a workflow already exists for the task before generating a new one. "
        "Returns workflow IDs, names, and descriptions."
    )
    args_schema: type[BaseModel] = _ListWorkflowsInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, project_id: str | None = None, tag_id: str | None = None) -> str:  # type: ignore[override]
        try:
            workflows = await self.client.get("/api/workflows", projectId=project_id, tagId=tag_id)  # type: ignore[attr-defined]
            return json.dumps([
                {
                    "id": w["id"],
                    "name": _sanitize(w["name"]),
                    "description": _sanitize(w["description"]) if w.get("description") else None,
                    "visibility": w.get("visibility"),
                    "updated_at": w.get("updatedAt"),
                }
                for w in workflows
            ])
        except Exception as e:
            return json.dumps({"error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Execute Workflow ─────────────────────────────────────────────────────────

class _ExecuteWorkflowInput(BaseModel):
    workflow_id: str = Field(
        description="Workflow ID to execute (format: wf_xxx). Get this from keeperhub_list_workflows."
    )
    input: Optional[dict[str, Any]] = Field(
        default=None,
        description="Runtime key-value inputs to pass to the workflow (max 8KB)"
    )
    wait: bool = Field(default=True, description="Wait for completion before returning (default: true)")


class ExecuteWorkflowTool(BaseTool):
    """
    Execute a KeeperHub workflow and return a structured result.

    Never throws — always returns a JSON string with ok, summary,
    isRetryable, and suggestion so the agent can reason about failures.
    """

    name: str = "keeperhub_execute_workflow"
    description: str = (
        "Execute a KeeperHub onchain automation workflow by ID. "
        "Use keeperhub_list_workflows first to find the right workflow ID. "
        "Returns ok, summary (human-readable), execution_id, status, and tx hash. "
        "If ok=false, check isRetryable and suggestion to decide what to do next."
    )
    args_schema: type[BaseModel] = _ExecuteWorkflowInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        workflow_id: str,
        input: dict[str, Any] | None = None,
        wait: bool = True,
    ) -> str:
        try:
            # Start execution
            exec_result = await self.client.post(  # type: ignore[attr-defined]
                f"/api/workflow/{workflow_id}/execute",
                json={"input": input or {}},
            )
            execution_id = exec_result.get("executionId")

            if not wait:
                return json.dumps({
                    "ok": True,
                    "summary": f"Workflow {workflow_id} started (fire-and-forget). Execution ID: {execution_id}.",
                    "execution_id": execution_id,
                    "status": "running",
                })

            # Poll until terminal
            import asyncio
            for _ in range(60):  # max 2 min
                await asyncio.sleep(2)
                status = await self.client.get(  # type: ignore[attr-defined]
                    f"/api/workflows/executions/{execution_id}/status"
                )
                s = status.get("status", "")
                if s in ("completed", "success", "failed", "error", "cancelled"):
                    ok = s in ("completed", "success")
                    attempts = 1
                    summary = (
                        f"Workflow {workflow_id} {s} after {attempts} attempt. Execution ID: {execution_id}."
                        if ok
                        else f"Workflow {workflow_id} failed with status '{s}'. Execution ID: {execution_id}."
                    )
                    return json.dumps({
                        "ok": ok,
                        "summary": summary,
                        "execution_id": execution_id,
                        "status": s,
                        "is_retryable": s in ("error", "failed"),
                        "suggestion": "Check keeperhub_get_execution_status for details." if not ok else None,
                    })

            return json.dumps({
                "ok": False,
                "summary": f"Workflow {workflow_id} timed out. Execution ID: {execution_id}.",
                "execution_id": execution_id,
                "status": "timeout",
                "is_retryable": True,
                "suggestion": f"Check execution status separately: keeperhub_get_execution_status('{execution_id}')",
            })
        except Exception as e:
            return json.dumps({
                "ok": False,
                "summary": f"Workflow {workflow_id} failed: {e}",
                "error": str(e),
                "is_retryable": "timeout" in str(e).lower() or "network" in str(e).lower(),
                "suggestion": "Retry once or check your API key and workflow ID.",
            })

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Generate Workflow ────────────────────────────────────────────────────────

class _GenerateWorkflowInput(BaseModel):
    prompt: str = Field(
        max_length=1000,
        description="Natural language description of the workflow (max 1000 chars)"
    )
    context: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Optional context about wallet, protocol, or chain (max 500 chars)"
    )
    execute: bool = Field(
        default=False,
        description="If true, generate AND immediately execute the workflow"
    )


class GenerateWorkflowTool(BaseTool):
    """
    Generate a KeeperHub workflow from a natural-language prompt.

    Optionally execute the generated workflow immediately with execute=True.
    """

    name: str = "keeperhub_generate_workflow"
    description: str = (
        "Generate a new KeeperHub onchain automation workflow from a plain-English description. "
        "Use this when keeperhub_list_workflows returned no suitable existing workflow. "
        "Set execute=true to generate and run immediately. "
        "Returns workflow_id, name, and optionally execution_id if execute=true."
    )
    args_schema: type[BaseModel] = _GenerateWorkflowInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        prompt: str,
        context: str | None = None,
        execute: bool = False,
    ) -> str:
        try:
            # Generate spec
            spec_result = await self.client.post(  # type: ignore[attr-defined]
                "/api/ai/generate",
                json={"prompt": prompt[:1000], "context": (context or "")[:500]},
            )
            # Save workflow
            saved = await self.client.post(  # type: ignore[attr-defined]
                "/api/workflows/create",
                json={
                    "name": spec_result.get("name", "Generated workflow"),
                    "description": spec_result.get("description"),
                    "nodes": spec_result.get("nodes", []),
                    "edges": spec_result.get("edges", []),
                },
            )
            workflow_id = saved.get("id")

            if not execute:
                return json.dumps({
                    "ok": True,
                    "workflow_id": workflow_id,
                    "name": saved.get("name"),
                    "description": saved.get("description"),
                    "hint": f"To execute, call keeperhub_execute_workflow with workflow_id='{workflow_id}'",
                })

            exec_result = await self.client.post(  # type: ignore[attr-defined]
                f"/api/workflow/{workflow_id}/execute",
                json={"input": {}},
            )
            return json.dumps({
                "ok": True,
                "workflow_id": workflow_id,
                "execution_id": exec_result.get("executionId"),
                "status": exec_result.get("status", "running"),
                "hint": "Call keeperhub_get_execution_status to track completion.",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Get Execution Status ─────────────────────────────────────────────────────

class _ExecutionStatusInput(BaseModel):
    execution_id: str = Field(
        description="Execution ID to check (exec_xxx or UUID format)"
    )
    include_logs: bool = Field(
        default=False,
        description="Include step-by-step execution logs (useful when debugging failures)"
    )


class GetExecutionStatusTool(BaseTool):
    """Check the status and progress of a KeeperHub workflow execution."""

    name: str = "keeperhub_get_execution_status"
    description: str = (
        "Check the status of a KeeperHub workflow execution. "
        "Returns status (pending/running/completed/failed), progress percentage, "
        "tx hash when available, and error details on failure. "
        "Set include_logs=true when debugging a failure to get step-level detail."
    )
    args_schema: type[BaseModel] = _ExecutionStatusInput
    client: object = Field(exclude=True)
    store: object = Field(default=None, exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, execution_id: str, include_logs: bool = False) -> str:  # type: ignore[override]
        try:
            # Try workflow execution first, then direct execution (transfer/contract call)
            status = None
            is_direct = False
            try:
                status = await self.client.get(  # type: ignore[attr-defined]
                    f"/api/workflows/executions/{execution_id}/status"
                )
            except Exception as first_err:
                if "404" in str(first_err) or "not found" in str(first_err).lower():
                    # Try direct execution endpoint (used by transfer, contract write)
                    try:
                        status = await self.client.get(  # type: ignore[attr-defined]
                            f"/api/execute/{execution_id}/status"
                        )
                        is_direct = True
                    except Exception:
                        raise first_err  # re-raise original error
                else:
                    raise

            result: dict[str, Any] = {
                "execution_id": execution_id,
                "status": status.get("status"),
                "progress": status.get("progress"),
                "tx_hash": status.get("transactionHash") or status.get("txHash"),
                "tx_link": status.get("transactionLink"),
                "type": status.get("type"),  # "transfer", "contract-call", etc.
                "is_direct_execution": is_direct,
                "error": status.get("errorContext", {}).get("error") if status.get("errorContext") else status.get("error"),
                "failed_node_id": status.get("errorContext", {}).get("failedNodeId") if status.get("errorContext") else None,
            }

            if include_logs:
                try:
                    logs_resp = await self.client.get(  # type: ignore[attr-defined]
                        f"/api/workflows/executions/{execution_id}/logs"
                    )
                    logs = logs_resp.get("logs", []) if isinstance(logs_resp, dict) else logs_resp
                    result["logs"] = [
                        {
                            "step": log.get("nodeName") or log.get("nodeId"),
                            "status": log.get("status"),
                            "duration_ms": log.get("durationMs"),
                            "tx_hash": log.get("txHash") or log.get("transactionHash"),
                            "error": log.get("error"),
                        }
                        for log in (logs or [])
                    ]
                except Exception:
                    pass  # logs are optional

            # Update execution store if terminal state reached
            terminal_states = {"completed", "success", "failed", "error", "cancelled"}
            exec_status = result.get("status", "")
            if self.store and exec_status in terminal_states:
                try:
                    await self.store.update_status(  # type: ignore[union-attr]
                        execution_id=execution_id,
                        status=exec_status,
                        tx_hash=result.get("tx_hash"),
                        error=result.get("error"),
                    )
                except Exception:
                    pass  # store failures never affect the main result

            return json.dumps(result)
        except Exception as e:
            # Don't reveal whether an ID exists vs access denied
            if "404" in str(e) or "401" in str(e) or "403" in str(e):
                return json.dumps({"error": "Execution not found or not accessible with your API key."})
            return json.dumps({"error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── List Executions (history) ────────────────────────────────────────────────

class _ListExecutionsInput(BaseModel):
    status: Optional[str] = Field(
        default=None,
        description="Filter by status: 'pending', 'running', 'completed', 'failed'. Omit for all."
    )
    limit: int = Field(default=20, ge=1, le=100, description="Max results (default 20)")


class ListExecutionsTool(BaseTool):
    """List past write executions from the local history store."""

    name: str = "keeperhub_list_executions"
    description: str = (
        "List past write executions (transfers, contract calls) from local history. "
        "Use to: get receipts, avoid double-paying, check pending transactions, or audit activity. "
        "Filter by status: pending, running, completed, failed. "
        "Only available when the toolkit is initialized with history=True."
    )
    args_schema: type[BaseModel] = _ListExecutionsInput
    store: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, status: str | None = None, limit: int = 20) -> str:  # type: ignore[override]
        try:
            records = await self.store.list(status=status, limit=limit)  # type: ignore[union-attr]
            return json.dumps({
                "ok": True,
                "count": len(records),
                "status_filter": status,
                "executions": [
                    {
                        "execution_id": r.execution_id,
                        "kind": r.kind,
                        "status": r.status,
                        "created_at": r.created_at,
                        "tx_hash": r.transaction_hash,
                        "network": r.network,
                        "amount": r.amount,
                        "to": r.to_address,
                        "error": r.error,
                    }
                    for r in records
                ],
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
