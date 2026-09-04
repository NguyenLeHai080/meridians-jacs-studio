from __future__ import annotations

import random
import string
import urllib.parse
from datetime import UTC, datetime
from typing import Any, ClassVar

from app.core.repositories.billing_repo import billing_repo
from app.services.license_service import license_service


class BillingService:
    """Domain service for VietQR payments and subscription plans."""

    PLANS: ClassVar[list[dict[str, Any]]] = [
        {
            "id": "1m",
            "name": "Gói 1 Tháng (Standard)",
            "days": 30,
            "price": 299000,
            "description": "30 ngày sử dụng Full tính năng AI Video Studio",
        },
        {
            "id": "3m",
            "name": "Gói 3 Tháng (Tiết Kiệm 15%)",
            "days": 90,
            "price": 799000,
            "description": "90 ngày sử dụng Full tính năng + Ưu tiên Render",
        },
        {
            "id": "6m",
            "name": "Gói 6 Tháng (Phổ Biến Nhất)",
            "days": 180,
            "price": 1499000,
            "description": "180 ngày sử dụng + Hỗ trợ 24/7 VIP",
        },
        {
            "id": "1y",
            "name": "Gói 1 Năm (Trọn Đời Ưu Đãi 35%)",
            "days": 365,
            "price": 2499000,
            "description": "365 ngày sử dụng Full quyền hạn Studio Pro",
        },
    ]

    @staticmethod
    def generate_vietqr_url(bank_id: str, account_no: str, account_name: str, amount: int, memo: str, template: str = "compact2") -> str:
        safe_memo = urllib.parse.quote(memo)
        safe_name = urllib.parse.quote(account_name)
        return f"https://img.vietqr.io/image/{bank_id}-{account_no}-{template}.png?amount={amount}&addInfo={safe_memo}&accountName={safe_name}"

    @classmethod
    def create_renewal_order(cls, license_key: str, plan_id: str, customer_note: str = "") -> dict[str, Any]:
        plan = next((p for p in cls.PLANS if p["id"] == plan_id), None)
        if not plan:
            raise ValueError(f"Gói dịch vụ không hợp lệ: {plan_id}")

        bank_cfg = billing_repo.get_bank_config()
        # Generate random 5-digit code for payment memo
        code_suffix = "".join(random.choices(string.digits, k=5))
        order_code = f"JACS{code_suffix}"
        memo = f"{bank_cfg.get('notes_prefix', 'JACS')} {order_code}"

        qr_url = cls.generate_vietqr_url(
            bank_id=bank_cfg.get("bank_id", "MB"),
            account_no=bank_cfg.get("account_number", "0988888888"),
            account_name=bank_cfg.get("account_name", "CONG TY TNHH MERIDIANS"),
            amount=plan["price"],
            memo=memo,
            template=bank_cfg.get("template", "compact2"),
        )

        order_data = {
            "order_code": order_code,
            "license_key": license_key,
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "days": plan["days"],
            "amount": plan["price"],
            "currency": "VND",
            "memo": memo,
            "qr_url": qr_url,
            "bank_info": bank_cfg,
            "status": "pending",
            "customer_note": customer_note,
            "created_at": datetime.now(UTC).isoformat(),
        }

        created = billing_repo.create(order_data)
        return created

    @classmethod
    def confirm_payment(cls, order_code: str, actor: str = "admin") -> dict[str, Any]:
        order = billing_repo.find_order_by_code(order_code)
        if not order:
            raise ValueError("Không tìm thấy đơn hàng")
        if order.get("status") == "completed":
            return order

        # Upgrade license
        lic_key = order.get("license_key")
        days = order.get("days", 30)
        updated_lic = license_service.extend_license(lic_key, days)

        order["status"] = "completed"
        order["confirmed_at"] = datetime.now(UTC).isoformat()
        order["confirmed_by"] = actor
        billing_repo.update(order["id"], order)

        return {
            "order": order,
            "license": updated_lic,
            "message": f"Đã kích hoạt thành công đơn hàng {order_code}, cộng {days} ngày sử dụng!",
        }


billing_service = BillingService()
