from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.core.repositories.release_repo import release_repo


class ReleaseService:
    """Domain service for desktop app versioning, OTA manifests, and secure downloads."""

    @staticmethod
    def calculate_sha512(file_path: str | Path) -> str:
        h = hashlib.sha512()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                h.update(chunk)
        return h.hexdigest()

    @staticmethod
    def sanitize_download_path(filename: str) -> Path | None:
        """Sanitizes filename and prevents directory traversal attacks."""
        settings = get_settings()
        downloads_dir = Path(settings.downloads_dir).resolve()
        # Remove any path traversal tokens
        safe_filename = Path(filename).name
        target_path = (downloads_dir / safe_filename).resolve()

        # Ensure target_path is strictly within downloads_dir
        if not str(target_path).startswith(str(downloads_dir)):
            return None
        if not target_path.exists() or not target_path.is_file():
            return None
        return target_path

    @classmethod
    def get_latest_ota_manifest(cls, platform: str = "win32") -> dict[str, Any] | None:
        release = release_repo.get_latest_release(platform=platform)
        if not release:
            return None
        return release


release_service = ReleaseService()
