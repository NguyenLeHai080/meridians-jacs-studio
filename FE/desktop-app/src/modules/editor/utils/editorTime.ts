import { isNativeRuntime } from "../../../core/runtime";

export function fileUrl(value?: string) {
  if (!value || !isNativeRuntime()) return undefined;
  return `jacs-media://local?path=${encodeURIComponent(value)}`;
}

export function toSeconds(value: string | number | undefined | null): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value) return 0;
  const str = String(value).trim().replace(/,/g, ".");
  if (/^\d+(?:\.\d+)?$/.test(str)) return Number(str);
  const parts = str.split(":").map(Number);
  if (parts.length === 3 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && Number.isFinite(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  const match = str.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

export function formatSeconds(total: number, withDecimals = false): string {
  const mins = Math.floor(total / 60);
  const remainder = Math.max(0, total % 60);
  if (withDecimals) {
    const s = remainder.toFixed(2).padStart(5, "0");
    return `${mins.toString().padStart(2, "0")}:${s}`;
  }
  const secs = Math.floor(remainder);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function formatTimecodePrecise(total: number): string {
  const mins = Math.floor(total / 60);
  const secs = Math.floor(total % 60);
  const hundredths = Math.floor((total % 1) * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`;
}

export function stripSceneMetadata(text?: string): string {
  if (!text) return "";
  let cleaned = String(text || "")
    .replace(/\[\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part|Hồi)\s*\d+[^\]]*\]/gi, "")
    .replace(/(?:^|\n)\s*(?:Phân cảnh|Cảnh|Scene|Segment|Part|Hồi)\s*\d+[:\-\.]\s*/gi, " ")
    .replace(/\[\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\]/g, "")
    .replace(/\(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*-\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\)/g, "")
    .replace(/(?:tại|ở|từ)\s+mốc\s+\d{1,2}[:.]\d{2}(?:\s*đến\s+\d{1,2}[:.]\d{2})?,?\s*/gi, "")
    .replace(/(?:vào\s+)?lúc\s+\d{1,2}[:.]\d{2},?\s*/gi, "")
    .replace(/\(\d{1,2}[:.]\d{2}\)/g, "")
    .replace(/\[[^\]]{1,60}\]/g, "")
    .replace(/#\d+\b/g, "")
    .replace(/["'“”«»‘’`\\{}[\]^~*#_<>]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/,{2,}/g, ",")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

export function estimateSpokenDuration(text?: string, speedMultiplier: number = 1.0): number {
  const clean = stripSceneMetadata(text);
  if (!clean) return 0.5;
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0.5;
  const punctuationCount = (clean.match(/[,.?!:;]/g) || []).length;
  const speed = speedMultiplier > 0 ? speedMultiplier : 1.0;
  // Calibrated Vietnamese Neural TTS cadence: ~3.8 words/sec (~0.26s/word) + ~0.12s pause per punctuation
  const estSec = (0.10 + words.length * 0.26 + punctuationCount * 0.12) / speed;
  return Math.max(0.6, estSec);
}

export function computeActiveWordIndex(
  words: string[],
  currentOffset: number,
  totalVoiceDur: number,
  leadInSeconds: number = 0.28
): number {
  if (words.length === 0 || currentOffset < 0) return -1;
  // Apply anticipation lead-in so word highlights right on syllable onset instead of 1 word late
  const effectiveOffset = currentOffset + leadInSeconds;
  if (effectiveOffset >= totalVoiceDur) return words.length;

  const weights = words.map((w) => {
    let weight = 10;
    if (w.length > 3) weight += (w.length - 3) * 1.2;
    if (/[,:;]/.test(w)) weight += 3;
    if (/[.!?]/.test(w)) weight += 4;
    return weight;
  });
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let accumulated = 0;
  for (let i = 0; i < words.length; i++) {
    const wordDur = (weights[i] / totalWeight) * totalVoiceDur;
    if (effectiveOffset < accumulated + wordDur) {
      return i;
    }
    accumulated += wordDur;
  }
  return words.length - 1;
}
