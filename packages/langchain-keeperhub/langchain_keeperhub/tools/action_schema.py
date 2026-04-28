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
            # API returns { actions: { "code/run-code": {...}, "aave-v3/supply": {...} } }
            response = await self.client.get("/api/mcp/schemas")  # type: ignore[attr-defined]

            schema = None
            if isinstance(response, dict):
                all_actions = response.get("actions", {})
                # Exact match
                if action_type in all_actions:
                    schema = all_actions[action_type]
                    schema = {**schema, "actionType": action_type}
                else:
                    # Fuzzy match
                    for key, val in all_actions.items():
                        if action_type.lower() in key.lower():
                            schema = {**val, "actionType": key}
                            break

            if not schema:
                return json.dumps({
                    "ok": False,
                    "error": f"Action '{action_type}' not found.",
                    "hint": "Use keeperhub_search_actions to browse all 396 available actions.",
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
                "hint": f"Call keeperhub_protocol_action with action_type='{action_type}' and required_fields as config.",
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
            # API returns { actions: { "actionType": schema, ... } } — not a list
            response = await self.client.get("/api/mcp/schemas")  # type: ignore[attr-defined]

            if not isinstance(response, dict):
                return json.dumps({"ok": False, "error": "Unexpected response format"})

            all_actions = response.get("actions", {})
            q = query.lower()
            cat = category.lower() if category else None

            results = []
            for action_type, schema in all_actions.items():
                if not isinstance(schema, dict):
                    continue
                # Category filter
                if cat and cat not in schema.get("category", "").lower():
                    continue
                # Keyword filter
                if q not in action_type.lower() and q not in schema.get("label", "").lower() and q not in schema.get("description", "").lower():
                    continue
                results.append({
                    "action_type": action_type,
                    "label": schema.get("label"),
                    "category": schema.get("category"),
                    "description": schema.get("description"),
                    "required_fields": schema.get("requiredFields", {}),
                    "requires_credentials": schema.get("requiresCredentials"),
                })
                if len(results) >= limit:
                    break

            return json.dumps({
                "ok": True,
                "query": query,
                "total_available": len(all_actions),
                "total_found": len(results),
                "results": results,
                "hint": "Use keeperhub_get_action_schema for full details. Use keeperhub_protocol_action with action_type and config to execute.",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
