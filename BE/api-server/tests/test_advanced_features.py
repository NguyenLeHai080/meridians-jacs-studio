from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.store import store
from app.main import app


@pytest.fixture
def client():
    store.clear()
    return TestClient(app)


def test_crud_license_and_billing_integration(client: TestClient):
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "change-me"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create license with amount and logo_url
    create_res = client.post(
        "/api/v1/licenses",
        headers=headers,
        json={
            "customer_name": "Studio A",
            "customer_contact": "contact@studioa.vn",
            "hwid": "JACS-WIN-11223344556677889900AABBCCDDEEFF",
            "amount": 500000.0,
            "plan_type": "1_month",
            "payment_method": "bank_transfer",
            "logo_url": "https://example.com/logo-studio-a.png",
            "notes": "VIP Client",
        },
    )
    assert create_res.status_code == 201
    created_data = create_res.json()
    license_id = created_data["id"]
    license_key = created_data["key"]
    assert created_data["logo_url"] == "https://example.com/logo-studio-a.png"

    # 3. Check billing transactions auto-created
    bill_res = client.get("/api/v1/billing/transactions", headers=headers)
    assert bill_res.status_code == 200
    txs = bill_res.json()
    assert len(txs) == 1
    assert txs[0]["amount"] == 500000.0
    assert txs[0]["customer_name"] == "Studio A"

    # 4. Check billing summary
    sum_res = client.get("/api/v1/billing/summary", headers=headers)
    assert sum_res.status_code == 200
    assert sum_res.json()["total_revenue"] == 500000.0

    # 5. Client validates license -> receives logo_url
    val_res = client.post(
        "/api/v1/licenses/validate",
        json={"key": license_key, "hwid": "JACS-WIN-11223344556677889900AABBCCDDEEFF"},
    )
    assert val_res.status_code == 200
    assert val_res.json()["data"]["logo_url"] == "https://example.com/logo-studio-a.png"
    assert val_res.json()["data"]["customer_name"] == "Studio A"

    # 6. Client heartbeats
    hb_res = client.post(
        "/api/v1/licenses/heartbeat",
        json={
            "key": license_key,
            "hwid": "JACS-WIN-11223344556677889900AABBCCDDEEFF",
            "app_version": "0.3.18",
            "platform": "windows",
        },
    )
    assert hb_res.status_code == 200

    # 7. Check active sessions
    sess_res = client.get("/api/v1/clients/sessions", headers=headers)
    assert sess_res.status_code == 200
    sessions = sess_res.json()
    assert len(sessions) == 1
    assert sessions[0]["is_online"] is True
    assert sessions[0]["last_app_version"] == "0.3.18"

    # 8. Update license details
    up_res = client.patch(
        f"/api/v1/licenses/{license_id}",
        headers=headers,
        json={"customer_name": "Studio A Pro", "max_jobs_per_day": 250},
    )
    assert up_res.status_code == 200
    assert up_res.json()["customer_name"] == "Studio A Pro"
    assert up_res.json()["max_jobs_per_day"] == 250

    # 9. Renew license with amount
    renew_res = client.post(
        f"/api/v1/licenses/{license_id}/renew",
        headers=headers,
        json={
            "expires_at": "2030-01-01T00:00:00Z",
            "reason": "Gia hạn thêm 1 năm",
            "amount": 4000000.0,
            "plan_type": "1_year",
            "payment_method": "bank_transfer",
        },
    )
    assert renew_res.status_code == 200
    # Check updated total billing
    sum_res2 = client.get("/api/v1/billing/summary", headers=headers)
    assert sum_res2.json()["total_revenue"] == 4500000.0

    # 10. Terminate session
    term_res = client.delete(f"/api/v1/clients/sessions/{license_id}", headers=headers)
    assert term_res.status_code == 200

    # 11. Delete license
    del_res = client.delete(f"/api/v1/licenses/{license_id}", headers=headers)
    assert del_res.status_code == 200
    assert len(client.get("/api/v1/licenses", headers=headers).json()) == 0
