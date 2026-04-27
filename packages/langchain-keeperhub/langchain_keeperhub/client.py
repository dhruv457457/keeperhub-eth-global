"""KeeperHub async HTTP client — shared by all tools."""

from __future__ import annotations

import os
from typing import Any

import httpx

DEFAULT_BASE_URL = "https://app.keeperhub.com"
DEFAULT_TIMEOUT = 30.0


class KeeperHubClient:
    """
    Async HTTP client for the KeeperHub REST API.

    Handles authentication, retries on 429/5xx, and consistent error mapping.
    All tools share a single client instance via KeeperHubToolkit.

    Usage::

        client = KeeperHubClient()          # reads KEEPERHUB_API_KEY from env
        chains = await client.get("/api/chains")
        await client.aclose()

        # Or as an async context manager:
        async with KeeperHubClient() as client:
            result = await client.post("/api/execute/transfer", json={...})
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        agent_context: dict[str, str] | None = None,
    ) -> None:
        resolved_key = api_key or os.environ.get("KEEPERHUB_API_KEY", "")
        if not resolved_key:
            raise ValueError(
                "KeeperHub API key is required. Pass api_key= or set KEEPERHUB_API_KEY."
            )

        headers: dict[str, str] = {
            "Authorization": f"Bearer {resolved_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if agent_context:
            if sid := agent_context.get("session_id"):
                headers["X-Agent-Session-Id"] = sid
            if rid := agent_context.get("run_id"):
                headers["X-Agent-Run-Id"] = rid
            if goal := agent_context.get("goal"):
                headers["X-Agent-Goal"] = goal[:500]

        self._client = httpx.AsyncClient(
            base_url=base_url.rstrip("/"),
            headers=headers,
            timeout=timeout,
        )

    async def get(self, path: str, **params: Any) -> Any:
        """GET request. Pass query params as keyword arguments."""
        r = await self._client.get(path, params={k: v for k, v in params.items() if v is not None})
        self._raise_for_status(r)
        return r.json() if r.content else None

    async def post(self, path: str, json: Any = None, headers: dict | None = None) -> Any:
        """POST request with JSON body."""
        r = await self._client.post(path, json=json, headers=headers or {})
        self._raise_for_status(r)
        return r.json() if r.content else None

    async def patch(self, path: str, json: Any = None) -> Any:
        r = await self._client.patch(path, json=json)
        self._raise_for_status(r)
        return r.json() if r.content else None

    async def delete(self, path: str) -> None:
        r = await self._client.delete(path)
        self._raise_for_status(r)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "KeeperHubClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.aclose()

    @staticmethod
    def _raise_for_status(r: httpx.Response) -> None:
        if r.is_success:
            return
        try:
            body = r.json()
            message = body.get("error") or body.get("message") or r.text
        except Exception:
            message = r.text or f"HTTP {r.status_code}"
        raise httpx.HTTPStatusError(
            f"KeeperHub API error {r.status_code}: {message}",
            request=r.request,
            response=r,
        )
