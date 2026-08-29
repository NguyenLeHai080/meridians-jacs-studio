from __future__ import annotations

from collections import defaultdict
import json
import sqlite3
from threading import Lock
from datetime import datetime
from enum import Enum
from pathlib import Path
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
            connection.execute("INSERT INTO records(collection, id, data, created_at) VALUES (?, ?, ?, ?)", (collection, str(record["id"]), payload, datetime.now().timestamp()))
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


def _build_store():
    from app.core.config import get_settings

    settings = get_settings()
    if settings.store_backend.lower() == "sqlite":
        return SqliteStore(settings.sqlite_path)
    return InMemoryStore()


store = _build_store()
