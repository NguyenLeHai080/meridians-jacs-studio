from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BankConfigBase(BaseModel):
    bank_name: str = Field(default="MB Bank", min_length=1, max_length=100)
    bank_bin: str = Field(default="970422", min_length=1, max_length=32)
    account_number: str = Field(default="0988888888", min_length=1, max_length=64)
    account_name: str = Field(default="JACS STUDIO ADMIN", min_length=1, max_length=160)
    qr_template: str = Field(default="compact2", max_length=32)
    plans_pricing: dict[str, float] = Field(
        default_factory=lambda: {
            "1_month": 500000.0,
            "3_months": 1350000.0,
            "6_months": 2500000.0,
            "1_year": 4500000.0,
        }
    )


class BankConfigResponse(BankConfigBase):
    updated_at: datetime | None = None


class UpdateBankConfigRequest(BankConfigBase):
    pass


class BillingTransactionBase(BaseModel):
    license_id: str | None = None
    customer_name: str = Field(min_length=1, max_length=160)
    amount: float
    currency: str = Field(default="VND", max_length=16)
    plan_type: str = Field(default="1_month", max_length=64)
    payment_method: str = Field(default="bank_transfer", max_length=64)
    transaction_type: str = Field(default="income", max_length=64)  # "income", "deposit", "refund", "renewal"
    notes: str | None = Field(default=None, max_length=1000)


class CreateBillingTransactionRequest(BillingTransactionBase):
    pass


class BillingTransactionResponse(BillingTransactionBase):
    id: UUID
    actor: str
    created_at: datetime


class RenewQrRequest(BaseModel):
    license_key: str = Field(min_length=1, max_length=100)
    plan_type: str = Field(default="1_month", max_length=64)


class RenewQrResponse(BaseModel):
    license_key: str
    customer_name: str | None = None
    current_expires_at: str | None = None
    plan_type: str
    plan_name: str
    amount: float
    duration_days: int
    bank_name: str
    bank_bin: str
    account_number: str
    account_name: str
    transfer_content: str
    qr_url: str


class BillingSummaryResponse(BaseModel):
    total_revenue: float
    this_month_revenue: float
    total_deposits: float
    total_refunds: float
    net_revenue: float
    total_transactions: int
    revenue_by_plan: dict[str, float]
    revenue_by_method: dict[str, float]
