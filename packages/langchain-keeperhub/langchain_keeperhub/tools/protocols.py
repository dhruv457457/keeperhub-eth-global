"""DeFi protocol tools — execute Aave, Uniswap, Lido, Curve, and 16 more."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient

# ─── List Protocols ───────────────────────────────────────────────────────────

class _ListProtocolsInput(BaseModel):
    query: Optional[str] = Field(default=None, description="Search keyword e.g. 'supply' or 'swap'")
    protocol: Optional[str] = Field(default=None, description="Filter by protocol slug e.g. 'aave-v3'")


class ListProtocolsTool(BaseTool):
    """List all available DeFi protocols and their actions."""

    name: str = "keeperhub_list_protocols"
    description: str = (
        "List all available DeFi protocols and their actions. "
        "Protocols: aave-v3, aave-v4, uniswap, lido, compound-v3, curve, morpho, "
        "yearn-v3, aerodrome, cowswap, rocket-pool, pendle, sky, spark, ethena, safe. "
        "Use this to discover valid actionType values before calling keeperhub_protocol_action."
    )
    args_schema: type[BaseModel] = _ListProtocolsInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, query: str | None = None, protocol: str | None = None) -> str:  # type: ignore[override]
        try:
            params: dict[str, Any] = {"category": "protocol"}
            if query:
                params["q"] = query
            if protocol:
                params["protocol"] = protocol

            actions = await self.client.get("/api/mcp/schemas", **params)  # type: ignore[attr-defined]
            if isinstance(actions, list):
                return json.dumps({
                    "ok": True,
                    "count": len(actions),
                    "actions": [
                        {
                            "actionType": a.get("actionType") or a.get("slug"),
                            "name": a.get("name"),
                            "protocol": a.get("protocol"),
                            "description": a.get("description"),
                        }
                        for a in actions[:25]
                    ],
                })
            return json.dumps({"ok": True, "data": actions})
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Execute Protocol Action ─────────────────────────────────────────────────

class _ProtocolActionInput(BaseModel):
    action_type: str = Field(
        description=(
            "Protocol action in 'protocol/action' format. Examples: "
            "'aave-v3/supply', 'aave-v3/borrow', 'aave-v3/withdraw', 'aave-v3/repay', "
            "'uniswap/swap-exact-input', 'lido/wrap', 'compound-v3/supply', "
            "'curve/exchange', 'morpho/supply', 'yearn-v3/deposit', "
            "'cowswap/create-order', 'rocket-pool/stake', 'pendle/swap'"
        )
    )
    params: dict[str, Any] = Field(
        description="Action parameters matching the protocol's input schema"
    )


class ProtocolActionTool(BaseTool):
    """Execute any DeFi protocol action — Aave, Uniswap, Lido, Curve, and more."""

    name: str = "keeperhub_protocol_action"
    description: str = (
        "Execute a DeFi protocol action directly — Aave, Uniswap, Lido, Curve, Compound, "
        "Morpho, Yearn, Aerodrome, CowSwap, Rocket Pool, Pendle, Sky, Spark, Ethena, Safe. "
        "Format: action_type='protocol/action' e.g. 'aave-v3/supply'. "
        "Use keeperhub_list_protocols to discover available actions and their parameter schemas. "
        "Returns execution_id for write actions — follow up with keeperhub_get_execution_status."
    )
    args_schema: type[BaseModel] = _ProtocolActionInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, action_type: str, params: dict[str, Any]) -> str:  # type: ignore[override]
        try:
            result = await self.client.post(  # type: ignore[attr-defined]
                "/api/execute/node",
                json={"actionType": f"protocol/{action_type}", "params": params},
            )
            r = result if isinstance(result, dict) else {}
            return json.dumps({
                "ok": True,
                "execution_id": r.get("executionId"),
                "status": r.get("status"),
                "result": r.get("result"),
                "hint": "Call keeperhub_get_execution_status to get the tx hash."
                if r.get("executionId") else None,
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
