"""Plugin tools — Chainlink CCIP, Ajna, Code execution, Math aggregation."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, Literal, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient


# ─── Chainlink CCIP ──────────────────────────────────────────────────────────

class _ChainlinkCcipInput(BaseModel):
    action: Literal[
        "ccip-send", "ccip-get-fee",
        "ccip-approve-bridge-token", "ccip-approve-fee-token",
        "ccip-check-bridge-balance", "ccip-check-bridge-allowance",
        "ccip-check-fee-balance", "ccip-check-fee-allowance",
    ] = Field(description="CCIP action. Start with ccip-get-fee to quote, then ccip-send to execute.")
    params: dict[str, Any] = Field(
        description=(
            "For ccip-send / ccip-get-fee: { destinationChainSelector, receiver, tokenAmounts, feeToken }. "
            "For approve: { spender, amount }. For check: { account } or { owner }."
        )
    )


class ChainlinkCcipTool(BaseTool):
    """Chainlink CCIP — cross-chain token transfers between 5+ chains."""

    name: str = "keeperhub_chainlink_ccip"
    description: str = (
        "Send tokens cross-chain using Chainlink CCIP (Cross-Chain Interoperability Protocol). "
        "Supports Ethereum (1), Base (8453), Arbitrum (42161), Optimism (10), Polygon (137), Avalanche (43114). "
        "Full flow: ccip-get-fee → ccip-approve-bridge-token → ccip-approve-fee-token → ccip-send. "
        "Pay fees in LINK or native token."
    )
    args_schema: type[BaseModel] = _ChainlinkCcipInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, action: str, params: dict[str, Any]) -> str:  # type: ignore[override]
        try:
            result = await self.client.post(  # type: ignore[attr-defined]
                "/api/execute/node",
                json={"actionType": f"chainlink/{action}", "config": params},
            )
            r = result if isinstance(result, dict) else {}
            return json.dumps({
                "ok": True,
                "action": f"chainlink/{action}",
                "execution_id": r.get("executionId"),
                "status": r.get("status"),
                "result": r.get("result"),
                "hint": "Call keeperhub_get_execution_status for the tx hash." if r.get("executionId") else None,
            })
        except Exception as e:
            return json.dumps({"ok": False, "action": f"chainlink/{action}", "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Chainlink Price Feed ─────────────────────────────────────────────────────

class _ChainlinkPriceInput(BaseModel):
    feed: str = Field(
        description="Price feed slug e.g. 'eth-usd', 'btc-usd', 'link-usd', 'matic-usd'. Format: {asset}-{quote}."
    )
    network: int = Field(
        default=1,
        description="Chain ID where the Chainlink feed is deployed. Ethereum mainnet=1, Base=8453, Arbitrum=42161."
    )


class ChainlinkPriceFeedTool(BaseTool):
    """Get latest price from a Chainlink oracle price feed."""

    name: str = "keeperhub_chainlink_price"
    description: str = (
        "Get the latest price from a Chainlink oracle price feed. "
        "Common feeds: eth-usd, btc-usd, link-usd, usdc-usd, matic-usd, avax-usd, bnb-usd. "
        "Returns the current on-chain price from the Chainlink aggregator."
    )
    args_schema: type[BaseModel] = _ChainlinkPriceInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, feed: str, network: int = 1) -> str:  # type: ignore[override]
        try:
            result = await self.client.post(  # type: ignore[attr-defined]
                "/api/execute/node",
                json={"actionType": f"chainlink/{feed}-latest-round-data", "config": {"network": str(network)}},
            )
            r = result if isinstance(result, dict) else {}
            return json.dumps({
                "ok": True,
                "feed": feed,
                "price": r.get("result") or r.get("answer"),
                "result": r.get("result"),
            })
        except Exception as e:
            return json.dumps({"ok": False, "feed": feed, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Ajna Protocol ───────────────────────────────────────────────────────────

class _AjnaInput(BaseModel):
    action: Literal[
        "get-borrower-info", "get-auction-status", "get-pool-lup",
        "get-pool-htp", "get-hpb-index", "price-to-index",
        "index-to-price", "get-deposit-index", "pool1-kicker-info",
    ] = Field(description="Ajna action to perform")
    params: dict[str, Any] = Field(
        default_factory=dict,
        description="For get-borrower-info: { pool, borrower }. For get-auction-status: { pool, borrower }."
    )


class AjnaTool(BaseTool):
    """Ajna permissionless lending protocol on Base."""

    name: str = "keeperhub_ajna"
    description: str = (
        "Interact with the Ajna permissionless lending protocol on Base. "
        "Monitor pool health, check borrower positions, query auction status. "
        "No oracles, no governance — purely on-chain math. "
        "Actions: get-borrower-info, get-auction-status, get-pool-lup, get-pool-htp, "
        "get-hpb-index, price-to-index, index-to-price, get-deposit-index, pool1-kicker-info."
    )
    args_schema: type[BaseModel] = _AjnaInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, action: str, params: dict[str, Any] | None = None) -> str:  # type: ignore[override]
        try:
            result = await self.client.post(  # type: ignore[attr-defined]
                "/api/execute/node",
                json={"actionType": f"ajna/{action}", "config": params or {}},
            )
            r = result if isinstance(result, dict) else {}
            return json.dumps({
                "ok": True,
                "action": f"ajna/{action}",
                "result": r.get("result") or result,
                "execution_id": r.get("executionId"),
            })
        except Exception as e:
            return json.dumps({"ok": False, "action": f"ajna/{action}", "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Code Execution ───────────────────────────────────────────────────────────

class _CodeExecuteInput(BaseModel):
    code: str = Field(
        max_length=10_000,
        description=(
            "JavaScript code to execute server-side. Use 'return' to return a value. "
            "fetch() available for HTTP calls. "
            "Example: 'return { result: inputs.amount * 1.05 }'"
        )
    )
    inputs: Optional[dict[str, Any]] = Field(
        default=None,
        description="Input values accessible as 'inputs.key' in the code"
    )


class CodeExecuteTool(BaseTool):
    """Execute custom JavaScript in a KeeperHub sandboxed workflow step."""

    name: str = "keeperhub_run_code"
    description: str = (
        "Execute custom JavaScript code in a KeeperHub sandboxed server-side VM. "
        "fetch() is available for HTTP calls. Use for custom calculations, "
        "data transformation, external API calls, or complex logic between workflow steps. "
        "Returns the value of the last expression or explicit return statement."
    )
    args_schema: type[BaseModel] = _CodeExecuteInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, code: str, inputs: dict[str, Any] | None = None) -> str:  # type: ignore[override]
        try:
            config: dict[str, Any] = {"code": code}
            if inputs:
                config["inputs"] = inputs

            result = await self.client.post(  # type: ignore[attr-defined]
                "/api/execute/node",
                json={"actionType": "code/run-code", "config": config},
            )
            r = result if isinstance(result, dict) else {}
            return json.dumps({
                "ok": True,
                "execution_id": r.get("executionId"),
                "status": r.get("status"),
                "result": r.get("result"),
                "hint": "Call keeperhub_get_execution_status to get the final result." if r.get("executionId") else None,
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Math Aggregation ─────────────────────────────────────────────────────────

class _MathAggregateInput(BaseModel):
    operation: Literal["sum", "count", "average", "median", "min", "max", "product"] = Field(
        description="Aggregation operation"
    )
    values: list[float] = Field(description="Numeric values to aggregate")
    description: Optional[str] = Field(default=None, description="What these values represent")


class MathAggregateTool(BaseTool):
    """Math aggregation — sum, average, median, min, max, product."""

    name: str = "keeperhub_math_aggregate"
    description: str = (
        "Perform math aggregation on numeric values using KeeperHub's Math plugin. "
        "Operations: sum, count, average, median, min, max, product. "
        "Use for aggregating DeFi data — total TVL, average APY, portfolio value, etc."
    )
    args_schema: type[BaseModel] = _MathAggregateInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        operation: str,
        values: list[float],
        description: str | None = None,
    ) -> str:
        try:
            sorted_vals = sorted(values)
            n = len(values)
            result: float

            if operation == "sum":
                result = sum(values)
            elif operation == "count":
                result = float(n)
            elif operation == "average":
                result = sum(values) / n
            elif operation == "median":
                result = (sorted_vals[n // 2 - 1] + sorted_vals[n // 2]) / 2 if n % 2 == 0 else sorted_vals[n // 2]
            elif operation == "min":
                result = min(values)
            elif operation == "max":
                result = max(values)
            elif operation == "product":
                r = 1.0
                for v in values:
                    r *= v
                result = r
            else:
                return json.dumps({"ok": False, "error": f"Unknown operation: {operation}"})

            preview = values[:3]
            return json.dumps({
                "ok": True,
                "operation": operation,
                "result": result,
                "input_count": n,
                "description": description or f"{operation} of {n} values",
                "summary": f"{operation}({', '.join(str(v) for v in preview)}{'…' if n > 3 else ''}) = {result}",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
