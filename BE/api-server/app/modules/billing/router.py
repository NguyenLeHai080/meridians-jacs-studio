from __future__ import annotations

import re
import urllib.parse
from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request

from app.core.errors import AppError
from app.core.security import require_auth
from app.core.store import store
from app.modules.billing.schemas import (
    BankAccountResponse,
    BankConfigResponse,
    BillingSummaryResponse,
    BillingTransactionResponse,
    CreateBankAccountRequest,
    CreateBillingTransactionRequest,
    CreateCreditPackageRequest,
    CreditConfigResponse,
    CreditPackageResponse,
    CreditTopupOrderRequest,
    CreditTopupOrderResponse,
    CreditTopupTransactionItem,
    RenewQrRequest,
    RenewQrResponse,
    SepayTransactionResponse,
    UpdateBankAccountRequest,
    UpdateBankConfigRequest,
    UpdateCreditConfigRequest,
    UpdateCreditPackageRequest,
)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

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


def _ensure_seed_bank_accounts() -> list[dict]:
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


def _get_bank_config() -> dict:
    accounts = _ensure_seed_bank_accounts()
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


@router.get("/bank-accounts", response_model=list[BankAccountResponse])
async def list_bank_accounts(_: dict = Depends(require_auth)) -> list[dict]:
    """Admin endpoint to list all configured beneficiary bank accounts."""
    accounts = _ensure_seed_bank_accounts()
    return sorted(
        accounts,
        key=lambda x: (not x.get("is_default", False), str(x.get("created_at", ""))),
    )


@router.post("/bank-accounts", response_model=BankAccountResponse, status_code=201)
async def create_bank_account(
    payload: CreateBankAccountRequest, user: dict = Depends(require_auth)
) -> dict:
    """Admin endpoint to create a new bank account."""
    data = payload.model_dump()
    data["created_at"] = datetime.now(UTC)
    data["updated_at"] = datetime.now(UTC)

    accounts = store.list("bank_accounts")
    if not accounts or payload.is_default:
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
            "bank_name": payload.bank_name,
            "account_number": payload.account_number,
            "actor": user["email"],
        },
    )
    return record


@router.get("/bank-accounts/{account_id}", response_model=BankAccountResponse)
async def get_bank_account(account_id: str, _: dict = Depends(require_auth)) -> dict:
    """Admin endpoint to get a single bank account details."""
    record = store.get("bank_accounts", account_id)
    if not record:
        raise AppError("ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản ngân hàng", 404)
    return record


@router.put("/bank-accounts/{account_id}", response_model=BankAccountResponse)
async def update_bank_account(
    account_id: str, payload: UpdateBankAccountRequest, user: dict = Depends(require_auth)
) -> dict:
    """Admin endpoint to update bank account details."""
    record = store.get("bank_accounts", account_id)
    if not record:
        raise AppError("ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản ngân hàng", 404)

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
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
            "actor": user["email"],
        },
    )
    return saved


@router.delete("/bank-accounts/{account_id}")
async def delete_bank_account(account_id: str, user: dict = Depends(require_auth)) -> dict:
    """Admin endpoint to delete a bank account."""
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
            "actor": user["email"],
        },
    )
    return {"data": {"success": True, "message": "Đã xóa tài khoản ngân hàng thành công"}}


@router.post("/bank-accounts/{account_id}/set-default", response_model=BankAccountResponse)
async def set_default_bank_account(account_id: str, user: dict = Depends(require_auth)) -> dict:
    """Admin endpoint to designate a bank account as the primary default beneficiary."""
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
            "actor": user["email"],
        },
    )
    return saved


@router.post("/bank-accounts/{account_id}/toggle-status", response_model=BankAccountResponse)
async def toggle_bank_account_status(account_id: str, user: dict = Depends(require_auth)) -> dict:
    """Admin endpoint to toggle active / inactive status of a bank account."""
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
            "actor": user["email"],
        },
    )
    return saved


@router.get("/bank-config", response_model=BankConfigResponse)
async def get_bank_config() -> BankConfigResponse:
    """Public & client endpoint to get current banking information and pricing."""
    cfg = _get_bank_config()
    return BankConfigResponse(**cfg)


@router.put("/bank-config", response_model=BankConfigResponse)
async def update_bank_config(
    payload: UpdateBankConfigRequest, user: dict = Depends(require_auth)
) -> BankConfigResponse:
    """Admin endpoint to update bank details and plan pricing."""
    data = {
        **payload.model_dump(),
        "updated_at": datetime.now(UTC),
    }
    existing = store.get("billing_settings", "bank_config")
    if existing:
        saved = store.update("billing_settings", "bank_config", data)
    else:
        saved = store.create("billing_settings", {"id": "bank_config", **data})

    # Also synchronize default bank account if present
    accounts = store.list("bank_accounts")
    default_acc = next((a for a in accounts if a.get("is_default")), None)
    if default_acc:
        store.update(
            "bank_accounts",
            default_acc["id"],
            {
                "bank_name": payload.bank_name,
                "bank_bin": payload.bank_bin,
                "account_number": payload.account_number,
                "account_name": payload.account_name,
                "qr_template": payload.qr_template,
                "custom_qr_url": payload.custom_qr_url,
                "updated_at": datetime.now(UTC),
            },
        )

    store.create(
        "audit",
        {
            "action": "billing.bank_config_updated",
            "bank_name": payload.bank_name,
            "account_number": payload.account_number,
            "actor": user["email"],
        },
    )
    return BankConfigResponse(**saved)


@router.post("/renew-qr", response_model=RenewQrResponse)
async def generate_renew_qr(payload: RenewQrRequest) -> RenewQrResponse:
    """Client endpoint to generate a dynamic VietQR payment request for key renewal."""
    from hashlib import sha256
    clean_key = payload.license_key.strip().upper() if payload.license_key else "DEMO-KEY"
    key_hash = sha256(clean_key.encode("utf-8")).hexdigest()
    license_record = next(
        (rec for rec in store.list("licenses") if rec.get("key_hash") == key_hash or rec.get("key") == clean_key or rec.get("key_hint") == clean_key or rec.get("id") == clean_key),
        None,
    )

    bank_cfg = _get_bank_config()
    pricing = bank_cfg.get("plans_pricing", DEFAULT_BANK_CONFIG["plans_pricing"])
    plan_key = payload.plan_type if payload.plan_type in pricing else "1_month"
    amount = float(pricing.get(plan_key, 500000.0))
    duration_days = PLAN_DAYS.get(plan_key, 30)
    plan_name = PLAN_NAMES.get(plan_key, f"Gói {plan_key}")

    # Transfer remark: JACS <KEY_TOKEN> (e.g. JACS C97AEA65)
    key_token = re.sub(r"^(?:JACS[-_ ]*)+", "", clean_key, flags=re.IGNORECASE).replace("-", "").strip()[:8]
    if not key_token:
        key_token = "KEY"
    transfer_content = f"JACS {key_token}"

    # VietQR URL: https://img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<NAME>
    if bank_cfg.get("custom_qr_url"):
        qr_url = bank_cfg["custom_qr_url"]
    else:
        encoded_content = urllib.parse.quote(transfer_content)
        encoded_account_name = urllib.parse.quote(bank_cfg.get("account_name", "JACS STUDIO ADMIN"))
        qr_url = (
            f"https://img.vietqr.io/image/{bank_cfg.get('bank_bin', '970422')}-{bank_cfg.get('account_number', '0988888888')}-{bank_cfg.get('qr_template', 'compact2')}.png"
            f"?amount={int(amount)}&addInfo={encoded_content}&accountName={encoded_account_name}"
        )

    return RenewQrResponse(
        license_key=clean_key,
        customer_name=license_record.get("customer_name") if license_record else "Khách Hàng JACS",
        current_expires_at=license_record.get("expires_at") if license_record else None,
        plan_type=plan_key,
        plan_name=plan_name,
        amount=amount,
        duration_days=duration_days,
        bank_name=bank_cfg.get("bank_name", "MB Bank"),
        bank_bin=bank_cfg.get("bank_bin", "970422"),
        account_number=bank_cfg.get("account_number", "0988888888"),
        account_name=bank_cfg.get("account_name", "JACS STUDIO ADMIN"),
        transfer_content=transfer_content,
        qr_url=qr_url,
    )


async def process_sepay_webhook(
    payload: dict,
    auth_header: str | None = None,
    api_key_query: str | None = None,
) -> dict:
    """Core logic to process SePay incoming bank transfer webhook with API key authentication."""
    import re
    from datetime import timedelta
    
    bank_cfg = _get_bank_config()
    configured_api_key = str(bank_cfg.get("sepay_api_key") or "").strip()

    # If an API Key is set in settings, enforce verification
    if configured_api_key:
        passed_key = ""
        if auth_header:
            if "apikey" in auth_header.lower():
                parts = auth_header.split(None, 1)
                passed_key = parts[1].strip() if len(parts) == 2 else auth_header.replace("Apikey", "").replace("apikey", "").strip()
            else:
                passed_key = auth_header.strip()
        elif api_key_query:
            passed_key = api_key_query.strip()
        elif payload.get("apiKey") or payload.get("api_key"):
            passed_key = str(payload.get("apiKey") or payload.get("api_key")).strip()

        if not passed_key or passed_key != configured_api_key:
            raise AppError("UNAUTHORIZED_SEPAY", "Mã xác thực SePay API Key không chính xác hoặc bị thiếu", 401)
    
    transfer_type = str(payload.get("transferType", "in")).lower()
    transfer_amount = float(payload.get("transferAmount", 0))
    content = str(payload.get("content", "")).strip()
    reference_code = str(payload.get("referenceCode", payload.get("id", "")))

    if transfer_type != "in" or transfer_amount <= 0:
        return {"success": True, "message": "Ignored outgoing or zero transfer"}

    is_credit_topup = bool(re.search(r"(?:JACSCR|CR|CREDIT)\b", content, re.IGNORECASE))
    match = re.search(r"(?:JACSCR|JACS|CR|CREDIT)\s*([A-Za-z0-9\-_]+)", content, re.IGNORECASE)
    searched_token = match.group(1).upper() if match else ""

    licenses = store.list("licenses")
    matching_lic = None

    if searched_token:
        # First check if matching order in credit_topup_orders exists
        topup_orders = store.list("credit_topup_orders")
        matched_topup_order = next((
            o for o in topup_orders
            if searched_token in str(o.get("transfer_content", "")).upper()
            or searched_token in str(o.get("order_code", "")).upper()
            or searched_token in str(o.get("id", "")).upper()
            or searched_token in str(o.get("license_key", "")).replace("-", "").upper()
        ), None)

        if matched_topup_order:
            if matched_topup_order.get("license_id"):
                matching_lic = next((lic_item for lic_item in licenses if str(lic_item.get("id")) == str(matched_topup_order["license_id"])), None)
            if not matching_lic and matched_topup_order.get("license_key"):
                matching_lic = next((lic_item for lic_item in licenses if str(lic_item.get("key", "")).strip().upper() == str(matched_topup_order["license_key"]).strip().upper()), None)

        if not matching_lic:
            matching_lic = next((
                lic for lic in licenses
                if searched_token in str(lic.get("key", "")).upper()
                or searched_token in str(lic.get("key", "")).replace("-", "").replace("_", "").upper()
                or searched_token in str(lic.get("key_hint", "")).upper()
                or searched_token in str(lic.get("key_hint", "")).replace("-", "").replace("_", "").upper()
                or searched_token == str(lic.get("id", "")).replace("-", "").upper()[:len(searched_token)]
                or searched_token in str(lic.get("customer_name", "")).upper()
            ), None)

    if not matching_lic:
        for lic in licenses:
            hint = str(lic.get("key_hint", "")).upper().replace("...", "").strip()
            if hint and hint in content.upper():
                matching_lic = lic
                break

    now = datetime.now(UTC)

    # 1. Handle AI Credits Top-up
    if is_credit_topup and (matching_lic or matched_topup_order):
        # Check if matching pending topup order exists
        pending_orders = store.list("credit_topup_orders")
        matched_order = matched_topup_order or next((
            o for o in pending_orders
            if o.get("status") == "PENDING"
            and (
                (matching_lic and str(o.get("license_id")) == str(matching_lic["id"]))
                or searched_token in str(o.get("transfer_content", ""))
                or searched_token in str(o.get("license_key", "")).upper()
            )
        ), None)

        if matched_order:
            credits_to_add = float(matched_order.get("credits_granted", 0)) if abs(float(matched_order.get("amount", 0)) - transfer_amount) < 1000 else round(transfer_amount * (615.385 / 1000.0), 0)
            pkg_name = matched_order.get("package_name", "Gói Credit")
            bonus_pct = float(matched_order.get("bonus_percent", 0))
            order_id = str(matched_order.get("id"))
            cust_name = matched_order.get("customer_name") or (matching_lic.get("customer_name") if matching_lic else "Khách Hàng JACS")
            lic_id = matched_order.get("license_id") or (matching_lic["id"] if matching_lic else None)

            store.update("credit_topup_orders", order_id, {
                "status": "APPROVED",
                "amount": transfer_amount,
                "credits_granted": credits_to_add,
                "approved_at": now.isoformat(),
                "approved_by": "sepay_webhook",
                "payment_method": "sepay_vietqr",
                "updated_at": now.isoformat(),
            })
        else:
            # Match package or calculate
            packages = _get_or_seed_credit_packages()
            pkg = next((p for p in packages if abs(float(p.get("price", 0)) - transfer_amount) < 1000), None)
            if pkg:
                credits_to_add = float(pkg.get("total_credits", 0))
                bonus_pct = float(pkg.get("bonus_percent", 0))
                pkg_name = f"Gói {pkg.get('name')}"
            else:
                credits_to_add = round(transfer_amount * (615.385 / 1000.0), 0)
                bonus_pct = 0.0
                pkg_name = f"Nạp tùy ý ({transfer_amount:,.0f} đ)"

            order_id = f"CTP-{uuid4().hex[:8].upper()}"
            cust_name = matching_lic.get("customer_name") if matching_lic else "Khách Hàng JACS"
            lic_id = matching_lic["id"] if matching_lic else None

            store.create("credit_topup_orders", {
                "id": order_id,
                "order_code": order_id,
                "license_id": str(lic_id) if lic_id else None,
                "license_key": matching_lic.get("key") if matching_lic else None,
                "hwid": matching_lic.get("hwid") if matching_lic else None,
                "customer_name": cust_name,
                "package_name": pkg_name,
                "amount": transfer_amount,
                "credits_granted": credits_to_add,
                "bonus_percent": bonus_pct,
                "transfer_content": content,
                "payment_method": "sepay_vietqr",
                "status": "APPROVED",
                "notes": f"SePay Webhook auto-credit (+{credits_to_add:,.0f} Cr): {content}",
                "approved_at": now.isoformat(),
                "approved_by": "sepay_webhook",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            })

        new_balance = 0.0
        if matching_lic:
            cur_bal = float(matching_lic.get("credit_balance", 0.0))
            new_balance = round(cur_bal + credits_to_add, 2)
            store.update("licenses", matching_lic["id"], {
                "credit_balance": new_balance,
                "updated_at": now,
            })

        tx = store.create("billing_transactions", {
            "customer_name": cust_name,
            "license_id": lic_id,
            "plan_type": "credit_topup",
            "plan_name": pkg_name,
            "amount": transfer_amount,
            "credit_amount": credits_to_add,
            "payment_method": "sepay_vietqr",
            "transaction_type": "deposit",
            "reference_code": reference_code,
            "notes": f"SePay Webhook auto-credit (+{credits_to_add:,.0f} Cr): {content}",
            "created_at": now,
        })

        store.create("audit", {
            "action": "sepay.webhook_credit_topup_completed",
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

    now = datetime.now(UTC)
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


@router.post("/webhook/sepay")
async def sepay_billing_webhook(payload: dict, request: Request) -> dict:
    """SePay Webhook endpoint under /api/v1/billing/webhook/sepay."""
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    api_key_query = request.query_params.get("api_key") or request.query_params.get("apikey")
    return await process_sepay_webhook(payload, auth_header=auth_header, api_key_query=api_key_query)


@router.get("/transactions", response_model=list[BillingTransactionResponse])
async def list_transactions(_: dict = Depends(require_auth)) -> list[dict]:
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


@router.post("/transactions", response_model=BillingTransactionResponse, status_code=201)
async def create_transaction(
    payload: CreateBillingTransactionRequest, user: dict = Depends(require_auth)
) -> dict:
    data = payload.model_dump()
    tx_type = data.get("transaction_type", "income")

    # If refund, ensure amount is negative or tagged
    if tx_type == "refund" and data["amount"] > 0:
        data["amount"] = -abs(data["amount"])
    elif tx_type in ("income", "deposit", "renewal") and data["amount"] < 0:
        data["amount"] = abs(data["amount"])

    record = store.create(
        "billing_transactions",
        {
            **data,
            "actor": user["email"],
            "created_at": datetime.now(UTC),
        },
    )
    store.create(
        "audit",
        {
            "action": f"billing.transaction_{tx_type}",
            "transaction_id": str(record["id"]),
            "customer": payload.customer_name,
            "amount": data["amount"],
            "actor": user["email"],
        },
    )
    return record


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: UUID, user: dict = Depends(require_auth)) -> dict:
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
            "actor": user["email"],
        },
    )
    return {"data": {"success": True, "message": "Đã xóa giao dịch thành công"}}


@router.get("/summary", response_model=BillingSummaryResponse)
async def billing_summary(_: dict = Depends(require_auth)) -> dict:
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

    # Map active customer license keys to ensure revenue reflects all active licenses
    bank_cfg = _get_bank_config()
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


@router.get("/client-history")
async def get_client_billing_history(license_key: str) -> dict:
    """Client endpoint to get renewal and billing history for a given license key."""
    import hashlib
    import re
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
        # Match by license ID, notes containing key token, or customer name
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


DEFAULT_CREDIT_CONFIG = {
    "price_per_1m_token": 1000.0,
    "cost_per_1m_token": 800.0,
    "token_in_price": 700.0,
    "token_out_price": 900.0,
    "min_deposit_amount": 2000.0,
    "is_active": True,
}


@router.get("/credit-config", response_model=CreditConfigResponse)
async def get_credit_config(_: dict = Depends(require_auth)) -> CreditConfigResponse:
    """Get the current credit pricing and formula configuration."""
    existing = store.get("billing_settings", "credit_config")
    if not existing:
        cfg = dict(DEFAULT_CREDIT_CONFIG)
        cfg["id"] = "credit_config"
        cfg["created_at"] = datetime.now(UTC)
        cfg["updated_at"] = datetime.now(UTC)
        store.create("billing_settings", cfg)
        existing = cfg
    return CreditConfigResponse(**existing)


@router.put("/credit-config", response_model=CreditConfigResponse)
async def update_credit_config(
    payload: UpdateCreditConfigRequest, user: dict = Depends(require_auth)
) -> CreditConfigResponse:
    """Update the credit pricing and formula configuration."""
    data = {
        **payload.model_dump(),
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
            "actor": user["email"],
            "price_per_1m_token": payload.price_per_1m_token,
            "cost_per_1m_token": payload.cost_per_1m_token,
        },
    )
    return CreditConfigResponse(**saved)


@router.get("/sepay-transactions", response_model=list[SepayTransactionResponse])
async def list_sepay_transactions(_: dict = Depends(require_auth)) -> list[SepayTransactionResponse]:
    """Retrieve all SePay credit top-up transactions with calculated cost, credit, profit, and key details."""
    transactions = store.list("billing_transactions")
    licenses = store.list("licenses")
    credit_cfg = store.get("billing_settings", "credit_config") or DEFAULT_CREDIT_CONFIG

    p_sell = float(credit_cfg.get("price_per_1m_token", 1000.0)) or 1000.0
    p_cost = float(credit_cfg.get("cost_per_1m_token", 800.0)) or 800.0

    # Build lookup map for licenses
    lic_map: dict[str, dict] = {}
    for lic in licenses:
        lic_id = str(lic.get("id", ""))
        if lic_id:
            lic_map[lic_id] = lic
        key_hint = str(lic.get("key_hint", "")).upper()
        if key_hint:
            lic_map[key_hint] = lic

    results: list[SepayTransactionResponse] = []

    # Map existing billing transactions
    for tx in transactions:
        amount = float(tx.get("amount", 0.0))
        if amount <= 0:
            continue

        lic_id = str(tx.get("license_id", ""))
        matched_lic = lic_map.get(lic_id)
        if not matched_lic:
            # Try fuzzy match on notes or customer name
            for lic in licenses:
                cust = str(lic.get("customer_name", "")).strip().lower()
                tx_cust = str(tx.get("customer_name", "")).strip().lower()
                if cust and cust == tx_cust:
                    matched_lic = lic
                    break

        ref_code = str(tx.get("reference_code") or tx.get("sepay_code") or "").strip()
        if not ref_code:
            tx_id_clean = str(tx.get("id", "")).replace("-", "").upper()[:8]
            ref_code = f"SEVQR{tx_id_clean}" if tx_id_clean else f"SEVQR{abs(hash(str(tx.get('created_at')))) % 1000000000:09X}"

        key_name = (
            tx.get("api_key_name")
            or (matched_lic.get("customer_name") if matched_lic else None)
            or tx.get("customer_name")
            or "test"
        )
        
        # Mask key hint
        key_masked = tx.get("api_key_masked")
        if not key_masked and matched_lic:
            raw = str(matched_lic.get("key_hint") or matched_lic.get("key") or "UK4APVL")
            token_part = re.sub(r"^(?:JACS[-_ ]*)+", "", raw).replace("-", "").replace("*", "").strip()[:7]
            key_masked = f"sk-{token_part}" if token_part else "sk-UK4APVL"
        elif not key_masked:
            key_masked = "sk-UK4APVL"

        cost_val = tx.get("cost_amount")
        if cost_val is None:
            cost_val = amount * (p_cost / p_sell) if p_sell > 0 else (amount * 0.61538)

        credit_val = tx.get("credit_amount")
        if credit_val is None:
            credit_val = cost_val

        profit_val = tx.get("profit_amount")
        if profit_val is None:
            profit_val = amount - cost_val

        profit_pct = (profit_val / amount * 100.0) if amount > 0 else 0.0

        status = str(tx.get("status") or "COMPLETED").upper()
        if tx.get("transaction_type") == "refund":
            status = "REVOKED"

        results.append(
            SepayTransactionResponse(
                id=str(tx.get("id")),
                sepay_code=ref_code,
                license_id=str(matched_lic.get("id")) if matched_lic else lic_id or None,
                api_key_name=key_name,
                api_key_masked=key_masked,
                deposit_amount=amount,
                cost_amount=round(cost_val, 2),
                credit_amount=round(credit_val, 2),
                profit_amount=round(profit_val, 2),
                profit_percent=round(profit_pct, 1),
                status=status,
                payment_method=str(tx.get("payment_method") or "sepay_vietqr"),
                bank_name=tx.get("bank_name") or "VietinBank",
                notes=tx.get("notes"),
                created_at=tx.get("created_at"),
                raw_content=tx.get("notes"),
            )
        )

    return sorted(results, key=lambda x: str(x.created_at or ""), reverse=True)


@router.post("/transactions/{transaction_id}/revoke-credit")
async def revoke_credit_transaction(transaction_id: str, user: dict = Depends(require_auth)) -> dict:
    """Revoke granted credit for a given SePay transaction, mark transaction as REVOKED."""
    txs = store.list("billing_transactions")
    tx = next(
        (t for t in txs if str(t.get("id")) == transaction_id or str(t.get("reference_code")) == transaction_id),
        None,
    )
    if not tx:
        raise AppError("TRANSACTION_NOT_FOUND", "Không tìm thấy giao dịch", 404)

    updated = store.update(
        "billing_transactions",
        tx["id"],
        {"status": "REVOKED", "updated_at": datetime.now(UTC)},
    )

    # If linked to license, deduct credit
    lic_id = tx.get("license_id")
    if lic_id:
        lic = store.get("licenses", lic_id)
        if lic and "credit_balance" in lic:
            credit_to_deduct = float(tx.get("credit_amount", tx.get("amount", 0.0)))
            current_bal = float(lic.get("credit_balance", 0.0))
            new_bal = max(0.0, current_bal - credit_to_deduct)
            store.update("licenses", lic_id, {"credit_balance": new_bal, "updated_at": datetime.now(UTC)})

    store.create(
        "audit",
        {
            "action": "billing.credit_revoked",
            "transaction_id": str(tx["id"]),
            "reference_code": tx.get("reference_code"),
            "customer": tx.get("customer_name"),
            "amount": tx.get("amount"),
            "actor": user["email"],
        },
    )
    return {"data": {"success": True, "message": "Đã thu hồi Credit thành công", "transaction": updated}}


# ============================================================================
# CREDIT PACKAGES & AUTOMATED DESKTOP CREDIT TOP-UP MANAGEMENT
# ============================================================================

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


def _get_or_seed_credit_packages() -> list[dict]:
    existing = store.list("credit_packages")
    if not existing:
        for p in DEFAULT_CREDIT_PACKAGES:
            item = dict(p)
            item["created_at"] = datetime.now(UTC)
            item["updated_at"] = datetime.now(UTC)
            store.create("credit_packages", item)
        existing = store.list("credit_packages")
    return sorted(existing, key=lambda x: int(x.get("sort_order", 1)))


@router.get("/credit-packages", response_model=list[CreditPackageResponse])
async def list_credit_packages() -> list[CreditPackageResponse]:
    """Retrieve all active credit packages (public for Desktop Tool & Admin Portal)."""
    packages = _get_or_seed_credit_packages()
    return [CreditPackageResponse(**p) for p in packages]


@router.post("/credit-packages", response_model=CreditPackageResponse)
async def create_credit_package(payload: CreateCreditPackageRequest, user: dict = Depends(require_auth)) -> CreditPackageResponse:
    """Create a new credit package."""
    now = datetime.now(UTC)
    data = payload.model_dump()
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
        "actor": user["email"],
    })
    return CreditPackageResponse(**saved)


@router.put("/credit-packages/{package_id}", response_model=CreditPackageResponse)
async def update_credit_package(package_id: str, payload: UpdateCreditPackageRequest, user: dict = Depends(require_auth)) -> CreditPackageResponse:
    """Update an existing credit package."""
    existing = store.get("credit_packages", package_id)
    if not existing:
        raise AppError("PACKAGE_NOT_FOUND", "Không tìm thấy gói credit", 404)

    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(UTC)
    saved = store.update("credit_packages", package_id, update_data) or existing

    store.create("audit", {
        "action": "billing.credit_package_updated",
        "package_id": package_id,
        "actor": user["email"],
    })
    return CreditPackageResponse(**saved)


@router.delete("/credit-packages/{package_id}")
async def delete_credit_package(package_id: str, user: dict = Depends(require_auth)) -> dict:
    """Delete a credit package."""
    existing = store.get("credit_packages", package_id)
    if not existing:
        raise AppError("PACKAGE_NOT_FOUND", "Không tìm thấy gói credit", 404)

    store.delete("credit_packages", package_id)
    store.create("audit", {
        "action": "billing.credit_package_deleted",
        "package_id": package_id,
        "name": existing.get("name"),
        "actor": user["email"],
    })
    return {"data": {"success": True, "message": "Đã xóa gói credit thành công"}}


@router.post("/credit-topup/create", response_model=CreditTopupOrderResponse)
async def create_credit_topup_order(payload: CreditTopupOrderRequest) -> CreditTopupOrderResponse:
    """Desktop App client endpoint: Create/Update a credit top-up order and generate dynamic VietQR."""
    clean_key = payload.license_key.strip().upper()
    clean_token = re.sub(r"^(?:JACS[-_ ]*)+", "", clean_key).replace("-", "").strip()[:8] or "KEY"

    # Find matching license
    licenses = store.list("licenses")
    matching_lic = next((
        lic_item for lic_item in licenses
        if clean_key == str(lic_item.get("key", "")).upper()
        or clean_token in str(lic_item.get("key", "")).upper()
        or clean_token in str(lic_item.get("key_hint", "")).upper()
    ), None)

    cust_name = payload.customer_name or (matching_lic.get("customer_name") if matching_lic else "Khách Hàng JACS")

    # Determine credits expected and package name
    packages = _get_or_seed_credit_packages()
    selected_pkg = next((p for p in packages if p.get("id") == payload.package_id or p.get("name", "").lower() == (payload.package_name or "").lower()), None)

    amount = float(payload.amount)
    bonus_pct = 0.0
    pkg_name = payload.package_name or "Nạp tùy ý"

    if selected_pkg and abs(float(selected_pkg.get("price", 0)) - amount) < 1000:
        credits_expected = float(selected_pkg.get("total_credits", 0))
        bonus_pct = float(selected_pkg.get("bonus_percent", 0))
        pkg_name = f"Gói {selected_pkg.get('name')}"
    else:
        # Calculate credits from credit config formula (1M token = 1000đ -> ~615.38 credits per 1000đ)
        base_cr = amount * (615.385 / 1000.0)
        credits_expected = round(base_cr, 0)
        pkg_name = f"Nạp tùy ý ({amount:,.0f} đ)"

    transfer_content = f"JACSCR {clean_token}"

    bank_cfg = _get_bank_config()
    bank_bin = bank_cfg.get("bank_bin", "970415")
    acc_num = bank_cfg.get("account_number", "109873538727")
    acc_name = bank_cfg.get("account_name", "NGUYEN LE HAI")
    qr_template = bank_cfg.get("qr_template", "compact2")

    encoded_content = urllib.parse.quote(transfer_content)
    encoded_name = urllib.parse.quote(acc_name)
    qr_url = f"https://img.vietqr.io/image/{bank_bin}-{acc_num}-{qr_template}.png?amount={int(amount)}&addInfo={encoded_content}&accountName={encoded_name}"

    now = datetime.now(UTC)

    # Check if a PENDING order already exists for this client to reuse instead of flooding DB
    pending_orders = store.list("credit_topup_orders")
    existing_pending = next((
        o for o in pending_orders
        if o.get("status") == "PENDING"
        and (
            (matching_lic and str(o.get("license_id")) == str(matching_lic["id"]))
            or str(o.get("license_key", "")).upper() == clean_key
            or (payload.hwid and str(o.get("hwid", "")).upper() == str(payload.hwid).upper())
        )
    ), None)

    if existing_pending:
        order_id = str(existing_pending["id"])
        store.update("credit_topup_orders", order_id, {
            "package_id": payload.package_id,
            "package_name": pkg_name,
            "amount": amount,
            "credits_granted": credits_expected,
            "bonus_percent": bonus_pct,
            "transfer_content": transfer_content,
            "notes": payload.notes or f"Yêu cầu nạp {credits_expected:,.0f} Credits",
            "updated_at": now.isoformat(),
        })
    else:
        order_id = f"CTP-{uuid4().hex[:8].upper()}"
        order_record = {
            "id": order_id,
            "order_code": order_id,
            "license_id": str(matching_lic.get("id")) if matching_lic else None,
            "license_key": clean_key,
            "hwid": payload.hwid,
            "customer_name": cust_name,
            "package_id": payload.package_id,
            "package_name": pkg_name,
            "amount": amount,
            "credits_granted": credits_expected,
            "bonus_percent": bonus_pct,
            "transfer_content": transfer_content,
            "payment_method": "vietqr",
            "status": "PENDING",
            "notes": payload.notes or f"Yêu cầu nạp {credits_expected:,.0f} Credits",
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }
        store.create("credit_topup_orders", order_record)

    return CreditTopupOrderResponse(
        order_id=order_id,
        license_key=clean_key,
        hwid=payload.hwid,
        customer_name=cust_name,
        package_id=payload.package_id,
        package_name=pkg_name,
        amount=amount,
        credits_expected=credits_expected,
        bonus_percent=bonus_pct,
        transfer_content=transfer_content,
        bank_name=bank_cfg.get("bank_name", "VietinBank"),
        bank_bin=bank_bin,
        account_number=acc_num,
        account_name=acc_name,
        qr_url=qr_url,
        status="PENDING",
        created_at=now.isoformat(),
    )


@router.get("/credit-topup/transactions", response_model=list[CreditTopupTransactionItem])
async def list_credit_topup_transactions(status: str | None = None, _: dict = Depends(require_auth)) -> list[CreditTopupTransactionItem]:
    """Admin Portal endpoint: Get real-time list of all completed/verified credit topup transactions."""
    orders = store.list("credit_topup_orders")
    results: list[CreditTopupTransactionItem] = []
    seen_ids: set[str] = set()

    for o in orders:
        st = str(o.get("status", "PENDING")).upper()
        # By default, do NOT display un-paid PENDING draft clicks in the Admin table
        if status != "all" and status != "pending" and st == "PENDING":
            continue

        o_id = str(o.get("id"))
        seen_ids.add(o_id)
        results.append(CreditTopupTransactionItem(
            id=o_id,
            order_code=str(o.get("order_code") or o_id),
            license_id=str(o.get("license_id")) if o.get("license_id") else None,
            license_key=o.get("license_key"),
            hwid=o.get("hwid"),
            customer_name=o.get("customer_name") or "Khách hàng",
            package_id=o.get("package_id"),
            package_name=o.get("package_name") or "Nạp Credit",
            amount=float(o.get("amount", 0.0)),
            credits_granted=float(o.get("credits_granted", 0.0)),
            bonus_percent=float(o.get("bonus_percent", 0.0)),
            transfer_content=o.get("transfer_content") or "",
            payment_method=o.get("payment_method", "vietqr"),
            status=st,
            created_at=o.get("created_at"),
            approved_at=o.get("approved_at"),
            approved_by=o.get("approved_by"),
            notes=o.get("notes"),
        ))

    # Also aggregate from billing_transactions if any SePay deposit was recorded there
    billing_txs = store.list("billing_transactions")
    for b in billing_txs:
        if b.get("plan_type") == "credit_topup":
            ref = str(b.get("reference_code") or b.get("id") or "")
            if ref in seen_ids or str(b.get("id")) in seen_ids:
                continue

            results.append(CreditTopupTransactionItem(
                id=str(b.get("id")),
                order_code=ref or str(b.get("id")),
                license_id=str(b.get("license_id")) if b.get("license_id") else None,
                license_key=None,
                hwid=None,
                customer_name=b.get("customer_name") or "Khách hàng SePay",
                package_id="sepay_topup",
                package_name=b.get("plan_name") or "Nạp Credit SePay",
                amount=float(b.get("amount", 0.0)),
                credits_granted=float(b.get("credit_amount", 0.0)),
                bonus_percent=0.0,
                transfer_content=b.get("notes") or "",
                payment_method="sepay_vietqr",
                status="APPROVED",
                created_at=b.get("created_at"),
                approved_at=b.get("created_at"),
                approved_by="sepay_webhook",
                notes=b.get("notes"),
            ))

    return sorted(results, key=lambda x: str(x.created_at or ""), reverse=True)


@router.post("/credit-topup/transactions/{transaction_id}/approve")
async def approve_credit_topup_transaction(transaction_id: str, user: dict = Depends(require_auth)) -> dict:
    """Admin Portal endpoint: Approve a credit top-up order and AUTOMATICALLY GRANT CREDITS to device/license."""
    orders = store.list("credit_topup_orders")
    order = next((o for o in orders if str(o.get("id")) == transaction_id or str(o.get("order_code")) == transaction_id), None)
    if not order:
        raise AppError("ORDER_NOT_FOUND", "Không tìm thấy yêu cầu nạp credit này", 404)

    if order.get("status") in {"APPROVED", "COMPLETED"}:
        return {"data": {"success": True, "message": "Giao dịch đã được duyệt trước đó", "order": order}}

    now = datetime.now(UTC)
    credits_to_add = float(order.get("credits_granted", 0.0))

    # Find matching license to add credits
    licenses = store.list("licenses")
    lic = None
    if order.get("license_id"):
        lic = store.get("licenses", order["license_id"])
    if not lic and order.get("license_key"):
        clean_key = str(order["license_key"]).strip().upper()
        lic = next((lic_item for lic_item in licenses if str(lic_item.get("key", "")).upper() == clean_key), None)
    if not lic and order.get("hwid"):
        lic = next((lic_item for lic_item in licenses if str(lic_item.get("hwid", "")).upper() == str(order["hwid"]).upper()), None)
    if not lic and licenses:
        token = str(order.get("transfer_content", "")).replace("JACSCR", "").strip().upper()
        if token:
            lic = next((lic_item for lic_item in licenses if token in str(lic_item.get("key", "")).upper() or token in str(lic_item.get("key_hint", "")).upper()), None)

    new_balance = 0.0
    if lic:
        cur_bal = float(lic.get("credit_balance", 0.0))
        new_balance = round(cur_bal + credits_to_add, 2)
        store.update("licenses", lic["id"], {
            "credit_balance": new_balance,
            "updated_at": now,
        })

    # Update order status
    updated_order = store.update("credit_topup_orders", order["id"], {
        "status": "APPROVED",
        "approved_at": now.isoformat(),
        "approved_by": user["email"],
        "updated_at": now.isoformat(),
    }) or order

    # Record in billing_transactions for accounting
    store.create("billing_transactions", {
        "customer_name": order.get("customer_name", "Khách hàng"),
        "license_id": lic.get("id") if lic else order.get("license_id"),
        "plan_type": "credit_topup",
        "plan_name": order.get("package_name", "Nạp Credits"),
        "amount": float(order.get("amount", 0.0)),
        "credit_amount": credits_to_add,
        "payment_method": "vietqr",
        "transaction_type": "deposit",
        "reference_code": order.get("order_code") or order.get("id"),
        "notes": f"Admin duyệt nạp +{credits_to_add:,.0f} Credits cho {order.get('customer_name')}",
        "created_at": now,
    })

    store.create("audit", {
        "action": "billing.credit_topup_approved",
        "order_id": order["id"],
        "credits_granted": credits_to_add,
        "new_balance": new_balance,
        "license_id": lic.get("id") if lic else None,
        "actor": user["email"],
    })

    return {
        "data": {
            "success": True,
            "message": f"Đã duyệt và tự động cấp thành công +{credits_to_add:,.0f} Credits!",
            "new_balance": new_balance,
            "order": updated_order,
        }
    }


@router.post("/credit-topup/transactions/{transaction_id}/reject")
async def reject_credit_topup_transaction(transaction_id: str, user: dict = Depends(require_auth)) -> dict:
    """Admin Portal endpoint: Reject/Cancel a credit top-up order."""
    orders = store.list("credit_topup_orders")
    order = next((o for o in orders if str(o.get("id")) == transaction_id or str(o.get("order_code")) == transaction_id), None)
    if not order:
        raise AppError("ORDER_NOT_FOUND", "Không tìm thấy yêu cầu nạp credit này", 404)

    now = datetime.now(UTC)
    updated_order = store.update("credit_topup_orders", order["id"], {
        "status": "REJECTED",
        "approved_at": now.isoformat(),
        "approved_by": user["email"],
        "updated_at": now.isoformat(),
    }) or order

    store.create("audit", {
        "action": "billing.credit_topup_rejected",
        "order_id": order["id"],
        "actor": user["email"],
    })
    return {"data": {"success": True, "message": "Đã từ chối đơn nạp credit", "order": updated_order}}


@router.get("/credit-topup/check-status")
async def check_credit_topup_status(order_id: str | None = None, license_key: str | None = None) -> dict:
    """Desktop App client endpoint: Check status of recent credit topup order."""
    orders = store.list("credit_topup_orders")
    matched_order = None
    if order_id:
        matched_order = next((o for o in orders if str(o.get("id")) == order_id or str(o.get("order_code")) == order_id), None)

    if not matched_order and license_key:
        clean_key = license_key.strip().upper()
        clean_token = re.sub(r"^(?:JACS[-_ ]*)+", "", clean_key).replace("-", "").strip()[:8]
        matching = [
            o for o in orders
            if str(o.get("license_key", "")).upper() == clean_key
            or (clean_token and clean_token in str(o.get("transfer_content", "")).upper())
        ]
        if matching:
            matched_order = sorted(matching, key=lambda x: str(x.get("created_at", "")), reverse=True)[0]

    # Get latest credit balance from license
    current_credit = 0.0
    licenses = store.list("licenses")
    lic = None
    if matched_order and (matched_order.get("license_id") or matched_order.get("license_key")):
        lic = next((
            lic_item for lic_item in licenses
            if str(lic_item.get("id")) == str(matched_order.get("license_id"))
            or str(lic_item.get("key", "")).upper() == str(matched_order.get("license_key", "")).upper()
        ), None)
    elif license_key:
        clean_key = license_key.strip().upper()
        clean_token = re.sub(r"^(?:JACS[-_ ]*)+", "", clean_key).replace("-", "").strip()[:8]
        lic = next((
            lic_item for lic_item in licenses
            if str(lic_item.get("key", "")).upper() == clean_key
            or (clean_token and clean_token in str(lic_item.get("key", "")).upper())
        ), None)

    if lic:
        current_credit = float(lic.get("credit_balance", 0.0))

    if not matched_order:
        return {
            "data": {
                "found": False,
                "status": "NOT_FOUND",
                "credit_balance": current_credit,
            }
        }

    return {
        "data": {
            "found": True,
            "order_id": matched_order.get("id"),
            "status": str(matched_order.get("status", "PENDING")).upper(),
            "credits_granted": float(matched_order.get("credits_granted", 0.0)),
            "credit_balance": current_credit,
            "approved_at": matched_order.get("approved_at"),
            "approved_by": matched_order.get("approved_by"),
        }
    }




