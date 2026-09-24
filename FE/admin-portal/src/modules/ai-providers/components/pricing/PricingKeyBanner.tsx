import React from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";
import type { KeyInfo, AvailableKeyItem } from "../../pages/AiModelsPricingPage";

interface PricingKeyBannerProps {
  currentKey: KeyInfo | null;
  availableKeys: AvailableKeyItem[];
  selectedKey: string;
  onKeyChange: (key: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

export const PricingKeyBanner: React.FC<PricingKeyBannerProps> = ({
  currentKey,
  availableKeys,
  selectedKey,
  onKeyChange,
  loading,
  onRefresh,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mb-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Key status & details */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                {currentKey?.provider_name || "Upstream Provider"}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                {currentKey?.status_text || "Hoạt động"}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">
              Key: <span className="text-blue-600 font-bold">{currentKey?.masked_key || "sk-****"}</span>
              {currentKey?.period && (
                <span className="text-slate-400 ml-2">({currentKey.period})</span>
              )}
            </div>
          </div>
        </div>

        {/* Quota & Balances */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-medium">Số dư khả dụng</span>
            <span className="font-mono font-bold text-emerald-600 text-sm">
              {currentKey?.balance_display || "$0.00"}
            </span>
          </div>

          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-medium">Đã tiêu thụ</span>
            <span className="font-mono font-bold text-amber-600 text-sm">
              {currentKey?.used_display || "$0.00"}
            </span>
          </div>

          <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 block font-medium">Hạn mức (Quota)</span>
            <span className="font-mono text-slate-700 font-bold text-sm">
              {currentKey?.limit_display || "Unlimited"}
            </span>
          </div>

          {/* Switch Key Dropdown & Refresh */}
          <div className="flex items-center gap-2">
            <select
              value={selectedKey}
              onChange={(e) => onKeyChange(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
            >
              <option value="all">Tất cả key ({availableKeys.length})</option>
              {availableKeys.map((k) => (
                <option key={k.masked_key} value={k.masked_key}>
                  {k.provider_name} ({k.masked_key})
                </option>
              ))}
            </select>

            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 transition-colors disabled:opacity-50 shadow-xs"
              title="Đồng bộ lại từ nhà cung cấp"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin text-blue-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
