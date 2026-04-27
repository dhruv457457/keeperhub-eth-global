"""Action schema tools — discover params for any of 396 KeeperHub actions."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient


# ─── Get Action Schema ────────────────────────────────────────────────────────

class _GetActionSchemaInput(BaseModel):
    action_type: str = Field(
        description=(
            "Action type to look up. Format: 'protocol/action' or 'plugin/action'. "
            "Examples: 'aave-v3/supply', 'uniswap/swap-exact-input', "
            "'chainlink/ccip-send', 'lido/wrap', 'code/run-code', "
            "'math/aggregate', 'discord/send-message', 'ajna/get-borrower-info'"
        )
    )


class GetActionSchemaTool(BaseTool):
    """Get full parameter schema for any KeeperHub action before calling it."""

    name: str = "keeperhub_get_action_schema"
    description: str = (
        "Get the full parameter schema for any KeeperHub action before calling it. "
        "Returns required fields, optional fields, output fields, and descriptions. "
        "Use this BEFORE keeperhub_protocol_action to know exactly what params to pass. "
        "Covers all 396 actions: aave-v3/supply, uniswap/swap-exact-input, "
        "chainlink/ccip-send, lido/wrap, code/run-code, math/aggregate, etc."
    )
    args_schema: type[BaseModel] = _GetActionSchemaInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, action_type: str) -> str:  # type: ignore[override]
        try:
            # Search for specific action
            schemas = await self.client.get("/api/mcp/schemas", q=action_type)  # type: ignore[attr-defined]

            schema = None
            if isinstance(schemas, list):
                # Exact match first
                schema = next(
                    (s for s in schemas
                     if isinstance(s, dict) and (
                         s.get("actionType") == action_type or
                         s.get("type") == action_type
                     )),
                    None
                )
                # Fuzzy match fallback
                if not schema:
                    schema = next(
                        (s for s in schemas
                         if isinstance(s, dict) and
                         action_type.lower() in str(s.get("actionType", "")).lower()),
                        None
                    )

            if not schema:
                return json.dumps({
                    "ok": False,
                    "error": f"Action '{action_type}' not found.",
                    "hint": "Use keeperhub_search_actions to discover valid action types.",
                })

            return json.dumps({
                "ok": True,
                "action_type": schema.get("actionType", action_type),
                "label": schema.get("label"),
                "description": schema.get("description"),
                "category": schema.get("category"),
                "requires_credentials": schema.get("requiresCredentials"),
                "required_fields": schema.get("requiredFields", {}),
                "optional_fields": schema.get("optionalFields", {}),
                "output_fields": schema.get("outputFields", {}),
                "hint": f"Call keeperhub_protocol_action with action_type='{action_type}' and required_fields above.",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Search Actions ───────────────────────────────────────────────────────────

class _SearchActionsInput(BaseModel):
    query: str = Field(min_length=2, description="Search keyword e.g. 'supply', 'swap', 'bridge', 'stake'")
    category: Optional[str] = Field(default=None, description="Filter by category e.g. 'Aave V3', 'Chainlink', 'Code'")
    limit: int = Field(default=10, ge=1, le=20, description="Max results")


class SearchActionsTool(BaseTool):
    """Search all 396 KeeperHub actions by keyword or category."""

    name: str = "keeperhub_search_actions"
    description: str = (
        "Search all 396 KeeperHub actions by keyword, protocol, or category. "
        "Returns matching actions with required fields and descriptions. "
        "Use before keeperhub_protocol_action to discover the right action type. "
        "Example queries: 'supply', 'swap', 'ccip', 'stake', 'send message', 'aggregate'"
    )
    args_schema: type[BaseModel] = _SearchActionsInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, query: str, category: str | None = None, limit: int = 10) -> str:  # type: ignore[override]
        try:
            params: dict = {"q": query}
            if category:
                params["category"] = category

            schemas = await self.client.get("/api/mcp/schemas", **params)  # type: ignore[attr-defined]
            results = schemas[:limit] if isinstance(schemas, list) else []

            return json.dumps({
                "ok": True,
                "query": query,
                "total_found": len(schemas) if isinstance(schemas, list) else 0,
                "results": [
                    {
                        "action_type": s.get("actionType"),
                        "label": s.get("label"),
                        "category": s.get("category"),
                        "description": s.get("description"),
                        "required_fields": s.get("requiredFields", {}),
                        "requires_credentials": s.get("requiresCredentials"),
                    }
                    for s in results if isinstance(s, dict)
                ],
                "hint": "Use keeperhub_get_action_schema for full details on a specific action.",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
