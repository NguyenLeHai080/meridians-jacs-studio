import React from "react";
import { FileText, ShieldCheck, Scale, FileSignature } from "lucide-react";
import type { TermsMetrics } from "../types";
import { useI18n } from "../../../core/i18n";

interface TermsStatsCardsProps {
  metrics: TermsMetrics;
}

export const TermsStatsCards: React.FC<TermsStatsCardsProps> = ({ metrics }) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Documents */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-orange-50/80 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
          <FileText size={20} className="stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statTotalDocs", "Tổng số văn bản")}
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">
            {metrics.total}{" "}
            <span className="text-xs font-normal text-slate-400">
              {t("statDocsUnit", "văn bản")}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            Quy chế & Thỏa thuận cấp phép
          </div>
        </div>
      </div>

      {/* Card 2: Active / In Effect */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <ShieldCheck size={20} className="stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statActiveDocs", "Đang có hiệu lực")}
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
            {metrics.active}{" "}
            <span className="text-xs font-normal text-emerald-600/70">
              {t("statActiveUnit", "văn bản")}
            </span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 truncate">
            Áp dụng toàn bộ người dùng
          </div>
        </div>
      </div>

      {/* Card 3: Drafts & Archived */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-amber-50/80 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <Scale size={20} className="stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statDraftDocs", "Dự thảo & Lưu trữ")}
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">
            {metrics.draft + metrics.archived}{" "}
            <span className="text-xs font-normal text-slate-400">
              ({metrics.draft} dự thảo / {metrics.archived} cũ)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            Quản lý lịch sử ban hành
          </div>
        </div>
      </div>

      {/* Card 4: Compliance & Standards */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
          <FileSignature size={20} className="stroke-[2]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {t("statCompliance", "Thể thức văn bản")}
          </div>
          <div className="text-sm font-extrabold text-slate-900 mt-0.5 truncate">
            NĐ 30/2020/NĐ-CP
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            Cập nhật: {metrics.lastUpdated}
          </div>
        </div>
      </div>
    </div>
  );
};
