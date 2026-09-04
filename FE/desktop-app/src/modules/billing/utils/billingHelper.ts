export function formatCurrencyVnd(amount?: number): string {
  if (amount === undefined || amount === null) return "0 đ";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}
