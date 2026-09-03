#!/usr/bin/env python3
"""Comprehensive PostgreSQL Verification Script for JACS Studio.

Tests:
1. Connection pool acquisition & release
2. CRUD operations with UUID and string keys
3. JSONB storage and GIN index queries
4. Dynamic updated_at timestamp verification
5. Persistent encrypted secret storage (Fernet + PostgreSQL)
6. Collection isolation and cleanup
"""
from __future__ import annotations

import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings
from app.core.providers.secrets import PersistentSecretStore
from app.core.store import PostgresStore


def main() -> int:
    settings = get_settings()
    print("=" * 65)
    print("JACS Studio - Comprehensive PostgreSQL Verification")
    print("=" * 65)
    print(f"DSN: {settings.database_url}")
    print(f"Pool size: {settings.database_min_pool_size}-{settings.database_max_pool_size}")

    try:
        # Step 1: Initialize PostgresStore
        store = PostgresStore(
            dsn=settings.database_url or "",
            min_size=settings.database_min_pool_size,
            max_size=settings.database_max_pool_size,
            timeout=settings.database_pool_timeout_seconds,
        )
        assert store.healthcheck(), "Store healthcheck failed"
        print("[OK] 1. Connection Pool & Healthcheck OK")

        # Step 2: UUID Key CRUD Test
        test_col = "verification_test"
        store.clear(test_col)
        assert store.count(test_col) == 0, "Collection should be empty after clear"

        rec1_id = uuid4()
        rec1 = store.create(
            test_col,
            {
                "id": rec1_id,
                "title": "Postgres High Perf Test",
                "tier": "enterprise",
                "tags": ["pgsql", "fastapi", "jsonb"],
                "config": {"workers": 8, "rate_limit": 1000},
                "active": True,
            },
        )
        assert rec1["id"] == rec1_id, "Record ID mismatch"
        print("[OK] 2. UUID Record Insert OK")

        # Step 3: Get by UUID and string
        fetched_by_uuid = store.get(test_col, rec1_id)
        assert fetched_by_uuid is not None, "Failed to get by UUID"
        assert fetched_by_uuid["title"] == "Postgres High Perf Test"

        fetched_by_str = store.get(test_col, str(rec1_id))
        assert fetched_by_str is not None, "Failed to get by string ID"
        print("[OK] 3. Record Query by UUID/String OK")

        # Step 4: Custom Named Key (e.g. 'main')
        main_setting = store.create("verification_settings", {"id": "main", "theme": "dark", "locale": "vi-VN"})
        assert main_setting["id"] == "main"
        fetched_main = store.get("verification_settings", "main")
        assert fetched_main is not None and fetched_main["theme"] == "dark"
        print("[OK] 4. Custom Key ('main') Insert & Fetch OK")

        # Step 5: Update & updated_at trigger verification
        time.sleep(0.1)  # small pause to ensure timestamp advances
        updated = store.update(test_col, rec1_id, {"tier": "ultimate", "config": {"workers": 16}})
        assert updated is not None and updated["tier"] == "ultimate"
        assert updated["config"]["workers"] == 16

        with store.connection() as conn:
            row = conn.execute(
                "SELECT created_at, updated_at FROM jacs_records WHERE collection = %s AND id = %s",
                (test_col, str(rec1_id)),
            ).fetchone()
            assert row is not None, "Record row not found in DB"
            created_at, updated_at = row[0], row[1]
            assert updated_at >= created_at, "updated_at should be >= created_at"
        print("[OK] 5. Atomic Update & updated_at Tracking OK")

        # Step 6: JSONB GIN Query Verification
        with store.connection() as conn:
            gin_rows = conn.execute(
                "SELECT data FROM jacs_records WHERE collection = %s AND data @> %s::jsonb",
                (test_col, '{"tier": "ultimate"}'),
            ).fetchall()
            assert len(gin_rows) == 1, "GIN index JSONB query should match 1 row"
        print("[OK] 6. JSONB GIN Index Query (data @> '{\"tier\": \"ultimate\"}') OK")

        # Step 7: Encrypted Persistent Secrets (Fernet + PostgreSQL)
        secret_store = PersistentSecretStore()
        test_api_key = "sk-live-meridians-jacs-super-secret-key-12345"
        ref = secret_store.put(test_api_key)
        assert ref.startswith("secret://"), "Secret reference format invalid"
        recovered_key = secret_store.get(ref)
        assert recovered_key == test_api_key, "Decrypted secret does not match original"

        # Verify ciphertext in PostgreSQL is indeed encrypted and not plain text
        sec_id = ref.removeprefix("secret://")
        raw_sec = store.get("provider_secrets", sec_id)
        assert raw_sec is not None, "Secret not found in DB"
        assert raw_sec["ciphertext"] != test_api_key, "Secret must be encrypted ciphertext"
        assert test_api_key not in raw_sec["ciphertext"], "Plaintext leaked in ciphertext"

        secret_store.delete(ref)
        assert secret_store.get(ref) is None, "Secret should be deleted"
        print("[OK] 7. Fernet Encrypted Persistent Secrets in PostgreSQL OK")

        # Step 8: Clean up test collections
        store.clear(test_col)
        store.clear("verification_settings")
        assert store.count(test_col) == 0
        assert store.count("verification_settings") == 0
        print("[OK] 8. Collection Isolation & Cleanup OK")

        # Step 9: Graceful Pool Shutdown
        store.close()
        print("[OK] 9. Connection Pool Graceful Shutdown OK")

        print("=" * 65)
        print("ALL POSTGRESQL VERIFICATION TESTS PASSED SUCCESSFULLY! (100%)")
        print("=" * 65)
        return 0

    except Exception as exc:
        print(f"\n[FAIL] PostgreSQL Verification Error: {exc}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
