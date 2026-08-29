from __future__ import annotations

from threading import Lock
from uuid import uuid4


class InMemorySecretStore:
    """Development vault; production must replace this with KMS/Vault."""

    def __init__(self) -> None:
        self._secrets: dict[str, str] = {}
        self._lock = Lock()

    def put(self, secret: str) -> str:
        reference = f"secret://{uuid4()}"
        with self._lock:
            self._secrets[reference] = secret
        return reference

    def get(self, reference: str) -> str | None:
        with self._lock:
            return self._secrets.get(reference)

    def delete(self, reference: str | None) -> None:
        if not reference:
            return
        with self._lock:
            self._secrets.pop(reference, None)

    def clear(self) -> None:
        with self._lock:
            self._secrets.clear()


secret_store = InMemorySecretStore()
