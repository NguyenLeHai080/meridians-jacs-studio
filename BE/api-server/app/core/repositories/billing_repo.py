from __future__ import annotations

from typing import Any

from app.core.repositories.base_repo import BaseRepository


class BillingRepository(BaseRepository):
    """Domain repository for billing orders, pricing plans, and bank configs."""

    def __init__(self) -> None:
        super().__init__(collection="billing_orders")
        self.bank_config_repo = BaseRepository(collection="system_bank_config")
        self.plans_repo = BaseRepository(collection="pricing_plans")

    def get_bank_config(self) -> dict[str, Any]:
        configs = self.bank_config_repo.list_all()
        if configs:
            return configs[0]
        # Default VietQR bank account config
        default_config = {
            "bank_id": "MB",
            "account_number": "0988888888",
            "account_name": "CONG TY TNHH MERIDIANS",
            "template": "compact2",
            "notes_prefix": "JACS",
        }
        return self.bank_config_repo.create(default_config)

    def update_bank_config(self, data: dict[str, Any]) -> dict[str, Any]:
        configs = self.bank_config_repo.list_all()
        if configs:
            c_id = configs[0]["id"]
            return self.bank_config_repo.update(c_id, data) or data
        return self.bank_config_repo.create(data)

    def find_order_by_code(self, order_code: str) -> dict[str, Any] | None:
        normalized = order_code.strip().upper()
        for item in self.list_all():
            if str(item.get("order_code", "")).strip().upper() == normalized:
                return item
        return None

    def list_orders_for_license(self, license_key: str) -> list[dict[str, Any]]:
        normalized = license_key.strip().upper()
        return [
            item for item in self.list_all()
            if str(item.get("license_key", "")).strip().upper() == normalized
        ]


billing_repo = BillingRepository()
