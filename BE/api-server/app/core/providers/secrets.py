from __future__ import annotations

from threading import Lock
from uuid import UUID, uuid4

from app.core.config import get_settings
from app.core.store import store


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


class PersistentSecretStore:
    """Encrypt provider keys before persisting them in the active repository."""

    def __init__(self) -> None:
        from cryptography.fernet import Fernet

        settings = get_settings()
        self._fernet = Fernet(settings.secret_key.encode()) if settings.secret_key else None

    def put(self, secret: str) -> str:
        if not self._fernet:
            raise RuntimeError("JACS_SECRET_KEY is required for persistent secrets")
        record = store.create("provider_secrets", {"ciphertext": self._fernet.encrypt(secret.encode()).decode()})
        return f"secret://{record['id']}"

    def get(self, reference: str) -> str | None:
        if not self._fernet or not reference.startswith("secret://"):
            return None
        try:
            record = store.get("provider_secrets", UUID(reference.removeprefix("secret://")))
        except ValueError:
            return None
        if not record:
            return None
        return self._fernet.decrypt(record["ciphertext"].encode()).decode()

    def delete(self, reference: str | None) -> None:
        if not reference or not reference.startswith("secret://"):
            return
        try:
            store.delete("provider_secrets", UUID(reference.removeprefix("secret://")))
        except ValueError:
            return

    def clear(self) -> None:
        for record in store.list("provider_secrets"):
            store.delete("provider_secrets", record["id"])


settings = get_settings()
secret_store = PersistentSecretStore() if settings.store_backend.lower() in {"postgres", "postgresql", "sqlite"} else InMemorySecretStore()
