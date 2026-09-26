import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Info,
  Heart,
  Code2,
  Clock,
  Zap,
  ShieldCheck,
  Tag,
  ArrowRight,
  Sparkles,
  Layers,
  Terminal,
  Server,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { SquareModel, ProviderLogo } from "../pages/ModelSquarePage";
import { showToast } from "../../../core/swal";

interface ModelDetailDrawerProps {
  model: SquareModel | null;
  onClose: () => void;
  formatPrice: (price: number) => string;
}

export const ModelDetailDrawer: React.FC<ModelDetailDrawerProps> = ({
  model,
  onClose,
  formatPrice,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "performance" | "api">("overview");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeApiLang, setActiveApiLang] = useState<"curl" | "python" | "node">("curl");

  if (!model) return null;

  const handleCopy = (text: string, label: string = "ID") => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showToast(`Đã sao chép ${label}`, "success");
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Base pricing calculations
  const baseInput = model.input_price_1m > 0 ? model.input_price_1m : (model.cost_per_call ? model.cost_per_call * 1000 : 260000);
  const baseOutput = model.output_price_1m > 0 ? model.output_price_1m : baseInput * 5;
  const baseCacheRead = model.cache_price_1m > 0 ? model.cache_price_1m : Math.round(baseInput * 0.1);
  const baseCacheWrite = (model.cache_write_1m && model.cache_write_1m > 0) ? model.cache_write_1m : Math.round(baseInput * 1.25);

  // Determine group multiplier rates for the group tiers shown in screenshot
  const groupChains = [
    {
      name: "claude-kiro",
      rate: 0.1078,
      input: Math.round(baseInput * 0.1078),
      output: Math.round(baseOutput * 0.1078),
      cacheRead: +(baseCacheRead * 0.1078).toFixed(1),
      cacheWrite: Math.round(baseCacheWrite * 0.1078),
    },
    {
      name: "claude-max",
      rate: 0.2546,
      input: Math.round(baseInput * 0.2546),
      output: Math.round(baseOutput * 0.2546),
      cacheRead: +(baseCacheRead * 0.2546).toFixed(1),
      cacheWrite: Math.round(baseCacheWrite * 0.2546),
    },
  ];

  // Synchronized Provider icon badge
  const renderProviderIcon = () => {
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center shadow-2xs shrink-0">
        <ProviderLogo provider={model.provider} size={22} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Click outside backdrop to close */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Drawer content */}
      <div className="w-full max-w-[760px] h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 border-l border-slate-200">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 bg-white relative">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>

          {/* Model info top */}
          <div className="flex items-start gap-3.5 pr-10">
            {renderProviderIcon()}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 font-mono tracking-tight">
                  {model.name}
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopy(model.name, "tên mô hình")}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Sao chép tên mô hình"
                >
                  {copiedText === model.name ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              {/* Sub-meta line */}
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="font-semibold text-slate-700">{model.provider}</span>
                <span className="text-slate-300">·</span>
                <span className="text-cyan-600 font-medium hover:underline cursor-pointer">
                  {model.price_type}
                </span>
              </div>

              {/* Description */}
              <p className="mt-2 text-xs text-slate-600 leading-relaxed font-normal">
                {model.description}
              </p>
            </div>
          </div>

          {/* 3 Tabs Row */}
          <div className="flex items-center gap-2 mt-6">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "overview"
                  ? "bg-white text-slate-900 border border-slate-200/90 shadow-2xs font-extrabold"
                  : "bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Info size={13} />
              <span>Tổng quan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("performance")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "performance"
                  ? "bg-white text-slate-900 border border-slate-200/90 shadow-2xs font-extrabold"
                  : "bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Heart size={13} />
              <span>Hiệu suất</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("api")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "api"
                  ? "bg-white text-slate-900 border border-slate-200/90 shadow-2xs font-extrabold"
                  : "bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Code2 size={13} />
              <span>API</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================= TAB 1: TỔNG QUAN ================= */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Top KPI Metrics Box */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                {/* Metric 1: TPS */}
                <div className="px-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <Clock size={12} className="text-slate-400" />
                    <span>TPS</span>
                  </div>
                  <div className="text-base font-black text-slate-900 mt-1 font-mono">
                    {model.tps} t/s
                  </div>
                </div>

                {/* Metric 2: Latency */}
                <div className="px-4">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <Clock size={12} className="text-slate-400" />
                    <span>ĐỘ TRỄ TRUNG BÌNH</span>
                  </div>
                  <div className="text-base font-black text-slate-900 mt-1 font-mono">
                    {model.latency_s}s
                  </div>
                </div>

                {/* Metric 3: Success rate */}
                <div className="px-4">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <ShieldCheck size={12} className="text-emerald-500" />
                    <span>TỶ LỆ THÀNH CÔNG</span>
                  </div>
                  <div className="text-base font-black text-emerald-600 mt-1 font-mono">
                    {model.uptime.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* SECTION: GIÁ CẢ */}
              <div className="space-y-3">
                <h3 className="text-xs font-black tracking-wider uppercase text-slate-800">
                  GIÁ CẢ
                </h3>

                {/* Container for Pricing */}
                <div className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-4 shadow-2xs">
                  <div>
                    <span className="text-[11px] font-black uppercase text-slate-700 tracking-wide block mb-3">
                      GIÁ CƠ BẢN
                    </span>

                    {/* 2 Big Price Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Box 1: Dau vao */}
                      <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                        <span className="text-[11px] text-slate-500 block font-medium">Đầu vào</span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-base font-black text-slate-900 font-mono">
                            ₫ {baseInput.toLocaleString("vi-VN")}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">/ 1M</span>
                        </div>
                      </div>

                      {/* Box 2: Dau ra */}
                      <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                        <span className="text-[11px] text-slate-500 block font-medium">Đầu ra</span>
                        <div className="mt-1 flex items-baseline gap-1">
                          <span className="text-base font-black text-slate-900 font-mono">
                            ₫ {baseOutput.toLocaleString("vi-VN")}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">/ 1M</span>
                        </div>
                      </div>
                    </div>

                    {/* Cache rows */}
                    <div className="mt-3 divide-y divide-slate-100 text-xs font-medium">
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-600">Đọc bộ nhớ đệm</span>
                        <span className="font-mono font-bold text-slate-800">
                          ₫ {baseCacheRead.toLocaleString("vi-VN")}{" "}
                          <span className="text-slate-400 font-normal">/ 1M</span>
                        </span>
                      </div>
                      <div className="py-2.5 flex items-center justify-between">
                        <span className="text-slate-600">Ghi bộ nhớ đệm</span>
                        <span className="font-mono font-bold text-slate-800">
                          ₫ {baseCacheWrite.toLocaleString("vi-VN")}{" "}
                          <span className="text-slate-400 font-normal">/ 1M</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Banner: Gia linh hoat */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 border border-amber-200/70">
                    <Tag size={16} className="text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-amber-900">Giá linh hoạt</div>
                      <div className="text-[11px] text-amber-700/80 mt-0.5">
                        Giá thay đổi theo bậc dùng và điều kiện yêu cầu
                      </div>
                    </div>
                  </div>

                  {/* Bang gia theo bac */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-2.5">Bảng giá theo bậc</h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-200/70">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/70">
                          <tr>
                            <th className="py-2 px-3">Bậc</th>
                            <th className="py-2 px-3 text-right">Đầu vào</th>
                            <th className="py-2 px-3 text-right">Đầu ra</th>
                            <th className="py-2 px-3 text-right">Đọc bộ nhớ đệm</th>
                            <th className="py-2 px-3 text-right">Ghi bộ nhớ đệm</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          <tr>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200/60 font-sans font-bold text-[10px]">
                                标准
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                              ₫{baseInput.toFixed(4)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                              ₫{baseOutput.toFixed(4)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                              ₫{baseCacheRead.toFixed(4)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                              ₫{baseCacheWrite.toFixed(4)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: GIÁ THEO NHÓM */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-wider uppercase text-slate-800">
                    GIÁ THEO NHÓM
                  </h3>
                </div>

                <div className="text-[11.5px] text-slate-500 flex items-center gap-1.5 font-medium">
                  <span>Chuỗi nhóm tự động</span>
                  <span className="text-slate-300">→</span>
                  <span className="text-cyan-600 hover:underline cursor-pointer">claude-kiro</span>
                  <span className="text-slate-300">→</span>
                  <span className="text-cyan-600 hover:underline cursor-pointer">claude-max</span>
                </div>

                {/* Sub-tables for each group tier */}
                <div className="space-y-3">
                  {groupChains.map((grp) => (
                    <div
                      key={grp.name}
                      className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs"
                    >
                      {/* Sub-header */}
                      <div className="px-3.5 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-700 font-mono">
                          {grp.name}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {grp.rate}x
                        </span>
                      </div>

                      {/* Sub-table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                            <tr>
                              <th className="py-2 px-3.5">BẬC</th>
                              <th className="py-2 px-3.5 text-right">ĐẦU VÀO</th>
                              <th className="py-2 px-3.5 text-right">ĐẦU RA</th>
                              <th className="py-2 px-3.5 text-right">ĐỌC BỘ NHỚ ĐỆM</th>
                              <th className="py-2 px-3.5 text-right">GHI BỘ NHỚ ĐỆM</th>
                            </tr>
                          </thead>
                          <tbody className="font-mono text-[11px]">
                            <tr>
                              <td className="py-2.5 px-3.5 font-sans font-medium text-slate-700">
                                标准
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-medium text-slate-800">
                                ₫ {grp.input.toLocaleString("vi-VN")}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-medium text-slate-800">
                                ₫ {grp.output.toLocaleString("vi-VN")}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-medium text-slate-800">
                                ₫ {grp.cacheRead.toLocaleString("vi-VN")}
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-medium text-slate-800">
                                ₫ {grp.cacheWrite.toLocaleString("vi-VN")}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  <p className="text-[10px] text-slate-400 italic">
                    * Giá hiển thị theo 1M tokens
                  </p>
                </div>
              </div>

              {/* SECTION: MÔ HÌNH (Metadata Card) */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-black tracking-wider uppercase text-slate-800">
                  MÔ HÌNH
                </h3>

                <div className="rounded-xl border border-slate-200/90 bg-white p-4 divide-y divide-slate-100 text-xs shadow-2xs">
                  {/* Row 1: Nhà cung cấp & Loại */}
                  <div className="grid grid-cols-2 gap-4 pb-3.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        NHÀ CUNG CẤP
                      </span>
                      <strong className="text-sm font-black text-slate-900">
                        {model.provider}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        LOẠI
                      </span>
                      <span className="text-cyan-600 font-bold hover:underline cursor-pointer">
                        {model.price_type}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Nhóm & Điểm cuối */}
                  <div className="grid grid-cols-2 gap-4 py-3.5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        NHÓM
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {["claude-max", "claude-kiro"].map((grp) => (
                          <span
                            key={grp}
                            className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[10.5px] font-medium"
                          >
                            {grp}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        ĐIỂM CUỐI
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {model.endpoint.split(",").map((ep) => (
                          <span
                            key={ep}
                            className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-mono text-[10.5px] font-medium"
                          >
                            {ep.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Thẻ (Tags) */}
                  <div className="pt-3.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                      THẺ
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {["Reasoning", "Tools", "Files", "Vision", "1M", ...model.tags.filter(t => !["Reasoning", "Tools", "Files", "Vision", "1M"].includes(t))].map((t) => (
                        <span
                          key={t}
                          className="px-2.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB 2: HIỆU SUẤT ================= */}
          {activeTab === "performance" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-4 shadow-2xs">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Chỉ số phản hồi & Đo đạc thời gian thực
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 block font-bold">Độ trễ TTFT</span>
                    <strong className="text-sm font-black text-slate-800 font-mono mt-0.5 block">
                      {model.latency_s}s
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 block font-bold">Tốc độ sinh (TPS)</span>
                    <strong className="text-sm font-black text-slate-800 font-mono mt-0.5 block">
                      {model.tps} t/s
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 block font-bold">Uptime 30 ngày</span>
                    <strong className="text-sm font-black text-emerald-600 font-mono mt-0.5 block">
                      {model.uptime.toFixed(1)}%
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                    <span className="text-[10px] text-slate-400 block font-bold">Ngữ cảnh (Context)</span>
                    <strong className="text-sm font-black text-slate-800 font-mono mt-0.5 block">
                      {model.context_window}
                    </strong>
                  </div>
                </div>

                {/* Simulated Latency Timeline Chart */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-600 block mb-2">
                    Lịch sử độ trễ 24 giờ qua (giây)
                  </span>
                  <div className="h-28 flex items-end gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {[12, 14, 15, 11, 13, 16, 14, 13, 12, 11, 15, 13, 14, 12, 16, 13, 14, 13].map((val, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-cyan-500/70 hover:bg-cyan-600 rounded-t-xs transition-all cursor-pointer relative group"
                        style={{ height: `${(val / 20) * 100}%` }}
                      >
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[9px] px-1 rounded font-mono">
                          {val}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: API ================= */}
          {activeTab === "api" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Tích hợp API chuẩn OpenAI & Anthropic
                  </h4>

                  {/* Lang switcher */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActiveApiLang("curl")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        activeApiLang === "curl" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                      }`}
                    >
                      cURL
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveApiLang("python")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        activeApiLang === "python" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                      }`}
                    >
                      Python
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveApiLang("node")}
                      className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                        activeApiLang === "node" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                      }`}
                    >
                      Node.js
                    </button>
                  </div>
                </div>

                {/* Code block */}
                <div className="relative bg-slate-900 rounded-xl p-4 font-mono text-[11.5px] text-emerald-400 overflow-x-auto shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      const snippet =
                        activeApiLang === "curl"
                          ? `curl https://api.nexoratech.com.vn/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "${model.id}",
    "messages": [{"role": "user", "content": "Xin chào!"}]
  }'`
                          : activeApiLang === "python"
                          ? `from openai import OpenAI

client = OpenAI(
    base_url="https://api.nexoratech.com.vn/v1",
    api_key="YOUR_API_KEY"
)

response = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "Xin chào!"}]
)
print(response.choices[0].message.content)`
                          : `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.nexoratech.com.vn/v1",
  apiKey: "YOUR_API_KEY"
});

const completion = await openai.chat.completions.create({
  model: "${model.id}",
  messages: [{ role: "user", content: "Xin chào!" }]
});
console.log(completion.choices[0].message.content);`;
                      handleCopy(snippet, "mã tích hợp API");
                    }}
                    className="absolute top-3 right-3 px-2 py-1 rounded-md bg-slate-800 text-slate-300 hover:text-white text-[11px] font-sans flex items-center gap-1 transition-colors"
                  >
                    <Copy size={12} />
                    <span>Sao chép code</span>
                  </button>

                  <pre className="pr-16">
                    {activeApiLang === "curl" &&
                      `curl https://api.nexoratech.com.vn/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "${model.id}",
    "messages": [{"role": "user", "content": "Xin chào!"}]
  }'`}

                    {activeApiLang === "python" &&
                      `from openai import OpenAI

client = OpenAI(
    base_url="https://api.nexoratech.com.vn/v1",
    api_key="YOUR_API_KEY"
)

response = client.chat.completions.create(
    model="${model.id}",
    messages=[{"role": "user", "content": "Xin chào!"}]
)
print(response.choices[0].message.content)`}

                    {activeApiLang === "node" &&
                      `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.nexoratech.com.vn/v1",
  apiKey: "YOUR_API_KEY"
});

const completion = await openai.chat.completions.create({
  model: "${model.id}",
  messages: [{ role: "user", content: "Xin chào!" }]
});
console.log(completion.choices[0].message.content);`}
                  </pre>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Tên định danh:</span>
            <code className="bg-slate-200/80 px-2 py-0.5 rounded text-slate-800 font-bold font-mono">
              {model.id}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(model.id, "ID mô hình")}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              Sao chép ID
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Hoàn tất
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
