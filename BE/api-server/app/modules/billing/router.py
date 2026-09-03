from __future__ import annotations

import urllib.parse
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends

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
    clean_key = payload.license_key.strip().upper()
    key_hash = sha256(clean_key.encode("utf-8")).hexdigest()
    license_record = next(
        (rec for rec in store.list("licenses") if rec.get("key_hash") == key_hash or rec.get("key") == clean_key),
        None,
    )
    if not license_record:
        raise AppError("LICENSE_NOT_FOUND", "Mã License Key không tồn tại", 404)

    bank_cfg = _get_bank_config()
    pricing = bank_cfg.get("plans_pricing", DEFAULT_BANK_CONFIG["plans_pricing"])
    plan_key = payload.plan_type if payload.plan_type in pricing else "1_month"
    amount = float(pricing.get(plan_key, 500000.0))
    duration_days = PLAN_DAYS.get(plan_key, 30)
    plan_name = PLAN_NAMES.get(plan_key, f"Gói {plan_key}")

    # Transfer remark: JACS <SHORT_KEY_OR_FULL>
    transfer_content = f"JACS {clean_key[:12]}"

    # VietQR URL: https://img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<NAME>
    encoded_content = urllib.parse.quote(transfer_content)
    encoded_account_name = urllib.parse.quote(bank_cfg["account_name"])
    qr_url = (
        f"https://img.vietqr.io/image/{bank_cfg['bank_bin']}-{bank_cfg['account_number']}-{bank_cfg.get('qr_template', 'compact2')}.png"
        f"?amount={int(amount)}&addInfo={encoded_content}&accountName={encoded_account_name}"
    )

    return RenewQrResponse(
        license_key=clean_key,
        customer_name=license_record.get("customer_name"),
        current_expires_at=license_record.get("expires_at"),
        plan_type=plan_key,
        plan_name=plan_name,
        amount=amount,
        duration_days=duration_days,
        bank_name=bank_cfg["bank_name"],
        bank_bin=bank_cfg["bank_bin"],
        account_number=bank_cfg["account_number"],
        account_name=bank_cfg["account_name"],
        transfer_content=transfer_content,
        qr_url=qr_url,
    )


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
    now = datetime.now(UTC)
    current_month_prefix = now.strftime("%Y-%m")

    total_deposits = 0.0
    total_refunds = 0.0
    this_month_revenue = 0.0
    revenue_by_plan: dict[str, float] = {}
    revenue_by_method: dict[str, float] = {}

    for item in records:
        amt = float(item.get("amount", 0.0))
        tx_type = item.get("transaction_type", "income")

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

    net_revenue = total_deposits - total_refunds

    return {
        "total_revenue": net_revenue,
        "this_month_revenue": this_month_revenue,
        "total_deposits": total_deposits,
        "total_refunds": total_refunds,
        "net_revenue": net_revenue,
        "total_transactions": len(records),
        "revenue_by_plan": revenue_by_plan,
        "revenue_by_method": revenue_by_method,
    }
