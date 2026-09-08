export interface PlanItem {
  id: string;
  name: string;
  days: number;
  price: number;
  max_jobs_per_day: number;
  discount_percent?: number;
  description?: string;
  is_featured?: boolean;
  active?: boolean;
}

export const DEFAULT_PLANS: PlanItem[] = [
  { id: "1_month", name: "Gói Tiết Kiệm (1 Tháng)", days: 30, price: 550000, max_jobs_per_day: 100, discount_percent: 27, description: "Kích hoạt 1 thiết bị, 100 video/ngày, Full HD 1080p", active: true },
  { id: "6_months", name: "Gói Cơ Bản (6 Tháng)", days: 180, price: 2650000, max_jobs_per_day: 500, discount_percent: 20, is_featured: true, description: "Kích hoạt 2 thiết bị, 500 video/ngày, 4K GPU Acceleration", active: true },
  { id: "lifetime", name: "Gói Vĩnh Viễn (Lifetime VIP)", days: 9999, price: 9650000, max_jobs_per_day: 9999, discount_percent: 0, is_featured: true, description: "Kích hoạt trọn đời, 5-10 thiết bị Studio, Batch Render & Hỗ trợ 1-1", active: true },
];
