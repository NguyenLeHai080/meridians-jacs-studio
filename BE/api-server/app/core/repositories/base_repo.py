from __future__ import annotations

from typing import Any
from uuid import UUID

from app.core.store import store


class BaseRepository:
    """Base generic repository providing clean domain data access operations."""

    def __init__(self, collection: str) -> None:
        self.collection = collection
        self.store = store

    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        return self.store.create(self.collection, data)

    def get_by_id(self, record_id: UUID | str) -> dict[str, Any] | None:
        return self.store.get(self.collection, record_id)

    def list_all(self) -> list[dict[str, Any]]:
        return self.store.list(self.collection)

    def update(self, record_id: UUID | str, data: dict[str, Any]) -> dict[str, Any] | None:
        return self.store.update(self.collection, record_id, data)

    def delete(self, record_id: UUID | str) -> bool:
        return self.store.delete(self.collection, record_id)

    def count(self) -> int:
        return self.store.count(self.collection)

    def clear(self) -> None:
        self.store.clear(self.collection)
