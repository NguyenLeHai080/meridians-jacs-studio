export function formatCurrencyVND(val: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
}

export function calculateDonutOffset(percent: number, circumference: number = 251): number {
  return Math.round(circumference * (1 - percent / 100));
}
