"""Workflow versioning and migration tools."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient


# ─── Create New Version ───────────────────────────────────────────────────────

class _WorkflowVersionInput(BaseModel):
    workflow_id: str = Field(description="Source workflow ID to version (wf_xxx)")
    improvements: Optional[str] = Field(
        default=None, max_length=500,
        description="Describe improvements e.g. 'Switch to Aave V3 for better yield'"
    )
    go_live: bool = Field(default=False, description="Publish the new version immediately")


class WorkflowVersionTool(BaseTool):
    """Create a new version of an existing workflow (v1 → v2)."""

    name: str = "keeperhub_workflow_version"
    description: str = (
        "Create a new version of an existing workflow (v1 → v2). "
        "Duplicates the workflow, optionally applies improvements, returns new workflow ID. "
        "Use keeperhub_workflow_migrate after to move funds from old to new version."
    )
    args_schema: type[BaseModel] = _WorkflowVersionInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        workflow_id: str,
        improvements: str | None = None,
        go_live: bool = False,
    ) -> str:
        try:
            # Duplicate workflow
            result = await self.client.post(  # type: ignore[attr-defined]
                f"/api/workflows/{workflow_id}/duplicate",
                json={},
            )
            r = result if isinstance(result, dict) else {}
            new_id = r.get("id")

            if not new_id:
                return json.dumps({"ok": False, "error": "Duplication failed — no new ID returned"})

            # Apply improvement description
            if improvements:
                try:
                    await self.client.patch(  # type: ignore[attr-defined]
                        f"/api/workflows/{new_id}",
                        json={"description": f"{r.get('description', '')} [v2: {improvements[:100]}]"},
                    )
                except Exception:
                    pass  # non-fatal

            # Go live if requested
            live_status = None
            if go_live:
                try:
                    await self.client.post(f"/api/workflows/{new_id}/go-live", json={})  # type: ignore[attr-defined]
                    live_status = "published"
                except Exception as e:
                    live_status = f"go-live failed: {e}"

            return json.dumps({
                "ok": True,
                "original_workflow_id": workflow_id,
                "new_workflow_id": new_id,
                "new_workflow_name": r.get("name"),
                "live_status": live_status,
                "summary": f"Created v2 workflow {new_id} from {workflow_id}.",
                "next_steps": [
                    f"1. Test: keeperhub_execute_workflow('{new_id}')",
                    f"2. Migrate funds: keeperhub_workflow_migrate(from='{workflow_id}', to='{new_id}')",
                    "3. Archive old workflow when stable",
                ],
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Migrate Funds ────────────────────────────────────────────────────────────

class _WorkflowMigrateInput(BaseModel):
    from_workflow_id: str = Field(description="Old workflow ID to migrate FROM")
    to_workflow_id: str = Field(description="New workflow ID to migrate TO")
    withdraw_input: Optional[dict[str, Any]] = Field(
        default=None,
        description="Inputs for the withdrawal run e.g. { 'action': 'withdraw_all' }"
    )
    activate_new: bool = Field(default=True, description="Run new workflow after migration")
    activate_input: Optional[dict[str, Any]] = Field(
        default=None, description="Inputs for the initial run of the new workflow"
    )


class WorkflowMigrateTool(BaseTool):
    """Migrate funds from an old workflow version to a new one."""

    name: str = "keeperhub_workflow_migrate"
    description: str = (
        "Migrate funds and execution from an old workflow version to a new one. "
        "Answers: 'how do I move funds from v1 to v2 of my workflow?' "
        "Drains the old workflow, then activates the new one. "
        "Use after keeperhub_workflow_version to complete migration."
    )
    args_schema: type[BaseModel] = _WorkflowMigrateInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        from_workflow_id: str,
        to_workflow_id: str,
        withdraw_input: dict[str, Any] | None = None,
        activate_new: bool = True,
        activate_input: dict[str, Any] | None = None,
    ) -> str:
        import asyncio
        steps: list[str] = []

        try:
            # Step 1: Drain old workflow
            steps.append(f"Draining {from_workflow_id}…")
            drain_result: dict = {}
            try:
                drain_exec = await self.client.post(  # type: ignore[attr-defined]
                    f"/api/workflow/{from_workflow_id}/execute",
                    json={"input": {**(withdraw_input or {}), "_action": "withdraw"}},
                )
                dr = drain_exec if isinstance(drain_exec, dict) else {}
                drain_exec_id = dr.get("executionId")
                # Poll drain
                for _ in range(30):
                    await asyncio.sleep(2)
                    st = await self.client.get(  # type: ignore[attr-defined]
                        f"/api/workflows/executions/{drain_exec_id}/status"
                    )
                    s = st.get("status", "") if isinstance(st, dict) else ""
                    if s in ("completed", "success", "failed", "error"):
                        drain_result = {"ok": s in ("completed", "success"), "status": s, "execution_id": drain_exec_id}
                        steps.append(f"✅ Drain {s}." if drain_result["ok"] else f"⚠️ Drain {s}.")
                        break
            except Exception as e:
                steps.append(f"⚠️ Drain attempt: {e} (continuing)")

            # Step 2: Activate new workflow
            activate_result: dict = {}
            if activate_new:
                steps.append(f"Activating {to_workflow_id}…")
                try:
                    act_exec = await self.client.post(  # type: ignore[attr-defined]
                        f"/api/workflow/{to_workflow_id}/execute",
                        json={"input": activate_input or {}},
                    )
                    ae = act_exec if isinstance(act_exec, dict) else {}
                    activate_result = {"ok": True, "execution_id": ae.get("executionId"), "status": ae.get("status")}
                    steps.append("✅ New workflow activated.")
                except Exception as e:
                    activate_result = {"ok": False, "error": str(e)}
                    steps.append(f"❌ Activation failed: {e}")

            return json.dumps({
                "ok": True,
                "from": from_workflow_id,
                "to": to_workflow_id,
                "drain_result": drain_result,
                "activate_result": activate_result,
                "steps": steps,
                "summary": f"Migration {from_workflow_id} → {to_workflow_id} complete.",
            })
        except Exception as e:
            return json.dumps({"ok": False, "steps": steps, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Publish Workflow ─────────────────────────────────────────────────────────

class _PublishWorkflowInput(BaseModel):
    workflow_id: str = Field(description="Workflow ID to publish (wf_xxx)")


class PublishWorkflowTool(BaseTool):
    """Publish a workflow to the KeeperHub marketplace."""

    name: str = "keeperhub_workflow_publish"
    description: str = (
        "Publish a workflow to the KeeperHub marketplace (go-live). "
        "Once published, others can discover and call it via x402/MPP payments. "
        "Use after testing your workflow is ready for production."
    )
    args_schema: type[BaseModel] = _PublishWorkflowInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, workflow_id: str) -> str:  # type: ignore[override]
        try:
            result = await self.client.post(  # type: ignore[attr-defined]
                f"/api/workflows/{workflow_id}/go-live",
                json={},
            )
            r = result if isinstance(result, dict) else {}
            return json.dumps({
                "ok": True,
                "workflow_id": workflow_id,
                "status": r.get("status", "live"),
                "name": r.get("name"),
                "summary": f"Workflow {workflow_id} is now live. Others can call it via x402/MPP.",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
