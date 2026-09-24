import React from "react";
import { Activity, CheckCircle2, Clock, Zap } from "lucide-react";
import type { SummaryData } from "../../pages/AiRequestLogsPage";

interface LogsKpiCardsProps {
  summary: SummaryData;
  loading: boolean;
}

export const LogsKpiCards: React.FC<LogsKpiCardsProps> = ({ summary, loading }) => {
  const cards = [
    {
      label: "Tổng Lượt Request",
      value: summary.total_requests.toLocaleString("vi-VN"),
      sub: `${summary.successful_requests.toLocaleString("vi-VN")} thành công, ${summary.failed_requests.toLocaleString("vi-VN")} lỗi`,
      icon: Activity,
      iconBg: "bg-blue-50 text-blue-600",
      valueColor: "text-slate-900",
    },
    {
      label: "Tỷ Lệ Thành Công",
      value: `${summary.success_rate_pct.toFixed(1)}%`,
      sub: "Đạt chuẩn SLA 99.5%",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      label: "Độ Trễ Trung Bình",
      value: `${summary.avg_latency_ms} ms`,
      sub: "Tốc độ phản hồi mạng lưới",
      icon: Clock,
      iconBg: "bg-cyan-50 text-cyan-600",
      valueColor: "text-cyan-600",
    },
    {
      label: "Tổng Tiêu Thụ Ước Tính",
      value: `${Math.round(summary.total_cost_vnd).toLocaleString("vi-VN")} ₫`,
      sub: `${summary.total_tokens.toLocaleString("vi-VN")} tokens đã xử lý`,
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
