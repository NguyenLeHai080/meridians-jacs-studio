from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BillingTransactionBase(BaseModel):
    license_id: str | None = None
    customer_name: str = Field(min_length=1, max_length=160)
    amount: float = Field(ge=0)
    currency: str = Field(default="VND", max_length=16)
    plan_type: str = Field(default="1_month", max_length=64)
    payment_method: str = Field(default="bank_transfer", max_length=64)
    transaction_type: str = Field(default="renewal", max_length=64)
    notes: str | None = Field(default=None, max_length=1000)


class CreateBillingTransactionRequest(BillingTransactionBase):
    pass


class BillingTransactionResponse(BillingTransactionBase):
    id: UUID
    actor: str
    created_at: datetime


class BillingSummaryResponse(BaseModel):
    total_revenue: float
    this_month_revenue: float
    total_transactions: int
    revenue_by_plan: dict[str, float]
    revenue_by_method: dict[str, float]
