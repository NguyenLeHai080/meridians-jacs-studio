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
