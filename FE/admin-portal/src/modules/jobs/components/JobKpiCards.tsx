import React from "react";
import { Layers, Play, CheckCircle2, XCircle } from "lucide-react";
import type { JobMetrics } from "../types";

interface JobKpiCardsProps {
  metrics: JobMetrics;
  loading: boolean;
  isEmpty?: boolean;
}

export const JobKpiCards: React.FC<JobKpiCardsProps> = ({ metrics, loading, isEmpty = false }) => {
  if (loading && isEmpty) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-7 w-20 bg-slate-200 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Tổng Lượt Tác Vụ",
      value: `${metrics.total} Jobs`,
      sub: "Toàn bộ tác vụ đã ghi nhận",
      icon: Layers,
      iconBg: "bg-blue-50 text-blue-600",
      valueColor: "text-slate-900",
    },
    {
      title: "Đang Xử Lý / Queued",
      value: `${metrics.running} Jobs`,
      sub: "Đang render & xử lý ngầm",
      icon: Play,
      iconBg: "bg-amber-50 text-amber-600",
      valueColor: "text-amber-600",
      isPulsing: metrics.running > 0,
    },
    {
      title: "Hoàn Thành",
      value: `${metrics.completed} Jobs`,
      sub: `${metrics.total > 0 ? ((metrics.completed / metrics.total) * 100).toFixed(0) : 100}% thành công`,
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      title: "Thất Bại / Đã Hủy",
      value: `${metrics.failed} Jobs`,
      sub: metrics.failed > 0 ? "Cần kiểm tra log lỗi" : "Hoạt động ổn định",
      icon: XCircle,
      iconBg: "bg-rose-50 text-rose-600",
      valueColor: "text-rose-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {c.title}
              </span>
              <div className={`w-8 h-8 rounded-xl ${c.iconBg} flex items-center justify-center`}>
                <Icon size={16} />
              </div>
            </div>
            <div className={`text-xl font-bold font-mono flex items-center gap-2 ${c.valueColor}`}>
              <span>{c.value}</span>
              {c.isPulsing && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 truncate">
              {c.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};
