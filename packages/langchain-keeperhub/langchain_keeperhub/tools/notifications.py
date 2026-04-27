"""Notification tools — Discord, Telegram, Email (SendGrid), Webhook."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient


# ─── List Integrations ────────────────────────────────────────────────────────

class _ListIntegrationsInput(BaseModel):
    type: Optional[str] = Field(
        default=None,
        description="Filter by type: 'discord', 'telegram', 'sendgrid', 'webhook'. Omit for all."
    )


class ListIntegrationsTool(BaseTool):
    """List configured notification integrations (Discord, Telegram, SendGrid, Webhook)."""

    name: str = "keeperhub_list_integrations"
    description: str = (
        "List all configured notification integrations (Discord, Telegram, SendGrid, Webhook). "
        "Returns integration IDs, types, and names. "
        "Set up integrations at app.keeperhub.com → Integrations. "
        "Use integration IDs with keeperhub_notify to send notifications."
    )
    args_schema: type[BaseModel] = _ListIntegrationsInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, type: str | None = None) -> str:  # type: ignore[override]
        try:
            integrations = await self.client.get("/api/integrations")  # type: ignore[attr-defined]
            if not isinstance(integrations, list):
                integrations = []

            if type:
                integrations = [
                    i for i in integrations
                    if isinstance(i, dict) and i.get("type", "").lower() == type.lower()
                ]

            return json.dumps({
                "ok": True,
                "count": len(integrations),
                "integrations": [
                    {"id": i.get("id"), "type": i.get("type"), "name": i.get("name")}
                    for i in integrations
                    if isinstance(i, dict)
                ],
                "hint": (
                    f"No {'  ' + type if type else ''}integrations found. "
                    "Add one at app.keeperhub.com → Integrations."
                ) if not integrations else None,
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Send Notification ────────────────────────────────────────────────────────

class _NotifyInput(BaseModel):
    channel: str = Field(
        description="Notification channel: 'discord', 'telegram', 'email', or 'webhook'"
    )
    message: str = Field(max_length=2000, description="Notification message content")
    workflow_id: Optional[str] = Field(
        default=None,
        description="Existing notification workflow ID (wf_xxx). If omitted, auto-generates one."
    )
    subject: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Email subject (email channel only)"
    )


class NotifyTool(BaseTool):
    """Send notifications via Discord, Telegram, Email (SendGrid), or Webhook."""

    name: str = "keeperhub_notify"
    description: str = (
        "Send a notification via Discord, Telegram, Email (SendGrid), or Webhook. "
        "KeeperHub notifications run through workflow steps — not standalone endpoints. "
        "Provide an existing workflow_id for fast delivery, or just set channel + message "
        "and KeeperHub auto-generates a one-shot notification workflow. "
        "Set up integrations first at app.keeperhub.com → Integrations."
    )
    args_schema: type[BaseModel] = _NotifyInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        channel: str,
        message: str,
        workflow_id: str | None = None,
        subject: str | None = None,
    ) -> str:
        try:
            # Path 1: Run existing notification workflow
            if workflow_id:
                import asyncio
                exec_result = await self.client.post(  # type: ignore[attr-defined]
                    f"/api/workflow/{workflow_id}/execute",
                    json={"input": {"message": message, "subject": subject}},
                )
                r = exec_result if isinstance(exec_result, dict) else {}
                execution_id = r.get("executionId")

                # Poll for completion
                for _ in range(30):
                    await asyncio.sleep(2)
                    status = await self.client.get(  # type: ignore[attr-defined]
                        f"/api/workflows/executions/{execution_id}/status"
                    )
                    s = status.get("status", "") if isinstance(status, dict) else ""
                    if s in ("completed", "success", "failed", "error"):
                        ok = s in ("completed", "success")
                        return json.dumps({
                            "ok": ok,
                            "summary": f"{channel.title()} notification {'sent' if ok else 'failed'} via {workflow_id}.",
                            "execution_id": execution_id,
                            "channel": channel,
                        })

                return json.dumps({
                    "ok": False,
                    "summary": f"Notification workflow timed out.",
                    "execution_id": execution_id,
                })

            # Path 2: Auto-generate via AI pipeline
            channel_map = {
                "discord": "Discord channel",
                "telegram": "Telegram channel",
                "email": "email via SendGrid",
                "webhook": "webhook endpoint",
            }
            prompt = (
                f"Send a notification to {channel_map.get(channel, channel)}. "
                f"Message: \"{message[:500]}\". "
                + (f"Subject: \"{subject}\". " if subject else "")
                + f"Use the configured {channel} integration in KeeperHub."
            )

            # Generate + run workflow
            spec_result = await self.client.post(  # type: ignore[attr-defined]
                "/api/ai/generate",
                json={"prompt": prompt[:1000]},
            )
            saved = await self.client.post(  # type: ignore[attr-defined]
                "/api/workflows/create",
                json={
                    "name": f"Notify via {channel}",
                    "nodes": spec_result.get("nodes", []) if isinstance(spec_result, dict) else [],
                    "edges": spec_result.get("edges", []) if isinstance(spec_result, dict) else [],
                },
            )
            new_workflow_id = saved.get("id") if isinstance(saved, dict) else None

            if not new_workflow_id:
                return json.dumps({
                    "ok": False,
                    "error": "Failed to generate notification workflow.",
                    "hint": f"Set up a {channel} integration at app.keeperhub.com → Integrations.",
                })

            exec_result = await self.client.post(  # type: ignore[attr-defined]
                f"/api/workflow/{new_workflow_id}/execute",
                json={"input": {"message": message}},
            )
            r = exec_result if isinstance(exec_result, dict) else {}

            return json.dumps({
                "ok": True,
                "summary": f"{channel.title()} notification sent via auto-generated workflow.",
                "workflow_id": new_workflow_id,
                "execution_id": r.get("executionId"),
                "channel": channel,
            })

        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
