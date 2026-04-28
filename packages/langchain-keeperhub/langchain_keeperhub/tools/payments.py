"""Payment tools — x402 and MPP payment-gated workflow execution."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient


class _PayAndRunInput(BaseModel):
    workflow_id: Optional[str] = Field(default=None, description="Owned workflow ID from keeperhub_list_workflows")
    listed_slug: Optional[str] = Field(default=None, description="Public listed workflow slug from the x402/MPP catalog, e.g. 'microtip'")
    input: Optional[dict[str, Any]] = Field(default=None, description="Runtime inputs for the workflow")
    max_budget_usd: str = Field(default="1.00", description="Maximum USDC budget for this call (default $1.00)")
    prefer_mpp: bool = Field(default=True, description="Prefer MPP (Tempo USDC.e, cheaper) over x402 (Base USDC)")


class PayAndRunTool(BaseTool):
    """Execute a payment-gated workflow via x402 (Base USDC) or MPP (Tempo USDC.e)."""

    name: str = "keeperhub_pay_and_run"
    description: str = (
        "Execute a payment-gated KeeperHub workflow using x402 (Base USDC) or MPP (Tempo USDC.e). "
        "Handles payment automatically — agent never touches private keys. "
        "Use for paid/listed workflows that require USDC payment. "
        "Set max_budget_usd to cap spending per call (default $1.00). "
        "Prefer MPP (prefer_mpp=True) — it's cheaper and near-instant on Tempo. "
        "Returns ok, summary, execution_id, and amount_paid."
    )
    args_schema: type[BaseModel] = _PayAndRunInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        workflow_id: str | None = None,
        listed_slug: str | None = None,
        input: dict[str, Any] | None = None,
        max_budget_usd: str = "1.00",
        prefer_mpp: bool = True,
    ) -> str:
        try:
            if listed_slug:
                try:
                    result = await self.client.post(  # type: ignore[attr-defined]
                        f"/api/mcp/workflows/{listed_slug}/call",
                        json=input or {},
                    )
                    r = result if isinstance(result, dict) else {}
                    return json.dumps({
                        "ok": True,
                        "summary": f"Listed workflow {listed_slug} executed.",
                        "execution_id": r.get("executionId"),
                        "status": r.get("status"),
                        "output": r.get("output"),
                    })
                except Exception as e:
                    response = getattr(e, "response", None)
                    if getattr(response, "status_code", None) == 402:
                        headers = dict(getattr(response, "headers", {}))
                        www_auth = headers.get("www-authenticate", "")
                        protocol = "MPP" if ("method=\"tempo\"" in www_auth or www_auth.lower().startswith("mpp")) else "x402"
                        return json.dumps({
                            "ok": False,
                            "payment_required": True,
                            "protocol": protocol,
                            "has_mpp_header": bool(www_auth),
                            "has_x402_header": bool(headers.get("x-payment-requirements")),
                            "hint": "Payment challenge received. Use an x402/MPP payment resolver to sign and retry.",
                        })
                    raise

            if not workflow_id:
                return json.dumps({
                    "ok": False,
                    "error": "Provide workflow_id or listed_slug.",
                })

            # Start execution with payment
            result = await self.client.post(  # type: ignore[attr-defined]
                f"/api/workflow/{workflow_id}/execute",
                json={
                    "input": input or {},
                    "payment": {
                        "maxBudgetUsd": max_budget_usd,
                        "preferMpp": prefer_mpp,
                    },
                },
            )
            r = result if isinstance(result, dict) else {}
            execution_id = r.get("executionId")

            if not execution_id:
                return json.dumps({
                    "ok": False,
                    "summary": f"Failed to start paid workflow {workflow_id}",
                    "error": r.get("error") or "No execution ID returned",
                })

            # Poll for completion
            import asyncio
            for _ in range(60):
                await asyncio.sleep(2)
                status = await self.client.get(  # type: ignore[attr-defined]
                    f"/api/workflows/executions/{execution_id}/status"
                )
                s = status.get("status", "") if isinstance(status, dict) else ""
                if s in ("completed", "success", "failed", "error", "cancelled"):
                    ok = s in ("completed", "success")
                    return json.dumps({
                        "ok": ok,
                        "summary": (
                            f"Paid workflow {workflow_id} {s}. Execution: {execution_id}. "
                            f"Paid up to ${max_budget_usd} USDC via {'MPP' if prefer_mpp else 'x402'}."
                        ),
                        "execution_id": execution_id,
                        "status": s,
                        "amount_paid_usd": max_budget_usd,
                        "payment_protocol": "MPP (Tempo USDC.e)" if prefer_mpp else "x402 (Base USDC)",
                        "is_retryable": s in ("error", "failed"),
                    })

            return json.dumps({
                "ok": False,
                "summary": f"Paid workflow {workflow_id} timed out. Execution: {execution_id}.",
                "execution_id": execution_id,
                "status": "timeout",
                "is_retryable": True,
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
