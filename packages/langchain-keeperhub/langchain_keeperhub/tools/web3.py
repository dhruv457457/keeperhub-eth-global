"""Web3 execution tools — transfer, contract call, check-and-execute, gas estimate."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient


# ─── Transfer ────────────────────────────────────────────────────────────────

class _TransferInput(BaseModel):
    network: str = Field(description="Chain ID as string (e.g. '8453' for Base, '1' for Ethereum)")
    to: str = Field(description="Recipient wallet address (0x...)")
    amount: str = Field(description="Amount to send as a decimal string (e.g. '0.01' for 0.01 ETH)")
    token: Optional[str] = Field(
        default=None,
        description="ERC-20 token contract address. Omit to send native ETH/MATIC."
    )


class TransferFundsTool(BaseTool):
    """Transfer native tokens or ERC-20 tokens to a recipient address via KeeperHub."""

    name: str = "keeperhub_transfer_funds"
    description: str = (
        "Transfer native tokens (ETH, MATIC, etc.) or ERC-20 tokens to an address. "
        "Uses KeeperHub's managed wallet with retry logic, gas optimization, and MEV protection. "
        "Returns an execution_id — follow up with keeperhub_get_execution_status to get the tx hash."
    )
    args_schema: type[BaseModel] = _TransferInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, network: str, to: str, amount: str, token: str | None = None) -> str:  # type: ignore[override]
        try:
            body: dict[str, Any] = {"network": network, "to": to, "amount": amount}
            if token:
                body["token"] = token
            result = await self.client.post("/api/execute/transfer", json=body)  # type: ignore[attr-defined]
            return json.dumps({
                "ok": True,
                "execution_id": result.get("executionId"),
                "status": result.get("status"),
                "hint": "Call keeperhub_get_execution_status with this execution_id to get the tx hash.",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Contract Call (read + write) ────────────────────────────────────────────

class _ContractCallInput(BaseModel):
    network: str = Field(description="Chain ID as string")
    contract: str = Field(description="Smart contract address (0x...)")
    function: str = Field(description="Function name to call (e.g. 'balanceOf', 'transfer')")
    args: Optional[list[Any]] = Field(default=None, description="Function arguments as a JSON array")
    abi: Optional[str] = Field(default=None, description="Contract ABI JSON string (auto-fetched if omitted)")
    call_type: str = Field(
        default="read",
        description="'read' for view/pure functions (no gas), 'write' for state-changing functions (costs gas)"
    )
    gas_limit_multiplier: Optional[str] = Field(
        default=None,
        description="Gas limit multiplier e.g. '1.2' adds 20%% headroom. Only for write calls."
    )


class ContractCallTool(BaseTool):
    """
    Read or write any smart contract function via KeeperHub.

    For read calls: returns the function return value immediately (no gas).
    For write calls: submits a transaction and returns execution_id for polling.
    """

    name: str = "keeperhub_contract_call"
    description: str = (
        "Read or write any smart contract function. "
        "Set call_type='read' for view/pure functions (returns value immediately, no gas cost). "
        "Set call_type='write' for state-changing functions (returns execution_id, costs gas). "
        "For write calls, follow up with keeperhub_get_execution_status to get the tx hash."
    )
    args_schema: type[BaseModel] = _ContractCallInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        network: str,
        contract: str,
        function: str,
        args: list[Any] | None = None,
        abi: str | None = None,
        call_type: str = "read",
        gas_limit_multiplier: str | None = None,
    ) -> str:
        try:
            body: dict[str, Any] = {
                "network": network,
                "contractAddress": contract,
                "functionName": function,
            }
            if args:
                body["functionArgs"] = args
            if abi:
                body["abi"] = abi
            if call_type == "write" and gas_limit_multiplier:
                body["gasLimitMultiplier"] = gas_limit_multiplier

            result = await self.client.post("/api/execute/contract-call", json=body)  # type: ignore[attr-defined]

            if call_type == "read":
                return json.dumps({"ok": True, "result": result.get("result", result)})
            return json.dumps({
                "ok": True,
                "execution_id": result.get("executionId"),
                "status": result.get("status"),
                "hint": "Call keeperhub_get_execution_status with this execution_id to get the tx hash.",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Check-and-Execute ───────────────────────────────────────────────────────

class _CheckAndExecuteInput(BaseModel):
    network: str = Field(description="Chain ID as string")
    check_contract: str = Field(description="Contract address to read the condition from")
    check_function: str = Field(description="View function to call for the condition check")
    check_args: Optional[list[Any]] = Field(default=None, description="Arguments for the check function")
    check_abi: Optional[str] = Field(default=None, description="ABI for the check contract (auto-fetched if omitted)")
    condition_operator: str = Field(
        description="Comparison operator: 'gt', 'lt', 'eq', 'neq', 'gte', 'lte'"
    )
    condition_value: str = Field(description="Value to compare against (as string)")
    action_contract: str = Field(description="Contract address to call if condition is true")
    action_function: str = Field(description="Function to execute if condition is true")
    action_args: Optional[list[Any]] = Field(default=None, description="Arguments for the action function")
    action_abi: Optional[str] = Field(default=None, description="ABI for the action contract")


class CheckAndExecuteTool(BaseTool):
    """
    Atomically check an onchain condition and execute a transaction only if true.

    Example: read a vault's health factor → if below 1.2, trigger a repay.
    Prevents race conditions between the check and the action.
    """

    name: str = "keeperhub_check_and_execute"
    description: str = (
        "Read an onchain condition and execute a transaction only if the condition is met. "
        "Atomic — no race condition between the check and the action. "
        "Example: read a health factor → if below 1.2, trigger a repay. "
        "Returns execution_id if the condition was true and the action was submitted."
    )
    args_schema: type[BaseModel] = _CheckAndExecuteInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        network: str,
        check_contract: str,
        check_function: str,
        check_args: list[Any] | None,
        check_abi: str | None,
        condition_operator: str,
        condition_value: str,
        action_contract: str,
        action_function: str,
        action_args: list[Any] | None,
        action_abi: str | None,
    ) -> str:
        try:
            body: dict[str, Any] = {
                "network": network,
                "check": {
                    "contract": check_contract,
                    "function": check_function,
                    "condition": {"operator": condition_operator, "value": condition_value},
                },
                "action": {
                    "contract": action_contract,
                    "function": action_function,
                },
            }
            if check_args:
                body["check"]["args"] = check_args
            if check_abi:
                body["check"]["abi"] = check_abi
            if action_args:
                body["action"]["args"] = action_args
            if action_abi:
                body["action"]["abi"] = action_abi

            result = await self.client.post("/api/execute/check-and-execute", json=body)  # type: ignore[attr-defined]
            return json.dumps({
                "ok": True,
                "condition_met": result.get("conditionMet", True),
                "execution_id": result.get("executionId"),
                "status": result.get("status"),
                "hint": "Call keeperhub_get_execution_status with this execution_id to get the tx hash.",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Gas Estimate ────────────────────────────────────────────────────────────

class _GasEstimateInput(BaseModel):
    network: str = Field(description="Chain ID as string")
    contract: str = Field(description="Contract address")
    function: str = Field(description="Function name to estimate gas for")
    args: Optional[list[Any]] = Field(default=None, description="Function arguments")
    abi: Optional[str] = Field(default=None, description="Contract ABI JSON string. Auto-fetched if omitted.")


class EstimateGasTool(BaseTool):
    """Estimate gas cost for a smart contract call before submitting."""

    name: str = "keeperhub_estimate_gas"
    description: str = (
        "Estimate gas cost for a smart contract function call before executing it. "
        "Returns estimated gas units, ETH cost, and USD cost when available. "
        "Use this to check affordability before calling keeperhub_contract_call with call_type='write'."
    )
    args_schema: type[BaseModel] = _GasEstimateInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        network: str,
        contract: str,
        function: str,
        args: list[Any] | None = None,
        abi: str | None = None,
    ) -> str:
        try:
            # Auto-fetch ABI if not provided — API requires it for gas estimation
            resolved_abi = abi
            if not resolved_abi:
                try:
                    abi_resp = await self.client.get(  # type: ignore[attr-defined]
                        f"/api/chains/{network}/abi", address=contract
                    )
                    if isinstance(abi_resp, dict) and "abi" in abi_resp:
                        resolved_abi = json.dumps(abi_resp["abi"])
                    elif isinstance(abi_resp, list):
                        resolved_abi = json.dumps(abi_resp)
                except Exception:
                    pass  # proceed without ABI — API may still work

            # API requires: { chainId, actionSlug, config: { contractAddress, abi, abiFunction, ... } }
            body: dict[str, Any] = {
                "chainId": int(network),
                "actionSlug": "write-contract",
                "config": {
                    "contractAddress": contract,
                    "abiFunction": function,
                    "functionArgs": json.dumps(args) if args else "[]",
                },
            }
            if resolved_abi:
                body["config"]["abi"] = resolved_abi

            result = await self.client.post("/api/gas/estimate", json=body)  # type: ignore[attr-defined]
            return json.dumps({
                "ok": True,
                "estimated_gas": result.get("estimatedGas"),
                "estimated_eth": result.get("estimatedEth"),
                "estimated_usd": result.get("estimatedUsd"),
                "gas_price": result.get("gasPrice"),
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
