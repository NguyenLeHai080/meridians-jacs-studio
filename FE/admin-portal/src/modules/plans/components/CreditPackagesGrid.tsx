import React from "react";
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Zap,
  Power,
  Coins,
  Crown,
  Flame,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import type { CreditPackage } from "../services/planService";
import { useI18n } from "../../../core/i18n";

interface CreditPackagesGridProps {
  packages: CreditPackage[];
  loading: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (pkg: CreditPackage) => void;
  onOpenDelete: (pkg: CreditPackage) => void;
  onToggleStatus: (pkg: CreditPackage) => void;
}

export const CreditPackagesGrid: React.FC<CreditPackagesGridProps> = ({
  packages,
  loading,
  onOpenCreate,
  onOpenEdit,
  onOpenDelete,
  onToggleStatus,
}) => {
  const { t } = useI18n();

  // Helper to translate default seed badges & descriptions seamlessly
  const getLocalizedBadge = (badge?: string | null): string | null => {
    if (!badge) return null;
    const b = badge.trim().toUpperCase();
    if (b === "ĐỀ XUẤT" || b === "RECOMMENDED" || b === "おすすめ") return t("pkgBadgeRecommended", badge);
    if (b === "TIẾT KIỆM 12%" || b === "SAVE 12%" || b === "12%お得") return t("pkgBadgeSave12", badge);
    if (b === "SIÊU TIẾT KIỆM" || b === "BEST VALUE" || b === "超お得") return t("pkgBadgeBestValue", badge);
    if (b === "PHỔ BIẾN NHẤT" || b === "MOST POPULAR" || b === "一番人気") return t("pkgBadgePopular", badge);
    return badge;
  };

  const getLocalizedDesc = (desc?: string | null): string | null => {
    if (!desc) return null;
    if (desc.includes("Gói nạp trải nghiệm") || desc.includes("Basic AI") || desc.includes("基本的なAI")) {
      return t("pkgDescBase", desc);
    }
    if (desc.includes("Gói nạp phổ thông") || desc.includes("small & medium") || desc.includes("中小規模")) {
      return t("pkgDescStarter", desc);
    }
    if (desc.includes("Gói ưu đãi khuyên dùng") || desc.includes("content creators") || desc.includes("クリエイター")) {
      return t("pkgDescGrowth", desc);
    }
    if (desc.includes("Gói chuyên nghiệp") || desc.includes("multi-stream video") || desc.includes("動画スタジオ")) {
      return t("pkgDescPro", desc);
    }
    return desc;
  };

  // Tier Theme Config based on package index / name
  const getTierTheme = (pkg: CreditPackage, index: number) => {
    const nameLower = (pkg.name || "").toLowerCase();
    const isRecommended =
      (pkg.badge || "").toLowerCase().includes("đề xuất") ||
      (pkg.badge || "").toLowerCase().includes("recommend") ||
      (pkg.badge || "").toLowerCase().includes("おすすめ") ||
      nameLower.includes("growth");

    const isPro =
      nameLower.includes("pro") ||
      nameLower.includes("vip") ||
      nameLower.includes("enterprise") ||
      (pkg.price && pkg.price >= 2000000);

    const isStarter = nameLower.includes("starter") || index === 1;

    if (isRecommended) {
      return {
        isFeatured: true,
        IconComponent: Sparkles,
        iconBg: "bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 text-white shadow-md shadow-orange-500/25",
        cardBorder: "border-amber-300 ring-2 ring-amber-400/30 hover:border-amber-400 hover:ring-amber-400/50",
        cardBg: "bg-gradient-to-b from-amber-500/[0.04] via-white to-orange-500/[0.03] shadow-md shadow-orange-500/10 hover:shadow-xl hover:shadow-orange-500/20",
        creditColor: "text-orange-600",
        creditBg: "bg-orange-50/80 border-orange-200/80",
        badgeStyle: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-orange-500/30 border border-amber-300",
        bonusPill: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }

    if (isPro) {
      return {
        isFeatured: false,
        IconComponent: Crown,
        iconBg: "bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 text-white shadow-md shadow-purple-500/25",
        cardBorder: "border-purple-200/90 hover:border-purple-300 hover:ring-2 hover:ring-purple-400/20",
        cardBg: "bg-gradient-to-b from-purple-500/[0.03] via-white to-indigo-500/[0.02] shadow-xs hover:shadow-lg hover:shadow-purple-500/10",
        creditColor: "text-purple-600",
        creditBg: "bg-purple-50/80 border-purple-200/80",
        badgeStyle: "bg-purple-50 text-purple-700 border-purple-200",
        bonusPill: "bg-purple-50 text-purple-700 border-purple-200",
      };
    }

    if (isStarter) {
      return {
        isFeatured: false,
        IconComponent: Zap,
        iconBg: "bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25",
        cardBorder: "border-sky-200/80 hover:border-sky-300 hover:ring-2 hover:ring-sky-400/20",
        cardBg: "bg-gradient-to-b from-sky-500/[0.02] via-white to-blue-500/[0.02] shadow-xs hover:shadow-lg hover:shadow-sky-500/10",
        creditColor: "text-sky-600",
        creditBg: "bg-sky-50/80 border-sky-200/80",
        badgeStyle: "bg-sky-50 text-sky-700 border-sky-200",
        bonusPill: "bg-sky-50 text-sky-700 border-sky-200",
      };
    }

    // Default / Base Tier
    return {
      isFeatured: false,
      IconComponent: Coins,
      iconBg: "bg-gradient-to-tr from-slate-700 to-slate-800 text-white shadow-md shadow-slate-900/15",
      cardBorder: "border-slate-200/90 hover:border-slate-300 hover:ring-2 hover:ring-slate-300/30",
      cardBg: "bg-white shadow-xs hover:shadow-lg hover:shadow-slate-200/50",
      creditColor: "text-slate-900",
      creditBg: "bg-slate-50/80 border-slate-200/80",
      badgeStyle: "bg-slate-100 text-slate-700 border-slate-200",
      bonusPill: "bg-slate-100 text-slate-700 border-slate-200",
    };
  };

  return (
    <div className="space-y-4">
      {/* Sub-Header bar without duplicate redundant button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
              {t("packagesTitle", "Gói Credit Định Sẵn Mở Bán")}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-orange-100 text-orange-700 border border-orange-200/80 shadow-2xs">
              {packages.length} {t("statPackagesUnit", "gói")}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {t(
              "packagesSubtitle",
              "Các gói nạp tiền hiển thị trực tiếp trên phần mềm Desktop của khách hàng."
            )}
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-400 hidden sm:block">
          {t("lblRateStatus", "Trạng thái cổng")}:{" "}
          <span className="text-emerald-600 font-bold">● Active Online</span>
        </div>
      </div>

      {/* Packages Grid */}
      {packages.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-3.5 border border-orange-100 shadow-sm">
            <Package size={28} />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-1">
            {t("noPackages", "Chưa có gói credit nào được tạo")}
          </h4>
          <p className="text-xs text-slate-500 mb-5 max-w-md mx-auto leading-relaxed">
            {t(
              "noPackagesDesc",
              "Hãy tạo các gói định sẵn để khách hàng có thể chọn nạp nhanh chóng từ giao diện Desktop."
            )}
          </p>
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-md shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>{t("btnCreateFirstPackage", "Tạo gói credit đầu tiên")}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {packages.map((pkg, idx) => {
            const isActive = pkg.is_active ?? true;
            const localizedBadge = getLocalizedBadge(pkg.badge);
            const localizedDesc = getLocalizedDesc(pkg.description);
            const theme = getTierTheme(pkg, idx);
            const { IconComponent } = theme;

            return (
              <div
                key={pkg.id}
                className={`group rounded-3xl p-5 sm:p-5.5 flex flex-col justify-between transition-all duration-200 relative border ${
                  isActive
                    ? `${theme.cardBorder} ${theme.cardBg} hover:-translate-y-1`
                    : "border-slate-200 bg-slate-50/60 opacity-60"
                }`}
              >
                {/* Top Section */}
                <div>
                  {/* Icon & Status Toggle Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isActive ? theme.iconBg : "bg-slate-200 text-slate-400"
                        }`}
                      >
                        <IconComponent size={20} className="stroke-[2.2]" />
                      </div>
                      <div>
                        {localizedBadge && (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1 ${
                              isActive ? theme.badgeStyle : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {localizedBadge}
                          </span>
                        )}
                        <h4 className="text-base font-black text-slate-900 leading-snug">
                          {pkg.name}
                        </h4>
                      </div>
                    </div>

                    {/* Power On/Off Toggle Button */}
                    <button
                      type="button"
                      onClick={() => onToggleStatus(pkg)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-2xs ${
                        isActive
                          ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/80"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200"
                      }`}
                      title={
                        isActive
                          ? t("titleActiveToggle", "Đang mở bán (Click để tạm ẩn)")
                          : t("titleDisabledToggle", "Đang tạm ẩn (Click để mở bán)")
                      }
                    >
                      <Power size={14} className="stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Description */}
                  {localizedDesc && (
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed min-h-[36px]">
                      {localizedDesc}
                    </p>
                  )}

                  {/* Hero Credits Box */}
                  <div
                    className={`rounded-2xl p-4 border transition-all space-y-2.5 mb-4 ${
                      isActive ? theme.creditBg : "bg-slate-100 border-slate-200"
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        {t("pkgCredits", "Credit nhận:")}
                      </span>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className={`text-2xl font-black font-mono tracking-tight ${theme.creditColor}`}>
                          {pkg.total_credits.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-slate-500">Credits</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">{t("pkgPrice", "Giá bán:")}</span>
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          {pkg.price.toLocaleString()} VNĐ
                        </span>
                      </div>

                      {pkg.bonus_percent > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10.5px] font-black uppercase tracking-tight border ${theme.bonusPill}`}
                        >
                          +{pkg.bonus_percent}% {t("pkgBonus", "Bonus")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-500 font-mono">
                    {t("lblSortOrderPrefix", "STT")}: #{pkg.sort_order}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenEdit(pkg)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Edit2 size={12} className="text-slate-500" />
                      <span>{t("btnEditPackage", "Sửa")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDelete(pkg)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title={t("btnDeletePackage", "Xóa gói")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
