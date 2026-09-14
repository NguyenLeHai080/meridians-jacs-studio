#!/usr/bin/env python3
"""Portable local voice worker used by JACS Studio.

The worker deliberately has no network dependency. A packaged build can ship
this script as a PyInstaller executable; development builds may invoke Python
from PATH. macOS uses `say`, Windows uses System.Speech via PowerShell.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

PACKS = [
    {"id": "vi-female", "language": "vi", "locale": "vi-VN", "gender": "female", "label": "Linh · Nữ miền Nam"},
    {"id": "vi-male", "language": "vi", "locale": "vi-VN", "gender": "male", "label": "Nam · Nam miền Bắc"},
    {"id": "en-female", "language": "en", "locale": "en-US", "gender": "female", "label": "Samantha · English nữ"},
    {"id": "en-male", "language": "en", "locale": "en-US", "gender": "male", "label": "Alex · English nam"},
    {"id": "ja-female", "language": "ja", "locale": "ja-JP", "gender": "female", "label": "Kyoko · 日本語 nữ"},
    {"id": "ja-male", "language": "ja", "locale": "ja-JP", "gender": "male", "label": "Otoya · 日本語 nam"},
    {"id": "ko-female", "language": "ko", "locale": "ko-KR", "gender": "female", "label": "Yuna · 한국어 nữ"},
    {"id": "ko-male", "language": "ko", "locale": "ko-KR", "gender": "male", "label": "Joon · 한국어 nam"},
    {"id": "zh-CN-female", "language": "zh-CN", "locale": "zh-CN", "gender": "female", "label": "Ting-Ting · 中文 nữ"},
    {"id": "zh-CN-male", "language": "zh-CN", "locale": "zh-CN", "gender": "male", "label": "Sin-ji · 中文 nam"},
    {"id": "zh-TW-female", "language": "zh-TW", "locale": "zh-TW", "gender": "female", "label": "Meijia · 繁體中文 nữ"},
    {"id": "zh-TW-male", "language": "zh-TW", "locale": "zh-TW", "gender": "male", "label": "Chinese Taiwan · 繁體中文 nam"},
    {"id": "fr-female", "language": "fr", "locale": "fr-FR", "gender": "female", "label": "Amelie · Français nữ"},
    {"id": "fr-male", "language": "fr", "locale": "fr-FR", "gender": "male", "label": "Thomas · Français nam"},
    {"id": "es-female", "language": "es", "locale": "es-ES", "gender": "female", "label": "Monica · Español nữ"},
    {"id": "es-male", "language": "es", "locale": "es-ES", "gender": "male", "label": "Jorge · Español nam"},
    {"id": "th-female", "language": "th", "locale": "th-TH", "gender": "female", "label": "Kanya · ไทย nữ"},
    {"id": "th-male", "language": "th", "locale": "th-TH", "gender": "male", "label": "Thai · ไทย nam"},
    {"id": "id-female", "language": "id", "locale": "id-ID", "gender": "female", "label": "Damayanti · Indonesia nữ"},
    {"id": "id-male", "language": "id", "locale": "id-ID", "gender": "male", "label": "Indonesian · Indonesia nam"},
    {"id": "ms-female", "language": "ms", "locale": "ms-MY", "gender": "female", "label": "Amira · Melayu nữ"},
    {"id": "ms-male", "language": "ms", "locale": "ms-MY", "gender": "male", "label": "Malay · Melayu nam"},
    {"id": "pt-BR-female", "language": "pt", "locale": "pt-BR", "gender": "female", "label": "Luciana · Português nữ"},
    {"id": "pt-BR-male", "language": "pt", "locale": "pt-BR", "gender": "male", "label": "Português · Brasil nam"},
    {"id": "de-female", "language": "de", "locale": "de-DE", "gender": "female", "label": "Anna · Deutsch nữ"},
    {"id": "de-male", "language": "de", "locale": "de-DE", "gender": "male", "label": "German · Deutsch nam"},
    {"id": "it-female", "language": "it", "locale": "it-IT", "gender": "female", "label": "Alice · Italiano nữ"},
    {"id": "it-male", "language": "it", "locale": "it-IT", "gender": "male", "label": "Italiano · Italiano nam"},
    {"id": "ru-female", "language": "ru", "locale": "ru-RU", "gender": "female", "label": "Milena · Русский nữ"},
    {"id": "ru-male", "language": "ru", "locale": "ru-RU", "gender": "male", "label": "Russian · Русский nam"},
    {"id": "tr-female", "language": "tr", "locale": "tr-TR", "gender": "female", "label": "Yelda · Türkçe nữ"},
    {"id": "tr-male", "language": "tr", "locale": "tr-TR", "gender": "male", "label": "Turkish · Türkçe nam"},
    {"id": "ar-female", "language": "ar", "locale": "ar-SA", "gender": "female", "label": "Arabic · العربية nữ"},
    {"id": "ar-male", "language": "ar", "locale": "ar-SA", "gender": "male", "label": "Arabic · العربية nam"},
    {"id": "hi-female", "language": "hi", "locale": "hi-IN", "gender": "female", "label": "Lekha · हिन्दी nữ"},
    {"id": "hi-male", "language": "hi", "locale": "hi-IN", "gender": "male", "label": "Hindi · हिन्दी nam"},
    {"id": "nl-female", "language": "nl", "locale": "nl-NL", "gender": "female", "label": "Xander · Nederlands nữ"},
    {"id": "nl-male", "language": "nl", "locale": "nl-NL", "gender": "male", "label": "Dutch · Nederlands nam"},
    {"id": "fil-female", "language": "fil", "locale": "en-PH", "gender": "female", "label": "English Philippines · Filipino nữ"},
    {"id": "fil-male", "language": "fil", "locale": "en-PH", "gender": "male", "label": "English Philippines · Filipino nam"},
]


def pack(voice: str, language: str, gender: str):
    voice = (voice or "").lower()
    requested_language = (language or "vi").lower()
    requested_base = requested_language.split("-")[0]

    def language_matches(profile_language: str) -> bool:
        profile = profile_language.lower()
        if profile == requested_language:
            return True
        # Keep regional Chinese voices distinct (zh-CN vs zh-TW).
        if requested_language.startswith("zh-") or profile.startswith("zh-"):
            return False
        return profile.split("-")[0] == requested_base

    for item in PACKS:
        if item["id"].lower() == voice and language_matches(item["language"]):
            return item
    code = requested_language
    exact = next((item for item in PACKS if item["language"].lower() == code and item["gender"] == gender), None)
    if exact:
        return exact
    base = (language or "vi").lower().split("-")[0]
    fallback = next((item for item in PACKS if item["language"].lower().split("-")[0] == base and item["gender"] == gender), None)
    if fallback:
        return fallback
    fallback = next((item for item in PACKS if item["language"].lower().split("-")[0] == base), None)
    if fallback:
        return fallback
    raise RuntimeError(f"Chưa có voice pack local cho ngôn ngữ {language or 'đã chọn'}. Hãy chọn ngôn ngữ được hỗ trợ hoặc cài voice tương ứng.")


def run(args: list[str]) -> str:
    completed = subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    return completed.stdout


def mac_voice_name(locale: str, gender: str, preferred: str) -> str:
    """Choose an installed voice with the requested locale.

    macOS does not expose a reliable gender field for `say`, so locale takes
    priority. The preferred profile name is used when it is installed.
    """
    try:
        lines = run(["/usr/bin/say", "-v", "?"]).splitlines()
    except Exception:
        lines = []
    voices = []
    for line in lines:
        match = re.match(r"^(.+?)\s{2,}([a-z]{2}_[A-Z]{2})\s+#", line)
        if match:
            voices.append((match.group(1).strip(), match.group(2)))
    wanted = locale.replace("-", "_")
    exact = [name for name, item_locale in voices if item_locale == wanted]
    if preferred and preferred in exact:
        return preferred
    if exact:
        return exact[0]
    if not wanted.startswith("zh_"):
        base = wanted.split("_", 1)[0]
        base_matches = [name for name, item_locale in voices if item_locale.split("_", 1)[0] == base]
        if base_matches:
            return base_matches[0]
    raise RuntimeError(f"Chưa cài voice locale {locale}. Hãy tải language voice trong System Settings > Accessibility > Spoken Content.")


def synthesize(text: str, voice: str, language: str, gender: str, output: Path) -> None:
    selected = pack(voice, language, gender)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="jacs-voice-") as temp:
        script = Path(temp) / "script.txt"
        script.write_text(text[:12000], encoding="utf-8")
        if sys.platform == "darwin":
            say = "/usr/bin/say"
            if not Path(say).exists():
                raise RuntimeError("macOS không có System Voice (say)")
            preferred = {"vi-female": "Linh", "en-female": "Samantha", "en-male": "Alex", "ja-female": "Kyoko", "ja-male": "Otoya", "zh-CN-female": "Ting-Ting", "zh-TW-female": "Meijia", "fr-female": "Amélie", "fr-male": "Thomas", "es-female": "Monica", "es-male": "Jorge", "th-female": "Kanya", "id-female": "Damayanti", "ms-female": "Amira", "pt-BR-female": "Luciana", "de-female": "Anna", "it-female": "Alice", "ru-female": "Milena", "tr-female": "Yelda", "hi-female": "Lekha", "nl-female": "Xander"}.get(selected["id"], "")
            voice_name = mac_voice_name(selected["locale"], selected["gender"], preferred)
            run([say, "-f", str(script), "-o", str(output), "-v", voice_name])
            return
        if os.name == "nt":
            powershell = os.environ.get("SystemRoot", r"C:\Windows") + r"\System32\WindowsPowerShell\v1.0\powershell.exe"
            ps = Path(temp) / "synthesize.ps1"
            ps.write_text("\n".join([
                "Add-Type -AssemblyName System.Speech",
                "$text = [IO.File]::ReadAllText($args[0], [Text.Encoding]::UTF8)",
                "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer",
                "$locale = $args[2]",
                "$gender = $args[3]",
                "$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like ($locale + '*') -and $_.VoiceInfo.Gender.ToString() -eq $gender } | Select-Object -First 1",
                "if (-not $voice) { $voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like ($locale + '*') } | Select-Object -First 1 }",
                "if (-not $voice) { throw \"Chưa cài voice locale $locale. Hãy cài Text-to-speech language pack cho ngôn ngữ này trong Windows Settings > Time & language > Language & region.\" }",
                "$synth.SelectVoice($voice.VoiceInfo.Name)",
                "$synth.SetOutputToWaveFile($args[1]); $synth.Speak($text); $synth.Dispose()",
            ]), encoding="utf-8")
            run([powershell, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", str(ps), str(script), str(output), selected["locale"], "Male" if selected["gender"] == "male" else "Female"])
            return
        raise RuntimeError("Local voice worker chỉ hỗ trợ macOS và Windows")


def separate_stem(input_path: Path, output_path: Path) -> Path:
    try:
        from pathlib import Path
        input_path = Path(input_path)
        output_path = Path(output_path)
        import soundfile as sf
        import numpy as np
        import scipy.signal as signal
        import scipy.ndimage as ndimage

        data, sr = sf.read(str(input_path))
        if data.ndim == 1:
            data = np.column_stack((data, data))

        left = data[:, 0].astype(np.float32)
        right = data[:, 1].astype(np.float32)

        mid = 0.5 * (left + right)
        side = 0.5 * (left - right)

        # Chunked processing for ultra-low memory & CPU footprint (prevent system freeze)
        chunk_samples = sr * 20  # 20-second chunks
        overlap_samples = sr * 1  # 1-second overlap
        step_samples = chunk_samples - overlap_samples
        total_len = len(mid)

        clean_audio = np.zeros(total_len, dtype=np.float32)
        window_acc = np.zeros(total_len, dtype=np.float32)

        n_fft = 2048
        hop_length = 512
        window = signal.windows.hann(n_fft)
        eps = 1e-7

        freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)
        vocal_siren_boost = np.ones_like(freqs)
        vocal_siren_boost[freqs < 130] = 0.0
        vocal_zone = (freqs >= 250) & (freqs <= 4200)
        vocal_siren_boost[vocal_zone] = 1.35
        vocal_siren_boost[freqs > 6500] = 0.08
        boost_2d = vocal_siren_boost[:, np.newaxis]

        chunk_ranges = list(range(0, total_len, step_samples))
        total_chunks = max(1, len(chunk_ranges))
        for chunk_idx, start_idx in enumerate(chunk_ranges):
            pct = int(min(99, ((chunk_idx + 1) / total_chunks) * 100))
            print(json.dumps({"progress": pct, "stage": f"Bóc tách âm thanh AI: {pct}% ({chunk_idx + 1}/{total_chunks})"}, ensure_ascii=False), flush=True)

            end_idx = min(total_len, start_idx + chunk_samples)
            chunk_mid = mid[start_idx:end_idx]
            chunk_side = side[start_idx:end_idx]
            chunk_left = left[start_idx:end_idx]
            chunk_right = right[start_idx:end_idx]

            if len(chunk_mid) < n_fft:
                # Direct pad for very short trailing chunk
                clean_audio[start_idx:end_idx] += chunk_mid
                window_acc[start_idx:end_idx] += 1.0
                break

            _, _, z_m = signal.stft(chunk_mid, fs=sr, window=window, nperseg=n_fft, noverlap=n_fft - hop_length)
            _, _, z_s = signal.stft(chunk_side, fs=sr, window=window, nperseg=n_fft, noverlap=n_fft - hop_length)
            _, _, z_l = signal.stft(chunk_left, fs=sr, window=window, nperseg=n_fft, noverlap=n_fft - hop_length)
            _, _, z_r = signal.stft(chunk_right, fs=sr, window=window, nperseg=n_fft, noverlap=n_fft - hop_length)

            mag_m = np.abs(z_m)
            mag_s = np.abs(z_s)
            mag_l = np.abs(z_l)
            mag_r = np.abs(z_r)

            # 1. High-Precision Center Channel Extraction
            coherence = np.abs(z_l * np.conj(z_r)) / (np.sqrt((mag_l**2 + eps) * (mag_r**2 + eps)))
            coherence = np.clip(coherence, 0.0, 1.0)
            center_mag = np.maximum(0.0, mag_m - 0.85 * mag_s)
            spatial_mask = (center_mag / (mag_m + eps)) * (coherence ** 1.5)
            spatial_mask = np.clip(spatial_mask, 0.0, 1.0)

            # 2. Spectral Flux & Transient Extraction (chunked size is small & fast)
            flux = np.zeros_like(mag_m)
            flux[:, 1:] = np.maximum(0.0, mag_m[:, 1:] - mag_m[:, :-1])
            harm_bed = ndimage.median_filter(mag_m, size=(1, min(31, mag_m.shape[1])))
            transient_sfx = np.maximum(0.0, mag_m - harm_bed)

            speech_sfx_ratio = (transient_sfx + flux * 1.5) / (harm_bed + eps)
            speech_sfx_mask = np.clip(speech_sfx_ratio / (speech_sfx_ratio + 1.0), 0.0, 1.0)

            # 4. Multi-Tier Deep Fusion Mask
            combined_mask = np.maximum(spatial_mask * 0.85, speech_sfx_mask * 0.9) * boost_2d
            combined_mask = np.clip(combined_mask, 0.0, 1.0)
            gate_threshold = 0.08
            combined_mask = np.where(combined_mask < gate_threshold, combined_mask * 0.1, combined_mask)
            combined_mask = ndimage.gaussian_filter(combined_mask, sigma=(0.4, 0.6))

            # Reconstruct clean chunk
            z_clean = z_m * combined_mask
            _, c_chunk = signal.istft(z_clean, fs=sr, window=window, nperseg=n_fft, noverlap=n_fft - hop_length)

            c_chunk = c_chunk[:len(chunk_mid)]
            # Overlap-add weighting
            w = np.hanning(len(chunk_mid))
            if start_idx == 0:
                w[:overlap_samples] = 1.0
            if end_idx == total_len:
                w[-overlap_samples:] = 1.0

            clean_audio[start_idx:end_idx] += c_chunk * w
            window_acc[start_idx:end_idx] += w

        # Normalize overlap-add
        nonzero = window_acc > 1e-4
        clean_audio[nonzero] /= window_acc[nonzero]

        # Normalize and optimize peak dynamics
        peak = np.max(np.abs(clean_audio))
        if peak > 0.01:
            clean_audio = (clean_audio / peak) * 0.96

        clean_stereo = np.column_stack((clean_audio, clean_audio))
        output_path.parent.mkdir(parents=True, exist_ok=True)
        sf.write(str(output_path), clean_stereo, sr)
        return output_path
    except Exception as exc:
        raise RuntimeError(f"Lỗi khi bóc tách sóng âm AI: {exc}")



def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["list", "synthesize", "separate-stem"])
    parser.add_argument("--language", default="")
    parser.add_argument("--voice", default="")
    parser.add_argument("--gender", default="female")
    parser.add_argument("--text", default="")
    parser.add_argument("--text-file", default="")
    parser.add_argument("--input", default="")
    parser.add_argument("--output", default="")
    args = parser.parse_args()
    if args.command == "list":
        code = args.language.lower() if args.language else ""
        exact = [item for item in PACKS if item["language"].lower() == code]
        base = code.split("-")[0]
        print(json.dumps(exact or [item for item in PACKS if not base or item["language"].lower().split("-")[0] == base], ensure_ascii=False))
        return 0
    if args.command == "separate-stem":
        if not args.input or not args.output:
            raise SystemExit("separate-stem cần --input và --output")
        separate_stem(Path(args.input), Path(args.output))
        print(json.dumps({"output": args.output, "status": "success"}, ensure_ascii=False))
        return 0
    text = args.text or (Path(args.text_file).read_text(encoding="utf-8") if args.text_file else "")
    if not text.strip() or not args.output:
        raise SystemExit("synthesize cần --text/--text-file và --output")
    synthesize(text, args.voice, args.language, args.gender, Path(args.output))
    print(json.dumps({"output": args.output}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        raise
