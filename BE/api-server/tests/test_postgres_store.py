from __future__ import annotations

import os
from datetime import UTC, datetime
from enum import Enum
from uuid import uuid4

import pytest

from app.core.store import (
    PostgresStore,
    _json_default,
    _json_object_hook,
    _restore_nested,
)


class SampleEnum(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


def test_json_default_serialization():
    uid = uuid4()
    now = datetime.now(UTC)
    assert _json_default(uid) == {"__type__": "uuid", "value": str(uid)}
    assert _json_default(now) == {"__type__": "datetime", "value": now.isoformat()}
    assert _json_default(SampleEnum.ACTIVE) == "active"

    with pytest.raises(TypeError):
        _json_default(object())


def test_json_object_hook_and_restore():
    uid = uuid4()
    now = datetime.now(UTC)

    decoded_uuid = _json_object_hook({"__type__": "uuid", "value": str(uid)})
    assert decoded_uuid == uid

    decoded_dt = _json_object_hook({"__type__": "datetime", "value": now.isoformat()})
    assert decoded_dt == now

    nested = {
        "user_id": {"__type__": "uuid", "value": str(uid)},
        "created_at": {"__type__": "datetime", "value": now.isoformat()},
        "tags": ["a", "b"],
    }
    restored = _restore_nested(nested)
    assert restored["user_id"] == uid
    assert restored["created_at"] == now


def test_postgres_store_requires_dsn():
    with pytest.raises(RuntimeError, match="JACS_DATABASE_URL is required"):
        PostgresStore(dsn="")


def test_postgres_store_crud_lifecycle():
    dsn = os.environ.get("JACS_DATABASE_URL", "postgresql://jacs:jacs-dev-password@localhost:5432/jacs")
    try:
        store = PostgresStore(dsn=dsn, min_size=1, max_size=5)
    except Exception:  # noqa: BLE001
        pytest.skip("PostgreSQL server not available for live integration test")

    test_col = "pytest_postgres_test"
    store.clear(test_col)

    # 1. Create
    rec_id = uuid4()
    created = store.create(
        test_col,
        {
            "id": rec_id,
            "name": "Postgres Unit Test",
            "count": 42,
            "enum_val": SampleEnum.ACTIVE,
            "metadata": {"nested": True},
        },
    )
    assert created["id"] == rec_id

    # 2. Get
    fetched = store.get(test_col, rec_id)
    assert fetched is not None
    assert fetched["name"] == "Postgres Unit Test"
    assert fetched["count"] == 42
    assert fetched["metadata"]["nested"] is True

    # 3. Get by str ID
    fetched_str = store.get(test_col, str(rec_id))
    assert fetched_str is not None

    # 4. List
    items = store.list(test_col)
    assert len(items) == 1

    # 5. Count
    assert store.count(test_col) == 1

    # 6. Update
    updated = store.update(test_col, rec_id, {"count": 100, "status": "completed"})
    assert updated is not None
    assert updated["count"] == 100
    assert updated["status"] == "completed"

    # 7. Healthcheck
    assert store.healthcheck() is True

    # 8. Delete
    deleted = store.delete(test_col, rec_id)
    assert deleted is True
    assert store.get(test_col, rec_id) is None
    assert store.count(test_col) == 0

    # 9. Clear
    store.create(test_col, {"name": "item 1"})
    store.create(test_col, {"name": "item 2"})
    assert store.count(test_col) == 2
    store.clear(test_col)
    assert store.count(test_col) == 0

    store.close()
