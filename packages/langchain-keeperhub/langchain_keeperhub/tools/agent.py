"""Agent identity and wallet tools — ERC-8004, wallet balance, provisioning."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Optional

from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from langchain_keeperhub.client import KeeperHubClient

# Base USDC on Base mainnet (x402)
_BASE_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
# USDC.e on Tempo (MPP)
_TEMPO_USDCE = "0x20c000000000000000000000b9537d11c60e8b50"


# ─── Register Agent (ERC-8004) ────────────────────────────────────────────────

class _RegisterAgentInput(BaseModel):
    name: Optional[str] = Field(default=None, max_length=64, description="Agent name")
    description: Optional[str] = Field(default=None, max_length=256, description="What this agent does")
    capabilities: Optional[list[str]] = Field(
        default=None,
        description="Capability slugs e.g. ['aave-v3/supply', 'uniswap/swap-exact-input']"
    )


class RegisterAgentTool(BaseTool):
    """Register this AI agent on-chain via ERC-8004 (idempotent)."""

    name: str = "keeperhub_register_agent"
    description: str = (
        "Register this AI agent on-chain as an ERC-8004 identity. "
        "Mints an NFT on Ethereum Mainnet representing the agent. "
        "Idempotent — safe to call on every startup, will not create duplicates. "
        "Returns the on-chain registration with NFT token ID and registry address."
    )
    args_schema: type[BaseModel] = _RegisterAgentInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(  # type: ignore[override]
        self,
        name: str | None = None,
        description: str | None = None,
        capabilities: list[str] | None = None,
    ) -> str:
        try:
            # Check for existing registration first (idempotent)
            existing = await self.client.get("/api/agent-registry")  # type: ignore[attr-defined]
            if isinstance(existing, dict):
                registrations = existing.get("registrations", [])
                if registrations:
                    r = registrations[0] if isinstance(registrations, list) else {}
                    return json.dumps({
                        "ok": True,
                        "already_registered": True,
                        "agent_id": r.get("id"),
                        "name": r.get("name"),
                        "token_id": r.get("tokenId"),
                        "summary": f"Agent already registered. Token ID: {r.get('tokenId')}",
                    })

            # Register new agent
            body: dict = {}
            if name:
                body["name"] = name
            if description:
                body["description"] = description
            if capabilities:
                body["capabilities"] = capabilities

            result = await self.client.post("/api/agent-registry", json=body)  # type: ignore[attr-defined]
            r = result if isinstance(result, dict) else {}
            return json.dumps({
                "ok": True,
                "agent_id": r.get("id"),
                "name": r.get("name"),
                "token_id": r.get("tokenId"),
                "registry_address": r.get("registryAddress"),
                "tx_hash": r.get("transactionHash"),
                "summary": f"Agent registered on-chain. Token ID: {r.get('tokenId')}",
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Wallet Balance ───────────────────────────────────────────────────────────

class _WalletBalanceInput(BaseModel):
    chain_id: Optional[int] = Field(
        default=None,
        description="Filter by chain ID. Omit for all chains. Base=8453, Tempo=4217"
    )


class WalletBalanceTool(BaseTool):
    """Check KeeperHub managed wallet balance including USDC for payments."""

    name: str = "keeperhub_wallet_balance"
    description: str = (
        "Check the KeeperHub managed wallet balance across all chains. "
        "Returns token balances including USDC (for x402 on Base) "
        "and USDC.e (for MPP on Tempo). "
        "Use before keeperhub_pay_and_run to confirm sufficient funds. "
        "Base USDC address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913. "
        "Tempo USDC.e address: 0x20C000000000000000000000B9537D11c60E8b50."
    )
    args_schema: type[BaseModel] = _WalletBalanceInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, chain_id: int | None = None) -> str:  # type: ignore[override]
        try:
            params: dict = {}
            if chain_id:
                params["chainId"] = chain_id

            balances = await self.client.get("/api/user/wallet/balances", **params)  # type: ignore[attr-defined]
            wallet = await self.client.get("/api/user/wallet/active")  # type: ignore[attr-defined]

            bal_list = balances if isinstance(balances, list) else []
            wallet_addr = wallet.get("address") if isinstance(wallet, dict) else None

            # Find USDC balances for payment readiness
            usdc_base = next(
                (b for b in bal_list
                 if isinstance(b, dict) and b.get("address", "").lower() == _BASE_USDC),
                None
            )
            usdc_tempo = next(
                (b for b in bal_list
                 if isinstance(b, dict) and b.get("address", "").lower() == _TEMPO_USDCE),
                None
            )

            return json.dumps({
                "ok": True,
                "wallet_address": wallet_addr,
                "balances": bal_list[:20],
                "payment_readiness": {
                    "x402_base_usdc": {
                        "balance": usdc_base.get("balance", "0") if usdc_base else "0",
                        "symbol": "USDC",
                        "chain": "Base (8453)",
                        "ready": bool(usdc_base and float(usdc_base.get("balance", 0)) > 0),
                    },
                    "mpp_tempo_usdce": {
                        "balance": usdc_tempo.get("balance", "0") if usdc_tempo else "0",
                        "symbol": "USDC.e",
                        "chain": "Tempo (4217)",
                        "ready": bool(usdc_tempo and float(usdc_tempo.get("balance", 0)) > 0),
                    },
                },
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")


# ─── Provision Agentic Wallet ─────────────────────────────────────────────────

class _ProvisionWalletInput(BaseModel):
    label: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Optional label for this wallet (e.g. agent name)"
    )


class ProvisionWalletTool(BaseTool):
    """Provision a new KeeperHub agentic wallet (Turnkey-backed, no key on disk)."""

    name: str = "keeperhub_provision_wallet"
    description: str = (
        "Provision a new KeeperHub agentic wallet for this agent. "
        "Server-side Turnkey custody — no private key lands on disk. "
        "Returns wallet_address and sub_org_id. "
        "Fund with USDC on Base (x402) or USDC.e on Tempo (MPP) to enable paid calls. "
        "Only call this once — save the wallet address for future use."
    )
    args_schema: type[BaseModel] = _ProvisionWalletInput
    client: object = Field(exclude=True)

    model_config = {"arbitrary_types_allowed": True}

    async def _arun(self, label: str | None = None) -> str:  # type: ignore[override]
        try:
            body: dict = {}
            if label:
                body["label"] = label

            result = await self.client.post(  # type: ignore[attr-defined]
                "/api/agentic-wallet/provision",
                json=body,
            )
            r = result if isinstance(result, dict) else {}
            addr = r.get("walletAddress", "")
            return json.dumps({
                "ok": True,
                "wallet_address": addr,
                "sub_org_id": r.get("subOrgId"),
                "summary": f"Agentic wallet provisioned at {addr}",
                "next_steps": [
                    f"Fund with USDC on Base (chain 8453) → {addr}",
                    f"Fund with USDC.e on Tempo (chain 4217) → {addr}",
                    "Check balance: keeperhub_wallet_balance",
                    "Run paid workflow: keeperhub_pay_and_run",
                ],
            })
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)})

    def _run(self, **kwargs: object) -> str:  # type: ignore[override]
        raise NotImplementedError("Use async version")
