from __future__ import annotations

import re
import urllib.parse
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request

from app.core.errors import AppError
from app.core.security import require_auth
from app.core.store import store
from app.modules.billing.schemas import (
    BankConfigResponse,
    BillingSummaryResponse,
    BillingTransactionResponse,
    CreateBillingTransactionRequest,
    RenewQrRequest,
    RenewQrResponse,
    UpdateBankConfigRequest,
)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

DEFAULT_BANK_CONFIG = {
    "bank_name": "MB Bank (Quân Đội)",
    "bank_bin": "970422",
    "account_number": "0988888888",
    "account_name": "JACS STUDIO ADMIN",
    "qr_template": "compact2",
    "plans_pricing": {
        "1_month": 500000.0,
        "3_months": 1350000.0,
        "6_months": 2500000.0,
        "1_year": 4500000.0,
    },
}

PLAN_DAYS = {
    "1_month": 30,
    "3_months": 90,
    "6_months": 180,
    "1_year": 365,
}

PLAN_NAMES = {
    "1_month": "Gói 1 Tháng (Standard)",
    "3_months": "Gói 3 Tháng (Tiết kiệm 10%)",
    "6_months": "Gói 6 Tháng (Tiết kiệm 17%)",
    "1_year": "Gói 1 Năm (Tiết kiệm 25%)",
}


def _get_bank_config() -> dict:
    saved = store.get("billing_settings", "bank_config")
    if saved:
        return {**DEFAULT_BANK_CONFIG, **saved}
    return dict(DEFAULT_BANK_CONFIG)


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

    match = re.search(r"JACS\s*([A-Za-z0-9\-_]+)", content, re.IGNORECASE)
    searched_token = match.group(1).upper() if match else ""

    licenses = store.list("licenses")
    matching_lic = None

    if searched_token:
        matching_lic = next((
            lic for lic in licenses
            if searched_token in str(lic.get("key", "")).upper()
            or searched_token in str(lic.get("key_hint", "")).upper()
            or searched_token == str(lic.get("id", "")).replace("-", "").upper()[:len(searched_token)]
            or searched_token in str(lic.get("customer_name", "")).upper()
        ), None)

    if not matching_lic:
        for lic in licenses:
            hint = str(lic.get("key_hint", "")).upper().replace("...", "").strip()
            if hint and hint in content.upper():
                matching_lic = lic
                break

    pricing = bank_cfg.get("plans_pricing", DEFAULT_BANK_CONFIG["plans_pricing"])

    days_to_add = 30
    plan_name = "1 Tháng (Standard)"
    if transfer_amount >= pricing.get("1_year", 4500000.0) * 0.95:
        days_to_add = 365
        plan_name = "1 Năm (VIP Studio)"
    elif transfer_amount >= pricing.get("6_months", 2500000.0) * 0.95:
        days_to_add = 180
        plan_name = "6 Tháng"
    elif transfer_amount >= pricing.get("3_months", 1350000.0) * 0.95:
        days_to_add = 90
        plan_name = "3 Tháng"
    elif transfer_amount >= pricing.get("1_month", 500000.0) * 0.95:
        days_to_add = 30
        plan_name = "1 Tháng"
    else:
        days_to_add = max(1, int((transfer_amount / pricing.get("1_month", 500000.0)) * 30))
        plan_name = f"Tùy chỉnh ({days_to_add} ngày)"

    now = datetime.now(UTC)
    if matching_lic:
        current_exp = matching_lic.get("expires_at")
        if current_exp:
            try:
                base_dt = datetime.fromisoformat(str(current_exp).replace("Z", "+00:00"))
                base_dt = max(base_dt, now)
            except Exception:
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
    return sorted(records, key=lambda x: str(x.get("created_at", "")), reverse=True)


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
            l
            for l in store.list("licenses")
            if l.get("key_hash") == key_hash
            or clean_key in str(l.get("key", "")).upper()
            or clean_key in str(l.get("key_hint", "")).upper()
            or str(l.get("id", "")) == clean_key
            or (key_token and key_token in str(l.get("key", "")).upper())
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

