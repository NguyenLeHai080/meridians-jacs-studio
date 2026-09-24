import React from "react";
import { Users, CheckCircle2, Laptop, DollarSign } from "lucide-react";
import type { ClientMetrics } from "../types";

interface ClientKpiCardsProps {
  metrics: ClientMetrics;
  loading: boolean;
}

export const ClientKpiCards: React.FC<ClientKpiCardsProps> = ({ metrics, loading }) => {
  const cards = [
    {
      title: "Tổng Khách Hàng",
      value: metrics.totalClients,
      sub: "Đang quản lý trên hệ thống",
      icon: Users,
      iconBg: "bg-blue-50 text-blue-600",
      valueColor: "text-slate-900",
    },
    {
      title: "Khách Đang Hoạt Động",
      value: metrics.activeClients,
      sub: "Có license còn hiệu lực",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      title: "Thiết Bị Đang Online",
      value: metrics.onlineDevices,
      sub: "Hoạt động trong 15 phút qua",
      icon: Laptop,
      iconBg: "bg-cyan-50 text-cyan-600",
      valueColor: "text-cyan-600",
    },
    {
      title: "Tổng Doanh Thu",
      value: `${metrics.totalSpent.toLocaleString("vi-VN")} ₫`,
      sub: "Lũy kế từ các gói license",
      icon: DollarSign,
      iconBg: "bg-amber-50 text-amber-600",
      valueColor: "text-amber-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
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
            <div className="mt-1 flex items-baseline gap-2">
              {loading ? (
                <div className="h-6 w-20 bg-slate-100 animate-pulse rounded"></div>
              ) : (
                <span className={`text-xl font-bold font-mono tracking-tight ${c.valueColor}`}>
                  {c.value}
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 truncate">{c.sub}</p>
          </div>
        );
      })}
    </div>
  );
};
