from __future__ import annotations

import json
import sqlite3
from collections import defaultdict
from datetime import UTC, datetime
from enum import Enum
from pathlib import Path
from threading import Lock, RLock
from uuid import UUID, uuid4


class InMemoryStore:
    """MVP store; thay bằng repository PostgreSQL khi triển khai production."""

    def __init__(self) -> None:
        self._data: dict[str, dict[UUID, dict]] = defaultdict(dict)
        self._lock = Lock()

    def create(self, collection: str, value: dict) -> dict:
        record = {"id": uuid4(), **value}
        with self._lock:
            self._data[collection][record["id"]] = record
        return record.copy()

    def list(self, collection: str) -> list[dict]:
        with self._lock:
            return [record.copy() for record in self._data[collection].values()]

    def get(self, collection: str, record_id: UUID) -> dict | None:
        with self._lock:
            record = self._data[collection].get(record_id)
            return record.copy() if record else None

    def update(self, collection: str, record_id: UUID, values: dict) -> dict | None:
        with self._lock:
            record = self._data[collection].get(record_id)
            if not record:
                return None
            record.update(values)
            return record.copy()

    def delete(self, collection: str, record_id: UUID) -> bool:
        with self._lock:
            return self._data[collection].pop(record_id, None) is not None

    def clear(self) -> None:
        """Reset all collections; intended for isolated tests and local demos."""
        with self._lock:
            self._data.clear()


class SqliteStore:
    """Small persistent adapter for demos and single-node deployments.

    PostgreSQL remains the recommended production database; this adapter keeps
    the same store contract so local deployments can persist data without an
    additional service.
    """

    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        with sqlite3.connect(self.path) as connection:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, created_at REAL NOT NULL, PRIMARY KEY (collection, id))"
            )
            connection.execute("CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection, created_at)")

    def create(self, collection: str, value: dict) -> dict:
        record = {"id": uuid4(), **value}
        payload = json.dumps(record, default=_json_default)
        with self._lock, sqlite3.connect(self.path) as connection:
            connection.execute("INSERT INTO records(collection, id, data, created_at) VALUES (?, ?, ?, ?)", (collection, str(record["id"]), payload, datetime.now(UTC).timestamp()))
        return record.copy()

    def list(self, collection: str) -> list[dict]:
        with self._lock, sqlite3.connect(self.path) as connection:
            rows = connection.execute("SELECT data FROM records WHERE collection = ? ORDER BY created_at ASC", (collection,)).fetchall()
        return [json.loads(row[0], object_hook=_json_object_hook) for row in rows]

    def get(self, collection: str, record_id: UUID) -> dict | None:
        with self._lock, sqlite3.connect(self.path) as connection:
            row = connection.execute("SELECT data FROM records WHERE collection = ? AND id = ?", (collection, str(record_id))).fetchone()
        return json.loads(row[0], object_hook=_json_object_hook) if row else None

    def update(self, collection: str, record_id: UUID, values: dict) -> dict | None:
        current = self.get(collection, record_id)
        if not current:
            return None
        current.update(values)
        payload = json.dumps(current, default=_json_default)
        with self._lock, sqlite3.connect(self.path) as connection:
            connection.execute("UPDATE records SET data = ? WHERE collection = ? AND id = ?", (payload, collection, str(record_id)))
        return current.copy()

    def delete(self, collection: str, record_id: UUID) -> bool:
        with self._lock, sqlite3.connect(self.path) as connection:
            cursor = connection.execute("DELETE FROM records WHERE collection = ? AND id = ?", (collection, str(record_id)))
        return cursor.rowcount > 0

    def clear(self) -> None:
        with self._lock, sqlite3.connect(self.path) as connection:
            connection.execute("DELETE FROM records")


class PostgresStore:
    """Persistent JSONB repository used by staging and production.

    The application modules intentionally depend on this small CRUD contract;
    PostgreSQL owns durability, concurrent access and restart persistence while
    each domain keeps its own collection namespace.
    """

    def __init__(self, dsn: str) -> None:
        if not dsn:
            raise RuntimeError("JACS_DATABASE_URL is required for PostgreSQL")
        try:
            import psycopg
        except ImportError as exc:  # pragma: no cover - exercised in image build
            raise RuntimeError("psycopg is required for PostgreSQL storage") from exc
        self._psycopg = psycopg
        self.dsn = dsn
        self._lock = RLock()
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS jacs_records (
                    collection TEXT NOT NULL,
                    id UUID NOT NULL,
                    data JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (collection, id)
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_jacs_records_collection ON jacs_records(collection, created_at)"
            )

    def _connect(self):
        return self._psycopg.connect(self.dsn)

    def create(self, collection: str, value: dict) -> dict:
        record = {"id": uuid4(), **value}
        payload = json.dumps(record, default=_json_default)
        with self._lock, self._connect() as connection:
            connection.execute(
                "INSERT INTO jacs_records(collection, id, data) VALUES (%s, %s, %s::jsonb)",
                (collection, str(record["id"]), payload),
            )
        return record.copy()

    def list(self, collection: str) -> list[dict]:
        with self._lock, self._connect() as connection:
            rows = connection.execute(
                "SELECT data FROM jacs_records WHERE collection = %s ORDER BY created_at ASC",
                (collection,),
            ).fetchall()
        return [_decode_json_payload(row[0]) for row in rows]

    def get(self, collection: str, record_id: UUID) -> dict | None:
        with self._lock, self._connect() as connection:
            row = connection.execute(
                "SELECT data FROM jacs_records WHERE collection = %s AND id = %s",
                (collection, str(record_id)),
            ).fetchone()
        return _decode_json_payload(row[0]) if row else None

    def update(self, collection: str, record_id: UUID, values: dict) -> dict | None:
        with self._lock:
            current = self.get(collection, record_id)
            if not current:
                return None
            current.update(values)
            payload = json.dumps(current, default=_json_default)
            with self._connect() as connection:
                connection.execute(
                    "UPDATE jacs_records SET data = %s::jsonb WHERE collection = %s AND id = %s",
                    (payload, collection, str(record_id)),
                )
            return current.copy()

    def delete(self, collection: str, record_id: UUID) -> bool:
        with self._lock, self._connect() as connection:
            cursor = connection.execute(
                "DELETE FROM jacs_records WHERE collection = %s AND id = %s",
                (collection, str(record_id)),
            )
        return cursor.rowcount > 0

    def clear(self) -> None:
        with self._lock, self._connect() as connection:
            connection.execute("DELETE FROM jacs_records")


def _json_default(value):
    if isinstance(value, UUID):
        return {"__type__": "uuid", "value": str(value)}
    if isinstance(value, datetime):
        return {"__type__": "datetime", "value": value.isoformat()}
    if isinstance(value, Enum):
        return value.value
    raise TypeError(f"Unsupported value: {type(value)!r}")


def _json_object_hook(value):
    if value.get("__type__") == "uuid":
        return UUID(value["value"])
    if value.get("__type__") == "datetime":
        return datetime.fromisoformat(value["value"])
    return value


def _decode_json_payload(value):
    if isinstance(value, str):
        return json.loads(value, object_hook=_json_object_hook)
    if isinstance(value, dict):
        return _restore_nested(value)
    return value


def _restore_nested(value):
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
    if settings.store_backend.lower() == "sqlite":
        return SqliteStore(settings.sqlite_path)
    if settings.store_backend.lower() in {"postgres", "postgresql"}:
        return PostgresStore(settings.database_url or "")
    return InMemoryStore()


store = _build_store()
