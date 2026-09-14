import React from "react";
import {
  Sliders,
  Calculator,
  Save,
  CheckCircle2,
  TrendingUp,
  Info,
  DollarSign,
  Sparkles,
  Zap,
} from "lucide-react";
import type { CreditConfig } from "../../../core/types";
import { useI18n } from "../../../core/i18n";

interface CreditRateConfigCardProps {
  creditConfig: CreditConfig;
  setCreditConfig: React.Dispatch<React.SetStateAction<CreditConfig>>;
  saveLoading: boolean;
  onSaveConfig: () => Promise<void>;
  simAmount: number;
  setSimAmount: (amount: number) => void;
  simulation: {
    baseCredits: number;
    estCost: number;
    estProfit: number;
    profitMargin: string;
  };
}

export const CreditRateConfigCard: React.FC<CreditRateConfigCardProps> = ({
  creditConfig,
  setCreditConfig,
  saveLoading,
  onSaveConfig,
  simAmount,
  setSimAmount,
  simulation,
}) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Left: Exchange Rate & Gateway Configuration Form */}
      <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200/60">
              <Sliders size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {t("rateConfigTitle", "Cấu Hình Tỷ Giá Token & Mức Nạp")}
              </h3>
              <p className="text-xs text-slate-400">
                {t(
                  "rateConfigSubtitle",
                  "Quy định giá bán/giá vốn 1M Tokens và hạn mức nạp tối thiểu."
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSaveConfig}
            disabled={saveLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save size={14} />
            <span>
              {saveLoading
                ? t("btnSavingConfig", "Đang lưu...")
                : t("btnSaveConfig", "Lưu Tỷ Giá")}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Price per 1M Token */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              {t("lblPricePer1M", "Giá bán 1M Tokens (VNĐ)")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="100"
                step="50"
                value={creditConfig.price_per_1m_token || 1000}
                onChange={(e) =>
                  setCreditConfig({
                    ...creditConfig,
                    price_per_1m_token: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-12 py-2.5 font-mono text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                VNĐ
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              {t("descPricePer1M", "1,000đ = 1,000,000 Credit Token")}
            </p>
          </div>

          {/* Cost per 1M Token */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              {t("lblCostPer1M", "Giá vốn 1M Tokens (VNĐ)")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="50"
                value={creditConfig.cost_per_1m_token || 650}
                onChange={(e) =>
                  setCreditConfig({
                    ...creditConfig,
                    cost_per_1m_token: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-12 py-2.5 font-mono text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                VNĐ
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              {t("descCostPer1M", "Chi phí trung bình trả cho hạ tầng AI")}
            </p>
          </div>

          {/* Token In Price */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              {t("lblTokenInPrice", "Giá Token Đầu Vào (Prompt)")}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="50"
                value={creditConfig.token_in_price || 500}
                onChange={(e) =>
                  setCreditConfig({
                    ...creditConfig,
                    token_in_price: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-12 py-2.5 font-mono text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                VNĐ/1M
              </span>
            </div>
          </div>

          {/* Token Out Price */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              {t("lblTokenOutPrice", "Giá Token Đầu Ra (Completion)")}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="50"
                value={creditConfig.token_out_price || 900}
                onChange={(e) =>
                  setCreditConfig({
                    ...creditConfig,
                    token_out_price: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-12 py-2.5 font-mono text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                VNĐ/1M
              </span>
            </div>
          </div>

          {/* Minimum Deposit */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              {t("lblMinDeposit", "Mức nạp tối thiểu (VNĐ)")}
            </label>
            <div className="relative">
              <input
                type="number"
                min="10000"
                step="10000"
                value={creditConfig.min_deposit_amount || 100000}
                onChange={(e) =>
                  setCreditConfig({
                    ...creditConfig,
                    min_deposit_amount: Number(e.target.value),
                  })
                }
                className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-12 py-2.5 font-mono text-xs font-bold text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                VNĐ
              </span>
            </div>
          </div>

          {/* Gateway Status Toggle */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              {t("lblRateStatus", "Trạng thái cổng nạp")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCreditConfig({ ...creditConfig, is_active: true })}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  creditConfig.is_active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <CheckCircle2 size={14} className={creditConfig.is_active ? "text-emerald-600" : "text-slate-400"} />
                <span>{t("statusActive", "Đang mở")}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreditConfig({ ...creditConfig, is_active: false })}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  !creditConfig.is_active
                    ? "bg-slate-100 text-slate-700 border-slate-300 ring-2 ring-slate-400/20 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{t("statusDisabled", "Tạm khóa")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Right: Simulator & Margin Calculator */}
      <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div className="flex items-center gap-2">
              <Calculator size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                {t("simulatorTitle", "Giả Lập Tính Toán Lợi Nhuận")}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Live Calc
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                {t("lblTestAmount", "Số tiền nạp thử nghiệm (VNĐ):")}
              </label>
              <div className="flex items-center gap-2">
                {[200000, 500000, 1000000, 2000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSimAmount(amt)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      simAmount === amt
                        ? "bg-orange-500 text-white shadow-xs"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                    }`}
                  >
                    {(amt / 1000).toLocaleString()}K
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="50000"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800/90 px-3.5 py-2 font-mono text-xs font-bold text-white focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-700/60 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>{t("simBaseCredits", "Credit gốc nhận được:")}</span>
                <span className="font-mono font-bold text-amber-400">
                  {simulation.baseCredits.toLocaleString()} Credits
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>{t("simEstCost", "Chi phí vốn ước tính:")}</span>
                <span className="font-mono text-slate-400">
                  {simulation.estCost.toLocaleString()} VNĐ
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-200">
                <span className="font-bold">{t("simEstProfit", "Lợi nhuận gộp ước tính:")}</span>
                <span className="font-mono font-bold text-emerald-400">
                  +{simulation.estProfit.toLocaleString()} VNĐ
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/80 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300">
            {t("simProfitMargin", "Biên lợi nhuận gộp:")}
          </span>
          <span className="text-base font-black text-emerald-400 font-mono">
            {simulation.profitMargin}%
          </span>
        </div>
      </div>
    </div>
  );
};
