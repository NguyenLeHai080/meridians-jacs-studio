import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  KeyRound,
  Coins,
  Cpu,
  ShieldCheck,
  Search,
  RefreshCw,
  Plus,
  Check,
  Copy,
  Sliders,
  Layers,
  Zap,
  Lock,
  Unlock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Home,
  ChevronRight,
  X,
  Bot,
  Laptop,
} from "lucide-react";
import { getToken } from "../../../core/session";
import { apiRequest } from "../../../core/api";
import { showToast } from "../../../core/swal";

interface LicenseRecord {
  id: string;
  customer_name: string;
  customer_contact?: string;
  hwid: string;
  key_hint: string;
  key?: string;
  raw_key?: string;
  license_key?: string;
  status: string;
  credit_balance: number;
  allowed_models?: string[] | null;
  ai_gateway_enabled?: boolean;
  max_jobs_per_day?: number;
  created_at?: string;
  last_seen_at?: string;
  last_app_version?: string;
}

const DEFAULT_MODELS_LIST: { id: string; name: string; provider: string; tag: string }[] = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Tốc độ cao & Tiết kiệm 1M context)", provider: "Google Gemini", tag: "⚡ Khuyên dùng" },
  { id: "gemini-flash-latest", name: "Gemini Flash Latest (Bản mới nhất)", provider: "Google Gemini", tag: "Mới" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Suy luận đỉnh cao 2M context)", provider: "Google Gemini", tag: "Pro 2M" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Phân tích chuyên sâu 2M context)", provider: "Google Gemini", tag: "Pro" },
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol (Mô hình kịch bản đỉnh cao VIP)", provider: "OpenAI", tag: "⭐ VIP" },
  { id: "gpt-5.5", name: "GPT-5.5 (Điện ảnh thế hệ mới)", provider: "OpenAI", tag: "Điện ảnh" },
  { id: "gpt-4o", name: "GPT-4o (Vision & Multimodal cao cấp)", provider: "OpenAI", tag: "Flagship" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (Giá rẻ, phản hồi nhanh)", provider: "OpenAI", tag: "Tiết kiệm" },
  { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet (Tư duy lai & Viết văn mượt)", provider: "Anthropic", tag: "HOT" },
  { id: "claude-opus-5", name: "Claude Opus 5 (Biên kịch điện ảnh & Plot twist cao cấp)", provider: "Anthropic", tag: "👑 Siêu cấp" },
  { id: "claude-opus-4.8", name: "Claude Opus 4.8 (Review phim triệu view & Cao trào)", provider: "Anthropic", tag: "👑 Review Phim" },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet (Chuyên gia kịch bản phim)", provider: "Anthropic", tag: "Cao cấp" },
  { id: "claude-3-5-haiku", name: "Claude 3.5 Haiku (Siêu tốc độ)", provider: "Anthropic", tag: "Nhanh" },
  { id: "deepseek-chat", name: "DeepSeek V3 (Chi phí cực rẻ)", provider: "DeepSeek", tag: "Siêu rẻ" },
  { id: "deepseek-reasoner", name: "DeepSeek R1 (Lập luận sâu Chain-of-Thought)", provider: "DeepSeek", tag: "Lập luận" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (Siêu tốc độ Groq LPU)", provider: "Groq", tag: "Siêu tốc" },
  { id: "glm-4-plus", name: "GLM-4 Plus (Đa ngôn ngữ thông minh)", provider: "Zhipu AI", tag: "Đa năng" },
  { id: "eleven_multilingual_v2", name: "ElevenLabs Voice TTS (Lồng tiếng AI)", provider: "ElevenLabs", tag: "Voice" },
  { id: "whisper-large-v3", name: "Whisper Large V3 (Bóc băng phụ đề)", provider: "Whisper", tag: "Audio" },
];

export const AiKeyGrantsPage: React.FC = () => {
  const token = getToken() ?? "";
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "has_credit" | "no_credit">("all");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal: Grant Credit
  const [creditModalLicense, setCreditModalLicense] = useState<LicenseRecord | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(500);
  const [creditMode, setCreditMode] = useState<"add" | "set">("add");
  const [creditReason, setCreditReason] = useState<string>("");
  const [submittingCredit, setSubmittingCredit] = useState(false);

  // Modal: Grant Models
  const [modelsModalLicense, setModelsModalLicense] = useState<LicenseRecord | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [isGatewayEnabled, setIsGatewayEnabled] = useState<boolean>(true);
  const [submittingModels, setSubmittingModels] = useState(false);

  // Fetch licenses
  const fetchLicenses = useCallback(async (quiet = false) => {
    if (!token) return;
    try {
      if (!quiet) setLoading(true);
      const res = await apiRequest<LicenseRecord[]>("/api/v1/licenses", {}, token);
      if (Array.isArray(res)) {
        setLicenses(res);
      }
    } catch {
      // ignore
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showToast("Đã sao chép License Key vào Clipboard", "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Credit Modal
  const openCreditModal = (lic: LicenseRecord) => {
    setCreditModalLicense(lic);
    setCreditAmount(500);
    setCreditMode("add");
    setCreditReason("");
  };

  // Open Models Modal
  const openModelsModal = (lic: LicenseRecord) => {
    setModelsModalLicense(lic);
    setIsGatewayEnabled(lic.ai_gateway_enabled !== false);
    if (!lic.allowed_models || lic.allowed_models.length === 0) {
      setSelectedModels(DEFAULT_MODELS_LIST.map((m) => m.id));
    } else {
      setSelectedModels([...lic.allowed_models]);
    }
  };

  // Submit Grant Credit
  const handleGrantCredit = async () => {
    if (!creditModalLicense || !token) return;
    try {
      setSubmittingCredit(true);
      const targetBalance =
        creditMode === "add"
          ? (creditModalLicense.credit_balance || 0) + creditAmount
          : creditAmount;

      await apiRequest(
        `/api/v1/licenses/${creditModalLicense.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            credit_balance: targetBalance,
            credit_adjustment: {
              mode: creditMode,
              amount: creditAmount,
              reason: creditReason.trim() || "Cấp phát thủ công qua Admin Portal",
            },
          }),
        },
        token
      );

      showToast(
        `Đã cấp ${creditAmount} Credit cho ${creditModalLicense.customer_name} thành công.`,
        "success"
      );
      setCreditModalLicense(null);
      fetchLicenses(true);
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi cấp phát Credit", "error");
    } finally {
      setSubmittingCredit(false);
    }
  };

  // Submit Grant Models
  const handleGrantModels = async () => {
    if (!modelsModalLicense || !token) return;
    try {
      setSubmittingModels(true);
      const isAll = selectedModels.length >= DEFAULT_MODELS_LIST.length;
      const allowedPayload = isAll ? null : selectedModels;

      await apiRequest(
        `/api/v1/licenses/${modelsModalLicense.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            allowed_models: allowedPayload,
            ai_gateway_enabled: isGatewayEnabled,
          }),
        },
        token
      );

      showToast(
        `Đã cập nhật quyền Model AI cho ${modelsModalLicense.customer_name} thành công.`,
        "success"
      );
      setModelsModalLicense(null);
      fetchLicenses(true);
    } catch (err: any) {
      showToast(err?.message || "Lỗi khi cấp quyền Model AI", "error");
    } finally {
      setSubmittingModels(false);
    }
  };

  // Toggle model checkbox
  const toggleModelSelection = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId]
    );
  };

  // Filtered licenses
  const filteredLicenses = useMemo(() => {
    return licenses.filter((lic) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (lic.customer_name || "").toLowerCase().includes(q) ||
        (lic.key_hint || "").toLowerCase().includes(q) ||
        (lic.raw_key || "").toLowerCase().includes(q) ||
        (lic.key || "").toLowerCase().includes(q) ||
        (lic.hwid || "").toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (statusFilter === "active" && lic.status !== "active") return false;
      if (statusFilter === "has_credit" && (lic.credit_balance || 0) <= 0) return false;
      if (statusFilter === "no_credit" && (lic.credit_balance || 0) > 0) return false;

      return true;
    });
  }, [licenses, searchQuery, statusFilter]);

  // KPI Calculations
  const totalKeys = licenses.length;
  const totalCreditBalance = licenses.reduce((acc, l) => acc + (l.credit_balance || 0), 0);
  const activeGatewayKeys = licenses.filter((l) => l.ai_gateway_enabled !== false && l.status === "active").length;
  const zeroCreditKeys = licenses.filter((l) => (l.credit_balance || 0) <= 0).length;

  return (
    <div className="w-full max-w-full space-y-6">
      {/* 1. Header with Breadcrumb & Action Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb Trail */}
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2.5">
            <span className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors">
              <Home size={12} className="text-slate-400" />
              <span>JACS Studio</span>
            </span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-500">Dịch Vụ AI & Mô Hình</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-700 border border-orange-500/20">
              Cấp Quyền & Credit Key Tool
            </span>
          </nav>

          {/* Title & Live Status Badges */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 ring-4 ring-orange-500/10 shrink-0">
              <KeyRound size={24} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
                  Cấp Quyền Model AI & Nạp Credit Cho Key Tool
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{activeGatewayKeys} Key Đang Bật Gateway</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Quản lý phân quyền gọi từng model AI và nạp số dư Credit cho từng Key Tool Desktop / Thiết bị máy khách.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <button
            type="button"
            onClick={() => fetchLicenses()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 hover:border-slate-400 border border-slate-200/90 rounded-xl shadow-xs transition-colors duration-150 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-orange-500" : "text-slate-500"} />
            <span>{loading ? "Đang tải..." : "Làm Mới"}</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Glassmorphism KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Tool Keys */}
        <div className="group relative bg-white/95 backdrop-blur-sm border border-slate-200/80 hover:border-amber-400/60 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
              <KeyRound size={22} />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-600 font-mono">
              Tổng Key
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Số Key Tool Khách
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mt-1 flex items-baseline gap-2">
              <span>{totalKeys}</span>
              <span className="text-xs font-bold text-slate-400">thiết bị</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Đã kích hoạt bản quyền</span>
              <span className="font-bold text-slate-700">100% Active</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Credit Circulating */}
        <div className="group relative bg-white/95 backdrop-blur-sm border border-slate-200/80 hover:border-amber-400/60 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shrink-0">
              <Coins size={22} />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 font-mono">
              1đ = 1 Cr
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
              Tổng Credit Đang Lưu Hành
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 leading-tight mt-1 flex items-baseline gap-1.5 font-mono">
              <span>{totalCreditBalance.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              <span className="text-xs font-bold text-amber-700 font-sans">Cr</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Quy đổi giá trị:</span>
              <span className="font-bold text-slate-700 font-mono">~{(totalCreditBalance * 1000).toLocaleString("vi-VN")} đ</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active AI Gateway Keys */}
        <div className="group relative bg-white/95 backdrop-blur-sm border border-slate-200/80 hover:border-emerald-400/60 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shrink-0">
              <Zap size={22} />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono">
              Online
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
              Key Bật Quyền AI Gateway
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 leading-tight mt-1 flex items-baseline gap-2">
              <span>{activeGatewayKeys}</span>
              <span className="text-xs font-bold text-slate-400">/ {totalKeys} key</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Trạng thái Gateway:</span>
              <span className="font-bold text-emerald-600">Sẵn sàng gọi AI</span>
            </div>
          </div>
        </div>

        {/* Card 4: Zero credit warning */}
        <div className="group relative bg-white/95 backdrop-blur-sm border border-slate-200/80 hover:border-rose-400/60 rounded-2xl p-5 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
              <AlertCircle size={22} />
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60 font-mono">
              Cảnh báo
            </span>
          </div>
          <div className="mt-4">
            <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
              Key Hết Credit (Cần Nạp)
            </div>
            <div className={`text-2xl sm:text-3xl font-black leading-tight mt-1 flex items-baseline gap-2 ${zeroCreditKeys > 0 ? "text-rose-600" : "text-slate-900"}`}>
              <span>{zeroCreditKeys}</span>
              <span className="text-xs font-bold text-slate-400">key</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Nguy cơ gián đoạn:</span>
              <span className={`font-bold ${zeroCreditKeys > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {zeroCreditKeys > 0 ? "Cần nạp thêm" : "An toàn"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Table Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/70 via-white to-amber-50/20">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo tên khách, Key máy, HWID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-8 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200/90 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10 placeholder-slate-400 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {[
              { id: "all", label: "Tất cả key" },
              { id: "active", label: "🟢 Đang hoạt động" },
              { id: "has_credit", label: "🪙 Còn Credit" },
              { id: "no_credit", label: "⚠️ Hết Credit" },
            ].map((f) => {
              const isSelected = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/10"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-100/80"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table Content - Single Line Compact Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none whitespace-nowrap">
                <th className="py-3.5 pl-6 pr-3 w-[25%]">Khách Hàng & Thiết Bị</th>
                <th className="py-3.5 px-3 w-[20%]">Key Tool (License)</th>
                <th className="py-3.5 px-3 w-[15%] text-center text-amber-700">Số Dư Credit</th>
                <th className="py-3.5 px-3 w-[22%]">Mô Hình AI Cấp Phép</th>
                <th className="py-3.5 px-3 w-[8%] text-center">AI Gateway</th>
                <th className="py-3.5 pr-6 pl-3 w-[10%] text-right">Thao Tác Cấp Phát</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <KeyRound size={32} className="mx-auto mb-2 opacity-40" />
                    <div className="font-bold text-sm text-slate-700">
                      {loading ? "Đang tải dữ liệu..." : "Không tìm thấy Key Tool nào phù hợp."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((lic) => {
                  const fullKey = lic.raw_key || lic.key || lic.license_key || lic.key_hint;
                  const isAllModels = !lic.allowed_models || lic.allowed_models.length === 0 || lic.allowed_models.length >= DEFAULT_MODELS_LIST.length;
                  const allowedList = lic.allowed_models || [];

                  return (
                    <tr
                      key={lic.id}
                      className="group hover:bg-slate-50/80 transition-colors duration-150"
                    >
                      {/* Customer & Machine Info */}
                      <td className="py-3 pl-6 pr-3 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                            <Laptop size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {lic.customer_name || "Khách hàng Desktop"}
                            </div>
                            <div className="text-[10.5px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>HWID: {lic.hwid ? `${lic.hwid.slice(0, 12)}...` : "Chưa gắn máy"}</span>
                              {lic.customer_contact && <span>• {lic.customer_contact}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* License Key with Copy button */}
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/90 px-2.5 py-1 rounded-lg">
                          <span className="font-mono font-bold text-slate-800 text-[11.5px]">
                            {fullKey}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(fullKey)}
                            title="Sao chép License Key"
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer"
                          >
                            {copiedKey === fullKey ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Credit Balance */}
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-900 font-mono shadow-2xs">
                          <Coins size={12} className="text-amber-600" />
                          <span>{(lic.credit_balance || 0).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          <span className="text-[10px] text-amber-700 font-sans">Cr</span>
                        </div>
                      </td>

                      {/* Allowed Models */}
                      <td className="py-3 px-3 align-middle whitespace-nowrap">
                        {isAllModels ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                            <Sparkles size={10} />
                            <span>Tất cả Model AI (Full Access)</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {allowedList.slice(0, 2).map((mId) => (
                              <span
                                key={mId}
                                className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10.5px] font-mono text-slate-700 font-semibold"
                              >
                                {mId}
                              </span>
                            ))}
                            {allowedList.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-bold text-slate-600">
                                +{allowedList.length - 2} model
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* AI Gateway Status */}
                      <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                        {lic.ai_gateway_enabled !== false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Zap size={10} />
                            <span>Bật</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <Lock size={10} />
                            <span>Khóa</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 pr-6 pl-3 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => openModelsModal(lic)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg transition-colors cursor-pointer shadow-2xs"
                            title="Phân quyền Model AI"
                          >
                            <Cpu size={11} className="text-slate-500" />
                            <span>Cấp Model</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openCreditModal(lic)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                            title="Nạp Credit cho Key này"
                          >
                            <Coins size={11} />
                            <span>+ Nạp Cr</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Nạp / Cấp Credit Cho Key Tool */}
      {creditModalLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-md transition-all duration-300">
          <div
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-amber-50/30 px-6 py-5 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200/80 shadow-xs">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Cấp Credit Cho Key Tool
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {creditModalLicense.customer_name} ({creditModalLicense.key_hint})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreditModalLicense(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Current balance card */}
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Số dư Credit hiện tại:</span>
                <span className="text-base font-black text-amber-600 font-mono">
                  {(creditModalLicense.credit_balance || 0).toLocaleString("vi-VN", { minimumFractionDigits: 0 })} Cr
                </span>
              </div>

              {/* Mode: Add or Set */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Hình Thức Cấp Phát:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCreditMode("add")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      creditMode === "add"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    ➕ Cộng Thêm Vào Số Dư
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditMode("set")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      creditMode === "set"
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🎯 Đặt Lại Số Dư Mới
                  </button>
                </div>
              </div>

              {/* Amount input & Quick buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số Lượng Credit ({creditMode === "add" ? "Cộng thêm" : "Số dư mới"}):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10 shadow-2xs"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-700 font-mono">Cr</span>
                </div>

                {/* Quick preset buttons */}
                <div className="flex gap-2 mt-2">
                  {[100, 500, 1000, 2000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCreditAmount(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        creditAmount === val
                          ? "bg-amber-500 text-slate-950 font-black shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Lý Do / Ghi Chú Cấp Phát:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nạp tiền gói tháng, Tặng thử nghiệm..."
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-3 focus:ring-orange-500/10 shadow-2xs"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4">
              <button
                type="button"
                onClick={() => setCreditModalLicense(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleGrantCredit}
                disabled={submittingCredit || creditAmount <= 0}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/20 disabled:opacity-50 transition-colors cursor-pointer active:scale-95"
              >
                <Coins size={13} />
                <span>{submittingCredit ? "Đang xử lý..." : "Xác Nhận Nạp Credit"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Phân Quyền Model AI Cho Key Tool */}
      {modelsModalLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-md transition-all duration-300">
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-orange-50/30 px-6 py-5 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-200/80 shadow-xs">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Phân Quyền Model AI Cho Key Tool
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {modelsModalLicense.customer_name} ({modelsModalLicense.key_hint})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModelsModalLicense(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[68vh] overflow-y-auto p-6 space-y-4 scrollbar-thin">
              {/* Gateway Toggle Switch */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Bật Quyền Gọi AI Gateway Cho Key Này</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Nếu tắt, thiết bị Desktop sẽ bị chặn mọi lượt gọi phân tích AI.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGatewayEnabled(!isGatewayEnabled)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isGatewayEnabled
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {isGatewayEnabled ? "🟢 Đang Bật" : "🔒 Đã Khóa"}
                </button>
              </div>

              {/* Models selection checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Danh Sách Model AI Được Phép Gọi ({selectedModels.length}/{DEFAULT_MODELS_LIST.length}):
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedModels(DEFAULT_MODELS_LIST.map((m) => m.id))}
                      className="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer"
                    >
                      Chọn Tất Cả
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedModels([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Bỏ Chọn
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DEFAULT_MODELS_LIST.map((m) => {
                    const isChecked = selectedModels.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-orange-50/40 border-orange-200 ring-1 ring-orange-400/20"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModelSelection(m.id)}
                          className="mt-0.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500 accent-orange-600"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="font-mono font-bold text-xs text-slate-900 truncate">
                              {m.id}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold shrink-0">
                              {m.tag}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {m.provider}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/90 px-6 py-4">
              <button
                type="button"
                onClick={() => setModelsModalLicense(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleGrantModels}
                disabled={submittingModels}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-600/20 disabled:opacity-50 transition-colors cursor-pointer active:scale-95"
              >
                <CheckCircle2 size={13} />
                <span>{submittingModels ? "Đang lưu..." : "Lưu Phân Quyền"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiKeyGrantsPage;
