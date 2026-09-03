#!/usr/bin/env python3
"""Initialize PostgreSQL Database for JACS Studio.

Creates tables, GIN indexes, updated_at triggers, and verifies connectivity.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings
from app.core.store import PostgresStore


def main() -> int:
    settings = get_settings()
    dsn = settings.database_url
    print("=" * 60)
    print("JACS Studio - PostgreSQL Database Initialization")
    print("=" * 60)
    print(f"Target DSN: {dsn}")

    try:
        store = PostgresStore(
            dsn=dsn or "",
            min_size=settings.database_min_pool_size,
            max_size=settings.database_max_pool_size,
            timeout=settings.database_pool_timeout_seconds,
        )
        print("Connected to PostgreSQL successfully.")

        # Run additional trigger setup from init_db.sql
        sql_file = Path(__file__).parent / "init_db.sql"
        if sql_file.exists():
            sql_content = sql_file.read_text(encoding="utf-8")
            with store.connection() as conn:
                conn.execute(sql_content)
            print("Loaded schema and triggers from init_db.sql successfully.")

        with store.connection() as conn:
            pg_ver = conn.execute("SELECT version()").fetchone()
            indexes = conn.execute(
                """
                SELECT indexname FROM pg_indexes
                WHERE tablename = 'jacs_records'
                """
            ).fetchall()

        print(f"PostgreSQL Version: {pg_ver[0] if pg_ver else 'Unknown'}")
        print("Active Indexes on jacs_records:")
        for idx in indexes:
            print(f"  - {idx[0]}")

        is_healthy = store.healthcheck()
        print(f"Database Health Check: {'PASSED (OK)' if is_healthy else 'FAILED'}")
        store.close()
        print("Initialization completed successfully!")
        return 0
    except Exception as exc:
        print(f"[ERROR] Failed to initialize PostgreSQL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
