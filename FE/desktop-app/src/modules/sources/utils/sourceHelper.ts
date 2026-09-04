import type { Job } from "../../../core/types";

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "--";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export function extractFileName(path: string): string {
  if (!path) return "Unknown";
  const parts = path.split(/[\/\\]/);
  return parts[parts.length - 1] || path;
}
