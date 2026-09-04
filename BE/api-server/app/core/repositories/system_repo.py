from __future__ import annotations

from typing import Any

from app.core.repositories.base_repo import BaseRepository


class SystemRepository(BaseRepository):
    """Domain repository for tool branding config, menu locks, audit logs, and telemetry."""

    def __init__(self) -> None:
        super().__init__(collection="system_tool_config")
        self.audit_repo = BaseRepository(collection="audit_logs")
        self.telemetry_repo = BaseRepository(collection="telemetry_events")

    def get_tool_config(self) -> dict[str, Any]:
        configs = self.list_all()
        if configs:
            return configs[0]
        default_config = {
            "studio_brand_name": "JACS STUDIO",
            "tool_slogan": "Judicious AI Content Scanner & Video Synthesis Engine",
            "custom_logo_url": "",
            "support_contact": "https://t.me/jacs_support",
            "menu_locks": {},
        }
        return self.create(default_config)

    def update_tool_config(self, data: dict[str, Any]) -> dict[str, Any]:
        configs = self.list_all()
        if configs:
            c_id = configs[0]["id"]
            return self.update(c_id, data) or data
        return self.create(data)

    def log_audit(self, action: str, actor: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
        return self.audit_repo.create({
            "action": action,
            "actor": actor,
            "details": details or {},
        })

    def log_telemetry(self, event_type: str, client_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return self.telemetry_repo.create({
            "event_type": event_type,
            "client_id": client_id,
            "data": data,
        })


system_repo = SystemRepository()
