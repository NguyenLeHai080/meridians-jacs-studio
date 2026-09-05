from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Header, status
from pydantic import BaseModel, Field

from app.core.errors import AppError
from app.core.store import store
from app.modules.client.schemas import DesktopJobCreate, DesktopJobResponse
from app.modules.licensing.router import _active_license

router = APIRouter(prefix="/api/v1/client", tags=["desktop-client"])


class DesktopJobUpdate(BaseModel):
    status: str | None = Field(default=None, pattern=r"^(queued|running|completed|failed|cancelled)$")
    progress: int | None = Field(default=None, ge=0, le=100)
    stage: str | None = Field(default=None, max_length=40)
    error: str | None = Field(default=None, max_length=1000)
    output_path: str | None = Field(default=None, max_length=1000)
    parent_job_id: str | None = Field(default=None, min_length=1, max_length=128)
    scene_id: str | None = Field(default=None, min_length=1, max_length=128)
    split_scenes: bool | None = None
    analysis_only: bool | None = None
    clip_start_seconds: float | None = Field(default=None, ge=0)
    clip_end_seconds: float | None = Field(default=None, ge=0)
    output_file_name: str | None = Field(default=None, max_length=180)
    timeline_clips: list[dict] | None = Field(default=None, max_length=500)
    tokens_used: int | None = Field(default=None, ge=0)
    credits_used: int | None = Field(default=None, ge=0)
    subtitles_enabled: bool | None = None
    subtitle_style: str | None = Field(default=None, pattern=r"^(bottom|center|top)$")
    subtitle_text: str | None = Field(default=None, max_length=12000)
    logo_position: str | None = Field(default=None, pattern=r"^(top-left|top-right|bottom-left|bottom-right)$")
    logo_opacity: float | None = Field(default=None, ge=0.1, le=1)


def _license_from_headers(
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
) -> dict:
    if not license_key or not device_id:
        raise AppError("CLIENT_LICENSE_REQUIRED", "Tool phải được kích hoạt trước khi dùng dịch vụ", 401)
    return _active_license(license_key, device_id)


@router.post("/jobs", response_model=DesktopJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_desktop_job(
    payload: DesktopJobCreate,
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    license_record = _license_from_headers(license_key, device_id)
    # Client retries are safe: return the original accepted job for the same id.
    existing = next(
        (
            item
            for item in store.list("jobs")
            if item.get("license_id") == license_record["id"] and item.get("client_job_id") == payload.client_job_id
        ),
        None,
    )
    if existing:
        return existing

    today = datetime.now(UTC).date()
    jobs_today = sum(
        1
        for item in store.list("jobs")
        if item.get("license_id") == license_record["id"]
        and isinstance(item.get("created_at"), datetime)
        and item["created_at"].astimezone(UTC).date() == today
    )
    if jobs_today >= license_record["max_jobs_per_day"]:
        raise AppError("LICENSE_DAILY_QUOTA_EXCEEDED", "Đã đạt giới hạn job trong ngày của license", 429)

    # The desktop sends an opaque local provider id. Secrets and capability
    # checks are handled in the Electron main process; the API stores only a
    # non-sensitive job snapshot and must not require an Admin-managed UUID.
    return store.create(
        "jobs",
        {
            **payload.model_dump(),
            "license_id": license_record["id"],
            "status": "queued",
            "progress": 0,
            "engine": payload.execution_mode.value,
            "created_at": datetime.now(UTC),
        },
    )


@router.get("/jobs", response_model=list[DesktopJobResponse])
async def list_desktop_jobs(
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    license_record = _license_from_headers(license_key, device_id)
    return [item for item in store.list("jobs") if item.get("license_id") == license_record["id"]]


@router.patch("/jobs/{client_job_id}", response_model=DesktopJobResponse)
async def update_desktop_job(
    client_job_id: str,
    payload: DesktopJobUpdate,
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    license_record = _license_from_headers(license_key, device_id)
    job = next((item for item in store.list("jobs") if item.get("license_id") == license_record["id"] and item.get("client_job_id") == client_job_id), None)
    if not job:
        raise AppError("CLIENT_JOB_NOT_FOUND", "Không tìm thấy job của thiết bị", 404)
    values = payload.model_dump(exclude_none=True)
    updated = store.update("jobs", job["id"], values)
    return updated or job


@router.delete("/jobs/{client_job_id}")
async def delete_desktop_job(
    client_job_id: str,
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    """Remove one desktop job owned by the activated license.

    The desktop queue is local-first, but deleting the remote snapshot as well
    prevents a removed job from reappearing during the next synchronization.
    """
    license_record = _license_from_headers(license_key, device_id)
    job = next((item for item in store.list("jobs") if item.get("license_id") == license_record["id"] and item.get("client_job_id") == client_job_id), None)
    if not job:
        raise AppError("CLIENT_JOB_NOT_FOUND", "Không tìm thấy job của thiết bị", 404)
    store.delete("jobs", job["id"])
    return {"data": {"success": True, "message": "Đã xóa job thành công"}}


@router.get("/metrics")
async def desktop_metrics(
    license_key: str | None = Header(default=None, alias="X-License-Key"),
    device_id: str | None = Header(default=None, alias="X-Device-Id"),
):
    license_record = _license_from_headers(license_key, device_id)
    jobs = [item for item in store.list("jobs") if item.get("license_id") == license_record["id"]]
    return {
        "total_jobs": len(jobs),
        "failed_jobs": sum(1 for item in jobs if item.get("status") == "failed"),
        "completed_jobs": sum(1 for item in jobs if item.get("status") == "completed"),
        "tokens_used": sum(int(item.get("tokens_used") or 0) for item in jobs),
        "credits_used": sum(int(item.get("credits_used") or 0) for item in jobs),
    }


class SpeechSynthesisPayload(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice: str | None = Field(default="vi-VN-NamMinhNeural", max_length=100)
    language: str | None = Field(default="vi", max_length=20)
    gender: str | None = Field(default="male", max_length=20)
    api_key: str | None = Field(default=None, max_length=200)
    provider: str | None = Field(default=None, max_length=50)


@router.post("/synthesize-speech")
async def client_synthesize_speech(payload: SpeechSynthesisPayload):
    import asyncio
    import hashlib
    import json
    import logging
    import os
    import pathlib
    import urllib.error
    import urllib.request

    import edge_tts
    from fastapi import Response

    logger = logging.getLogger(__name__)

    clean_text = str(payload.text or "").strip()
    voice_key = str(payload.voice or "").strip().lower()
    provider_key = str(payload.provider or "").strip().lower()
    api_key = payload.api_key or os.getenv("ELEVENLABS_API_KEY") or ""

    cache_dir = pathlib.Path("/tmp/tts_cache")
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_key = hashlib.sha256(f"{voice_key}:{clean_text}:{api_key[:8]}".encode()).hexdigest()
    cache_file = cache_dir / f"{cache_key}.mp3"

    if cache_file.exists() and cache_file.stat().st_size > 100:
        cached_data = await asyncio.to_thread(cache_file.read_bytes)
        return Response(content=cached_data, media_type="audio/mpeg", headers={"Content-Type": "audio/mpeg", "Content-Length": str(len(cached_data)), "X-Cache": "HIT"})

    # 1. ELEVENLABS AI VOICE (Top 1 World for Human Rhythm, Emotion, Breath Pauses)
    eleven_map = {
        "eleven-adam": "pNInz6obpgDQGcFmaJgB",
        "eleven-charlie": "IKne3meq5aSn9XLyUdCD",
        "eleven-george": "JBFqnCBsd6RMkjVDRZzb",
        "eleven-rachel": "21m00Tcm4TlvDq8ikWAM",
        "eleven-brian": "nPczCjzI2devNBz1zQrb",
        "eleven-sarah": "EXAVITQu4vr4xnSDxMaL",
    }
    is_eleven = voice_key.startswith("eleven-") or provider_key == "elevenlabs" or voice_key in eleven_map
    if is_eleven and api_key:
        voice_id = eleven_map.get(voice_key, voice_key.replace("eleven-", ""))
        try:
            req_data = json.dumps({
                "text": clean_text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {
                    "stability": 0.40,
                    "similarity_boost": 0.85,
                    "style": 0.50,
                    "use_speaker_boost": True,
                },
            }).encode("utf-8")
            req = urllib.request.Request(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                data=req_data,
                headers={
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg",
                    "User-Agent": "JACS-Studio/1.0",
                },
            )

            def _fetch_elevenlabs():
                with urllib.request.urlopen(req, timeout=25) as response:
                    return response.read()

            content = await asyncio.to_thread(_fetch_elevenlabs)
            if len(content) > 200:
                await asyncio.to_thread(cache_file.write_bytes, content)
                return Response(content=content, media_type="audio/mpeg", headers={"Content-Type": "audio/mpeg", "Content-Length": str(len(content)), "X-Cache": "MISS", "X-Engine": "ElevenLabs"})
        except (urllib.error.URLError, TimeoutError, OSError) as err:
            logger.warning("ElevenLabs Error: %s", err)

    # 2. MICROSOFT NEURAL PROSODY ENGINE (High-Speed Authentic Prosody Profiles)
    voice_profiles = {
        "vi-adam-review": {"voice": "vi-VN-NamMinhNeural", "rate": "+12%", "pitch": "-2Hz"},
        "vi-namminh": {"voice": "vi-VN-NamMinhNeural", "rate": "+10%", "pitch": "-2Hz"},
        "vi-mystery-deep": {"voice": "vi-VN-NamMinhNeural", "rate": "+0%", "pitch": "-6Hz"},
        "vi-hoaimy-review": {"voice": "vi-VN-HoaiMyNeural", "rate": "+14%", "pitch": "+1Hz"},
        "vi-hoaimy": {"voice": "vi-VN-HoaiMyNeural", "rate": "+4%", "pitch": "+0Hz"},
        "vi-baolong": {"voice": "vi-VN-NamMinhNeural", "rate": "+6%", "pitch": "+2Hz"},
        "vi-thihuong": {"voice": "vi-VN-HoaiMyNeural", "rate": "-2%", "pitch": "-2Hz"},
        "vbee-manhdung": {"voice": "vi-VN-NamMinhNeural", "rate": "+12%", "pitch": "-2Hz"},
        "vbee-minhhoang": {"voice": "vi-VN-NamMinhNeural", "rate": "+6%", "pitch": "+2Hz"},
        "vbee-maiphuong": {"voice": "vi-VN-HoaiMyNeural", "rate": "+14%", "pitch": "+1Hz"},
        "vbee-ngochoang": {"voice": "vi-VN-HoaiMyNeural", "rate": "-2%", "pitch": "-2Hz"},
        "eleven-adam": {"voice": "vi-VN-NamMinhNeural", "rate": "+12%", "pitch": "-2Hz"},
        "eleven-charlie": {"voice": "vi-VN-NamMinhNeural", "rate": "+0%", "pitch": "-6Hz"},
        "eleven-george": {"voice": "vi-VN-NamMinhNeural", "rate": "+8%", "pitch": "-3Hz"},
        "eleven-rachel": {"voice": "vi-VN-HoaiMyNeural", "rate": "+10%", "pitch": "+1Hz"},
        "vi-male": {"voice": "vi-VN-NamMinhNeural", "rate": "+10%", "pitch": "-2Hz"},
        "vi-female": {"voice": "vi-VN-HoaiMyNeural", "rate": "+5%", "pitch": "+0Hz"},
        "en-adam": {"voice": "en-US-GuyNeural", "rate": "+0%", "pitch": "-4Hz"},
        "en-guy": {"voice": "en-US-GuyNeural", "rate": "+0%", "pitch": "-4Hz"},
        "en-brian": {"voice": "en-US-BrianNeural", "rate": "+0%", "pitch": "+0Hz"},
        "en-jenny": {"voice": "en-US-JennyNeural", "rate": "+0%", "pitch": "+0Hz"},
        "en-aria": {"voice": "en-US-AriaNeural", "rate": "+5%", "pitch": "+1Hz"},
        "en-male": {"voice": "en-US-GuyNeural", "rate": "+0%", "pitch": "-4Hz"},
        "en-female": {"voice": "en-US-JennyNeural", "rate": "+0%", "pitch": "+0Hz"},
        "ja-male": {"voice": "ja-JP-KeitaNeural", "rate": "+0%", "pitch": "+0Hz"},
        "ja-female": {"voice": "ja-JP-NanamiNeural", "rate": "+0%", "pitch": "+0Hz"},
        "ko-male": {"voice": "ko-KR-InJoonNeural", "rate": "+0%", "pitch": "+0Hz"},
        "ko-female": {"voice": "ko-KR-SunHiNeural", "rate": "+0%", "pitch": "+0Hz"},
        "zh-cn-male": {"voice": "zh-CN-YunxiNeural", "rate": "+0%", "pitch": "+0Hz"},
        "zh-cn-female": {"voice": "zh-CN-XiaoxiaoNeural", "rate": "+0%", "pitch": "+0Hz"},
        "fr-male": {"voice": "fr-FR-HenriNeural", "rate": "+0%", "pitch": "+0Hz"},
        "fr-female": {"voice": "fr-FR-DeniseNeural", "rate": "+0%", "pitch": "+0Hz"},
        "es-male": {"voice": "es-ES-AlvaroNeural", "rate": "+0%", "pitch": "+0Hz"},
        "es-female": {"voice": "es-ES-ElviraNeural", "rate": "+0%", "pitch": "+0Hz"},
    }

    profile = voice_profiles.get(voice_key)
    if profile:
        voice_name = profile["voice"]
        rate = profile["rate"]
        pitch = profile["pitch"]
    else:
        voice_name = payload.voice if (payload.voice and ("-" in payload.voice or "neural" in payload.voice.lower())) else ("vi-VN-NamMinhNeural" if payload.gender == "male" else "vi-VN-HoaiMyNeural")
        rate = "+0%"
        pitch = "+0Hz"

    try:
        communicate = edge_tts.Communicate(clean_text, voice_name, rate=rate, pitch=pitch)
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk.get("type") == "audio" and "data" in chunk:
                audio_chunks.append(chunk["data"])

        if audio_chunks:
            audio_data = b"".join(audio_chunks)
            if len(audio_data) > 100:
                try:
                    await asyncio.to_thread(cache_file.write_bytes, audio_data)
                except OSError as write_err:
                    logger.debug("Failed to write TTS cache: %s", write_err)
                return Response(content=audio_data, media_type="audio/mpeg", headers={"Content-Type": "audio/mpeg", "Content-Length": str(len(audio_data)), "X-Cache": "MISS", "X-Engine": "NeuralProsody"})
    except (OSError, RuntimeError, ValueError) as e:
        logger.warning("TTS Stream Error: %s", e)

    return Response(content=b"", media_type="audio/mpeg", status_code=500)


@router.get("/config")
async def get_client_public_config():
    stored = store.get("system_settings", "main") or {}
    return {
        "data": {
            "studio_brand_name": stored.get("studio_brand_name", "JACS Studio"),
            "tool_slogan": stored.get("tool_slogan", "Judicious AI Content Scanner & Video Synthesis Engine"),
            "custom_logo_url": stored.get("custom_logo_url", ""),
            "support_contact": stored.get("support_contact", "https://t.me/jacs_support"),
            "menu_locks": stored.get("menu_locks", {}),
        }
    }
