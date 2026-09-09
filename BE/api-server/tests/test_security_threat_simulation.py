from __future__ import annotations

import hmac
import json
import time
from hashlib import sha256
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.security.anti_tamper import CLIENT_SIGNING_SALT, AntiTamperGuard
from app.core.store import store
from app.main import app

client = TestClient(app)
HWID_VICTIM = "JACS-WIN-11111111111111111111111111111111"
HWID_ATTACKER = "JACS-WIN-99999999999999999999999999999999"


def setup_function():
    store.clear()
    AntiTamperGuard._seen_nonces.clear()
    AntiTamperGuard._rate_limits.clear()


def create_mock_license(hwid: str = HWID_VICTIM) -> str:
    """Helper to provision an active license in the test store."""
    from app.modules.licensing.router import hash_key, make_key
    raw_key = make_key()
    store.create("licenses", {
        "customer_name": "Victim User",
        "customer_contact": "victim@example.com",
        "hwid": hwid,
        "key_hash": hash_key(raw_key),
        "key_hint": f"JACS-****-{raw_key[-4:]}",
        "status": "active",
        "max_jobs_per_day": 100,
        "credit_balance": 50.0,
    })
    return raw_key


def generate_signed_headers(hwid: str, payload_data: dict, fake_salt: bytes | None = None, timestamp_offset: int = 0) -> dict:
    """Simulates the Electron Security Shield request signing process."""
    ts = str(int(time.time()) + timestamp_offset)
    nonce = f"test-nonce-{uuid4().hex}"
    payload_str = json.dumps(payload_data, separators=(",", ":"))
    data_to_sign = f"{ts}:{nonce}:{hwid}:{payload_str}"
    
    salt = fake_salt if fake_salt is not None else CLIENT_SIGNING_SALT
    sig = hmac.new(salt, data_to_sign.encode("utf-8"), sha256).hexdigest()

    return {
        "X-Jacs-Signature": sig,
        "X-Jacs-Timestamp": ts,
        "X-Jacs-Nonce": nonce,
        "X-Jacs-Hwid": hwid,
    }


# ============================================================================
# SCENARIO 1: MITM & Tampering Attacks
# ============================================================================

def test_hacker_tampered_payload_is_blocked():
    """Hacker intercepts packet and tampers with payload data."""
    key = create_mock_license(HWID_VICTIM)
    payload = {"key": key, "hwid": HWID_VICTIM}
    headers = generate_signed_headers(HWID_VICTIM, payload)

    # Hacker tampers payload body after signature generation
    tampered_payload = {"key": key, "hwid": HWID_ATTACKER}
    response = client.post("/api/v1/licenses/validate", json=tampered_payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "SECURITY_SIGNATURE_MISMATCH"


def test_hacker_forged_signature_with_wrong_salt_is_blocked():
    """Hacker tries to sign request using their own guessed secret key/salt."""
    key = create_mock_license(HWID_VICTIM)
    payload = {"key": key, "hwid": HWID_VICTIM}
    fake_salt = b"hacker-guessed-fake-secret-key-123456"
    headers = generate_signed_headers(HWID_VICTIM, payload, fake_salt=fake_salt)

    response = client.post("/api/v1/licenses/validate", json=payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "SECURITY_SIGNATURE_MISMATCH"


# ============================================================================
# SCENARIO 2: Replay Attacks
# ============================================================================

def test_hacker_expired_timestamp_replay_is_blocked():
    """Hacker intercepts authentic request and replays it after 3 minutes."""
    key = create_mock_license(HWID_VICTIM)
    payload = {"key": key, "hwid": HWID_VICTIM}
    # 180 seconds in the past (> 120s limit)
    headers = generate_signed_headers(HWID_VICTIM, payload, timestamp_offset=-180)

    response = client.post("/api/v1/licenses/validate", json=payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "SECURITY_SIGNATURE_MISMATCH"


def test_hacker_immediate_nonce_replay_is_blocked():
    """Hacker captures valid packet and replays it immediately with identical nonce."""
    key = create_mock_license(HWID_VICTIM)
    payload = {"key": key, "hwid": HWID_VICTIM}
    headers = generate_signed_headers(HWID_VICTIM, payload)

    # First authentic request: Succeeds
    res1 = client.post("/api/v1/licenses/validate", json=payload, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["data"]["valid"] is True

    # Second replayed request with identical nonce: Blocked
    res2 = client.post("/api/v1/licenses/validate", json=payload, headers=headers)
    assert res2.status_code == 403
    assert res2.json()["error"]["code"] == "SECURITY_SIGNATURE_MISMATCH"


# ============================================================================
# SCENARIO 3: Rate Limiting & Brute-Force Key Flooding
# ============================================================================

def test_hacker_brute_force_key_flooding_is_rate_limited():
    """Hacker writes a bot to spam license validation and crack keys."""
    client_ip = "198.51.100.23"  # Simulated attacker IP
    blocked = False

    for i in range(35):
        raw_key = f"JACS-{i:04X}-0000-0000"
        payload = {"key": raw_key, "hwid": HWID_ATTACKER}
        res = client.post("/api/v1/licenses/validate", json=payload, headers={"X-Forwarded-For": client_ip})
        if res.status_code == 429:
            blocked = True
            assert res.json()["error"]["code"] == "RATE_LIMITED"
            break

    assert blocked is True, "Rate limiter should have triggered after threshold"


# ============================================================================
# SCENARIO 4: HWID Spoofing & Key Sharing Attack
# ============================================================================

def test_hacker_hwid_cloning_and_unauthorized_machine_is_blocked():
    """Hacker copies victim key and tries to use on their own machine."""
    victim_key = create_mock_license(HWID_VICTIM)
    
    # Attacker tries to validate victim's key with attacker's HWID
    attacker_payload = {"key": victim_key, "hwid": HWID_ATTACKER}
    headers = generate_signed_headers(HWID_ATTACKER, attacker_payload)

    response = client.post("/api/v1/licenses/validate", json=attacker_payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "LICENSE_HWID_MISMATCH"


# ============================================================================
# SCENARIO 5: SQL Injection & Payload Fuzzing
# ============================================================================

@pytest.mark.parametrize("malicious_key", [
    "' OR '1'='1",
    "JACS-0000-0000-0000; DROP TABLE licenses;--",
    "../../../../etc/passwd",
    "JACS-<script>alert(1)</script>",
    "{}",
])
def test_hacker_injection_in_license_key_is_sanitized_and_rejected(malicious_key: str):
    """Hacker attempts SQL/Command injection or XSS via key parameter."""
    payload = {"key": malicious_key, "hwid": HWID_VICTIM}
    response = client.post("/api/v1/licenses/validate", json=payload)
    # Rejection by either Pydantic validation (422) or Regex Key validation (401)
    assert response.status_code in (401, 422)


@pytest.mark.parametrize("malicious_hwid", [
    "WEB-DEMO-MACHINE",
    "' OR 1=1 --",
    "JACS-WIN-1234; rm -rf /",
    "INVALID-HWID-FORMAT",
])
def test_hacker_malformed_hwid_is_rejected(malicious_hwid: str):
    """Hacker tries to supply arbitrary HWID strings or bypass HWID verification."""
    key = create_mock_license(HWID_VICTIM)
    payload = {"key": key, "hwid": malicious_hwid}
    response = client.post("/api/v1/licenses/validate", json=payload)
    assert response.status_code in (401, 422)


# ============================================================================
# SCENARIO 6: Privilege Escalation & Admin Bypass Attack
# ============================================================================

def test_hacker_unauthenticated_admin_access_is_blocked():
    """Hacker tries to call admin user management / HWID reset without valid admin token."""
    res1 = client.get("/api/v1/licenses")
    assert res1.status_code == 401

    res2 = client.get("/api/v1/billing/bank-accounts")
    assert res2.status_code == 401

    res3 = client.post(f"/api/v1/licenses/{uuid4()}/reset-hwid", json={"hwid": HWID_VICTIM, "reason": "Hacker reset"})
    assert res3.status_code == 401


def test_hacker_forged_jwt_token_is_blocked():
    """Hacker crafts a fake JWT token with admin role claim and signed by fake secret."""
    import base64
    fake_header = base64.urlsafe_b64encode(b'{"alg":"HS256","typ":"JWT"}').decode().rstrip("=")
    fake_payload = base64.urlsafe_b64encode(b'{"sub":"hacker@evil.com","role":"admin","exp":9999999999}').decode().rstrip("=")
    fake_sig = "fake-signature-bytes"
    fake_jwt = f"{fake_header}.{fake_payload}.{fake_sig}"

    res = client.get("/api/v1/licenses", headers={"Authorization": f"Bearer {fake_jwt}"})
    assert res.status_code == 401
