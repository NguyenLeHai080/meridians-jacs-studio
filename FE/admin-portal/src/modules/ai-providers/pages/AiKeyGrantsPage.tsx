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
} from "lucide-react";
import { getToken } from "../../../core/session";
import { apiRequest } from "../../../core/api";

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

interface ProviderModelItem {
  id: string;
  model_id: string;
  model_name: string;
  provider_type: string;
  is_active: boolean;
  pricing_tier?: string;
}

const DEFAULT_MODELS_LIST: { id: string; name: string; provider: string; tag: string }[] = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Tốc độ cao & Tiết kiệm)", provider: "Google Gemini", tag: "⚡ Khuyên dùng" },
  { id: "gemini-flash-latest", name: "Gemini Flash Latest (Bản mới nhất)", provider: "Google Gemini", tag: "Mới" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Phân tích chuyên sâu 2M context)", provider: "Google Gemini", tag: "Pro" },
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol (Mô hình kịch bản đỉnh cao)", provider: "OpenAI", tag: "⭐ VIP" },
  { id: "gpt-4o", name: "GPT-4o (Vision & Multimodal cao cấp)", provider: "OpenAI", tag: "Flagship" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini (Giá rẻ, phản hồi nhanh)", provider: "OpenAI", tag: "Tiết kiệm" },
  { id: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet (Tư duy lai & Viết văn mượt)", provider: "Anthropic", tag: "HOT" },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet (Chuyên gia kịch bản phim)", provider: "Anthropic", tag: "Cao cấp" },
  { id: "claude-3-5-haiku", name: "Claude 3.5 Haiku (Siêu tốc độ)", provider: "Anthropic", tag: "Nhanh" },
  { id: "deepseek-chat", name: "DeepSeek V3 (Chi phí cực rẻ)", provider: "DeepSeek", tag: "Siêu rẻ" },
  { id: "deepseek-reasoner", name: "DeepSeek R1 (Lập luận sâu)", provider: "DeepSeek", tag: "Lập luận" },
  { id: "glm-4-plus", name: "GLM-4 Plus (Đa ngôn ngữ thông minh)", provider: "Zhipu AI", tag: "Đa năng" },
  { id: "eleven_multilingual_v2", name: "ElevenLabs Voice TTS (Lồng tiếng AI)", provider: "ElevenLabs", tag: "Voice" },
  { id: "whisper-large-v3", name: "Whisper Large V3 (Bóc băng phụ đề)", provider: "OpenAI", tag: "Audio" },
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
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Open Grant Credit Modal
  const openCreditModal = (lic: LicenseRecord) => {
    setCreditModalLicense(lic);
    setCreditAmount(500);
    setCreditMode("add");
    setCreditReason("Admin cấp thêm Credit sử dụng AI");
  };

  // Submit Grant Credit
  const handleGrantCredit = async () => {
    if (!creditModalLicense || !token) return;
    try {
      setSubmittingCredit(true);
      await apiRequest(
        `/api/v1/licenses/${creditModalLicense.id}/grant-credit`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: Number(creditAmount),
            mode: creditMode,
            reason: creditReason || "Cấp Credit từ Admin Portal",
          }),
        },
        token
      );
      await fetchLicenses(true);
      setCreditModalLicense(null);
    } catch (err: any) {
      alert(`Lỗi cấp Credit: ${err?.message || err}`);
    } finally {
      setSubmittingCredit(false);
    }
  };

  // Open Models Modal
  const openModelsModal = (lic: LicenseRecord) => {
    setModelsModalLicense(lic);
    setIsGatewayEnabled(lic.ai_gateway_enabled !== false);
    if (!lic.allowed_models || lic.allowed_models.length === 0) {
      // All models by default
      setSelectedModels(DEFAULT_MODELS_LIST.map((m) => m.id));
    } else {
      setSelectedModels([...lic.allowed_models]);
    }
  };

  // Toggle model item
  const toggleModel = (id: string) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Submit Allowed Models
  const handleSaveAllowedModels = async () => {
    if (!modelsModalLicense || !token) return;
    try {
      setSubmittingModels(true);
      await apiRequest(
        `/api/v1/licenses/${modelsModalLicense.id}/allowed-models`,
        {
          method: "PUT",
          body: JSON.stringify({
            allowed_models: selectedModels,
            ai_gateway_enabled: isGatewayEnabled,
          }),
        },
        token
      );
      await fetchLicenses(true);
      setModelsModalLicense(null);
    } catch (err: any) {
      alert(`Lỗi lưu cấu hình Model: ${err?.message || err}`);
    } finally {
      setSubmittingModels(false);
    }
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
    <div style={{ padding: "24px 28px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#12151f",
                boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 850, color: "#0f172a", margin: 0, letterSpacing: "-0.3px" }}>
                Cấp Quyền Model AI & Nạp Credit Cho Key Tool
              </h1>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "2px 0 0" }}>
                Quản lý quyền sử dụng Model AI và cấp phát số dư Credit cho từng Key Tool Desktop / Thiết bị máy khách
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => fetchLicenses()}
            disabled={loading}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "7px 14px",
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#334155",
              cursor: loading ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Đang tải..." : "Làm Mới"}
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        {/* Card 1: Total Tool Keys */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Tổng Số Key Tool Máy Khách
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KeyRound size={16} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 850, color: "#0f172a", marginTop: "6px" }}>
            {totalKeys} <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>thiết bị</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
            Đã kích hoạt trên hệ thống
          </div>
        </div>

        {/* Card 2: Total Credit Circulating */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Tổng Credit Đang Lưu Hành
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Coins size={16} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 850, color: "#d97706", marginTop: "6px" }}>
            {totalCreditBalance.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: "13px", color: "#d97706", fontWeight: 700 }}>Cr</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
            Tương đương ~{(totalCreditBalance * 1000).toLocaleString("vi-VN")} VNĐ
          </div>
        </div>

        {/* Card 3: Active AI Gateway Keys */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Key Bật Quyền AI Gateway
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={16} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 850, color: "#16a34a", marginTop: "6px" }}>
            {activeGatewayKeys} <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>/ {totalKeys} key</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#16a34a", fontWeight: 700, marginTop: "4px" }}>
            🟢 Sẵn sàng gọi AI Gateway
          </div>
        </div>

        {/* Card 4: Zero credit warning */}
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 18px", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
              Key Hết Credit (Cần nạp)
            </span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: zeroCreditKeys > 0 ? "#fef2f2" : "#f8fafc", color: zeroCreditKeys > 0 ? "#dc2626" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertCircle size={16} />
            </div>
          </div>
          <div style={{ fontSize: "24px", fontWeight: 850, color: zeroCreditKeys > 0 ? "#dc2626" : "#0f172a", marginTop: "6px" }}>
            {zeroCreditKeys} <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 600 }}>key</span>
          </div>
          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
            Cần cấp thêm Credit để không gián đoạn
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        {/* Search & Filter Toolbar */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "#f8fafc" }}>
          {/* Search Box */}
          <div style={{ position: "relative", width: "320px", maxWidth: "100%" }}>
            <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Tìm theo tên khách, Key máy, HWID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 34px",
                fontSize: "12.5px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#ffffff",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {[
              { id: "all", label: "Tất cả key" },
              { id: "active", label: "Đang hoạt động" },
              { id: "has_credit", label: "Còn Credit" },
              { id: "no_credit", label: "Hết Credit" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as any)}
                style={{
                  background: statusFilter === f.id ? "#0f172a" : "#ffffff",
                  color: statusFilter === f.id ? "#ffffff" : "#475569",
                  border: statusFilter === f.id ? "1px solid #0f172a" : "1px solid #cbd5e1",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 800, fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                <th style={{ padding: "12px 16px" }}>Khách Hàng / Thiết Bị</th>
                <th style={{ padding: "12px 16px" }}>Key Tool (License)</th>
                <th style={{ padding: "12px 16px" }}>Số Dư Credit</th>
                <th style={{ padding: "12px 16px" }}>Mô Hình AI Được Cấp Phép</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>AI Gateway</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Thao Tác Cấp Phát</th>
              </tr>
            </thead>
            <tbody>
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "36px 16px", textAlign: "center", color: "#94a3b8" }}>
                    {loading ? "Đang tải dữ liệu..." : "Không tìm thấy Key Tool nào phù hợp."}
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
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Customer & Machine Info */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "13px" }}>
                          {lic.customer_name || "Khách hàng Desktop"}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontFamily: "monospace", color: "#475569" }}>
                            HWID: {lic.hwid ? `${lic.hwid.slice(0, 16)}...` : "Chưa gắn máy"}
                          </span>
                          {lic.customer_contact && <span>• {lic.customer_contact}</span>}
                        </div>
                      </td>

                      {/* License Key with Copy button */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 750, color: "#1e293b", fontSize: "12px" }}>
                            {fullKey}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(fullKey)}
                            title="Sao chép License Key"
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              color: copiedKey === fullKey ? "#16a34a" : "#64748b",
                            }}
                          >
                            {copiedKey === fullKey ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* Credit Balance */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                          <span
                            style={{
                              fontSize: "16px",
                              fontWeight: 850,
                              color: (lic.credit_balance || 0) > 0 ? "#d97706" : "#dc2626",
                            }}
                          >
                            {(lic.credit_balance || 0).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "#d97706" }}>Cr</span>
                        </div>
                        <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                          ~{((lic.credit_balance || 0) * 1000).toLocaleString("vi-VN")} đ
                        </div>
                      </td>

                      {/* Allowed Models */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", maxWidth: "380px" }}>
                        {isAllModels ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "rgba(22, 163, 74, 0.1)",
                              color: "#16a34a",
                              border: "1px solid rgba(22, 163, 74, 0.25)",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 750,
                            }}
                          >
                            <Sparkles size={12} /> Tất cả Model AI (Full Access)
                          </span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {allowedList.slice(0, 3).map((mId) => (
                              <span
                                key={mId}
                                style={{
                                  background: "#f1f5f9",
                                  border: "1px solid #e2e8f0",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10.5px",
                                  fontFamily: "monospace",
                                  color: "#334155",
                                  fontWeight: 600,
                                }}
                              >
                                {mId}
                              </span>
                            ))}
                            {allowedList.length > 3 && (
                              <span
                                style={{
                                  background: "#f8fafc",
                                  border: "1px solid #cbd5e1",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  color: "#64748b",
                                  fontWeight: 700,
                                }}
                              >
                                +{allowedList.length - 3} model khác
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* AI Gateway Status */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", textAlign: "center" }}>
                        {lic.ai_gateway_enabled !== false ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#16a34a", fontWeight: 750, background: "#f0fdf4", padding: "3px 8px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                            <Zap size={11} /> Bật
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#dc2626", fontWeight: 750, background: "#fef2f2", padding: "3px 8px", borderRadius: "12px", border: "1px solid #fecaca" }}>
                            <Lock size={11} /> Khóa
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", verticalAlign: "middle", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          {/* Nút Cấp Quyền Model AI */}
                          <button
                            type="button"
                            onClick={() => openModelsModal(lic)}
                            style={{
                              background: "rgba(37, 99, 235, 0.08)",
                              border: "1px solid rgba(37, 99, 235, 0.3)",
                              color: "#2563eb",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 750,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Cpu size={12} /> Cấp Model AI
                          </button>

                          {/* Nút Nạp Credit */}
                          <button
                            type="button"
                            onClick={() => openCreditModal(lic)}
                            style={{
                              background: "linear-gradient(135deg, #d97706, #f59e0b)",
                              border: "none",
                              color: "#12151f",
                              padding: "5px 11px",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: 800,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              boxShadow: "0 1px 4px rgba(245, 158, 11, 0.3)",
                            }}
                          >
                            <Coins size={12} /> + Nạp Credit
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
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "480px",
              maxWidth: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "18px 22px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Coins size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                    Cấp Credit Cho Key Tool
                  </h3>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {creditModalLicense.customer_name} ({creditModalLicense.key_hint})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreditModalLicense(null)}
                style={{ background: "none", border: "none", fontSize: "18px", color: "#94a3b8", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Current balance display */}
              <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 600 }}>Số dư Credit hiện tại:</span>
                <span style={{ fontSize: "16px", fontWeight: 850, color: "#d97706" }}>
                  {(creditModalLicense.credit_balance || 0).toLocaleString("vi-VN", { minimumFractionDigits: 2 })} Cr
                </span>
              </div>

              {/* Mode: Add or Set */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  Hình Thức Cấp Phát:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setCreditMode("add")}
                    style={{
                      background: creditMode === "add" ? "#0f172a" : "#ffffff",
                      color: creditMode === "add" ? "#ffffff" : "#475569",
                      border: creditMode === "add" ? "1px solid #0f172a" : "1px solid #cbd5e1",
                      padding: "8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    ➕ Cộng Thêm Vào Số Dư
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditMode("set")}
                    style={{
                      background: creditMode === "set" ? "#0f172a" : "#ffffff",
                      color: creditMode === "set" ? "#ffffff" : "#475569",
                      border: creditMode === "set" ? "1px solid #0f172a" : "1px solid #cbd5e1",
                      padding: "8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    🎯 Đặt Lại Số Dư Mới
                  </button>
                </div>
              </div>

              {/* Amount input & Quick buttons */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  Số Lượng Credit ({creditMode === "add" ? "Cộng thêm" : "Số dư mới"}):
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />

                {/* Quick preset buttons */}
                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  {[100, 500, 1000, 2000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCreditAmount(val)}
                      style={{
                        flex: 1,
                        background: creditAmount === val ? "rgba(245, 158, 11, 0.2)" : "#f1f5f9",
                        color: creditAmount === val ? "#b45309" : "#475569",
                        border: creditAmount === val ? "1px solid #f59e0b" : "1px solid #e2e8f0",
                        padding: "5px 0",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 750,
                        cursor: "pointer",
                      }}
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason input */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  Lý Do / Ghi Chú Cấp Phát:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nạp tiền gói tháng, Tặng thử nghiệm..."
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "12.5px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "14px 22px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setCreditModalLicense(null)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleGrantCredit}
                disabled={submittingCredit || creditAmount <= 0}
                style={{
                  background: "linear-gradient(135deg, #d97706, #f59e0b)",
                  border: "none",
                  padding: "7px 18px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  color: "#12151f",
                  cursor: submittingCredit ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 6px rgba(245, 158, 11, 0.3)",
                }}
              >
                {submittingCredit ? "Đang xử lý..." : "Xác Nhận Cấp Credit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Cấp Phép Danh Sách Model AI */}
      {modelsModalLicense && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "650px",
              maxWidth: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "18px 22px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Cpu size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                    Cấp Quyền Mô Hình AI Cho Key Tool
                  </h3>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {modelsModalLicense.customer_name} ({modelsModalLicense.key_hint})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModelsModalLicense(null)}
                style={{ background: "none", border: "none", fontSize: "18px", color: "#94a3b8", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "18px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* AI Gateway Switch */}
              <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "13px" }}>
                    Quyền Truy Cập AI Gateway:
                  </div>
                  <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                    Cho phép Key Tool gọi các model AI qua hệ thống Cloud Gateway của Admin
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGatewayEnabled(!isGatewayEnabled)}
                  style={{
                    background: isGatewayEnabled ? "#16a34a" : "#cbd5e1",
                    color: "#ffffff",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontSize: "11.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ffffff" }} />
                  {isGatewayEnabled ? "ĐÃ BẬT" : "ĐÃ KHÓA"}
                </button>
              </div>

              {/* Models selection title & actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#334155", textTransform: "uppercase" }}>
                  Danh Sách Model AI Được Cấp Phép ({selectedModels.length}/{DEFAULT_MODELS_LIST.length}):
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedModels(DEFAULT_MODELS_LIST.map((m) => m.id))}
                    style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#334155", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModels([])}
                    style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#94a3b8", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Bỏ chọn hết
                  </button>
                </div>
              </div>

              {/* Models List Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "6px" }}>
                {DEFAULT_MODELS_LIST.map((model) => {
                  const isChecked = selectedModels.includes(model.id);
                  return (
                    <div
                      key={model.id}
                      onClick={() => toggleModel(model.id)}
                      style={{
                        background: isChecked ? "rgba(37, 99, 235, 0.05)" : "#ffffff",
                        border: isChecked ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ accentColor: "#2563eb", width: "15px", height: "15px", cursor: "pointer" }}
                        />
                        <div>
                          <div style={{ fontSize: "12.5px", fontWeight: 750, color: isChecked ? "#1e293b" : "#64748b" }}>
                            {model.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                            {model.provider} • ID: <code style={{ color: "#475569" }}>{model.id}</code>
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 750,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "#f1f5f9",
                          color: "#475569",
                        }}
                      >
                        {model.tag}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "14px 22px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setModelsModalLicense(null)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAllowedModels}
                disabled={submittingModels}
                style={{
                  background: "#2563eb",
                  border: "none",
                  padding: "7px 18px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  color: "#ffffff",
                  cursor: submittingModels ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
                }}
              >
                {submittingModels ? "Đang lưu..." : "Lưu Phân Quyền Model"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
