"""ENS (Ethereum Name Service) tools — resolve names, read agent policy records."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient

ENS_API = "https://api.ensideas.com/ens/resolve"
ENS_PUBLIC_RESOLVER = "0x4976fb03C32e5B8cfe2b6cCB31c09Ba78EBaBa41"


class _EnsResolveInput(BaseModel):
    name: str = Field(description="ENS name to resolve e.g. 'vitalik.eth', 'myagent.keeperhub.eth'")


class EnsResolveTool(BaseTool):
    """Resolve an ENS name to an Ethereum address."""

    name: str = "keeperhub_ens_resolve"
    description: str = (
        "Resolve an ENS name to an Ethereum address (forward resolution). "
        "Examples: 'vitalik.eth' → '0xd8dA...', 'myagent.eth' → '0x...'. "
        "Also returns avatar URL if set. "
        "Use to convert human-readable agent names to wallet addresses before transfers."
    )
    args_schema: type[BaseModel] = _EnsResolveInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, name: str) -> str:  # type: ignore[override]
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                r = await http.get(f"{ENS_API}/{name}")
                if r.status_code == 200:
                    data = r.json()
                    if data.get("address"):
                        return json.dumps({
                            "ok": True,
                            "name": name,
                            "address": data["address"],
                            "avatar": data.get("avatar"),
                            "display_name": data.get("displayName"),
                        })

            return json.dumps({"ok": False, "name": name, "error": "ENS name not found or not registered"})
        except Exception as e:
            return json.dumps({"ok": False, "name": name, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


class _EnsTextRecordInput(BaseModel):
    name: str = Field(description="ENS name e.g. 'myagent.eth'")
    key: str = Field(
        description=(
            "Text record key. Standard: 'description', 'url', 'avatar', 'com.twitter', 'com.github'. "
            "Agent policy (AgentPassports pattern): 'agent.policy', 'agent.publicKey', "
            "'agent.capabilities', 'agent.allowedContracts'"
        )
    )


class EnsTextRecordTool(BaseTool):
    """Read ENS text records — agent policies, descriptions, capabilities."""

    name: str = "keeperhub_ens_text_record"
    description: str = (
        "Read ENS text records from an ENS name. "
        "Text records store agent policies, public keys, capabilities, and custom data. "
        "Standard keys: 'description', 'url', 'avatar'. "
        "Agent policy keys: 'agent.policy', 'agent.publicKey', 'agent.capabilities', 'agent.allowedContracts'. "
        "Used by AgentPassports.eth pattern to publish agent identity and permissions on-chain."
    )
    args_schema: type[BaseModel] = _EnsTextRecordInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, name: str, key: str) -> str:  # type: ignore[override]
        try:
            # Read ENS Public Resolver text() function via KeeperHub web3
            result = await self.client.post(  # type: ignore[attr-defined]
                "/api/execute/contract-call",
                json={
                    "network": "1",
                    "contractAddress": ENS_PUBLIC_RESOLVER,
                    "functionName": "text",
                    "functionArgs": json.dumps([name, key]),
                },
            )
            r = result if isinstance(result, dict) else {}
            value = r.get("result")
            return json.dumps({
                "ok": True,
                "name": name,
                "key": key,
                "value": value,
                "empty": not value,
            })
        except Exception as e:
            return json.dumps({"ok": False, "name": name, "key": key, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


class _EnsLookupInput(BaseModel):
    address: str = Field(description="Ethereum address to reverse-lookup (0x...)")


class EnsLookupTool(BaseTool):
    """Reverse ENS lookup — find the ENS name for a wallet address."""

    name: str = "keeperhub_ens_lookup"
    description: str = (
        "Reverse ENS lookup — find the primary ENS name for a wallet address. "
        "Returns the human-readable ENS name set for a 0x address. "
        "Use to display agent identities as names instead of raw addresses."
    )
    args_schema: type[BaseModel] = _EnsLookupInput
    client: object = Field(exclude=True)
    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, address: str) -> str:  # type: ignore[override]
        import httpx
        try:
            async with httpx.AsyncClient(timeout=10) as http:
                r = await http.get(f"{ENS_API}/{address}")
                if r.status_code == 200:
                    data = r.json()
                    return json.dumps({
                        "ok": True,
                        "address": address,
                        "ens_name": data.get("name") or data.get("displayName"),
                        "avatar": data.get("avatar"),
                        "has_ens": bool(data.get("name") or data.get("displayName")),
                    })
            return json.dumps({"ok": True, "address": address, "ens_name": None, "has_ens": False})
        except Exception as e:
            return json.dumps({"ok": False, "address": address, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
