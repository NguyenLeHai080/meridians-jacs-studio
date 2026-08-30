from __future__ import annotations

import os

os.environ.setdefault("JACS_ADMIN_PASSWORD", "test-password")
os.environ.setdefault("JACS_TELEMETRY_INGEST_TOKEN", "telemetry-test-token")

from fastapi.testclient import TestClient

from app.core.providers import connection as provider_connection
from app.core.providers.secrets import secret_store
from app.core.security import hash_password, verify_password
from app.core.store import SqliteStore, store
from app.main import app

client = TestClient(app)


def setup_function():
    store.clear()
    secret_store.clear()


def auth_headers():
    login = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "test-password"})
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def test_live_health():
    response = client.get("/health/live")
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "live"
    assert response.headers["x-request-id"]


def test_readiness_checks_the_active_store(monkeypatch):
    monkeypatch.setattr(store, "healthcheck", lambda: False)
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["data"]["dependencies"]["store"] == "error"


def test_request_id_is_preserved_on_error():
    response = client.get("/api/v1/auth/me", headers={"X-Request-Id": "uat-request-123"})
    assert response.status_code == 401
    assert response.headers["x-request-id"] == "uat-request-123"
    assert response.json()["error"]["request_id"] == "uat-request-123"


def test_password_hash_round_trip():
    encoded = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", encoded)
    assert not verify_password("wrong password", encoded)


def test_logout_revokes_token():
    headers = auth_headers()
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_auth_token_signature_cannot_be_tampered():
    headers = auth_headers()
    token = headers["Authorization"].removeprefix("Bearer ")
    header, payload, signature = token.split(".")
    tampered = f"{header}.{payload[:-1]}{'A' if payload[-1:] != 'A' else 'B'}.{signature}"
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {tampered}"}).status_code == 401


def test_malformed_auth_token_returns_401():
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer !!!not-base64!!!"})
    assert response.status_code == 401


def test_provider_secret_is_not_returned():
    headers = auth_headers()
    response = client.post(
        "/api/v1/ai-providers",
        headers=headers,
        json={
            "name": "Test OpenAI",
            "provider_type": "openai",
            "base_url": "https://api.openai.com/v1",
            "model": "test-model",
            "api_key": "secret-key-value",
            "capabilities": ["analysis"],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert "api_key" not in body
    assert body["has_api_key"] is True


def test_license_key_is_returned_once_and_stored_as_hash():
    headers = auth_headers()
    response = client.post(
        "/api/v1/licenses",
        headers=headers,
        json={"customer_name": "Demo", "customer_contact": "demo@example.com", "hwid": "demo-hwid-0002"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["key"].startswith("JACS-")
    listed = client.get("/api/v1/licenses", headers=headers).json()
    assert "key" not in listed[-1]
    assert listed[-1]["key_hint"].startswith("JACS-****-")


def test_license_validate_and_hwid_mismatch():
    headers = auth_headers()
    created = client.post("/api/v1/licenses", headers=headers, json={
        "customer_name": "Demo", "customer_contact": "demo@example.com", "hwid": "demo-hwid-validate",
    }).json()
    valid = client.post("/api/v1/licenses/validate", json={"key": created["key"], "hwid": "demo-hwid-validate"})
    assert valid.status_code == 200
    assert valid.json()["data"]["valid"] is True
    mismatch = client.post("/api/v1/licenses/validate", json={"key": created["key"], "hwid": "other-hwid-0000"})
    assert mismatch.status_code == 403
    assert mismatch.json()["error"]["code"] == "LICENSE_HWID_MISMATCH"


def test_license_heartbeat_revalidates_running_desktop_session():
    headers = auth_headers()
    created = client.post("/api/v1/licenses", headers=headers, json={
        "customer_name": "Desktop", "customer_contact": "desktop@example.com", "hwid": "desktop-hwid-01",
    }).json()
    heartbeat = client.post("/api/v1/licenses/heartbeat", json={
        "key": created["key"], "hwid": "desktop-hwid-01", "app_version": "v0.3.0", "platform": "macos",
    })
    assert heartbeat.status_code == 200
    assert heartbeat.json()["data"]["valid"] is True
    assert heartbeat.json()["data"]["platform"] == "macos"


def test_license_revoke_and_renew():
    headers = auth_headers()
    created = client.post("/api/v1/licenses", headers=headers, json={
        "customer_name": "Demo", "customer_contact": "demo@example.com", "hwid": "demo-hwid-renew",
    }).json()
    license_id = created["id"]
    blocked = client.patch(f"/api/v1/licenses/{license_id}/status", headers=headers, json={"status": "blocked"})
    assert blocked.status_code == 200
    renewed = client.post(f"/api/v1/licenses/{license_id}/renew", headers=headers, json={
        "expires_at": "2099-01-01T00:00:00Z", "reason": "Gia hạn theo hợp đồng",
    })
    assert renewed.status_code == 200
    assert renewed.json()["status"] == "active"


def test_provider_update_capabilities_and_delete():
    headers = auth_headers()
    created = client.post("/api/v1/ai-providers", headers=headers, json={
        "name": "Test Gemini", "provider_type": "gemini", "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "model": "gemini-2.0-flash", "api_key": "secret-key-value", "capabilities": ["analysis"],
    }).json()
    provider_id = created["id"]
    updated = client.patch(f"/api/v1/ai-providers/{provider_id}", headers=headers, json={"capabilities": ["analysis", "vision"], "api_key": "rotated-key-value"})
    assert updated.status_code == 200
    assert updated.json()["masked_key"].endswith("alue")
    assert client.get(f"/api/v1/ai-providers/{provider_id}/capabilities", headers=headers).json() == ["analysis", "vision"]
    assert client.delete(f"/api/v1/ai-providers/{provider_id}", headers=headers).status_code == 204


def test_job_cancel_is_idempotently_guarded():
    headers = auth_headers()
    created = client.post("/api/v1/jobs", headers=headers, json={"kind": "render", "execution_mode": "local-cpu", "project_id": "demo"})
    assert created.status_code == 202
    job_id = created.json()["id"]
    cancelled = client.post(f"/api/v1/jobs/{job_id}/cancel", headers=headers)
    assert cancelled.status_code == 200
    again = client.post(f"/api/v1/jobs/{job_id}/cancel", headers=headers)
    assert again.status_code == 409


def test_cloud_job_requires_provider_capability_and_project_can_be_created():
    headers = auth_headers()
    missing_provider = client.post("/api/v1/jobs", headers=headers, json={"kind": "analysis", "execution_mode": "cloud", "project_id": "demo"})
    assert missing_provider.status_code == 422
    project = client.post("/api/v1/projects", headers=headers, json={"name": "Demo project", "aspect_ratio": "9:16"})
    assert project.status_code == 201
    assert client.get(f"/api/v1/projects/{project.json()['id']}", headers=headers).status_code == 200


def test_desktop_job_requires_license_and_is_idempotent():
    denied = client.post("/api/v1/client/jobs", json={
        "client_job_id": "desktop-job-denied", "name": "Denied", "source_name": "clip.mp4", "execution_mode": "local-cpu",
    })
    assert denied.status_code == 401
    headers = auth_headers()
    created = client.post("/api/v1/licenses", headers=headers, json={
        "customer_name": "Desktop", "customer_contact": "desktop@example.com", "hwid": "desktop-hwid-02", "max_jobs_per_day": 1,
    }).json()
    client_headers = {"X-License-Key": created["key"], "X-Device-Id": "desktop-hwid-02"}
    payload = {"client_job_id": "desktop-job-001", "name": "Render clip", "source_name": "clip.mp4", "execution_mode": "local-gpu"}
    first = client.post("/api/v1/client/jobs", headers=client_headers, json=payload)
    assert first.status_code == 202
    second = client.post("/api/v1/client/jobs", headers=client_headers, json=payload)
    assert second.status_code == 202
    assert second.json()["id"] == first.json()["id"]
    listed = client.get("/api/v1/client/jobs", headers=client_headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_telemetry_requires_ingest_token_and_is_queryable():
    event = {"event_name": "render.crash", "severity": "fatal", "app_version": "v1.0.0", "fingerprint": "abc", "message": "GPU unavailable"}
    unauthorized = client.post("/api/v1/telemetry/logs", json=event)
    assert unauthorized.status_code == 401
    accepted = client.post("/api/v1/telemetry/logs", headers={"X-Telemetry-Token": "telemetry-test-token"}, json=event)
    assert accepted.status_code == 202
    logs = client.get("/api/v1/telemetry/logs?severity=fatal", headers=auth_headers())
    assert logs.status_code == 200
    assert logs.json()["data"][0]["fingerprint"] == "abc"


def test_telemetry_accepts_activated_desktop_headers():
    admin_headers = auth_headers()
    created = client.post("/api/v1/licenses", headers=admin_headers, json={
        "customer_name": "Telemetry", "customer_contact": "telemetry@example.com", "hwid": "telemetry-hwid-1",
    }).json()
    event = {"event_name": "desktop.warning", "severity": "warning", "app_version": "v0.3.0", "fingerprint": "desktop-1", "message": "low disk"}
    accepted = client.post("/api/v1/telemetry/logs", headers={"X-License-Key": created["key"], "X-Device-Id": "telemetry-hwid-1"}, json=event)
    assert accepted.status_code == 202


def test_provider_endpoint_rejects_private_network():
    headers = auth_headers()
    response = client.post("/api/v1/ai-providers", headers=headers, json={
        "name": "Unsafe", "provider_type": "custom", "base_url": "https://10.0.0.5/v1",
        "model": "model", "api_key": "secret-key-value",
    })
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "PROVIDER_PRIVATE_ENDPOINT"


def test_provider_connection_normalizes_success(monkeypatch):
    class Response:
        status = 200
        def __enter__(self):
            return self
        def __exit__(self, *_):
            return False
        def read(self, _limit):
            return b'{"ok": true}'

    captured = {}
    def fake_urlopen(request, timeout):
        captured["url"] = request.full_url
        captured["timeout"] = timeout
        captured["authorization"] = request.headers.get("Authorization")
        return Response()

    monkeypatch.setattr(provider_connection, "urlopen", fake_urlopen)
    result = provider_connection.test_connection("openai", "https://api.openai.com/v1", "gpt-test", "secret-key", 3)
    assert result.status == "reachable"
    assert result.http_status == 200
    assert captured["url"].endswith("/v1/chat/completions")
    assert captured["authorization"] == "Bearer secret-key"


def test_provider_connection_maps_bad_credentials(monkeypatch):
    from urllib.error import HTTPError
    monkeypatch.setattr(provider_connection, "urlopen", lambda *_args, **_kwargs: (_ for _ in ()).throw(
        HTTPError("https://api.example.com", 401, "Unauthorized", {}, None)
    ))
    result = provider_connection.test_connection("openai-compatible", "https://api.example.com/v1", "model", "secret-key", 3)
    assert result.status == "invalid_credentials"
    assert result.http_status == 401


def test_sqlite_store_persists_records(tmp_path):
    persistent = SqliteStore(str(tmp_path / "jacs.sqlite3"))
    created = persistent.create("demo", {"name": "persisted"})
    reopened = SqliteStore(str(tmp_path / "jacs.sqlite3"))
    assert reopened.get("demo", created["id"])["name"] == "persisted"


def test_release_manifest_is_admin_only():
    response = client.post("/api/v1/releases", json={
        "version": "v1.0.0",
        "platform": "windows",
        "download_url": "https://cdn.example.com/jacs-1.0.0.exe",
        "sha512": "a" * 64,
        "release_notes": "Bản phát hành đầu tiên",
    })
    assert response.status_code == 401


def test_release_requires_signature_before_publish_and_is_discoverable():
    headers = auth_headers()
    created = client.post("/api/v1/releases", headers=headers, json={
        "version": "v1.2.0", "platform": "windows", "download_url": "https://cdn.example.com/jacs-1.2.0.exe",
        "sha512": "a" * 64, "release_notes": "Bản thử nghiệm",
    }).json()
    rejected = client.post(f"/api/v1/releases/{created['id']}/publish", headers=headers)
    assert rejected.status_code == 422
    signed = client.post("/api/v1/releases", headers=headers, json={
        "version": "v1.3.0", "platform": "windows", "download_url": "https://cdn.example.com/jacs-1.3.0.exe",
        "sha512": "b" * 64, "release_notes": "Bản đã ký", "signature": "c" * 64,
    }).json()
    published = client.post(f"/api/v1/releases/{signed['id']}/publish", headers=headers)
    assert published.status_code == 200
    check = client.get("/api/v1/releases/check?platform=windows&current_version=v1.0.0")
    assert check.status_code == 200
    assert check.json()["data"]["release"]["version"] == "v1.3.0"
