from __future__ import annotations

import json
import logging
import sqlite3
from collections import defaultdict
from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime
from enum import Enum
from pathlib import Path
from threading import Lock, RLock
from typing import Any
from uuid import UUID, uuid4

logger = logging.getLogger("jacs.store")


class InMemoryStore:
    """In-memory store for isolated unit tests and local fast mocking."""

    def __init__(self) -> None:
        self._data: dict[str, dict[Any, dict]] = defaultdict(dict)
        self._lock = Lock()

    def create(self, collection: str, value: dict) -> dict:
        record = value.copy()
        if "id" not in record or not record["id"]:
            record["id"] = uuid4()
        with self._lock:
            self._data[collection][record["id"]] = record
            self._data[collection][str(record["id"])] = record
        return record.copy()

    def list(self, collection: str) -> list[dict]:
        with self._lock:
            # Deduplicate items since we store under both UUID and str key
            seen_ids = set()
            result = []
            for item in self._data[collection].values():
                item_id = str(item.get("id"))
                if item_id not in seen_ids:
                    seen_ids.add(item_id)
                    result.append(item.copy())
            return result

    def get(self, collection: str, record_id: UUID | str) -> dict | None:
        with self._lock:
            record = self._data[collection].get(record_id) or self._data[collection].get(str(record_id))
            return record.copy() if record else None

    def update(self, collection: str, record_id: UUID | str, values: dict) -> dict | None:
        with self._lock:
            record = self._data[collection].get(record_id) or self._data[collection].get(str(record_id))
            if not record:
                return None
            record.update(values)
            copied = record.copy()
            self._data[collection][record_id] = copied
            self._data[collection][str(record_id)] = copied
            return copied

    def delete(self, collection: str, record_id: UUID | str) -> bool:
        with self._lock:
            res1 = self._data[collection].pop(record_id, None) is not None
            res2 = self._data[collection].pop(str(record_id), None) is not None
            return res1 or res2

    def clear(self, collection: str | None = None) -> None:
        """Reset collections; intended for isolated tests."""
        with self._lock:
            if collection:
                self._data.pop(collection, None)
            else:
                self._data.clear()

    def count(self, collection: str | None = None) -> int:
        with self._lock:
            if collection:
                return len(self.list(collection))
            return sum(len(self.list(c)) for c in self._data)

    def healthcheck(self) -> bool:
        return True

    def close(self) -> None:
        pass


class SqliteStore:
    """Persistent SQLite adapter for single-node development."""

    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        with sqlite3.connect(self.path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS records (
                    collection TEXT NOT NULL,
                    id TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    PRIMARY KEY (collection, id)
                )
                """
            )
            connection.execute("CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection, created_at)")

    def create(self, collection: str, value: dict) -> dict:
        record = value.copy()
        if "id" not in record or not record["id"]:
            record["id"] = uuid4()
        payload = json.dumps(record, default=_json_default)
        now_ts = datetime.now(UTC).timestamp()
        with self._lock, sqlite3.connect(self.path) as connection:
            connection.execute(
                "INSERT INTO records(collection, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (collection, str(record["id"]), payload, now_ts, now_ts),
            )
        return record.copy()

    def list(self, collection: str) -> list[dict]:
        with self._lock, sqlite3.connect(self.path) as connection:
            rows = connection.execute(
                "SELECT data FROM records WHERE collection = ? ORDER BY created_at ASC", (collection,)
            ).fetchall()
        return [json.loads(row[0], object_hook=_json_object_hook) for row in rows]

    def get(self, collection: str, record_id: UUID | str) -> dict | None:
        with self._lock, sqlite3.connect(self.path) as connection:
            row = connection.execute(
                "SELECT data FROM records WHERE collection = ? AND id = ?", (collection, str(record_id))
            ).fetchone()
        return json.loads(row[0], object_hook=_json_object_hook) if row else None

    def update(self, collection: str, record_id: UUID | str, values: dict) -> dict | None:
        current = self.get(collection, record_id)
        if not current:
            return None
        current.update(values)
        payload = json.dumps(current, default=_json_default)
        now_ts = datetime.now(UTC).timestamp()
        with self._lock, sqlite3.connect(self.path) as connection:
            connection.execute(
                "UPDATE records SET data = ?, updated_at = ? WHERE collection = ? AND id = ?",
                (payload, now_ts, collection, str(record_id)),
            )
        return current.copy()

    def delete(self, collection: str, record_id: UUID | str) -> bool:
        with self._lock, sqlite3.connect(self.path) as connection:
            cursor = connection.execute(
                "DELETE FROM records WHERE collection = ? AND id = ?", (collection, str(record_id))
            )
        return cursor.rowcount > 0

    def clear(self, collection: str | None = None) -> None:
        with self._lock, sqlite3.connect(self.path) as connection:
            if collection:
                connection.execute("DELETE FROM records WHERE collection = ?", (collection,))
            else:
                connection.execute("DELETE FROM records")

    def count(self, collection: str | None = None) -> int:
        with self._lock, sqlite3.connect(self.path) as connection:
            if collection:
                row = connection.execute("SELECT COUNT(*) FROM records WHERE collection = ?", (collection,)).fetchone()
            else:
                row = connection.execute("SELECT COUNT(*) FROM records").fetchone()
            return row[0] if row else 0

    def healthcheck(self) -> bool:
        try:
            with self._lock, sqlite3.connect(self.path) as connection:
                connection.execute("SELECT 1").fetchone()
            return True
        except sqlite3.Error:
            return False

    def close(self) -> None:
        pass


class PostgresStore:
    """Enterprise-grade PostgreSQL store with Connection Pooling, JSONB storage,

    GIN indexing, automatic updated_at timestamp tracking, and resilient lifecycle.
    """

    def __init__(
        self,
        dsn: str,
        min_size: int = 1,
        max_size: int = 20,
        timeout: float = 10.0,
    ) -> None:
        if not dsn:
            raise RuntimeError("JACS_DATABASE_URL is required for PostgreSQL")
        try:
            import psycopg
            from psycopg_pool import ConnectionPool
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("psycopg and psycopg_pool are required for PostgreSQL storage") from exc

        self._psycopg = psycopg
        self.dsn = dsn
        self.min_size = min_size
        self.max_size = max_size
        self.timeout = timeout
        self._lock = RLock()

        # Initialize thread-safe connection pool
        self._pool = ConnectionPool(
            conninfo=self.dsn,
            min_size=self.min_size,
            max_size=self.max_size,
            timeout=self.timeout,
            open=True,
        )
        self._init_schema()

    def _init_schema(self) -> None:
        """Create standard tables, primary keys, and high-performance GIN indexes."""
        with self.connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS jacs_records (
                    collection VARCHAR(64) NOT NULL,
                    id VARCHAR(64) NOT NULL,
                    data JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (collection, id)
                )
                """
            )
            # Automatic schema migration for existing databases
            conn.execute(
                "ALTER TABLE jacs_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
            )
            conn.execute(
                "ALTER TABLE jacs_records ALTER COLUMN id TYPE VARCHAR(64) USING id::text"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_jacs_records_collection ON jacs_records(collection, created_at DESC)"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_jacs_records_data_gin ON jacs_records USING gin (data)"
            )

    @contextmanager
    def connection(self) -> Generator[Any, None, None]:
        """Checked-out connection from pool with automatic commit/rollback."""
        with self._pool.connection() as conn:
            yield conn

    def create(self, collection: str, value: dict) -> dict:
        record = value.copy()
        if "id" not in record or not record["id"]:
            record["id"] = uuid4()
        str_id = str(record["id"])
        payload = json.dumps(record, default=_json_default)
        with self._lock, self.connection() as conn:
            conn.execute(
                """
                INSERT INTO jacs_records (collection, id, data, created_at, updated_at)
                VALUES (%s, %s, %s::jsonb, NOW(), NOW())
                ON CONFLICT (collection, id)
                DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
                """,
                (collection, str_id, payload),
            )
        return record.copy()

    def list(self, collection: str) -> list[dict]:
        with self._lock, self.connection() as conn:
            rows = conn.execute(
                "SELECT data FROM jacs_records WHERE collection = %s ORDER BY created_at ASC",
                (collection,),
            ).fetchall()
        return [_decode_json_payload(row[0]) for row in rows]

    def get(self, collection: str, record_id: UUID | str) -> dict | None:
        with self._lock, self.connection() as conn:
            row = conn.execute(
                "SELECT data FROM jacs_records WHERE collection = %s AND id = %s",
                (collection, str(record_id)),
            ).fetchone()
        return _decode_json_payload(row[0]) if row else None

    def update(self, collection: str, record_id: UUID | str, values: dict) -> dict | None:
        with self._lock:
            current = self.get(collection, record_id)
            if not current:
                return None
            current.update(values)
            payload = json.dumps(current, default=_json_default)
            with self.connection() as conn:
                conn.execute(
                    "UPDATE jacs_records SET data = %s::jsonb, updated_at = NOW() WHERE collection = %s AND id = %s",
                    (payload, collection, str(record_id)),
                )
            return current.copy()

    def delete(self, collection: str, record_id: UUID | str) -> bool:
        with self._lock, self.connection() as conn:
            cursor = conn.execute(
                "DELETE FROM jacs_records WHERE collection = %s AND id = %s",
                (collection, str(record_id)),
            )
        return cursor.rowcount > 0

    def clear(self, collection: str | None = None) -> None:
        with self._lock, self.connection() as conn:
            if collection:
                conn.execute("DELETE FROM jacs_records WHERE collection = %s", (collection,))
            else:
                conn.execute("DELETE FROM jacs_records")

    def count(self, collection: str | None = None) -> int:
        with self._lock, self.connection() as conn:
            if collection:
                row = conn.execute("SELECT COUNT(*) FROM jacs_records WHERE collection = %s", (collection,)).fetchone()
            else:
                row = conn.execute("SELECT COUNT(*) FROM jacs_records").fetchone()
            return row[0] if row else 0

    def healthcheck(self) -> bool:
        try:
            with self.connection() as conn:
                conn.execute("SELECT 1").fetchone()
            return True
        except Exception:  # noqa: BLE001
            return False

    def close(self) -> None:
        """Gracefully close the PostgreSQL connection pool."""
        try:
            self._pool.close()
        except Exception as e:  # noqa: BLE001
            logger.warning(f"Error closing PostgreSQL connection pool: {e}")


def _json_default(value: Any) -> Any:
    if isinstance(value, UUID):
        return {"__type__": "uuid", "value": str(value)}
    if isinstance(value, datetime):
        return {"__type__": "datetime", "value": value.isoformat()}
    if isinstance(value, Enum):
        return value.value
    raise TypeError(f"Unsupported value: {type(value)!r}")


def _json_object_hook(value: dict) -> Any:
    if value.get("__type__") == "uuid":
        return UUID(value["value"])
    if value.get("__type__") == "datetime":
        return datetime.fromisoformat(value["value"])
    return value


def _decode_json_payload(value: Any) -> Any:
    if isinstance(value, str):
        return json.loads(value, object_hook=_json_object_hook)
    if isinstance(value, dict):
        return _restore_nested(value)
    return value


def _restore_nested(value: Any) -> Any:
    if isinstance(value, dict):
        if value.get("__type__") == "uuid":
            return UUID(value["value"])
        if value.get("__type__") == "datetime":
            return datetime.fromisoformat(value["value"])
        return {key: _restore_nested(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_restore_nested(item) for item in value]
    return value


def _build_store():
    from app.core.config import get_settings

    settings = get_settings()
    backend = settings.store_backend.lower().strip()
    if backend == "sqlite":
        return SqliteStore(settings.sqlite_path)
    if backend in {"postgres", "postgresql", "pgsql"}:
        return PostgresStore(
            dsn=settings.database_url or "",
            min_size=settings.database_min_pool_size,
            max_size=settings.database_max_pool_size,
            timeout=settings.database_pool_timeout_seconds,
        )
    return InMemoryStore()


store = _build_store()
