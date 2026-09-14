#!/usr/bin/env python3
"""Seed sample licenses, sessions, and billing transactions for local demo."""
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.store import store
from app.modules.licensing.router import hash_key, make_key


def seed():
    print("[SEED] Dang khoi tao du lieu mau cho JACS Studio...")

    now = datetime.now(UTC)

    # 1. Clear existing test data
    store.clear("licenses")
    store.clear("billing_transactions")
    store.clear("audit")

    # 2. Sample Licenses & Devices
    samples = [
        {
            "customer_name": "Nguyễn Hoàng Long",
            "customer_contact": "long.nguyen@enterprise.vn",
            "hwid": "JACS-WIN-4F8A9B1C2D3E4F5A6B7C8D9E0F1A2B3C",
            "expires_at": None,  # Lifetime
            "premium_ai": True,
            "max_jobs_per_day": 500,
            "credit_balance": 250.0,
            "status": "active",
            "last_seen_at": now,
            "last_ip": "113.190.234.12",
            "last_platform": "Windows 11 Pro",
            "last_app_version": "0.8.74",
            "amount": 1500000,
            "plan_type": "lifetime",
            "notes": "Khách hàng VIP Doanh nghiệp - Bản quyền vĩnh viễn",
        },
        {
            "customer_name": "Trần Minh Tuấn - Studio Alpha",
            "customer_contact": "tuan.alpha@media.com",
            "hwid": "JACS-MAC-9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D",
            "expires_at": now + timedelta(days=320),
            "premium_ai": True,
            "max_jobs_per_day": 200,
            "credit_balance": 85.0,
            "status": "active",
            "last_seen_at": now - timedelta(minutes=4),
            "last_ip": "14.241.15.88",
            "last_platform": "macOS Sequoia",
            "last_app_version": "0.8.74",
            "amount": 650000,
            "plan_type": "1_year",
            "notes": "Studio dựng video TikTok & Shorts",
        },
        {
            "customer_name": "Vũ Thị Mai Anh - Media Lab",
            "customer_contact": "maianh.vu@creative.io",
            "hwid": "JACS-WIN-11223344556677889900AABBCCDDEEFF",
            "expires_at": now + timedelta(days=68),
            "premium_ai": True,
            "max_jobs_per_day": 100,
            "credit_balance": 45.0,
            "status": "active",
            "last_seen_at": now - timedelta(minutes=28),
            "last_ip": "27.72.61.104",
            "last_platform": "Windows 10",
            "last_app_version": "0.8.74",
            "amount": 250000,
            "plan_type": "90_days",
            "notes": "Kích hoạt gói 3 tháng",
        },
        {
            "customer_name": "Đặng Thu Trang - VTV Digital",
            "customer_contact": "trang.dang@vtv.vn",
            "hwid": "JACS-WIN-C3D4E5F6A1B27890123456789ABCDEF2",
            "expires_at": None,  # Lifetime
            "premium_ai": True,
            "max_jobs_per_day": 1000,
            "credit_balance": 500.0,
            "status": "active",
            "last_seen_at": now - timedelta(minutes=1),
            "last_ip": "118.70.198.45",
            "last_platform": "Windows 11",
            "last_app_version": "0.8.74",
            "amount": 2000000,
            "plan_type": "lifetime",
            "notes": "Bản quyền đối tác truyền thông chính thức",
        },
        {
            "customer_name": "Lê Quốc Bảo",
            "customer_contact": "bao.le@designhub.vn",
            "hwid": "JACS-WIN-A1B2C3D4E5F67890123456789ABCDEF0",
            "expires_at": now - timedelta(days=12),  # Expired
            "premium_ai": False,
            "max_jobs_per_day": 50,
            "credit_balance": 0.0,
            "status": "expired",
            "last_seen_at": now - timedelta(days=3),
            "last_ip": "42.112.89.15",
            "last_platform": "Windows 10",
            "last_app_version": "0.8.72",
            "amount": 120000,
            "plan_type": "30_days",
            "notes": "Hết hạn sử dụng gói 1 tháng - Chờ gia hạn",
        },
        {
            "customer_name": "Phạm Đức Hưng",
            "customer_contact": "hung.pham@agency.net",
            "hwid": "JACS-MAC-B2C3D4E5F6A17890123456789ABCDEF1",
            "expires_at": now + timedelta(days=15),
            "premium_ai": False,
            "max_jobs_per_day": 20,
            "credit_balance": 0.0,
            "status": "blocked",
            "last_seen_at": now - timedelta(days=7),
            "last_ip": "171.244.33.20",
            "last_platform": "macOS",
            "last_app_version": "0.8.70",
            "amount": 100000,
            "plan_type": "30_days",
            "notes": "Tạm khóa do phát hiện hành vi chia sẻ key",
        },
    ]

    created_licenses = []
    for item in samples:
        raw_key = make_key()
        created_at = now - timedelta(days=30)
        lic_rec = store.create(
            "licenses",
            {
                "customer_name": item["customer_name"],
                "customer_contact": item["customer_contact"],
                "hwid": item["hwid"],
                "key_hash": hash_key(raw_key),
                "key_hint": f"JACS-****-{raw_key[-4:]}",
                "status": item["status"],
                "expires_at": item["expires_at"],
                "max_jobs_per_day": item["max_jobs_per_day"],
                "premium_ai": item["premium_ai"],
                "credit_balance": item["credit_balance"],
                "last_seen_at": item["last_seen_at"],
                "last_ip": item["last_ip"],
                "last_platform": item["last_platform"],
                "last_app_version": item["last_app_version"],
                "notes": item["notes"],
                "created_at": created_at,
                "terms_accepted": True,
                "terms_accepted_at": created_at,
                "terms_version": "JACS-LEGAL-2026-v2.4",
            },
        )
        created_licenses.append({**lic_rec, "raw_key": raw_key, "amount": item["amount"], "plan_type": item["plan_type"]})

    # 3. Sample Billing / SePay Transactions across 7 days
    tx_samples = [
        {"customer": "Đặng Thu Trang - VTV Digital", "amount": 2000000, "code": "SEVQR99214", "method": "bank_transfer", "days_ago": 0, "type": "new_key"},
        {"customer": "Nguyễn Hoàng Long", "amount": 1500000, "code": "SEVQR88145", "method": "bank_transfer", "days_ago": 1, "type": "new_key"},
        {"customer": "Trần Minh Tuấn - Studio Alpha", "amount": 650000, "code": "SEVQR77210", "method": "bank_transfer", "days_ago": 2, "type": "new_key"},
        {"customer": "Nguyễn Hoàng Long", "amount": 500000, "code": "SEVQR66190", "method": "bank_transfer", "days_ago": 3, "type": "credit_grant"},
        {"customer": "Vũ Thị Mai Anh - Media Lab", "amount": 250000, "code": "SEVQR55082", "method": "bank_transfer", "days_ago": 4, "type": "new_key"},
        {"customer": "Lê Quốc Bảo", "amount": 120000, "code": "SEVQR44012", "method": "bank_transfer", "days_ago": 5, "type": "new_key"},
        {"customer": "Trần Minh Tuấn - Studio Alpha", "amount": 300000, "code": "SEVQR33099", "method": "bank_transfer", "days_ago": 6, "type": "credit_grant"},
    ]

    for tx in tx_samples:
        tx_time = now - timedelta(days=tx["days_ago"], hours=2)
        store.create(
            "billing_transactions",
            {
                "customer_name": tx["customer"],
                "amount": tx["amount"],
                "plan_type": tx["type"],
                "payment_method": tx["method"],
                "transaction_type": tx["type"],
                "reference_code": tx["code"],
                "sepay_code": tx["code"],
                "actor": "admin@example.com",
                "notes": f"Giao dịch SePay {tx['code']} ({tx['amount']:,}đ)",
                "created_at": tx_time,
            },
        )

    print(f"[SUCCESS] Da tao thanh cong {len(created_licenses)} nguoi dung mau & {len(tx_samples)} giao dich mau!")


if __name__ == "__main__":
    seed()
