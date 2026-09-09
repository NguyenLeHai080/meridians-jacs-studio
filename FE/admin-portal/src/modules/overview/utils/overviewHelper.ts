export function formatCurrencyVND(val: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
}

export function calculateDonutOffset(percent: number, circumference: number = 251): number {
  return Math.round(circumference * (1 - percent / 100));
}

export function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return "Chưa từng";
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay === 1) return "Hôm qua";
    if (diffDay < 30) return `${diffDay} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  } catch {
    return "Vừa xong";
  }
}
