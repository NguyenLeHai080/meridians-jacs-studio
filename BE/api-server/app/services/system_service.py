from __future__ import annotations

from typing import Any

from app.core.repositories.system_repo import system_repo


class SystemService:
    """Domain service for tool configuration, branding, and telemetry tracking."""

    @staticmethod
    def get_tool_branding() -> dict[str, Any]:
        return system_repo.get_tool_config()

    @staticmethod
    def update_tool_branding(data: dict[str, Any]) -> dict[str, Any]:
        return system_repo.update_tool_config(data)

    @staticmethod
    def is_menu_locked(menu_key: str) -> tuple[bool, str]:
        cfg = system_repo.get_tool_config()
        menu_locks = cfg.get("menu_locks", {})
        lock_info = menu_locks.get(menu_key, {})
        if lock_info.get("locked"):
            msg = lock_info.get("message") or f"Tính năng {menu_key} đang trong quá trình nâng cấp, vui lòng quay lại sau!"
            return True, msg
        return False, ""


system_service = SystemService()
