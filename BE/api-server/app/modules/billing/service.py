from __future__ import annotations

import hashlib
import re
import urllib.parse
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.core.errors import AppError
from app.core.store import store

DEFAULT_BANK_CONFIG = {
    "bank_name": "VietinBank (Công thương Việt Nam)",
    "bank_bin": "970415",
    "account_number": "109873538727",
    "account_name": "NGUYEN LE HAI",
    "qr_template": "compact2",
    "plans_pricing": {
        "1_month": 550000.0,
        "3_months": 1350000.0,
        "6_months": 2650000.0,
        "1_year": 4500000.0,
        "lifetime": 9650000.0,
    },
}

DEFAULT_BANK_ACCOUNTS = [
    {
        "id": "ba-vietinbank-default",
        "bank_name": "VietinBank (Công thương Việt Nam)",
        "bank_bin": "970415",
        "bank_short": "CTG",
        "account_number": "109873538727",
        "account_name": "NGUYEN LE HAI",
        "branch": "Chi nhánh Hà Nội",
        "purpose": "customer_income",
        "qr_template": "compact2",
        "custom_qr_url": None,
        "is_default": True,
        "is_active": True,
        "notes": "Tài khoản thụ hưởng chính nhận thanh toán bản quyền và SePay Webhook",
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    },
    {
        "id": "ba-mb-expense",
        "bank_name": "MB Bank (Ngân hàng Quân Đội)",
        "bank_bin": "970422",
        "bank_short": "MB",
        "account_number": "0988888888",
        "account_name": "JACS STUDIO ADMIN",
        "branch": "Hội sở chính",
        "purpose": "api_expense",
        "qr_template": "compact2",
        "custom_qr_url": None,
        "is_default": False,
        "is_active": True,
        "notes": "Tài khoản chi trả phí hạ tầng Server và API AI",
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    },
]

PLAN_DAYS = {
    "1_month": 30,
    "3_months": 90,
    "6_months": 180,
    "1_year": 365,
    "lifetime": 3650,
}

PLAN_NAMES = {
    "1_month": "Gói 1 Tháng (Standard)",
    "3_months": "Gói 3 Tháng (Tiết kiệm 10%)",
    "6_months": "Gói 6 Tháng (Tiết kiệm 17%)",
    "1_year": "Gói 1 Năm (Tiết kiệm 25%)",
    "lifetime": "Gói Trọn Đời (Lifetime Studio VIP)",
}

DEFAULT_CREDIT_CONFIG = {
    "price_per_1m_token": 1000.0,
    "cost_per_1m_token": 800.0,
    "token_in_price": 700.0,
    "token_out_price": 900.0,
    "min_deposit_amount": 2000.0,
    "is_active": True,
}

DEFAULT_CREDIT_PACKAGES = [
    {
        "id": "pkg-base",
        "name": "Base",
        "price": 250000.0,
        "base_credits": 153846.0,
        "bonus_percent": 2.0,
        "total_credits": 156923.0,
        "badge": None,
        "description": "Gói nạp trải nghiệm tác vụ AI cơ bản",
        "sort_order": 1,
        "is_active": True,
    },
    {
        "id": "pkg-starter",
        "name": "Starter",
        "price": 500000.0,
        "base_credits": 307692.0,
        "bonus_percent": 3.0,
        "total_credits": 316923.0,
        "badge": None,
        "description": "Gói nạp phổ thông cho dự án vừa & nhỏ",
        "sort_order": 2,
        "is_active": True,
    },
    {
        "id": "pkg-growth",
        "name": "Growth",
        "price": 1000000.0,
        "base_credits": 615385.0,
        "bonus_percent": 7.0,
        "total_credits": 658461.0,
        "badge": "ĐỀ XUẤT",
        "description": "Gói ưu đãi khuyên dùng cho nhà sáng tạo nội dung",
        "sort_order": 3,
        "is_active": True,
    },
    {
        "id": "pkg-pro",
        "name": "Pro",
        "price": 3000000.0,
        "base_credits": 1846154.0,
        "bonus_percent": 12.0,
        "total_credits": 2067692.0,
        "badge": "TIẾT KIỆM 12%",
        "description": "Gói chuyên nghiệp đa luồng video studio",
        "sort_order": 4,
        "is_active": True,
    },
]


class BillingService:
    @staticmethod
    def ensure_seed_bank_accounts() -> list[dict]:
        accounts = store.list("bank_accounts")
        if not accounts:
            legacy = store.get("billing_settings", "bank_config")
            if legacy:
                acc = {
                    "bank_name": legacy.get("bank_name", "VietinBank (Công thương Việt Nam)"),
                    "bank_bin": legacy.get("bank_bin", "970415"),
                    "bank_short": legacy.get("bank_short", "CTG"),
                    "account_number": legacy.get("account_number", "109873538727"),
                    "account_name": legacy.get("account_name", "NGUYEN LE HAI"),
                    "branch": legacy.get("branch", ""),
                    "purpose": "customer_income",
                    "qr_template": legacy.get("qr_template", "compact2"),
                    "custom_qr_url": legacy.get("custom_qr_url"),
                    "is_default": True,
                    "is_active": True,
                    "notes": "Tài khoản thụ hưởng chính",
                    "created_at": datetime.now(UTC),
                    "updated_at": datetime.now(UTC),
                }
                store.create("bank_accounts", acc)
            else:
                for seed in DEFAULT_BANK_ACCOUNTS:
                    store.create("bank_accounts", seed.copy())
            accounts = store.list("bank_accounts")
        return accounts

    @classmethod
    def get_bank_config(cls) -> dict:
        accounts = cls.ensure_seed_bank_accounts()
        default_acc = next((a for a in accounts if a.get("is_default") and a.get("is_active")), None)
        if not default_acc:
            default_acc = next((a for a in accounts if a.get("is_active")), None)
        if not default_acc and accounts:
            default_acc = accounts[0]

        saved_settings = store.get("billing_settings", "bank_config") or {}
        cfg = dict(DEFAULT_BANK_CONFIG)
        cfg.update(saved_settings)

        if default_acc:
            cfg["bank_name"] = default_acc.get("bank_name", cfg["bank_name"])
            cfg["bank_bin"] = default_acc.get("bank_bin", cfg["bank_bin"])
            cfg["account_number"] = default_acc.get("account_number", cfg["account_number"])
            cfg["account_name"] = default_acc.get("account_name", cfg["account_name"])
            cfg["qr_template"] = default_acc.get("qr_template", cfg["qr_template"])
            cfg["custom_qr_url"] = default_acc.get("custom_qr_url", cfg.get("custom_qr_url"))
        return cfg

    @classmethod
    def list_bank_accounts(cls) -> list[dict]:
        accounts = cls.ensure_seed_bank_accounts()
        return sorted(
            accounts,
            key=lambda x: (not x.get("is_default", False), str(x.get("created_at", ""))),
        )

    @staticmethod
    def create_bank_account(payload_data: dict, actor: str) -> dict:
        data = dict(payload_data)
        data["created_at"] = datetime.now(UTC)
        data["updated_at"] = datetime.now(UTC)

        accounts = store.list("bank_accounts")
        if not accounts or data.get("is_default"):
            for acc in accounts:
                if acc.get("is_default"):
                    store.update("bank_accounts", acc["id"], {"is_default": False})
            data["is_default"] = True

        record = store.create("bank_accounts", data)
        store.create(
            "audit",
            {
                "action": "billing.bank_account_created",
                "account_id": str(record["id"]),
                "bank_name": data.get("bank_name"),
                "account_number": data.get("account_number"),
                "actor": actor,
            },
        )
        return record

    @staticmethod
    def get_bank_account(account_id: str) -> dict:
        record = store.get("bank_accounts", account_id)
        if not record:
            raise AppError("ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản ngân hàng", 404)
        return record

    @staticmethod
    def update_bank_account(account_id: str, payload_data: dict, actor: str) -> dict:
        record = store.get("bank_accounts", account_id)
        if not record:
            raise AppError("ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản ngân hàng", 404)

        update_data = {k: v for k, v in payload_data.items() if v is not None}
        update_data["updated_at"] = datetime.now(UTC)

        if update_data.get("is_default"):
            for acc in store.list("bank_accounts"):
                if str(acc.get("id")) != str(account_id) and acc.get("is_default"):
                    store.update("bank_accounts", acc["id"], {"is_default": False})

        saved = store.update("bank_accounts", account_id, update_data)
        store.create(
            "audit",
            {
                "action": "billing.bank_account_updated",
                "account_id": str(account_id),
                "bank_name": saved.get("bank_name"),
                "account_number": saved.get("account_number"),
                "actor": actor,
            },
        )
        return saved

    @staticmethod
    def delete_bank_account(account_id: str, actor: str) -> dict:
        record = store.get("bank_accounts", account_id)
        if not record:
            raise AppError("ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản ngân hàng", 404)

        accounts = store.list("bank_accounts")
        was_default = record.get("is_default", False)

        store.delete("bank_accounts", account_id)

        if was_default:
            remaining = [acc for acc in accounts if str(acc.get("id")) != str(account_id)]
            if remaining:
                store.update("bank_accounts", remaining[0]["id"], {"is_default": True})

        store.create(
            "audit",
            {
                "action": "billing.bank_account_deleted",
                "account_id": str(account_id),
                "bank_name": record.get("bank_name"),
                "account_number": record.get("account_number"),
                "actor": actor,
            },
        )
        return {"data": {"success": True, "message": "Đã xóa tài khoản ngân hàng thành công"}}

    @staticmethod
    def set_default_bank_account(account_id: str, actor: str) -> dict:
        record = store.get("bank_accounts", account_id)
        if not record:
            raise AppError("ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản ngân hàng", 404)

        for acc in store.list("bank_accounts"):
            if str(acc.get("id")) != str(account_id) and acc.get("is_default"):
                store.update("bank_accounts", acc["id"], {"is_default": False})

        saved = store.update(
            "bank_accounts",
            account_id,
            {"is_default": True, "is_active": True, "updated_at": datetime.now(UTC)},
        )
        store.create(
            "audit",
            {
                "action": "billing.bank_account_set_default",
                "account_id": str(account_id),
                "bank_name": saved.get("bank_name"),
                "account_number": saved.get("account_number"),
                "actor": actor,
            },
        )
        return saved

    @staticmethod
    def toggle_bank_account_status(account_id: str, actor: str) -> dict:
        record = store.get("bank_accounts", account_id)
        if not record:
            raise AppError("ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản ngân hàng", 404)

        new_status = not record.get("is_active", True)
        saved = store.update(
            "bank_accounts",
            account_id,
            {"is_active": new_status, "updated_at": datetime.now(UTC)},
        )
        store.create(
            "audit",
            {
                "action": "billing.bank_account_toggle_status",
                "account_id": str(account_id),
                "is_active": new_status,
                "actor": actor,
            },
        )
        return saved

    @classmethod
    def update_bank_config(cls, payload_data: dict, actor: str) -> dict:
        data = {
            **payload_data,
            "updated_at": datetime.now(UTC),
        }
        existing = store.get("billing_settings", "bank_config")
        if existing:
            saved = store.update("billing_settings", "bank_config", data)
        else:
            saved = store.create("billing_settings", {"id": "bank_config", **data})

        accounts = store.list("bank_accounts")
        default_acc = next((a for a in accounts if a.get("is_default")), None)
        if default_acc:
            store.update(
                "bank_accounts",
                default_acc["id"],
                {
                    "bank_name": payload_data.get("bank_name"),
                    "bank_bin": payload_data.get("bank_bin"),
                    "account_number": payload_data.get("account_number"),
                    "account_name": payload_data.get("account_name"),
                    "qr_template": payload_data.get("qr_template"),
                    "custom_qr_url": payload_data.get("custom_qr_url"),
                    "updated_at": datetime.now(UTC),
                },
            )

        store.create(
            "audit",
            {
                "action": "billing.bank_config_updated",
                "bank_name": payload_data.get("bank_name"),
                "account_number": payload_data.get("account_number"),
                "actor": actor,
            },
        )
        return saved

    @classmethod
    def generate_renew_qr(cls, license_key: str, plan_type: str | None = None) -> dict:
        clean_key = license_key.strip().upper() if license_key else "DEMO-KEY"
        key_hash = hashlib.sha256(clean_key.encode("utf-8")).hexdigest()
        license_record = next(
            (
                rec
                for rec in store.list("licenses")
                if rec.get("key_hash") == key_hash
                or rec.get("key") == clean_key
                or rec.get("key_hint") == clean_key
                or rec.get("id") == clean_key
            ),
            None,
        )

        bank_cfg = cls.get_bank_config()
        pricing = bank_cfg.get("plans_pricing", DEFAULT_BANK_CONFIG["plans_pricing"])
        plan_key = plan_type if plan_type in pricing else "1_month"
        amount = float(pricing.get(plan_key, 500000.0))
        duration_days = PLAN_DAYS.get(plan_key, 30)
        plan_name = PLAN_NAMES.get(plan_key, f"Gói {plan_key}")

        key_token = re.sub(r"^(?:JACS[-_ ]*)+", "", clean_key, flags=re.IGNORECASE).replace("-", "").strip()[:8]
        if not key_token:
            key_token = "KEY"
        transfer_content = f"JACS {key_token}"

        if bank_cfg.get("custom_qr_url"):
            qr_url = bank_cfg["custom_qr_url"]
        else:
            encoded_content = urllib.parse.quote(transfer_content)
            encoded_account_name = urllib.parse.quote(bank_cfg.get("account_name", "JACS STUDIO ADMIN"))
            qr_url = (
                f"https://img.vietqr.io/image/{bank_cfg.get('bank_bin', '970422')}-{bank_cfg.get('account_number', '0988888888')}-{bank_cfg.get('qr_template', 'compact2')}.png"
                f"?amount={int(amount)}&addInfo={encoded_content}&accountName={encoded_account_name}"
            )

        return {
            "license_key": clean_key,
            "customer_name": license_record.get("customer_name") if license_record else "Khách Hàng JACS",
            "current_expires_at": license_record.get("expires_at") if license_record else None,
            "plan_type": plan_key,
            "plan_name": plan_name,
            "amount": amount,
            "duration_days": duration_days,
            "bank_name": bank_cfg.get("bank_name", "MB Bank"),
            "bank_bin": bank_cfg.get("bank_bin", "970422"),
            "account_number": bank_cfg.get("account_number", "0988888888"),
            "account_name": bank_cfg.get("account_name", "JACS STUDIO ADMIN"),
            "transfer_content": transfer_content,
            "qr_url": qr_url,
        }

    @classmethod
    async def process_sepay_webhook(
        cls,
        payload: dict,
        auth_header: str | None = None,
        api_key_query: str | None = None,
    ) -> dict:
        bank_cfg = cls.get_bank_config()
        configured_api_key = str(bank_cfg.get("sepay_api_key") or "").strip()

        if configured_api_key:
            passed_key = ""
            if auth_header:
                if "apikey" in auth_header.lower():
                    parts = auth_header.split(None, 1)
                    passed_key = (
                        parts[1].strip()
                        if len(parts) == 2
                        else auth_header.replace("Apikey", "").replace("apikey", "").strip()
                    )
                else:
                    passed_key = auth_header.strip()
            elif api_key_query:
                passed_key = api_key_query.strip()
            elif payload.get("apiKey") or payload.get("api_key"):
                passed_key = str(payload.get("apiKey") or payload.get("api_key")).strip()

            if not passed_key or passed_key != configured_api_key:
                raise AppError("UNAUTHORIZED_WEBHOOK", "API Key SePay không chính xác", 401)

        transfer_amount = float(payload.get("transferAmount") or payload.get("amount") or 0.0)
        content = str(payload.get("content") or payload.get("description") or "").strip()
        reference_code = str(payload.get("referenceCode") or payload.get("id") or f"SP{int(datetime.now(UTC).timestamp())}")

        existing_txs = store.list("billing_transactions")
        duplicate = next((t for t in existing_txs if str(t.get("reference_code")) == reference_code), None)
        if duplicate:
            return {"success": True, "message": "Giao dịch SePay đã được xử lý trước đó (Idempotent)", "transaction_id": duplicate.get("id")}

        licenses = store.list("licenses")
        matching_lic = None
        is_credit_topup = False

        credit_match = re.search(r"JACSCR\s*([A-Za-z0-9]+)", content, re.IGNORECASE)
        if credit_match:
            is_credit_topup = True
            token = credit_match.group(1).upper()
            matching_lic = next(
                (
                    l
                    for l in licenses
                    if token in str(l.get("key", "")).upper()
                    or token in str(l.get("key_hint", "")).upper()
                    or str(l.get("id", "")).replace("-", "").upper().startswith(token)
                ),
                None,
            )

        if not matching_lic:
            match = re.search(r"JACS\s*([A-Za-z0-9]+)", content, re.IGNORECASE)
            if match:
                token = match.group(1).upper()
                matching_lic = next(
                    (
                        l
                        for l in licenses
                        if token in str(l.get("key", "")).upper()
                        or token in str(l.get("key_hint", "")).upper()
                        or str(l.get("id", "")).replace("-", "").upper().startswith(token)
                    ),
                    None,
                )

        if not matching_lic:
            for l in licenses:
                hint = str(l.get("key_hint") or "").replace("*", "").strip().upper()
                if hint and len(hint) >= 4 and hint in content.upper():
                    matching_lic = l
                    break

        now = datetime.now(UTC)

        if is_credit_topup:
            packages = cls.get_or_seed_credit_packages()
            matched_pkg = next((p for p in packages if abs(float(p.get("price", 0)) - transfer_amount) < 1000), None)
            if matched_pkg:
                credits_to_add = float(matched_pkg.get("total_credits", 0))
                pkg_name = f"Gói {matched_pkg.get('name')}"
            else:
                credits_to_add = round(transfer_amount * (615.385 / 1000.0), 0)
                pkg_name = f"Nạp tùy ý ({transfer_amount:,.0f} đ)"

            new_balance = 0.0
            lic_id = None
            if matching_lic:
                lic_id = matching_lic["id"]
                cur_bal = float(matching_lic.get("credit_balance", 0.0))
                new_balance = round(cur_bal + credits_to_add, 2)
                store.update("licenses", matching_lic["id"], {
                    "credit_balance": new_balance,
                    "updated_at": now,
                })

            tx = store.create("billing_transactions", {
                "customer_name": matching_lic.get("customer_name", f"Khách SePay #{reference_code}") if matching_lic else f"Khách SePay #{reference_code}",
                "license_id": lic_id,
                "plan_type": "credit_topup",
                "plan_name": pkg_name,
                "amount": transfer_amount,
                "credit_amount": credits_to_add,
                "payment_method": "sepay_vietqr",
                "transaction_type": "deposit",
                "reference_code": reference_code,
                "notes": f"SePay Auto-Topup (+{credits_to_add:,.0f} Credits): {content}",
                "created_at": now,
            })

            store.create("audit", {
                "action": "sepay.webhook_credit_topup",
                "license_id": lic_id,
                "amount": transfer_amount,
                "credits_granted": credits_to_add,
                "new_balance": new_balance,
                "reference_code": reference_code,
                "actor": "sepay_gateway",
            })

            return {
                "success": True,
                "message": f"Credit top-up granted (+{credits_to_add:,.0f} Credits)",
                "license_id": lic_id,
                "new_credit_balance": new_balance,
                "transaction_id": tx.get("id"),
            }

        pricing = bank_cfg.get("plans_pricing", DEFAULT_BANK_CONFIG["plans_pricing"])
        days_to_add = 30
        plan_name = "1 Tháng (Standard)"
        if transfer_amount >= pricing.get("lifetime", 9650000.0) * 0.95:
            days_to_add = 3650
            plan_name = "Vĩnh Viễn (Lifetime VIP)"
        elif transfer_amount >= pricing.get("1_year", 4500000.0) * 0.95:
            days_to_add = 365
            plan_name = "1 Năm (VIP Studio)"
        elif transfer_amount >= pricing.get("6_months", 2650000.0) * 0.95:
            days_to_add = 180
            plan_name = "6 Tháng (Khuyên dùng)"
        elif transfer_amount >= pricing.get("3_months", 1350000.0) * 0.95:
            days_to_add = 90
            plan_name = "3 Tháng (Tiêu chuẩn)"
        elif transfer_amount >= pricing.get("1_month", 550000.0) * 0.95:
            days_to_add = 30
            plan_name = "1 Tháng (Tiết kiệm)"
        else:
            days_to_add = max(1, int((transfer_amount / pricing.get("1_month", 550000.0)) * 30))
            plan_name = f"Tùy chỉnh ({days_to_add} ngày)"

        if matching_lic:
            current_exp = matching_lic.get("expires_at")
            if current_exp:
                try:
                    base_dt = datetime.fromisoformat(str(current_exp))
                    if base_dt.tzinfo is None:
                        base_dt = base_dt.replace(tzinfo=UTC)
                    base_dt = max(base_dt, now)
                except (ValueError, TypeError):
                    base_dt = now
            else:
                base_dt = now

            new_exp = base_dt + timedelta(days=days_to_add)
            store.update("licenses", matching_lic["id"], {
                "status": "active",
                "expires_at": new_exp.isoformat(),
                "updated_at": now,
            })

            tx = store.create("billing_transactions", {
                "customer_name": matching_lic.get("customer_name", "Khách hàng"),
                "license_id": matching_lic["id"],
                "plan_type": "renewal",
                "plan_name": plan_name,
                "amount": transfer_amount,
                "payment_method": "sepay_vietqr",
                "transaction_type": "renewal",
                "reference_code": reference_code,
                "notes": f"SePay Webhook auto-renew (+{days_to_add} ngày): {content}",
                "created_at": now,
            })

            store.create("audit", {
                "action": "sepay.webhook_license_renewed",
                "license_id": matching_lic["id"],
                "amount": transfer_amount,
                "days_added": days_to_add,
                "reference_code": reference_code,
                "actor": "sepay_gateway",
            })

            return {
                "success": True,
                "message": f"License renewed (+{days_to_add} days)",
                "license_id": matching_lic["id"],
                "new_expires_at": new_exp.isoformat(),
                "transaction_id": tx.get("id"),
            }
        else:
            tx = store.create("billing_transactions", {
                "customer_name": f"Giao dịch SePay #{reference_code}",
                "plan_type": "sepay_unmatched",
                "plan_name": plan_name,
                "amount": transfer_amount,
                "payment_method": "sepay_vietqr",
                "transaction_type": "income",
                "reference_code": reference_code,
                "notes": f"SePay Webhook (Chưa khớp key): {content}",
                "created_at": now,
            })
            return {
                "success": True,
                "message": "Transaction recorded as unlinked income",
                "transaction_id": tx.get("id"),
            }

    @staticmethod
    def list_transactions() -> list[dict]:
        records = store.list("billing_transactions")
        normalized = []
        for r in records:
            item = dict(r)
            if not item.get("actor"):
                item["actor"] = "system"
            if not item.get("customer_name"):
                item["customer_name"] = "Khách hàng"
            if item.get("amount") is None:
                item["amount"] = 0.0
            normalized.append(item)
        return sorted(normalized, key=lambda x: str(x.get("created_at", "")), reverse=True)

    @staticmethod
    def create_transaction(payload_data: dict, actor: str) -> dict:
        data = dict(payload_data)
        tx_type = data.get("transaction_type", "income")

        if tx_type == "refund" and data["amount"] > 0:
            data["amount"] = -abs(data["amount"])
        elif tx_type in ("income", "deposit", "renewal") and data["amount"] < 0:
            data["amount"] = abs(data["amount"])

        record = store.create(
            "billing_transactions",
            {
                **data,
                "actor": actor,
                "created_at": datetime.now(UTC),
            },
        )
        store.create(
            "audit",
            {
                "action": f"billing.transaction_{tx_type}",
                "transaction_id": str(record["id"]),
                "customer": data.get("customer_name"),
                "amount": data["amount"],
                "actor": actor,
            },
        )
        return record

    @staticmethod
    def delete_transaction(transaction_id: UUID, actor: str) -> dict:
        existing = store.get("billing_transactions", UUID(str(transaction_id)))
        if not existing:
            raise AppError("TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch", 404)
        store.delete("billing_transactions", UUID(str(transaction_id)))
        store.create(
            "audit",
            {
                "action": "billing.transaction_deleted",
                "transaction_id": str(transaction_id),
                "customer": existing.get("customer_name"),
                "amount": existing.get("amount"),
                "actor": actor,
            },
        )
        return {"data": {"success": True, "message": "Đã xóa giao dịch thành công"}}

    @classmethod
    def compute_summary(cls) -> dict:
        records = store.list("billing_transactions")
        licenses = store.list("licenses")
        now = datetime.now(UTC)
        current_month_prefix = now.strftime("%Y-%m")

        total_deposits = 0.0
        total_refunds = 0.0
        this_month_revenue = 0.0
        revenue_by_plan: dict[str, float] = {}
        revenue_by_method: dict[str, float] = {}
        linked_license_ids = set()

        for item in records:
            amt = float(item.get("amount", 0.0))
            tx_type = item.get("transaction_type", "income")
            lic_id = str(item.get("license_id", ""))
            if lic_id:
                linked_license_ids.add(lic_id)

            if amt < 0 or tx_type == "refund":
                total_refunds += abs(amt)
            else:
                total_deposits += amt

            created_str = str(item.get("created_at", ""))
            if created_str.startswith(current_month_prefix):
                this_month_revenue += amt

            plan = item.get("plan_type", "other")
            revenue_by_plan[plan] = revenue_by_plan.get(plan, 0.0) + amt

            method = item.get("payment_method", "other")
            revenue_by_method[method] = revenue_by_method.get(method, 0.0) + amt

        bank_cfg = cls.get_bank_config()
        pricing = bank_cfg.get("plans_pricing", DEFAULT_BANK_CONFIG["plans_pricing"])
        base_plan_price = float(pricing.get("1_month", 500000.0))

        unlinked_active_licenses = 0
        for lic in licenses:
            if lic.get("status") == "active":
                lic_id = str(lic.get("id", ""))
                if lic_id not in linked_license_ids:
                    unlinked_active_licenses += 1
                    total_deposits += base_plan_price
                    this_month_revenue += base_plan_price
                    revenue_by_plan["active_license"] = revenue_by_plan.get("active_license", 0.0) + base_plan_price
                    revenue_by_method["license_allocation"] = revenue_by_method.get("license_allocation", 0.0) + base_plan_price

        net_revenue = total_deposits - total_refunds

        return {
            "total_revenue": net_revenue,
            "this_month_revenue": this_month_revenue,
            "total_deposits": total_deposits,
            "total_refunds": total_refunds,
            "net_revenue": net_revenue,
            "total_transactions": len(records) + unlinked_active_licenses,
            "revenue_by_plan": revenue_by_plan,
            "revenue_by_method": revenue_by_method,
        }

    @staticmethod
    def get_client_history(license_key: str) -> dict:
        clean_key = re.sub(r"[\s\u200b-\u200d\ufeff]+", "", license_key).upper()
        key_hash = hashlib.sha256(clean_key.encode("utf-8")).hexdigest()
        key_token = re.sub(r"^(?:JACS[-_ ]*)+", "", clean_key, flags=re.IGNORECASE).replace("-", "").strip()[:8]

        lic = next(
            (
                lic_item
                for lic_item in store.list("licenses")
                if lic_item.get("key_hash") == key_hash
                or clean_key in str(lic_item.get("key", "")).upper()
                or clean_key in str(lic_item.get("key_hint", "")).upper()
                or str(lic_item.get("id", "")) == clean_key
                or (key_token and key_token in str(lic_item.get("key", "")).upper())
            ),
            None,
        )
        lic_id = str(lic["id"]) if lic else None

        txs = store.list("billing_transactions")
        matched = []
        for tx in txs:
            if (
                (lic_id and str(tx.get("license_id", "")) == lic_id)
                or (key_token and key_token in str(tx.get("notes", "")).upper())
                or (clean_key in str(tx.get("notes", "")).upper())
                or (
                    lic
                    and lic.get("customer_name")
                    and str(tx.get("customer_name", "")).strip().lower()
                    == str(lic.get("customer_name", "")).strip().lower()
                )
            ):
                matched.append(tx)

        sorted_txs = sorted(matched, key=lambda x: str(x.get("created_at", "")), reverse=True)
        exp_val = lic.get("expires_at") if lic else None
        if hasattr(exp_val, "isoformat"):
            exp_str = exp_val.isoformat()
        else:
            exp_str = str(exp_val) if exp_val else None

        return {
            "data": {
                "license_key": clean_key,
                "customer_name": lic.get("customer_name") if lic else "Khách Hàng JACS",
                "expires_at": exp_str,
                "status": lic.get("status") if lic else "active",
                "transactions": sorted_txs,
            }
        }

    @staticmethod
    def get_credit_config() -> dict:
        existing = store.get("billing_settings", "credit_config")
        if not existing:
            cfg = dict(DEFAULT_CREDIT_CONFIG)
            cfg["id"] = "credit_config"
            cfg["created_at"] = datetime.now(UTC)
            cfg["updated_at"] = datetime.now(UTC)
            store.create("billing_settings", cfg)
            existing = cfg
        return existing

    @staticmethod
    def update_credit_config(payload_data: dict, actor: str) -> dict:
        data = {
            **payload_data,
            "updated_at": datetime.now(UTC),
        }
        existing = store.get("billing_settings", "credit_config")
        if existing:
            saved = store.update("billing_settings", "credit_config", data)
        else:
            saved = store.create("billing_settings", {"id": "credit_config", **data})

        store.create(
            "audit",
            {
                "action": "billing.credit_config_updated",
                "actor": actor,
                "price_per_1m_token": payload_data.get("price_per_1m_token"),
                "cost_per_1m_token": payload_data.get("cost_per_1m_token"),
            },
        )
        return saved

    @classmethod
    def get_or_seed_credit_packages(cls) -> list[dict]:
        existing = store.list("credit_packages")
        if not existing:
            for p in DEFAULT_CREDIT_PACKAGES:
                item = dict(p)
                item["created_at"] = datetime.now(UTC)
                item["updated_at"] = datetime.now(UTC)
                store.create("credit_packages", item)
            existing = store.list("credit_packages")
        return sorted(existing, key=lambda x: int(x.get("sort_order", 1)))

    @classmethod
    def create_credit_package(cls, payload_data: dict, actor: str) -> dict:
        now = datetime.now(UTC)
        data = dict(payload_data)
        data["id"] = f"pkg-{uuid4().hex[:8]}"
        data["created_at"] = now
        data["updated_at"] = now
        saved = store.create("credit_packages", data)

        store.create("audit", {
            "action": "billing.credit_package_created",
            "package_id": saved["id"],
            "name": saved.get("name"),
            "price": saved.get("price"),
            "total_credits": saved.get("total_credits"),
            "actor": actor,
        })
        return saved

    @classmethod
    def update_credit_package(cls, package_id: str, payload_data: dict, actor: str) -> dict:
        existing = store.get("credit_packages", package_id)
        if not existing:
            raise AppError("PACKAGE_NOT_FOUND", "Không tìm thấy gói credit", 404)

        update_data = {k: v for k, v in payload_data.items() if v is not None}
        update_data["updated_at"] = datetime.now(UTC)
        saved = store.update("credit_packages", package_id, update_data) or existing

        store.create("audit", {
            "action": "billing.credit_package_updated",
            "package_id": package_id,
            "actor": actor,
        })
        return saved

    @classmethod
    def delete_credit_package(cls, package_id: str, actor: str) -> dict:
        existing = store.get("credit_packages", package_id)
        if not existing:
            raise AppError("PACKAGE_NOT_FOUND", "Không tìm thấy gói credit", 404)

        store.delete("credit_packages", package_id)
        store.create("audit", {
            "action": "billing.credit_package_deleted",
            "package_id": package_id,
            "name": existing.get("name"),
            "actor": actor,
        })
        return {"data": {"success": True, "message": "Đã xóa gói credit thành công"}}
