from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class BankAccountBase(BaseModel):
    bank_name: str = Field(default="VietinBank", min_length=1, max_length=100)
    bank_bin: str = Field(default="970415", min_length=1, max_length=32)
    bank_short: str | None = Field(default=None, max_length=32)
    account_number: str = Field(default="109873538727", min_length=1, max_length=64)
    account_name: str = Field(default="NGUYEN LE HAI", min_length=1, max_length=160)
    branch: str | None = Field(default=None, max_length=160)
    purpose: str = Field(default="customer_income", max_length=64)  # customer_income, api_expense, supplier, backup, other
    qr_template: str = Field(default="compact2", max_length=32)
    custom_qr_url: str | None = Field(default=None, max_length=1000)
    is_default: bool = Field(default=False)
    is_active: bool = Field(default=True)
    notes: str | None = Field(default=None, max_length=1000)


class CreateBankAccountRequest(BankAccountBase):
    pass


class UpdateBankAccountRequest(BaseModel):
    bank_name: str | None = Field(default=None, min_length=1, max_length=100)
    bank_bin: str | None = Field(default=None, min_length=1, max_length=32)
    bank_short: str | None = Field(default=None, max_length=32)
    account_number: str | None = Field(default=None, min_length=1, max_length=64)
    account_name: str | None = Field(default=None, min_length=1, max_length=160)
    branch: str | None = Field(default=None, max_length=160)
    purpose: str | None = Field(default=None, max_length=64)
    qr_template: str | None = Field(default=None, max_length=32)
    custom_qr_url: str | None = Field(default=None, max_length=1000)
    is_default: bool | None = None
    is_active: bool | None = None
    notes: str | None = Field(default=None, max_length=1000)


class BankAccountResponse(BankAccountBase):
    id: UUID | str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BankConfigBase(BaseModel):
    bank_name: str = Field(default="MB Bank", min_length=1, max_length=100)
    bank_bin: str = Field(default="970422", min_length=1, max_length=32)
    account_number: str = Field(default="0988888888", min_length=1, max_length=64)
    account_name: str = Field(default="JACS STUDIO ADMIN", min_length=1, max_length=160)
    qr_template: str = Field(default="compact2", max_length=32)
    custom_qr_url: str | None = Field(default=None, max_length=1000)
    sepay_api_key: str | None = Field(default=None, max_length=255)
    plans_pricing: dict[str, float] = Field(
        default_factory=lambda: {
            "1_month": 500000.0,
            "3_months": 1350000.0,
            "6_months": 2500000.0,
            "1_year": 4500000.0,
            "lifetime": 10000000.0,
        }
    )


class BankConfigResponse(BankConfigBase):
    updated_at: datetime | None = None


class UpdateBankConfigRequest(BankConfigBase):
    pass


class BillingTransactionBase(BaseModel):
    license_id: UUID | str | None = None
    customer_name: str = Field(default="Khách hàng", max_length=160)
    amount: float = 0.0
    currency: str = Field(default="VND", max_length=16)
    plan_type: str = Field(default="1_month", max_length=64)
    plan_name: str | None = None
    payment_method: str = Field(default="bank_transfer", max_length=64)
    transaction_type: str = Field(default="income", max_length=64)  # "income", "deposit", "refund", "renewal", "new_key"
    reference_code: str | None = None
    notes: str | None = Field(default=None, max_length=1000)


class CreateBillingTransactionRequest(BillingTransactionBase):
    pass


class BillingTransactionResponse(BillingTransactionBase):
    id: UUID | str
    actor: str | None = "system"
    created_at: datetime | str | None = None


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


class CreditConfigBase(BaseModel):
    price_per_1m_token: float = Field(default=1000.0, ge=0)
    cost_per_1m_token: float = Field(default=800.0, ge=0)
    token_in_price: float = Field(default=700.0, ge=0)
    token_out_price: float = Field(default=900.0, ge=0)
    min_deposit_amount: float = Field(default=2000.0, ge=0)
    is_active: bool = True


class CreditConfigResponse(CreditConfigBase):
    updated_at: datetime | None = None


class UpdateCreditConfigRequest(CreditConfigBase):
    pass


class SepayTransactionResponse(BaseModel):
    id: str
    sepay_code: str
    license_id: UUID | str | None = None
    api_key_name: str = "Khách hàng"
    api_key_masked: str = "sk-******"
    deposit_amount: float = 0.0
    cost_amount: float = 0.0
    credit_amount: float = 0.0
    profit_amount: float = 0.0
    profit_percent: float = 0.0
    status: str = "COMPLETED"  # "COMPLETED", "PENDING", "REVOKED"
    payment_method: str = "sepay_vietqr"
    bank_name: str | None = "VietinBank"
    notes: str | None = None
    created_at: datetime | str | None = None
    raw_content: str | None = None


class CreditPackageBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)  # e.g. "Base", "Starter", "Growth", "Pro"
    price: float = Field(ge=0)  # e.g. 250000.0, 500000.0, 1000000.0, 3000000.0
    base_credits: float = Field(ge=0)  # e.g. 153846.0
    bonus_percent: float = Field(default=0.0, ge=0)  # e.g. 2.0, 7.0
    total_credits: float = Field(ge=0)  # e.g. 156923.0
    badge: str | None = Field(default=None, max_length=64)  # "ĐỀ XUẤT", "PHỔ BIẾN", "HOT", etc.
    description: str | None = Field(default=None, max_length=255)
    sort_order: int = Field(default=1)
    is_active: bool = Field(default=True)


class CreateCreditPackageRequest(CreditPackageBase):
    pass


class UpdateCreditPackageRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    price: float | None = Field(default=None, ge=0)
    base_credits: float | None = Field(default=None, ge=0)
    bonus_percent: float | None = Field(default=None, ge=0)
    total_credits: float | None = Field(default=None, ge=0)
    badge: str | None = Field(default=None, max_length=64)
    description: str | None = Field(default=None, max_length=255)
    sort_order: int | None = None
    is_active: bool | None = None


class CreditPackageResponse(CreditPackageBase):
    id: str
    created_at: datetime | str | None = None
    updated_at: datetime | str | None = None


class CreditTopupOrderRequest(BaseModel):
    license_key: str = Field(min_length=1, max_length=100)
    hwid: str | None = Field(default=None, max_length=120)
    package_id: str | None = Field(default="custom", max_length=64)
    package_name: str | None = Field(default="Nạp tùy ý", max_length=100)
    amount: float = Field(gt=0)
    customer_name: str | None = Field(default=None, max_length=160)
    notes: str | None = Field(default=None, max_length=500)


class CreditTopupOrderResponse(BaseModel):
    order_id: str
    license_key: str
    hwid: str | None = None
    customer_name: str | None = None
    package_id: str | None = None
    package_name: str
    amount: float
    credits_expected: float
    bonus_percent: float = 0.0
    transfer_content: str
    bank_name: str
    bank_bin: str
    account_number: str
    account_name: str
    qr_url: str
    status: str = "PENDING"  # "PENDING", "APPROVED", "REJECTED", "REVOKED"
    created_at: str | None = None


class CreditTopupTransactionItem(BaseModel):
    id: str
    order_code: str
    license_id: UUID | str | None = None
    license_key: str | None = None
    hwid: str | None = None
    customer_name: str
    package_id: str | None = None
    package_name: str
    amount: float
    credits_granted: float
    bonus_percent: float = 0.0
    transfer_content: str
    payment_method: str = "vietqr"
    status: str = "PENDING"  # "PENDING", "APPROVED", "REJECTED", "REVOKED"
    created_at: str | datetime | None = None
    approved_at: str | datetime | None = None
    approved_by: str | None = None
    notes: str | None = None


