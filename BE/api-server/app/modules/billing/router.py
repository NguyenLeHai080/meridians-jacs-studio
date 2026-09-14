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
from app.modules.billing.service import (
    DEFAULT_BANK_CONFIG,
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


# ============================================================================
# CREDIT PACKAGES
# ============================================================================


@router.get("/credit-packages", response_model=list[CreditPackageResponse])
async def list_credit_packages() -> list[CreditPackageResponse]:
    """Retrieve all active credit packages."""
    packages = BillingService.get_or_seed_credit_packages()
    return [CreditPackageResponse(**p) for p in packages]


@router.post("/credit-packages", response_model=CreditPackageResponse)
async def create_credit_package(
    payload: CreateCreditPackageRequest, user: dict = Depends(require_auth)
) -> CreditPackageResponse:
    """Create a new credit package."""
    saved = BillingService.create_credit_package(payload.model_dump(), user["email"])
    return CreditPackageResponse(**saved)


@router.put("/credit-packages/{package_id}", response_model=CreditPackageResponse)
async def update_credit_package(
    package_id: str, payload: UpdateCreditPackageRequest, user: dict = Depends(require_auth)
) -> CreditPackageResponse:
    """Update an existing credit package."""
    saved = BillingService.update_credit_package(package_id, payload.model_dump(exclude_unset=True), user["email"])
    return CreditPackageResponse(**saved)


@router.delete("/credit-packages/{package_id}")
async def delete_credit_package(package_id: str, user: dict = Depends(require_auth)) -> dict:
    """Delete a credit package."""
    return BillingService.delete_credit_package(package_id, user["email"])


# ============================================================================
# CREDIT TOPUP FLOW
# ============================================================================


@router.post("/credit-topup/create", response_model=CreditTopupOrderResponse)
async def create_credit_topup_order(payload: CreditTopupOrderRequest) -> CreditTopupOrderResponse:
    """Desktop App client endpoint: Create/Update a credit top-up order and generate dynamic VietQR."""
    clean_key = payload.license_key.strip().upper()
    clean_token = re.sub(r"^(?:JACS[-_ ]*)+", "", clean_key).replace("-", "").strip()[:8] or "KEY"

    licenses = store.list("licenses")
    matching_lic = next((
        lic_item for lic_item in licenses
        if clean_key == str(lic_item.get("key", "")).upper()
        or clean_token in str(lic_item.get("key", "")).upper()
        or clean_token in str(lic_item.get("key_hint", "")).upper()
    ), None)

    cust_name = payload.customer_name or (matching_lic.get("customer_name") if matching_lic else "Khách Hàng JACS")

    packages = BillingService.get_or_seed_credit_packages()
    selected_pkg = next((p for p in packages if p.get("id") == payload.package_id or p.get("name", "").lower() == (payload.package_name or "").lower()), None)

    amount = float(payload.amount)
    bonus_pct = 0.0
    pkg_name = payload.package_name or "Nạp tùy ý"

    if selected_pkg and abs(float(selected_pkg.get("price", 0)) - amount) < 1000:
        credits_expected = float(selected_pkg.get("total_credits", 0))
        bonus_pct = float(selected_pkg.get("bonus_percent", 0))
        pkg_name = f"Gói {selected_pkg.get('name')}"
    else:
        base_cr = amount * (615.385 / 1000.0)
        credits_expected = round(base_cr, 0)
        pkg_name = f"Nạp tùy ý ({amount:,.0f} đ)"

    transfer_content = f"JACSCR {clean_token}"

    bank_cfg = BillingService.get_bank_config()
    bank_bin = bank_cfg.get("bank_bin", "970415")
    acc_num = bank_cfg.get("account_number", "109873538727")
    acc_name = bank_cfg.get("account_name", "NGUYEN LE HAI")
    qr_template = bank_cfg.get("qr_template", "compact2")

    encoded_content = urllib.parse.quote(transfer_content)
    encoded_name = urllib.parse.quote(acc_name)
    qr_url = f"https://img.vietqr.io/image/{bank_bin}-{acc_num}-{qr_template}.png?amount={int(amount)}&addInfo={encoded_content}&accountName={encoded_name}"

    now = datetime.now(UTC)

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

    updated_order = store.update("credit_topup_orders", order["id"], {
        "status": "APPROVED",
        "approved_at": now.isoformat(),
        "approved_by": user["email"],
        "updated_at": now.isoformat(),
    }) or order

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
