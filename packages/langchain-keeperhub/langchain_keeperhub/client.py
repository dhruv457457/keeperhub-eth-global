"""KeeperHub async HTTP client — shared by all tools."""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import httpx

DEFAULT_BASE_URL = "https://app.keeperhub.com"
DEFAULT_TIMEOUT = 30.0
_MAX_GET_RETRIES = 3

logger = logging.getLogger("langchain_keeperhub.client")


class KeeperHubClient:
    """
    Async HTTP client for the KeeperHub REST API.

    Handles authentication, retries on 429/5xx (GET only), and consistent error mapping.
    All tools share a single client instance via KeeperHubToolkit.

    Retry policy:
    - GET requests: 3 retries with linear backoff (1s, 2s, 3s) on network errors
    - HTTP 429: retry up to 3x, honour Retry-After header (capped at 60s)
    - POST/PATCH/DELETE: **no retries** — prevents duplicate writes
    - All 4xx/5xx (non-429): raise immediately

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
        webhook_key: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        agent_context: dict[str, str] | None = None,
    ) -> None:
        resolved_key = api_key or os.environ.get("KEEPERHUB_API_KEY", "")
        # wfb_ key is used for webhook-triggered workflow execution
        # kh_ key is used for all other API operations
        self._webhook_key = webhook_key or os.environ.get("KEEPERHUB_WEBHOOK_KEY", "")
        if not resolved_key:
            raise ValueError(
                "KeeperHub API key is required. Pass api_key= or set KEEPERHUB_API_KEY.\n"
                "Note: Use kh_xxx key for API operations, wfb_xxx key for webhook triggers."
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
        """GET request with automatic retry + backoff. Pass query params as keyword arguments."""
        last_exc: Exception | None = None
        for attempt in range(_MAX_GET_RETRIES + 1):
            try:
                r = await self._client.get(
                    path, params={k: v for k, v in params.items() if v is not None}
                )
                # 429 — rate limit: honour Retry-After, then retry
                if r.status_code == 429:
                    wait = min(int(r.headers.get("Retry-After", attempt + 1)), 60)
                    logger.warning("KeeperHub rate-limited (429). Retrying in %ds (attempt %d).", wait, attempt + 1)
                    await asyncio.sleep(wait)
                    continue
                self._raise_for_status(r)
                return r.json() if r.content else None
            except httpx.HTTPStatusError:
                raise  # 4xx/5xx: no retry
            except httpx.HTTPError as e:
                last_exc = e
                if attempt < _MAX_GET_RETRIES:
                    wait = attempt + 1  # linear: 1s, 2s, 3s
                    logger.warning("KeeperHub network error on GET %s. Retrying in %ds (attempt %d): %s", path, wait, attempt + 1, e)
                    await asyncio.sleep(wait)
                    continue
                raise
        # Should not reach here, but just in case
        if last_exc:
            raise last_exc
        raise RuntimeError("Unexpected retry loop exit")

    async def post(self, path: str, json: Any = None, headers: dict | None = None) -> Any:
        """POST request — NO retry (prevents duplicate writes)."""
        r = await self._client.post(path, json=json, headers=headers or {})
        self._raise_for_status(r)
        return r.json() if r.content else None

    async def patch(self, path: str, json: Any = None) -> Any:
        """PATCH request — NO retry (prevents duplicate writes)."""
        r = await self._client.patch(path, json=json)
        self._raise_for_status(r)
        return r.json() if r.content else None

    async def delete(self, path: str) -> None:
        """DELETE request — NO retry."""
        r = await self._client.delete(path)
        self._raise_for_status(r)

    async def trigger_workflow(self, workflow_id: str, payload: dict | None = None) -> Any:
        """
        Trigger a workflow via the webhook endpoint using wfb_ key.

        KeeperHub has two key types:
        - kh_xxx → API management (list, read, execute via /api/workflow/{id}/execute)
        - wfb_xxx → Webhook trigger (POST /api/workflows/{id}/webhook)

        The webhook pattern is preferred for external integrations and published workflows.
        Set KEEPERHUB_WEBHOOK_KEY env var or pass webhook_key= to KeeperHubClient.
        """
        if not self._webhook_key:
            # Fall back to regular execute endpoint with kh_ key
            return await self.post(f"/api/workflow/{workflow_id}/execute", json={"input": payload or {}})

        # Use wfb_ key with webhook endpoint
        r = await self._client.post(
            f"/api/workflows/{workflow_id}/webhook",
            json=payload or {},
            headers={"Authorization": f"Bearer {self._webhook_key}"},
        )
        self._raise_for_status(r)
        return r.json() if r.content else {}

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
