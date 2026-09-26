import React from "react";
import { Activity, CheckCircle2, Clock, Zap } from "lucide-react";
import type { SummaryData } from "../../pages/AiRequestLogsPage";

interface LogsKpiCardsProps {
  summary: SummaryData;
  loading: boolean;
}

export const LogsKpiCards: React.FC<LogsKpiCardsProps> = ({ summary, loading }) => {
  const totalRequests = summary?.total_requests ?? 0;
  const successfulRequests = summary?.successful_requests ?? 0;
  const failedRequests = summary?.failed_requests ?? 0;
  const successRate = summary?.success_rate_pct ?? 100;
  const avgLatency = summary?.avg_latency_ms ?? 0;
  const totalCost = summary?.total_cost_vnd ?? 0;
  const totalTokens = summary?.total_tokens ?? 0;

  const cards = [
    {
      label: "Tổng Lượt Request",
      value: totalRequests.toLocaleString("vi-VN"),
      sub: `${successfulRequests.toLocaleString("vi-VN")} thành công, ${failedRequests.toLocaleString("vi-VN")} lỗi`,
      icon: Activity,
      iconBg: "bg-blue-50 text-blue-600",
      valueColor: "text-slate-900",
    },
    {
      label: "Tỷ Lệ Thành Công",
      value: `${successRate.toFixed(1)}%`,
      sub: "Đạt chuẩn SLA 99.5%",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      label: "Độ Trễ Trung Bình",
      value: `${avgLatency} ms`,
      sub: "Tốc độ phản hồi mạng lưới",
      icon: Clock,
      iconBg: "bg-cyan-50 text-cyan-600",
      valueColor: "text-cyan-600",
    },
    {
      label: "Tổng Tiêu Thụ Ước Tính",
      value: `${Math.round(totalCost).toLocaleString("vi-VN")} ₫`,
      sub: `${totalTokens.toLocaleString("vi-VN")} tokens đã xử lý`,
      icon: Zap,
      iconBg: "bg-amber-50 text-amber-600",
      valueColor: "text-amber-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{c.label}</span>
              <div className={`w-8 h-8 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                <Icon size={16} />
              </div>
            </div>
            <div className={`text-xl font-bold font-mono mt-1 ${c.valueColor}`}>
              {loading && summary.total_requests === 0 ? "..." : c.value}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-2">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
};
