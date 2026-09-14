#!/usr/bin/env python3
"""Migrate existing data from SQLite to PostgreSQL for JACS Studio."""
from __future__ import annotations

import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings
from app.core.store import SqliteStore, PostgresStore


def main() -> int:
    settings = get_settings()
    sqlite_path = Path(settings.sqlite_path)
    dsn = settings.database_url

    print("=" * 60)
    print("JACS Studio - Migrate Data: SQLite -> PostgreSQL")
    print("=" * 60)
    print(f"Source (SQLite) : {sqlite_path}")
    print(f"Target (PostgreSQL): {dsn}")

    if not sqlite_path.exists():
        print(f"[WARN] SQLite database not found at {sqlite_path}. Nothing to migrate.")
        return 0

    if not dsn:
        print("[ERROR] JACS_DATABASE_URL is not configured in .env", file=sys.stderr)
        return 1

    try:
        sqlite_store = SqliteStore(str(sqlite_path))
        pg_store = PostgresStore(
            dsn=dsn,
            min_size=settings.database_min_pool_size,
            max_size=settings.database_max_pool_size,
            timeout=settings.database_pool_timeout_seconds,
        )

        # Query all collections and records from SQLite
        import sqlite3
        with sqlite3.connect(sqlite_path) as conn:
            rows = conn.execute("SELECT collection, id, data FROM records ORDER BY created_at ASC").fetchall()

        print(f"Found {len(rows)} records in SQLite to migrate...")

        migrated = 0
        import json
        for col, rec_id, payload in rows:
            data = json.loads(payload)
            pg_store.create(col, data)
            migrated += 1

        print(f"Successfully migrated {migrated} records into PostgreSQL!")
        pg_store.close()
        return 0
    except Exception as exc:
        print(f"[ERROR] Migration failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
