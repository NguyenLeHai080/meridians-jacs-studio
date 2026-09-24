from __future__ import annotations

import re
from datetime import UTC, datetime
from uuid import UUID

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
    CreditConfigResponse,
    RenewQrRequest,
    RenewQrResponse,
    SepayTransactionResponse,
    UpdateBankAccountRequest,
    UpdateBankConfigRequest,
    UpdateCreditConfigRequest,
)
from app.modules.billing.service import (
    DEFAULT_CREDIT_CONFIG,
    BillingService,
)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


# ============================================================================
# BANK ACCOUNTS
# ============================================================================


@router.get("/bank-accounts", response_model=list[BankAccountResponse])
async def list_bank_accounts(_: dict = Depends(require_auth)) -> list[dict]:
    """Admin endpoint to list all configured beneficiary bank accounts."""
    return BillingService.list_bank_accounts()


@router.post("/bank-accounts", response_model=BankAccountResponse, status_code=201)
async def create_bank_account(
    payload: CreateBankAccountRequest, user: dict = Depends(require_auth)
) -> dict:
    """Admin endpoint to create a new bank account."""
    return BillingService.create_bank_account(payload.model_dump(), user["email"])


@router.get("/bank-accounts/{account_id}", response_model=BankAccountResponse)
async def get_bank_account(account_id: str, _: dict = Depends(require_auth)) -> dict:
    """Admin endpoint to get a single bank account details."""
    return BillingService.get_bank_account(account_id)


@router.put("/bank-accounts/{account_id}", response_model=BankAccountResponse)
async def update_bank_account(
    account_id: str, payload: UpdateBankAccountRequest, user: dict = Depends(require_auth)
) -> dict:
    """Admin endpoint to update bank account details."""
    return BillingService.update_bank_account(account_id, payload.model_dump(), user["email"])


@router.delete("/bank-accounts/{account_id}")
async def delete_bank_account(account_id: str, user: dict = Depends(require_auth)) -> dict:
    """Admin endpoint to delete a bank account."""
    return BillingService.delete_bank_account(account_id, user["email"])


@router.post("/bank-accounts/{account_id}/set-default", response_model=BankAccountResponse)
async def set_default_bank_account(account_id: str, user: dict = Depends(require_auth)) -> dict:
    """Admin endpoint to designate a bank account as the primary default beneficiary."""
    return BillingService.set_default_bank_account(account_id, user["email"])


@router.post("/bank-accounts/{account_id}/toggle-status", response_model=BankAccountResponse)
async def toggle_bank_account_status(account_id: str, user: dict = Depends(require_auth)) -> dict:
    """Admin endpoint to toggle active / inactive status of a bank account."""
    return BillingService.toggle_bank_account_status(account_id, user["email"])


# ============================================================================
# BANK CONFIG & RENEW QR
# ============================================================================


@router.get("/bank-config", response_model=BankConfigResponse)
async def get_bank_config() -> BankConfigResponse:
    """Public & client endpoint to get current banking information and pricing."""
    cfg = BillingService.get_bank_config()
    return BankConfigResponse(**cfg)


@router.put("/bank-config", response_model=BankConfigResponse)
async def update_bank_config(
    payload: UpdateBankConfigRequest, user: dict = Depends(require_auth)
) -> BankConfigResponse:
    """Admin endpoint to update bank details and plan pricing."""
    saved = BillingService.update_bank_config(payload.model_dump(), user["email"])
    return BankConfigResponse(**saved)


@router.post("/renew-qr", response_model=RenewQrResponse)
async def generate_renew_qr(payload: RenewQrRequest) -> RenewQrResponse:
    """Client endpoint to generate a dynamic VietQR payment request for key renewal."""
    res = BillingService.generate_renew_qr(payload.license_key, payload.plan_type)
    return RenewQrResponse(**res)


# ============================================================================
# SEPAY WEBHOOK
# ============================================================================


async def process_sepay_webhook(
    payload: dict,
    auth_header: str | None = None,
    api_key_query: str | None = None,
) -> dict:
    """Core logic wrapper to process SePay incoming bank transfer webhook."""
    return await BillingService.process_sepay_webhook(payload, auth_header=auth_header, api_key_query=api_key_query)


@router.post("/webhook/sepay")
async def sepay_billing_webhook(payload: dict, request: Request) -> dict:
    """SePay Webhook endpoint under /api/v1/billing/webhook/sepay."""
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    api_key_query = request.query_params.get("api_key") or request.query_params.get("apikey")
    return await BillingService.process_sepay_webhook(payload, auth_header=auth_header, api_key_query=api_key_query)


# ============================================================================
# TRANSACTIONS & SUMMARY
# ============================================================================


@router.get("/transactions", response_model=list[BillingTransactionResponse])
async def list_transactions(_: dict = Depends(require_auth)) -> list[dict]:
    return BillingService.list_transactions()


@router.post("/transactions", response_model=BillingTransactionResponse, status_code=201)
async def create_transaction(
    payload: CreateBillingTransactionRequest, user: dict = Depends(require_auth)
) -> dict:
    return BillingService.create_transaction(payload.model_dump(), user["email"])


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: UUID, user: dict = Depends(require_auth)) -> dict:
    return BillingService.delete_transaction(transaction_id, user["email"])


@router.get("/summary", response_model=BillingSummaryResponse)
async def billing_summary(_: dict = Depends(require_auth)) -> dict:
    return BillingService.compute_summary()


@router.get("/client-history")
async def get_client_billing_history(license_key: str) -> dict:
    """Client endpoint to get renewal and billing history for a given license key."""
    return BillingService.get_client_history(license_key)


# ============================================================================
# CREDIT CONFIG & SEPAY OVERVIEW
# ============================================================================


@router.get("/credit-config", response_model=CreditConfigResponse)
async def get_credit_config(_: dict = Depends(require_auth)) -> CreditConfigResponse:
    """Get the current credit pricing and formula configuration."""
    cfg = BillingService.get_credit_config()
    return CreditConfigResponse(**cfg)


@router.put("/credit-config", response_model=CreditConfigResponse)
async def update_credit_config(
    payload: UpdateCreditConfigRequest, user: dict = Depends(require_auth)
) -> CreditConfigResponse:
    """Update the credit pricing and formula configuration."""
    saved = BillingService.update_credit_config(payload.model_dump(), user["email"])
    return CreditConfigResponse(**saved)


@router.get("/sepay-transactions", response_model=list[SepayTransactionResponse])
async def list_sepay_transactions(_: dict = Depends(require_auth)) -> list[SepayTransactionResponse]:
    """Retrieve all SePay credit top-up transactions with calculated cost, credit, profit, and key details."""
    transactions = store.list("billing_transactions")
    licenses = store.list("licenses")
    credit_cfg = store.get("billing_settings", "credit_config") or DEFAULT_CREDIT_CONFIG

    p_sell = float(credit_cfg.get("price_per_1m_token", 1000.0)) or 1000.0
    p_cost = float(credit_cfg.get("cost_per_1m_token", 800.0)) or 800.0

    lic_map: dict[str, dict] = {}
    for lic in licenses:
        lic_id = str(lic.get("id", ""))
        if lic_id:
            lic_map[lic_id] = lic
        key_hint = str(lic.get("key_hint", "")).upper()
        if key_hint:
            lic_map[key_hint] = lic

    results: list[SepayTransactionResponse] = []

    for tx in transactions:
        amount = float(tx.get("amount", 0.0))
        if amount <= 0:
            continue

        lic_id = str(tx.get("license_id", ""))
        matched_lic = lic_map.get(lic_id)
        if not matched_lic:
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

