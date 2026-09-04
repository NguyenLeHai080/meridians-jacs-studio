export function formatTimestamp(dateStr?: string): string {
  if (!dateStr) return "--:--:--";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
