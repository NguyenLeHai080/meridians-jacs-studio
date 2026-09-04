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
  { id: "1_month", name: "Gói 1 Tháng (Cơ bản)", days: 30, price: 500000, max_jobs_per_day: 100, discount_percent: 0, description: "Phù hợp cá nhân làm video ngắn", active: true },
  { id: "3_months", name: "Gói 3 Tháng (Tiết kiệm)", days: 90, price: 1350000, max_jobs_per_day: 150, discount_percent: 10, is_featured: true, description: "Tiết kiệm 10% cho creators", active: true },
  { id: "6_months", name: "Gói 6 Tháng (Bán chạy)", days: 180, price: 2500000, max_jobs_per_day: 200, discount_percent: 17, is_featured: true, description: "Ưu tiên render tốc độ cao", active: true },
  { id: "1_year", name: "Gói 1 Năm (Pro Studio)", days: 365, price: 4500000, max_jobs_per_day: 500, discount_percent: 25, description: "Dành cho Studio và Agency chuyên nghiệp", active: true },
];
