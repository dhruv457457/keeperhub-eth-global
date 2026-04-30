"""Execution history store — optional SQLite-backed audit trail for write operations."""

from __future__ import annotations

import asyncio
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Protocol, runtime_checkable


@dataclass
class ExecutionRecord:
    """One write execution — persisted locally for receipts, crash recovery, and dedup."""
    execution_id: str
    kind: str                          # "transfer" | "contract-call" | "workflow" | "protocol"
    status: str                        # "pending" | "running" | "completed" | "failed"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    transaction_hash: Optional[str] = None
    network: Optional[str] = None
    amount: Optional[str] = None
    to_address: Optional[str] = None
    error: Optional[str] = None


@runtime_checkable
class ExecutionStore(Protocol):
    """Protocol for execution stores — swap in any backend."""
    async def record(self, rec: ExecutionRecord) -> None: ...
    async def update_status(self, execution_id: str, status: str, tx_hash: Optional[str] = None, error: Optional[str] = None) -> None: ...
    async def list(self, status: Optional[str] = None, limit: int = 20) -> list[ExecutionRecord]: ...
    async def get(self, execution_id: str) -> Optional[ExecutionRecord]: ...
    async def aclose(self) -> None: ...


class SqliteExecutionStore:
    """
    SQLite-backed execution store. Uses stdlib sqlite3 only — no extra deps.
    All DB calls run in a thread pool via asyncio.to_thread (safe for async loops).

    Failures are logged but never raised — history can never be the reason
    a successful transaction looks like a failure to the caller.

    Usage::

        store = SqliteExecutionStore()                      # ~/.keeperhub/executions.db
        store = SqliteExecutionStore("./project.db")        # custom path

        await store.record(ExecutionRecord(
            execution_id="exec_abc",
            kind="transfer",
            status="pending",
            network="11155111",
            amount="0.001",
            to_address="0xabc...",
        ))
        await store.update_status("exec_abc", "completed", tx_hash="0xdef...")
        records = await store.list(status="completed", limit=10)
    """

    def __init__(self, path: str = "~/.keeperhub/executions.db") -> None:
        self._path = str(Path(path).expanduser())
        # Create parent directory if needed
        Path(self._path).parent.mkdir(parents=True, exist_ok=True)
        # Init schema synchronously (happens once at startup)
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self._path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS executions (
                    execution_id    TEXT PRIMARY KEY,
                    kind            TEXT NOT NULL,
                    status          TEXT NOT NULL,
                    created_at      TEXT NOT NULL,
                    transaction_hash TEXT,
                    network         TEXT,
                    amount          TEXT,
                    to_address      TEXT,
                    error           TEXT
                )
            """)
            conn.commit()

    def _record_sync(self, rec: ExecutionRecord) -> None:
        with sqlite3.connect(self._path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO executions
                (execution_id, kind, status, created_at, transaction_hash, network, amount, to_address, error)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (rec.execution_id, rec.kind, rec.status, rec.created_at,
                  rec.transaction_hash, rec.network, rec.amount, rec.to_address, rec.error))
            conn.commit()

    def _update_sync(self, execution_id: str, status: str, tx_hash: Optional[str], error: Optional[str]) -> None:
        with sqlite3.connect(self._path) as conn:
            conn.execute("""
                UPDATE executions SET status=?, transaction_hash=COALESCE(?, transaction_hash), error=COALESCE(?, error)
                WHERE execution_id=?
            """, (status, tx_hash, error, execution_id))
            conn.commit()

    def _list_sync(self, status: Optional[str], limit: int) -> list[ExecutionRecord]:
        with sqlite3.connect(self._path) as conn:
            conn.row_factory = sqlite3.Row
            if status:
                rows = conn.execute(
                    "SELECT * FROM executions WHERE status=? ORDER BY created_at DESC LIMIT ?",
                    (status, limit)
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM executions ORDER BY created_at DESC LIMIT ?",
                    (limit,)
                ).fetchall()
        return [ExecutionRecord(**dict(row)) for row in rows]

    def _get_sync(self, execution_id: str) -> Optional[ExecutionRecord]:
        with sqlite3.connect(self._path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM executions WHERE execution_id=?", (execution_id,)
            ).fetchone()
        return ExecutionRecord(**dict(row)) if row else None

    async def record(self, rec: ExecutionRecord) -> None:
        try:
            await asyncio.to_thread(self._record_sync, rec)
        except Exception as e:
            import logging
            logging.getLogger("langchain_keeperhub.store").warning("Failed to record execution %s: %s", rec.execution_id, e)

    async def update_status(self, execution_id: str, status: str, tx_hash: Optional[str] = None, error: Optional[str] = None) -> None:
        try:
            await asyncio.to_thread(self._update_sync, execution_id, status, tx_hash, error)
        except Exception as e:
            import logging
            logging.getLogger("langchain_keeperhub.store").warning("Failed to update status for %s: %s", execution_id, e)

    async def list(self, status: Optional[str] = None, limit: int = 20) -> list[ExecutionRecord]:
        try:
            return await asyncio.to_thread(self._list_sync, status, limit)
        except Exception as e:
            import logging
            logging.getLogger("langchain_keeperhub.store").warning("Failed to list executions: %s", e)
            return []

    async def get(self, execution_id: str) -> Optional[ExecutionRecord]:
        try:
            return await asyncio.to_thread(self._get_sync, execution_id)
        except Exception as e:
            import logging
            logging.getLogger("langchain_keeperhub.store").warning("Failed to get execution %s: %s", execution_id, e)
            return None

    async def aclose(self) -> None:
        pass  # sqlite3 connections are opened/closed per-operation
