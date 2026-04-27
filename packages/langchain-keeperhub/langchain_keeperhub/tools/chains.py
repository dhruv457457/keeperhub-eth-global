"""Chain discovery tools — list supported networks and fetch contract ABIs."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient


class _ListChainsInput(BaseModel):
    pass  # no params


class ListChainsTool(BaseTool):
    """List all blockchain networks supported by KeeperHub."""

    name: str = "keeperhub_list_chains"
    description: str = (
        "List all blockchain networks that KeeperHub supports. "
        "Returns chain IDs, names, symbols, RPC info, and explorer links. "
        "Call this first to discover valid network IDs before executing any web3 operation."
    )
    args_schema: type[BaseModel] = _ListChainsInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self) -> str:  # type: ignore[override]
        try:
            chains = await self.client.get("/api/chains")  # type: ignore[attr-defined]
            summary = [
                {
                    "chainId": c["chainId"],
                    "name": c["name"],
                    "symbol": c["symbol"],
                    "isTestnet": c.get("isTestnet", False),
                    "explorerUrl": c.get("explorerUrl"),
                }
                for c in chains
                if c.get("isEnabled", True)
            ]
            return json.dumps(summary)
        except Exception as e:
            return json.dumps({"error": str(e)})

    def _run(self) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


class _FetchABIInput(BaseModel):
    chain_id: int = Field(description="Chain ID (e.g. 8453 for Base, 1 for Ethereum)")
    contract_address: str = Field(description="Smart contract address (0x...)")


class FetchContractABITool(BaseTool):
    """
    Fetch the verified ABI for a smart contract.

    KeeperHub auto-detects proxy patterns (EIP-1967, UUPS, Transparent Proxy,
    EIP-1167, Gnosis Safe, EIP-2535 Diamond) and returns the implementation ABI.
    """

    name: str = "keeperhub_fetch_contract_abi"
    description: str = (
        "Fetch the verified ABI for a smart contract address on any supported network. "
        "Automatically resolves proxy contracts to their implementation ABI. "
        "Use this before calling read_contract or write_contract to discover available functions."
    )
    args_schema: type[BaseModel] = _FetchABIInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, chain_id: int, contract_address: str) -> str:  # type: ignore[override]
        try:
            result = await self.client.get(  # type: ignore[attr-defined]
                f"/api/chains/{chain_id}/abi",
                address=contract_address,
            )
            # API returns { success: true, abi: [...], explorerUrl: "..." }
            if isinstance(result, dict) and "abi" in result:
                return json.dumps({
                    "ok": True,
                    "abi": result["abi"],
                    "explorer_url": result.get("explorerUrl"),
                })
            # May return ABI array directly
            if isinstance(result, list):
                return json.dumps({"ok": True, "abi": result})
            return json.dumps({"ok": True, "data": result})
        except Exception as e:
            return json.dumps({"error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
