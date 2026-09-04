export const HWID_PATTERN = /JACS-(?:MAC|WIN|LNX)-[A-F0-9]{32}/;

export function normalizeHwid(value: string): string {
  const normalized = value.replace(/[\s\u200b-\u200d\ufeff]+/g, "").toUpperCase();
  if (/^JACS-(MAC|WIN|LNX)-[A-F0-9]{32}$/.test(normalized)) return normalized;
  const matches = normalized.match(new RegExp(HWID_PATTERN.source, "g")) || [];
  return matches.length === 1 ? matches[0] : normalized;
}

export function licenseHwidError(value: string): string {
  if (value === "WEB-DEMO-MACHINE") return "Không thể cấp license cho mã demo. Hãy mở bản Desktop Electron để lấy mã máy thật.";
  if (!/^JACS-(MAC|WIN|LNX)-[A-F0-9]{32}$/.test(value)) return "Mã máy phải có dạng JACS-MAC/WIN/LNX-32 ký tự hex. Hãy copy nguyên Device ID từ tool.";
  return "";
}
