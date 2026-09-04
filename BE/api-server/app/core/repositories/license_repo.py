from __future__ import annotations

from typing import Any

from app.core.repositories.base_repo import BaseRepository


class LicenseRepository(BaseRepository):
    """Domain repository for software licenses and device activations."""

    def __init__(self) -> None:
        super().__init__(collection="licenses")

    def find_by_key(self, license_key: str) -> dict[str, Any] | None:
        normalized = license_key.strip().upper()
        for item in self.list_all():
            if str(item.get("key", "")).strip().upper() == normalized:
                return item
        return None

    def find_by_machine_id(self, machine_id: str) -> list[dict[str, Any]]:
        normalized = machine_id.strip()
        results = []
        for item in self.list_all():
            for dev in item.get("devices", []):
                if isinstance(dev, dict) and dev.get("machine_id") == normalized:
                    results.append(item)
                    break
        return results

    def list_active(self) -> list[dict[str, Any]]:
        return [item for item in self.list_all() if item.get("status") == "active"]

    def list_paginated(
        self,
        page: int = 1,
        page_size: int = 10,
        search: str | None = None,
        status: str | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        all_items = self.list_all()
        filtered = []

        for item in all_items:
            if status and item.get("status") != status:
                continue
            if search:
                s_lower = search.lower()
                c_name = str(item.get("customer_name", "")).lower()
                c_email = str(item.get("customer_email", "")).lower()
                l_key = str(item.get("key", "")).lower()
                if s_lower not in c_name and s_lower not in c_email and s_lower not in l_key:
                    continue
            filtered.append(item)

        total = len(filtered)
        start = (page - 1) * page_size
        end = start + page_size
        return filtered[start:end], total


license_repo = LicenseRepository()
