from __future__ import annotations

import secrets
import string
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.repositories.license_repo import license_repo


class LicenseService:
    """Domain service for business operations on licenses and activations."""

    @staticmethod
    def generate_license_key(prefix: str = "JACS") -> str:
        chars = string.ascii_uppercase + string.digits
        blocks = ["".join(secrets.choice(chars) for _ in range(4)) for _ in range(4)]
        return f"{prefix}-" + "-".join(blocks)

    @staticmethod
    def validate_license(
        license_key: str,
        machine_id: str,
        device_name: str | None = None,
        ip_address: str | None = None,
    ) -> dict[str, Any]:
        lic = license_repo.find_by_key(license_key)
        if not lic:
            return {"valid": False, "reason": "invalid_key", "message": "Mã bản quyền không tồn tại"}

        status = lic.get("status", "active")
        if status == "suspended":
            return {"valid": False, "reason": "suspended", "message": "Bản quyền đang bị tạm khoá"}
        if status == "revoked":
            return {"valid": False, "reason": "revoked", "message": "Bản quyền đã bị thu hồi"}

        # Expiration check
        expires_at_str = lic.get("expires_at")
        if expires_at_str:
            try:
                expires_at = datetime.fromisoformat(expires_at_str)
                now = datetime.now(UTC)
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=UTC)
                if now > expires_at:
                    return {
                        "valid": False,
                        "reason": "expired",
                        "message": "Bản quyền đã hết hạn sử dụng. Vui lòng gia hạn!",
                        "license": lic,
                    }
            except Exception:
                pass

        # Device binding
        devices = lic.get("devices", [])
        max_devices = lic.get("max_devices", 1)
        device_found = False

        for dev in devices:
            if isinstance(dev, dict) and dev.get("machine_id") == machine_id:
                device_found = True
                dev["last_seen_at"] = datetime.now(UTC).isoformat()
                if ip_address:
                    dev["ip_address"] = ip_address
                if device_name:
                    dev["device_name"] = device_name
                break

        if not device_found:
            if len(devices) >= max_devices:
                return {
                    "valid": False,
                    "reason": "max_devices_exceeded",
                    "message": f"Bản quyền đã đạt giới hạn thiết bị kích hoạt ({max_devices}/{max_devices})",
                }
            # Register new device
            new_dev = {
                "machine_id": machine_id,
                "device_name": device_name or "Desktop PC",
                "ip_address": ip_address or "127.0.0.1",
                "activated_at": datetime.now(UTC).isoformat(),
                "last_seen_at": datetime.now(UTC).isoformat(),
            }
            devices.append(new_dev)

        lic["devices"] = devices
        lic["last_heartbeat_at"] = datetime.now(UTC).isoformat()
        license_repo.update(lic["id"], lic)

        return {
            "valid": True,
            "license": lic,
            "customer_name": lic.get("customer_name") or "Quý Khách Hàng",
            "tier": lic.get("tier", "pro"),
            "expires_at": lic.get("expires_at"),
            "max_devices": max_devices,
            "active_devices": len(devices),
        }

    @staticmethod
    def extend_license(license_key: str, days: int) -> dict[str, Any] | None:
        lic = license_repo.find_by_key(license_key)
        if not lic:
            return None
        expires_at_str = lic.get("expires_at")
        now = datetime.now(UTC)
        if expires_at_str:
            try:
                base_time = datetime.fromisoformat(expires_at_str)
                if base_time.tzinfo is None:
                    base_time = base_time.replace(tzinfo=UTC)
                base_time = max(base_time, now)
            except Exception:
                base_time = now
        else:
            base_time = now

        new_expires_at = base_time + timedelta(days=days)
        lic["expires_at"] = new_expires_at.isoformat()
        lic["status"] = "active"
        return license_repo.update(lic["id"], lic)


license_service = LicenseService()
