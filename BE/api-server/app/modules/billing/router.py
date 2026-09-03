from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.errors import AppError
from app.core.security import require_auth
from app.core.store import store
from app.modules.billing.schemas import (
    BillingSummaryResponse,
    BillingTransactionResponse,
    CreateBillingTransactionRequest,
)

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])


@router.get("/transactions", response_model=list[BillingTransactionResponse])
async def list_transactions(_: dict = Depends(require_auth)):
    records = store.list("billing_transactions")
    # Sort newest first
    return sorted(records, key=lambda x: str(x.get("created_at", "")), reverse=True)


@router.post("/transactions", response_model=BillingTransactionResponse, status_code=201)
async def create_transaction(payload: CreateBillingTransactionRequest, user: dict = Depends(require_auth)):
    record = store.create(
        "billing_transactions",
        {
            **payload.model_dump(),
            "actor": user["email"],
            "created_at": datetime.now(UTC),
        },
    )
    store.create(
        "audit",
        {
            "action": "billing.transaction_created",
            "transaction_id": str(record["id"]),
            "customer": payload.customer_name,
            "amount": payload.amount,
            "actor": user["email"],
        },
    )
@router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: UUID, user: dict = Depends(require_auth)):
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
async def billing_summary(_: dict = Depends(require_auth)):
    records = store.list("billing_transactions")
    now = datetime.now(UTC)
    current_month_prefix = now.strftime("%Y-%m")

    total_revenue = 0.0
    this_month_revenue = 0.0
    revenue_by_plan: dict[str, float] = {}
    revenue_by_method: dict[str, float] = {}

    for item in records:
        amount = float(item.get("amount", 0.0))
        total_revenue += amount

        created_str = str(item.get("created_at", ""))
        if created_str.startswith(current_month_prefix):
            this_month_revenue += amount

        plan = item.get("plan_type", "other")
        revenue_by_plan[plan] = revenue_by_plan.get(plan, 0.0) + amount

        method = item.get("payment_method", "other")
        revenue_by_method[method] = revenue_by_method.get(method, 0.0) + amount

    return {
        "total_revenue": total_revenue,
        "this_month_revenue": this_month_revenue,
        "total_transactions": len(records),
        "revenue_by_plan": revenue_by_plan,
        "revenue_by_method": revenue_by_method,
    }
