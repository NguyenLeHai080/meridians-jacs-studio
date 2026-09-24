import React from "react";
import { Layers, CheckCircle2, Sliders, TrendingUp } from "lucide-react";

interface PricingKpiCardsProps {
  totalCount: number;
  activeCount: number;
  customCount: number;
  avgMarginPercent: number;
}

export const PricingKpiCards: React.FC<PricingKpiCardsProps> = ({
  totalCount,
  activeCount,
  customCount,
  avgMarginPercent,
}) => {
  const cards = [
    {
      label: "Tổng Model Phục Vụ",
      value: totalCount,
      sub: "Đã nạp vào hệ thống Gateway",
      icon: Layers,
      iconBg: "bg-blue-50 text-blue-600",
      valueColor: "text-slate-900",
    },
    {
      label: "Đang Mở Cho Client",
      value: activeCount,
      sub: "Client Desktop có thể gọi",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      label: "Model Custom Tùy Biến",
      value: customCount,
      sub: "Fine-tune & Cấu hình riêng",
      icon: Sliders,
      iconBg: "bg-purple-50 text-purple-600",
      valueColor: "text-purple-600",
    },
    {
      label: "Biên Độ Lợi Nhuận TB",
      value: `+${avgMarginPercent}%`,
      sub: "So với giá gốc nhà cung cấp",
      icon: TrendingUp,
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
            <div className={`text-xl font-bold font-mono mt-1 ${c.valueColor}`}>{c.value}</div>
            <div className="text-[11px] text-slate-500 truncate mt-2">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
};
