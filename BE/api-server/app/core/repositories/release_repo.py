from __future__ import annotations

from typing import Any

from app.core.repositories.base_repo import BaseRepository


class ReleaseRepository(BaseRepository):
    """Domain repository for desktop releases, installers, and OTA manifests."""

    def __init__(self) -> None:
        super().__init__(collection="releases")

    def find_by_version(self, version: str) -> dict[str, Any] | None:
        v_clean = version.strip().lstrip("v")
        for item in self.list_all():
            item_v = str(item.get("version", "")).strip().lstrip("v")
            if item_v == v_clean:
                return item
        return None

    def get_latest_release(self, platform: str | None = None) -> dict[str, Any] | None:
        all_releases = self.list_all()
        if not all_releases:
            return None
        # Sort by semver or created_at
        sorted_releases = sorted(
            all_releases,
            key=lambda x: str(x.get("created_at", "")),
            reverse=True,
        )
        if not platform:
            return sorted_releases[0]
        for r in sorted_releases:
            artifacts = r.get("artifacts", [])
            for art in artifacts:
                if isinstance(art, dict) and (not platform or art.get("platform") == platform):
                    return r
        return sorted_releases[0]


release_repo = ReleaseRepository()
