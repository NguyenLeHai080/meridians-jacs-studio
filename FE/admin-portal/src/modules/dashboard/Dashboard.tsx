import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  LayoutDashboard,
  Key,
  Laptop,
  CreditCard,
  Bot,
  FileText,
  Search,
  RotateCw,
  Bell,
  Power,
  Calendar,
  Plus,
  X,
  Check,
  Copy,
  Pencil,
  Clock,
  Trash2,
  Settings,
  AlertCircle,
  AlertTriangle,
  Zap,
  Lock,
  Unlock,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Cpu,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ApiRequestError, apiRequest, getApiBaseUrl } from "../../core/api";
import { clearToken, getToken } from "../../core/session";

export type License = {
  id: string;
  key_hint: string;
  customer_name: string;
  customer_contact: string;
  hwid: string;
  status: "active" | "blocked" | "expired" | string;
  expires_at?: string | null;
  last_seen_at?: string | null;
  last_app_version?: string | null;
  last_platform?: string | null;
  last_ip?: string | null;
  max_jobs_per_day?: number;
  premium_ai?: boolean;
  logo_url?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type Provider = {
  id: string;
  name: string;
  provider_type: string;
  base_url?: string;
  model: string;
  tts_model?: string | null;
  masked_key: string;
  capabilities: string[];
};

export type TelemetryLog = {
  id: string;
  severity: "info" | "warning" | "error" | "fatal" | string;
  event_name: string;
  fingerprint: string;
  message: string;
  app_version: string;
  created_at?: string;
};

export type BillingTransaction = {
  id: string;
  license_id?: string;
  customer_name: string;
  amount: number;
  plan_type: string;
  payment_method: string;
  transaction_type: string;
  actor: string;
  notes?: string;
  created_at: string;
};

export type BillingSummary = {
  total_revenue: number;
  this_month_revenue: number;
  total_transactions: number;
  revenue_by_plan: Record<string, number>;
  revenue_by_method: Record<string, number>;
};

export type ClientSession = {
  license_id: string;
  customer_name: string;
  hwid: string;
  key_hint: string;
  last_seen_at?: string;
  last_app_version?: string;
  last_platform?: string;
  last_ip?: string;
  is_online: boolean;
};

type MenuKey = "overview" | "licenses" | "sessions" | "billing" | "providers" | "telemetry";

const HWID_PATTERN = /JACS-(?:MAC|WIN|LNX)-[A-F0-9]{32}/;

function normalizeHwid(value: string) {
  const normalized = value.replace(/[\s\u200b-\u200d\ufeff]+/g, "").toUpperCase();
  if (/^JACS-(MAC|WIN|LNX)-[A-F0-9]{32}$/.test(normalized)) return normalized;
  const matches = normalized.match(new RegExp(HWID_PATTERN.source, "g")) || [];
  return matches.length === 1 ? matches[0] : normalized;
}

function licenseHwidError(value: string) {
  if (value === "WEB-DEMO-MACHINE") return "Không thể cấp license cho mã demo. Hãy mở bản Desktop Electron để lấy mã máy thật.";
  if (!/^JACS-(MAC|WIN|LNX)-[A-F0-9]{32}$/.test(value)) return "Mã máy phải có dạng JACS-MAC/WIN/LNX-32 ký tự hex. Hãy copy nguyên Device ID từ tool.";
  return "";
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const token = getToken() ?? "";
  const [activeMenu, setActiveMenu] = useState<MenuKey>("overview");
  
  // Data states
  const [licenses, setLicenses] = useState<License[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [chartPeriod, setChartPeriod] = useState<"14d" | "30d">("14d");
  
  // Modals & Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [renewingLicense, setRenewingLicense] = useState<License | null>(null);
  const [resettingHwidLicense, setResettingHwidLicense] = useState<License | null>(null);
  const [deletingLicense, setDeletingLicense] = useState<License | null>(null);
  
  // Create License Form
  const [licenseForm, setLicenseForm] = useState({
    customer_name: "",
    customer_contact: "",
    hwid: "",
    expires_at: "",
    max_jobs_per_day: "100",
    premium_ai: true,
    logo_url: "",
    notes: "",
    amount: "500000",
    plan_type: "1_month",
    payment_method: "bank_transfer",
  });
  
  // Edit License Form
  const [editForm, setEditForm] = useState({
    customer_name: "",
    customer_contact: "",
    max_jobs_per_day: 100,
    premium_ai: true,
    logo_url: "",
    notes: "",
    expires_at: "",
  });

  // Renew License Form
  const [renewForm, setRenewForm] = useState({
    expires_at: "",
    reason: "Gia hạn hợp đồng dịch vụ",
    amount: "500000",
    plan_type: "1_month",
    payment_method: "bank_transfer",
  });

  // Reset HWID Form
  const [hwidResetForm, setHwidResetForm] = useState({
    hwid: "",
    reason: "Khách hàng đổi máy tính mới",
  });

  // Provider Form
  const [providerForm, setProviderForm] = useState({
    name: "",
    provider_type: "openai",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    tts_model: "tts-1",
    api_key: "",
    capabilities: "analysis, vision, transcription, tts",
  });
  const [providerStatus, setProviderStatus] = useState<Record<string, string>>({});

  // Generated Key popup
  const [generatedKey, setGeneratedKey] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  function handleRequestError(reason: unknown): boolean {
    if (reason instanceof ApiRequestError && reason.status === 401) {
      clearToken();
      onLogout();
      return true;
    }
    return false;
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [licenseRes, providerRes, telemetryRes, txRes, sumRes, sessRes] = await Promise.all([
        apiRequest<License[]>("/api/v1/licenses", {}, token),
        apiRequest<Provider[]>("/api/v1/ai-providers", {}, token),
        apiRequest<TelemetryLog[]>("/api/v1/telemetry/logs?limit=30", {}, token),
        apiRequest<BillingTransaction[]>("/api/v1/billing/transactions", {}, token).catch(() => []),
        apiRequest<BillingSummary>("/api/v1/billing/summary", {}, token).catch(() => null),
        apiRequest<ClientSession[]>("/api/v1/clients/sessions", {}, token).catch(() => []),
      ]);
      setLicenses(licenseRes || []);
      setProviders(providerRes || []);
      setLogs(telemetryRes || []);
      setTransactions(txRes || []);
      setBillingSummary(sumRes);
      setSessions(sessRes || []);
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  // Copy helper
  async function copyText(text: string, itemId?: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement("textarea");
        input.value = text;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      if (itemId) {
        setCopiedItemId(itemId);
        window.setTimeout(() => setCopiedItemId(null), 2000);
      } else {
        setKeyCopied(true);
        window.setTimeout(() => setKeyCopied(false), 2000);
      }
    } catch {
      setError("Không thể sao chép");
    }
  }

  // Create License
  async function handleCreateLicense(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (!licenseForm.customer_name.trim()) { setError("Vui lòng nhập tên khách hàng"); return; }
      if (!licenseForm.customer_contact.trim()) { setError("Vui lòng nhập liên hệ"); return; }
      const normalizedHwid = normalizeHwid(licenseForm.hwid);
      const hwidErr = licenseHwidError(normalizedHwid);
      if (hwidErr) { setError(hwidErr); return; }

      const maxJobs = Number(licenseForm.max_jobs_per_day);
      if (!Number.isInteger(maxJobs) || maxJobs < 1) { setError("Giới hạn job/ngày phải lớn hơn 0"); return; }

      const amountVal = Number(licenseForm.amount) || 0;
      const expiresAt = licenseForm.expires_at ? new Date(licenseForm.expires_at) : null;
      if (expiresAt && expiresAt <= new Date()) { setError("Ngày hết hạn phải ở tương lai"); return; }

      const payload = {
        customer_name: licenseForm.customer_name.trim(),
        customer_contact: licenseForm.customer_contact.trim(),
        hwid: normalizedHwid,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        max_jobs_per_day: maxJobs,
        premium_ai: licenseForm.premium_ai,
        logo_url: licenseForm.logo_url.trim() || null,
        notes: licenseForm.notes.trim() || null,
        amount: amountVal,
        plan_type: licenseForm.plan_type,
        payment_method: licenseForm.payment_method,
      };

      const created = await apiRequest<License & { key: string }>("/api/v1/licenses", {
        method: "POST",
        body: JSON.stringify(payload),
      }, token);

      setGeneratedKey(created.key.trim().toUpperCase());
      setShowCreateModal(false);
      setMessage(`Đã tạo thành công license cho ${payload.customer_name}`);
      setLicenseForm({
        customer_name: "",
        customer_contact: "",
        hwid: "",
        expires_at: "",
        max_jobs_per_day: "100",
        premium_ai: true,
        logo_url: "",
        notes: "",
        amount: "500000",
        plan_type: "1_month",
        payment_method: "bank_transfer",
      });
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không tạo được license");
    }
  }

  // Open Edit Modal
  function openEditModal(lic: License) {
    setEditingLicense(lic);
    setEditForm({
      customer_name: lic.customer_name,
      customer_contact: lic.customer_contact,
      max_jobs_per_day: lic.max_jobs_per_day ?? 100,
      premium_ai: lic.premium_ai ?? true,
      logo_url: lic.logo_url ?? "",
      notes: lic.notes ?? "",
      expires_at: lic.expires_at ? lic.expires_at.slice(0, 16) : "",
    });
  }

  // Save Edit License
  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingLicense) return;
    setError("");
    try {
      const expiresAt = editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null;
      const payload = {
        customer_name: editForm.customer_name.trim() || undefined,
        customer_contact: editForm.customer_contact.trim() || undefined,
        max_jobs_per_day: Number(editForm.max_jobs_per_day) || 100,
        premium_ai: editForm.premium_ai,
        logo_url: editForm.logo_url.trim() || null,
        notes: editForm.notes.trim() || null,
        expires_at: expiresAt,
      };

      await apiRequest(`/api/v1/licenses/${editingLicense.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }, token);

      setEditingLicense(null);
      setMessage(`Đã cập nhật thông tin license ${editingLicense.key_hint}`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không cập nhật được license");
    }
  }

  // Toggle Block / Active
  async function toggleLicense(item: License) {
    const status = item.status === "active" ? "blocked" : "active";
    try {
      await apiRequest(`/api/v1/licenses/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }, token);
      setMessage(`Đã ${status === "active" ? "mở khóa" : "khóa"} license ${item.key_hint}`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không đổi được trạng thái");
    }
  }

  // Open Renew Modal
  function openRenewModal(lic: License) {
    setRenewingLicense(lic);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setRenewForm({
      expires_at: nextMonth.toISOString().slice(0, 16),
      reason: "Gia hạn hợp đồng dịch vụ",
      amount: "500000",
      plan_type: "1_month",
      payment_method: "bank_transfer",
    });
  }

  // Submit Renew
  async function handleRenewSubmit(event: FormEvent) {
    event.preventDefault();
    if (!renewingLicense) return;
    setError("");
    try {
      const expiresAt = new Date(renewForm.expires_at);
      if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        setError("Ngày hết hạn gia hạn phải ở tương lai");
        return;
      }
      await apiRequest(`/api/v1/licenses/${renewingLicense.id}/renew`, {
        method: "POST",
        body: JSON.stringify({
          expires_at: expiresAt.toISOString(),
          reason: renewForm.reason.trim(),
          amount: Number(renewForm.amount) || 0,
          plan_type: renewForm.plan_type,
          payment_method: renewForm.payment_method,
        }),
      }, token);

      setRenewingLicense(null);
      setMessage(`Đã gia hạn thành công license ${renewingLicense.key_hint}`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không gia hạn được license");
    }
  }

  // Open Reset HWID Modal
  function openResetHwidModal(lic: License) {
    setResettingHwidLicense(lic);
    setHwidResetForm({ hwid: "", reason: "Khách hàng đổi máy tính mới" });
  }

  // Submit Reset HWID
  async function handleResetHwidSubmit(event: FormEvent) {
    event.preventDefault();
    if (!resettingHwidLicense) return;
    setError("");
    try {
      const normalizedHwid = normalizeHwid(hwidResetForm.hwid);
      const hwidErr = licenseHwidError(normalizedHwid);
      if (hwidErr) { setError(hwidErr); return; }

      await apiRequest(`/api/v1/licenses/${resettingHwidLicense.id}/reset-hwid`, {
        method: "POST",
        body: JSON.stringify({
          hwid: normalizedHwid,
          reason: hwidResetForm.reason.trim(),
        }),
      }, token);

      setResettingHwidLicense(null);
      setMessage(`Đã đổi Device ID cho license ${resettingHwidLicense.key_hint}`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không đổi được Device ID");
    }
  }

  // Submit Delete License
  async function handleDeleteLicense() {
    if (!deletingLicense) return;
    setError("");
    try {
      await apiRequest(`/api/v1/licenses/${deletingLicense.id}`, { method: "DELETE" }, token);
      setMessage(`Đã xóa vĩnh viễn license ${deletingLicense.key_hint}`);
      setDeletingLicense(null);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không xóa được license");
    }
  }

  // Terminate Client Session
  async function terminateSession(licId: string) {
    try {
      await apiRequest(`/api/v1/clients/sessions/${licId}`, { method: "DELETE" }, token);
      setMessage("Đã ngắt phiên hoạt động của client");
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không ngắt được phiên");
    }
  }

  // Create AI Provider
  async function handleCreateProvider(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiRequest("/api/v1/ai-providers", {
        method: "POST",
        body: JSON.stringify({
          ...providerForm,
          capabilities: providerForm.capabilities.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      }, token);
      setMessage("Đã lưu AI Provider thành công");
      setProviderForm({
        name: "",
        provider_type: "openai",
        base_url: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        tts_model: "tts-1",
        api_key: "",
        capabilities: "analysis, vision, transcription, tts",
      });
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không lưu được provider");
    }
  }

  // Test Provider
  async function handleTestProvider(prov: Provider) {
    setProviderStatus((prev) => ({ ...prev, [prov.id]: "Đang kiểm tra..." }));
    try {
      const res = await apiRequest<{ status: string; detail: string; latency_ms: number }>(
        `/api/v1/ai-providers/${prov.id}/test`,
        { method: "POST" },
        token
      );
      setProviderStatus((prev) => ({ ...prev, [prov.id]: `✓ ${res.status} · ${res.latency_ms}ms` }));
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setProviderStatus((prev) => ({
        ...prev,
        [prov.id]: `✗ ${reason instanceof Error ? reason.message : "Lỗi kết nối"}`,
      }));
    }
  }

  function logout() {
    clearToken();
    onLogout();
  }

  // Filtered Licenses
  const filteredLicenses = licenses.filter((lic) => {
    const matchesSearch =
      !searchTerm ||
      lic.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lic.customer_contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lic.key_hint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lic.hwid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lic.notes && lic.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "all" || lic.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeLicensesCount = licenses.filter((l) => l.status === "active").length;
  const onlineSessionsCount = sessions.filter((s) => s.is_online).length;
  const totalRevenueVal = billingSummary?.total_revenue || 0;
  const thisMonthRevenueVal = billingSummary?.this_month_revenue || 0;

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <a href="#" className="brand-logo" onClick={(e) => { e.preventDefault(); setActiveMenu("overview"); }}>
            <div className="brand-logo-icon">
              <Zap size={18} />
            </div>
            <span className="brand-title">JACS<span>.</span>Admin</span>
          </a>
          <button type="button" className="sidebar-toggle-btn" title="Toggle Navigation">
            <Radio size={16} />
          </button>
        </div>

        <div className="sidebar-menu">
          <div className="menu-heading">TỔNG QUAN & PHÂN TÍCH</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "overview" ? "active" : ""}`}
            onClick={() => setActiveMenu("overview")}
          >
            <span className="menu-icon"><LayoutDashboard size={18} /></span>
            <span className="menu-label">Bảng điều khiển</span>
          </button>

          <div className="menu-heading">QUẢN TRỊ BẢN QUYỀN</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "licenses" ? "active" : ""}`}
            onClick={() => setActiveMenu("licenses")}
          >
            <span className="menu-icon"><Key size={18} /></span>
            <span className="menu-label">Quản lý License Keys</span>
            <span className="menu-badge badge-primary">{activeLicensesCount}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "sessions" ? "active" : ""}`}
            onClick={() => setActiveMenu("sessions")}
          >
            <span className="menu-icon"><Laptop size={18} /></span>
            <span className="menu-label">Máy khách Desktop</span>
            {onlineSessionsCount > 0 ? (
              <span className="menu-badge badge-success">{onlineSessionsCount} online</span>
            ) : (
              <span className="menu-badge badge-primary">{sessions.length}</span>
            )}
          </button>

          <div className="menu-heading">TÀI CHÍNH & DÒNG TIỀN</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "billing" ? "active" : ""}`}
            onClick={() => setActiveMenu("billing")}
          >
            <span className="menu-icon"><CreditCard size={18} /></span>
            <span className="menu-label">Doanh thu & Giao dịch</span>
            <span className="menu-badge badge-warning">{transactions.length}</span>
          </button>

          <div className="menu-heading">HỆ THỐNG & AI</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "providers" ? "active" : ""}`}
            onClick={() => setActiveMenu("providers")}
          >
            <span className="menu-icon"><Bot size={18} /></span>
            <span className="menu-label">AI Providers Gateway</span>
            <span className="menu-badge badge-info">{providers.length}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "telemetry" ? "active" : ""}`}
            onClick={() => setActiveMenu("telemetry")}
          >
            <span className="menu-icon"><FileText size={18} /></span>
            <span className="menu-label">Nhật ký & Telemetry</span>
            {logs.length > 0 && (
              <span className="menu-badge badge-danger">{logs.length}</span>
            )}
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="health-status-badge">
            <span className="health-status-dot"></span>
            <span>API Core: Live</span>
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>v0.1.0</span>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        {/* TOP NAVBAR */}
        <header className="top-navbar">
          <div className="navbar-left">
            <div className="search-box">
              <span className="search-icon"><Search size={16} /></span>
              <input
                type="text"
                className="search-input"
                placeholder="Tìm license, khách hàng, HWID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="nav-tag-badge">
              <ShieldCheck size={14} color="var(--success)" />
              <span>Production Gateway</span>
            </div>
          </div>

          <div className="navbar-right">
            <button
              type="button"
              className="nav-icon-btn"
              onClick={() => void refresh()}
              title="Làm mới dữ liệu từ API"
            >
              <RotateCw size={16} />
            </button>
            <button type="button" className="nav-icon-btn" title="Cảnh báo & Lỗi" onClick={() => setActiveMenu("telemetry")}>
              <Bell size={16} />
              {logs.length > 0 && <span className="notification-badge"></span>}
            </button>

            <div className="user-profile-widget">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                alt="Avatar"
                className="user-avatar-img"
              />
              <div className="user-info-text">
                <span className="user-name-title">Super Admin</span>
                <span className="user-role-sub">admin@jacs.vn</span>
              </div>
              <button
                type="button"
                className="user-logout-btn"
                onClick={logout}
                title="Đăng xuất khỏi hệ thống"
              >
                <Power size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* PAGE BODY */}
        <main className="page-content">
          {/* Header Row */}
          <div className="page-header-row">
            <div>
              <div className="page-title-box">
                <span className="page-icon-badge">
                  {activeMenu === "overview" && <LayoutDashboard size={24} />}
                  {activeMenu === "licenses" && <Key size={24} />}
                  {activeMenu === "sessions" && <Laptop size={24} />}
                  {activeMenu === "billing" && <CreditCard size={24} />}
                  {activeMenu === "providers" && <Bot size={24} />}
                  {activeMenu === "telemetry" && <FileText size={24} />}
                </span>
                <h1 className="page-main-heading">
                  {activeMenu === "overview" && "Tổng Quan Quản Trị Hệ Thống"}
                  {activeMenu === "licenses" && "Quản Lý Bản Quyền License Keys"}
                  {activeMenu === "sessions" && "Giám Sát Máy Khách Desktop Realtime"}
                  {activeMenu === "billing" && "Doanh Thu & Dòng Tiền Giao Dịch"}
                  {activeMenu === "providers" && "Cấu Hình AI Providers Gateway"}
                  {activeMenu === "telemetry" && "Nhật Ký Telemetry & Báo Cáo Lỗi"}
                </h1>
              </div>
              <div className="breadcrumb-trail">
                <span>Trang chủ</span> / <span>JACS Admin</span> / <span>{activeMenu.toUpperCase()}</span>
              </div>
            </div>

            <div className="page-header-actions">
              <button
                type="button"
                className="btn-pill-action"
                onClick={() => setChartPeriod(chartPeriod === "14d" ? "30d" : "14d")}
              >
                <Calendar size={15} />
                <span>Chu kỳ: {chartPeriod === "14d" ? "14 Ngày gần nhất" : "30 Ngày gần nhất"}</span>
              </button>
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={16} /> Cấp License Mới
              </button>
            </div>
          </div>

          {/* Flash Messages */}
          {message && (
            <div className="info-alert-strip" style={{ background: "var(--success-light)", borderColor: "#a7f3d0", color: "var(--success-text)" }}>
              <Check size={18} />
              <span>{message}</span>
              <button type="button" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 800 }} onClick={() => setMessage("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {error && (
            <div className="info-alert-strip" style={{ background: "var(--danger-light)", borderColor: "#fecaca", color: "var(--danger-text)" }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button type="button" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 800 }} onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: OVERVIEW DASHBOARD */}
          {/* ========================================================================= */}
          {activeMenu === "overview" && (
            <>
              {/* TOP 4 KPI CARDS */}
              <div className="kpi-cards-grid">
                {/* Card 1: Active Licenses */}
                <div className="kpi-card" onClick={() => setActiveMenu("licenses")} style={{ cursor: "pointer" }}>
                  <div className="kpi-card-bar bar-success"></div>
                  <div className="kpi-card-title">LICENSE HOẠT ĐỘNG</div>
                  <div className="kpi-card-body">
                    <div className="kpi-main-stat kpi-stat-success">
                      <TrendingUp size={22} />
                      <span>{activeLicensesCount}</span>
                      <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/ {licenses.length}</span>
                    </div>
                    <div className="radial-progress-pill radial-success">
                      <span>{licenses.length > 0 ? Math.round((activeLicensesCount / licenses.length) * 100) : 100}%</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: This Month Revenue */}
                <div className="kpi-card" onClick={() => setActiveMenu("billing")} style={{ cursor: "pointer" }}>
                  <div className="kpi-card-bar bar-primary"></div>
                  <div className="kpi-card-title">DOANH THU THÁNG NÀY</div>
                  <div className="kpi-card-body">
                    <div className="kpi-main-stat" style={{ fontSize: "1.45rem", color: "var(--primary)" }}>
                      <span>{formatCurrency(thisMonthRevenueVal)}</span>
                    </div>
                    <div className="radial-progress-pill radial-info">
                      <span>75%</span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Total Volume */}
                <div className="kpi-card" onClick={() => setActiveMenu("billing")} style={{ cursor: "pointer" }}>
                  <div className="kpi-card-bar bar-warning"></div>
                  <div className="kpi-card-title">TỔNG DOANH THU TÍCH LŨY</div>
                  <div className="kpi-card-body">
                    <div className="kpi-main-stat" style={{ fontSize: "1.45rem" }}>
                      <span>{formatCurrency(totalRevenueVal)}</span>
                    </div>
                    <div className="radial-progress-pill radial-warning">
                      <span>{transactions.length} tx</span>
                    </div>
                  </div>
                </div>

                {/* Card 4: Active Desktop Sessions */}
                <div className="kpi-card" onClick={() => setActiveMenu("sessions")} style={{ cursor: "pointer" }}>
                  <div className="kpi-card-bar bar-info"></div>
                  <div className="kpi-card-title">MÁY KHÁCH ONLINE</div>
                  <div className="kpi-card-body">
                    <div className="kpi-main-stat" style={{ color: "var(--text-dark)" }}>
                      <Radio size={20} color="var(--success)" />
                      <span>{onlineSessionsCount}</span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginLeft: "0.3rem" }}>thiết bị</span>
                    </div>
                    <div className="radial-progress-pill radial-info">
                      <span>{sessions.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CHARTS SECTION (SPLIT 2 COLUMNS) */}
              <div className="charts-split-grid">
                {/* Left Card: Traffic Sources Bar & Line Combined Chart */}
                <div className="card-panel">
                  <div className="card-panel-header">
                    <div>
                      <span className="card-panel-title">Lưu Lượng Render Video & Gọi AI</span>
                      <div className="card-panel-subtitle">Thống kê số lượng video xử lý và truy vấn model AI theo ngày</div>
                    </div>
                    <button type="button" className="btn-actions-amber" onClick={() => setActiveMenu("telemetry")}>
                      Xem Logs
                    </button>
                  </div>

                  <div className="chart-container-box">
                    <svg viewBox="0 0 680 220" width="100%" height="100%" style={{ overflow: "visible" }}>
                      {/* Grid Lines */}
                      <line x1="40" y1="20" x2="640" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="60" x2="640" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="100" x2="640" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="140" x2="640" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="40" y1="180" x2="640" y2="180" stroke="#e2e8f0" strokeWidth="1" />

                      {/* Left Axis Labels */}
                      <text x="25" y="24" fontSize="10" fill="#94a3b8" textAnchor="end">100</text>
                      <text x="25" y="64" fontSize="10" fill="#94a3b8" textAnchor="end">80</text>
                      <text x="25" y="104" fontSize="10" fill="#94a3b8" textAnchor="end">60</text>
                      <text x="25" y="144" fontSize="10" fill="#94a3b8" textAnchor="end">40</text>
                      <text x="25" y="184" fontSize="10" fill="#94a3b8" textAnchor="end">20</text>

                      {/* Right Axis Labels */}
                      <text x="655" y="24" fontSize="10" fill="#94a3b8" textAnchor="start">50</text>
                      <text x="655" y="64" fontSize="10" fill="#94a3b8" textAnchor="start">40</text>
                      <text x="655" y="104" fontSize="10" fill="#94a3b8" textAnchor="start">30</text>
                      <text x="655" y="144" fontSize="10" fill="#94a3b8" textAnchor="start">20</text>
                      <text x="655" y="184" fontSize="10" fill="#94a3b8" textAnchor="start">10</text>

                      {/* Blue Columns (Bars - Rendered Videos) */}
                      <rect x="70" y="110" width="28" height="70" rx="4" fill="#3b82f6" />
                      <text x="84" y="198" fontSize="10" fill="#64748b" textAnchor="middle">01 Jan</text>

                      <rect x="135" y="85" width="28" height="95" rx="4" fill="#3b82f6" />
                      <text x="149" y="198" fontSize="10" fill="#64748b" textAnchor="middle">03 Jan</text>

                      <rect x="200" y="100" width="28" height="80" rx="4" fill="#3b82f6" />
                      <text x="214" y="198" fontSize="10" fill="#64748b" textAnchor="middle">05 Jan</text>

                      <rect x="265" y="55" width="28" height="125" rx="4" fill="#3b82f6" />
                      <text x="279" y="198" fontSize="10" fill="#64748b" textAnchor="middle">07 Jan</text>

                      <rect x="330" y="130" width="28" height="50" rx="4" fill="#3b82f6" />
                      <text x="344" y="198" fontSize="10" fill="#64748b" textAnchor="middle">09 Jan</text>

                      <rect x="395" y="90" width="28" height="90" rx="4" fill="#3b82f6" />
                      <text x="409" y="198" fontSize="10" fill="#64748b" textAnchor="middle">11 Jan</text>

                      <rect x="460" y="40" width="28" height="140" rx="4" fill="#3b82f6" />
                      <text x="474" y="198" fontSize="10" fill="#64748b" textAnchor="middle">13 Jan</text>

                      <rect x="525" y="115" width="28" height="65" rx="4" fill="#3b82f6" />
                      <text x="539" y="198" fontSize="10" fill="#64748b" textAnchor="middle">15 Jan</text>

                      <rect x="590" y="145" width="28" height="35" rx="4" fill="#3b82f6" />
                      <text x="604" y="198" fontSize="10" fill="#64748b" textAnchor="middle">17 Jan</text>

                      {/* Teal Overlay Line Graph (AI Analysis Calls) */}
                      <polyline
                        points="84,120 149,70 214,95 279,125 344,55 409,140 474,105 539,150 604,135"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Dots on line */}
                      {[[84, 120], [149, 70], [214, 95], [279, 125], [344, 55], [409, 140], [474, 105], [539, 150], [604, 135]].map(([cx, cy], i) => (
                        <circle key={i} cx={cx} cy={cy} r="4" fill="#ffffff" stroke="#06b6d4" strokeWidth="2.5" />
                      ))}
                    </svg>
                  </div>

                  <div className="chart-legend-row">
                    <span><span className="legend-dot-blue">●</span> Video Rendered (Clips)</span>
                    <span><span className="legend-dot-teal">●</span> AI Vision & TTS Calls</span>
                  </div>
                </div>

                {/* Right Card: Performance Circular Gauge */}
                <div className="card-panel">
                  <div className="card-panel-header">
                    <div>
                      <span className="card-panel-title">Hiệu Suất AI Gateway</span>
                      <div className="card-panel-subtitle">Hạn mức & Tỷ lệ thành công</div>
                    </div>
                    <button type="button" className="sidebar-toggle-btn" title="Cấu hình Provider" onClick={() => setActiveMenu("providers")}>
                      <Settings size={16} />
                    </button>
                  </div>

                  <div className="gauge-wrapper">
                    <div className="circular-gauge-container">
                      <svg viewBox="0 0 100 100" width="170" height="170">
                        {/* Background track */}
                        <path
                          d="M 15 75 A 40 40 0 1 1 85 75"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                          strokeLinecap="round"
                        />
                        {/* Gradient definition */}
                        <defs>
                          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="60%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                        {/* Progress stroke 75% */}
                        <path
                          d="M 15 75 A 40 40 0 1 1 85 75"
                          fill="none"
                          stroke="url(#gaugeGrad)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray="188"
                          strokeDashoffset="47"
                        />
                      </svg>
                      <div className="gauge-center-text">
                        <span className="gauge-label">Thành công</span>
                        <span className="gauge-number">99.8%</span>
                      </div>
                    </div>

                    <div className="target-progress-widget">
                      <div className="target-progress-header">
                        <span style={{ fontWeight: 800, color: "var(--warning)" }}>32% Hạn mức Token</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>OpenAI + Gemini</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill fill-warning" style={{ width: "32%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 HORIZONTAL BOTTOM SUMMARY METRICS ROW */}
              <div className="summary-strip-grid">
                <div className="summary-card">
                  <div>
                    <div className="summary-card-label">Doanh thu TB / Key</div>
                    <div className="summary-card-val">
                      {formatCurrency(licenses.length > 0 ? totalRevenueVal / licenses.length : 500000)}
                    </div>
                  </div>
                  <span className="trend-badge trend-up">
                    <ArrowUpRight size={14} /> +14%
                  </span>
                </div>

                <div className="summary-card">
                  <div>
                    <div className="summary-card-label">Chi phí AI API Est.</div>
                    <div className="summary-card-val">{formatCurrency(totalRevenueVal * 0.12)}</div>
                  </div>
                  <span className="trend-badge trend-down">
                    <ArrowDownRight size={14} /> 8%
                  </span>
                </div>

                <div className="summary-card">
                  <div>
                    <div className="summary-card-label">Bản quyền Vĩnh viễn</div>
                    <div className="summary-card-val">
                      {licenses.filter((l) => !l.expires_at).length} keys
                    </div>
                  </div>
                  <span className="trend-badge trend-info">
                    <Sparkles size={14} /> Lifetime
                  </span>
                </div>

                <div className="summary-card">
                  <div>
                    <div className="summary-card-label">Tổng giao dịch Billing</div>
                    <div className="summary-card-val">{transactions.length} lượt</div>
                  </div>
                  <span className="trend-badge trend-amber">
                    <TrendingUp size={14} /> +76%
                  </span>
                </div>
              </div>

              {/* TARGET SECTION (4 MULTI-COLORED PROGRESS BARS) */}
              <div className="target-section-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="card-panel-title">Chỉ Số Mục Tiêu & Sức Khỏe Vận Hành (Targets)</span>
                  <a href="#" style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 700, textDecoration: "none" }} onClick={(e) => { e.preventDefault(); setActiveMenu("billing"); }}>
                    Xem chi tiết giao dịch →
                  </a>
                </div>

                <div className="target-grid">
                  {/* Target 1 */}
                  <div className="target-item">
                    <div className="target-item-top">
                      <span className="target-percent">71%</span>
                      <div className="progress-track" style={{ flex: 1, margin: "0 0.5rem" }}>
                        <div className="progress-fill fill-danger" style={{ width: "71%" }}></div>
                      </div>
                    </div>
                    <span className="target-label">Mục tiêu Doanh thu Tháng</span>
                  </div>

                  {/* Target 2 */}
                  <div className="target-item">
                    <div className="target-item-top">
                      <span className="target-percent">94%</span>
                      <div className="progress-track" style={{ flex: 1, margin: "0 0.5rem" }}>
                        <div className="progress-fill fill-success" style={{ width: "94%" }}></div>
                      </div>
                    </div>
                    <span className="target-label">Tỷ lệ License Đang Hoạt động</span>
                  </div>

                  {/* Target 3 */}
                  <div className="target-item">
                    <div className="target-item-top">
                      <span className="target-percent">32%</span>
                      <div className="progress-track" style={{ flex: 1, margin: "0 0.5rem" }}>
                        <div className="progress-fill fill-warning" style={{ width: "32%" }}></div>
                      </div>
                    </div>
                    <span className="target-label">Hạn mức Token AI Gateway</span>
                  </div>

                  {/* Target 4 */}
                  <div className="target-item">
                    <div className="target-item-top">
                      <span className="target-percent">99.9%</span>
                      <div className="progress-track" style={{ flex: 1, margin: "0 0.5rem" }}>
                        <div className="progress-fill fill-info" style={{ width: "99.9%" }}></div>
                      </div>
                    </div>
                    <span className="target-label">Uptime Hệ Thống Core</span>
                  </div>
                </div>
              </div>

              {/* DUAL SPLIT PANELS: RECENT CLIENTS & SYSTEM ALERTS */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.25rem", marginTop: "1.5rem" }}>
                {/* Recent Connected Clients */}
                <div className="card-panel">
                  <div className="card-panel-header">
                    <div>
                      <span className="card-panel-title">Thiết Bị Kết Nối Gần Nhất</span>
                      <div className="card-panel-subtitle">Tín hiệu heartbeat từ ứng dụng Desktop</div>
                    </div>
                    <button type="button" className="btn-icon-action" onClick={() => setActiveMenu("sessions")}>
                      Xem tất cả ({sessions.length})
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="architect-table">
                      <thead>
                        <tr>
                          <th>Khách hàng</th>
                          <th>Device ID</th>
                          <th>Bản Tool / OS</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.slice(0, 5).map((sess) => (
                          <tr key={sess.license_id}>
                            <td>
                              <strong>{sess.customer_name}</strong>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{sess.key_hint}</div>
                            </td>
                            <td><span className="code-chip">{sess.hwid.slice(0, 16)}...</span></td>
                            <td>
                              <span style={{ fontSize: "0.78rem" }}>
                                {sess.last_platform || "Windows"} · v{sess.last_app_version || "0.3.17"}
                              </span>
                            </td>
                            <td>
                              <span className={`pill-status ${sess.is_online ? "pill-online" : "pill-offline"}`}>
                                {sess.is_online ? "● Online" : "Offline"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {sessions.length === 0 && (
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                              Chưa có thiết bị nào gửi heartbeat.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Telemetry Alerts */}
                <div className="card-panel">
                  <div className="card-panel-header">
                    <div>
                      <span className="card-panel-title">Cảnh Báo & Telemetry Gần Đây</span>
                      <div className="card-panel-subtitle">Tự động thu thập từ Desktop tool</div>
                    </div>
                    <button type="button" className="btn-icon-action" onClick={() => setActiveMenu("telemetry")}>
                      Xem chi tiết
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    {logs.slice(0, 4).map((log) => (
                      <div key={log.id} style={{ padding: "0.65rem 0.85rem", background: "#f8fafc", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                          <span className={`pill-status pill-${log.severity === "fatal" ? "fatal" : log.severity === "error" ? "blocked" : "warning"}`} style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem" }}>
                            {log.severity.toUpperCase()}
                          </span>
                          <strong style={{ fontSize: "0.8rem", color: "var(--text-dark)" }}>{log.event_name}</strong>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginLeft: "auto" }}>v{log.app_version}</span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.message}
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                        <Check size={16} color="var(--success)" style={{ verticalAlign: "middle", marginRight: "0.3rem" }} />
                        Không có sự cố nào được ghi nhận. Hệ thống vận hành ổn định.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* VIEW: LICENSES MANAGEMENT */}
          {/* ========================================================================= */}
          {activeMenu === "licenses" && (
            <div className="card-panel">
              <div className="card-panel-header">
                <div>
                  <h2 className="card-panel-title">Danh Sách License Bản Quyền ({filteredLicenses.length})</h2>
                  <div className="card-panel-subtitle">Quản lý cấp phát, khóa/mở khóa, gia hạn và đổi mã máy (HWID)</div>
                </div>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} /> Cấp License Mới
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div style={{ display: "flex", gap: "0.85rem", marginBottom: "1.25rem" }}>
                <input
                  type="text"
                  className="form-input-light"
                  placeholder="Tìm kiếm theo tên khách hàng, email, Key Hint, Device ID..."
                  style={{ flex: 1 }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="form-select-light"
                  style={{ width: "200px" }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động (Active)</option>
                  <option value="blocked">Đang bị khóa (Blocked)</option>
                  <option value="expired">Đã hết hạn (Expired)</option>
                </select>
              </div>

              <div className="table-responsive">
                <table className="architect-table">
                  <thead>
                    <tr>
                      <th>Khách hàng & Logo</th>
                      <th>Key Hint & Device ID (HWID)</th>
                      <th>Hạn Dùng & Giới Hạn</th>
                      <th>Thiết Bị & Lần Cuối Online</th>
                      <th>Trạng Thái</th>
                      <th style={{ textAlign: "right" }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLicenses.map((lic) => (
                      <tr key={lic.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                            {lic.logo_url ? (
                              <img
                                src={lic.logo_url}
                                alt="logo"
                                style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "contain", background: "#f8fafc", border: "1px solid var(--border-light)" }}
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                              />
                            ) : (
                              <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "#eff6ff", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>
                                {lic.customer_name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <strong style={{ color: "var(--text-dark)", display: "block" }}>{lic.customer_name}</strong>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{lic.customer_contact}</span>
                              {lic.notes && (
                                <span style={{ display: "block", color: "var(--text-dim)", fontSize: "0.72rem", fontStyle: "italic" }}>
                                  {lic.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span className="code-chip">{lic.key_hint}</span>
                            <button
                              type="button"
                              className="btn-icon-action"
                              style={{ padding: "0.2rem 0.45rem", fontSize: "0.72rem" }}
                              onClick={() => void copyText(lic.key_hint, lic.id)}
                            >
                              {copiedItemId === lic.id ? (
                                <>
                                  <Check size={12} color="var(--success)" /> Đã copy
                                </>
                              ) : (
                                <>
                                  <Copy size={12} /> Copy
                                </>
                              )}
                            </button>
                          </div>
                          <div style={{ marginTop: "0.25rem" }}>
                            <span className="code-chip" style={{ background: "#f8fafc", color: "#475569", fontSize: "0.72rem" }}>{lic.hwid}</span>
                          </div>
                        </td>
                        <td>
                          <div>
                            {lic.expires_at ? (
                              <strong style={{ color: "var(--text-dark)" }}>{new Date(lic.expires_at).toLocaleDateString("vi-VN")}</strong>
                            ) : (
                              <span style={{ color: "var(--success-text)", fontWeight: 800, background: "var(--success-light)", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>Vĩnh viễn</span>
                            )}
                          </div>
                          <small style={{ color: "var(--text-muted)", display: "block", marginTop: "0.15rem" }}>
                            {lic.max_jobs_per_day} jobs/ngày {lic.premium_ai ? "· Premium AI" : ""}
                          </small>
                        </td>
                        <td>
                          <div>{lic.last_platform || "--"} {lic.last_app_version ? `· v${lic.last_app_version}` : ""}</div>
                          <small style={{ color: "var(--text-muted)", display: "block" }}>{lic.last_ip || "Chưa có IP"}</small>
                          <small style={{ color: lic.last_seen_at ? "var(--success)" : "var(--text-dim)", fontWeight: 600 }}>
                            {lic.last_seen_at ? `Online: ${new Date(lic.last_seen_at).toLocaleTimeString("vi-VN")}` : "Chưa online"}
                          </small>
                        </td>
                        <td>
                          <span className={`pill-status pill-${lic.status}`}>
                            ● {lic.status === "active" ? "Active" : lic.status === "blocked" ? "Blocked" : "Expired"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.3rem" }}>
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => openEditModal(lic)}
                              title="Sửa thông tin"
                            >
                              <Pencil size={13} /> Sửa
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => openRenewModal(lic)}
                              title="Gia hạn thêm hạn dùng"
                            >
                              <Clock size={13} /> Gia hạn
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => openResetHwidModal(lic)}
                              title="Đổi mã máy tính"
                            >
                              <RotateCw size={13} /> Đổi máy
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action"
                              onClick={() => void toggleLicense(lic)}
                            >
                              {lic.status === "active" ? (
                                <>
                                  <Lock size={13} /> Khóa
                                </>
                              ) : (
                                <>
                                  <Unlock size={13} /> Mở
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn-icon-action btn-danger-action"
                              onClick={() => setDeletingLicense(lic)}
                              title="Xóa vĩnh viễn"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLicenses.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          Không tìm thấy license nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: DESKTOP SESSIONS */}
          {/* ========================================================================= */}
          {activeMenu === "sessions" && (
            <div className="card-panel">
              <div className="card-panel-header">
                <div>
                  <h2 className="card-panel-title">Phiên Làm Việc Desktop Realtime ({sessions.length})</h2>
                  <div className="card-panel-subtitle">Theo dõi tín hiệu kết nối từ các máy cài đặt JACS Studio Desktop</div>
                </div>
                <button type="button" className="btn-pill-action" onClick={() => void refresh()}>
                  <RotateCw size={15} /> Làm mới danh sách
                </button>
              </div>

              <div className="table-responsive">
                <table className="architect-table">
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>Key Hint</th>
                      <th>Device ID (HWID)</th>
                      <th>Hệ Điều Hành / Bản Tool</th>
                      <th>Địa Chỉ IP</th>
                      <th>Trạng Thái</th>
                      <th style={{ textAlign: "right" }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((sess) => (
                      <tr key={sess.license_id}>
                        <td><strong>{sess.customer_name}</strong></td>
                        <td><span className="code-chip">{sess.key_hint}</span></td>
                        <td><span className="code-chip">{sess.hwid}</span></td>
                        <td>{sess.last_platform || "--"} {sess.last_app_version ? `· v${sess.last_app_version}` : ""}</td>
                        <td><code>{sess.last_ip || "--"}</code></td>
                        <td>
                          <span className={`pill-status ${sess.is_online ? "pill-online" : "pill-offline"}`}>
                            ● {sess.is_online ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn-icon-action btn-danger-action"
                            onClick={() => void terminateSession(sess.license_id)}
                          >
                            <Power size={13} /> Ngắt phiên
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          Chưa có thiết bị nào kết nối tới máy chủ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: BILLING & REVENUE */}
          {/* ========================================================================= */}
          {activeMenu === "billing" && (
            <div className="card-panel">
              <div className="card-panel-header">
                <div>
                  <h2 className="card-panel-title">Lịch Sử Giao Dịch & Dòng Tiền Thu ({transactions.length})</h2>
                  <div className="card-panel-subtitle">Tự động ghi nhận khi Cấp key mới hoặc Gia hạn hợp đồng</div>
                </div>
                <span className="trend-badge trend-up" style={{ fontSize: "0.85rem", padding: "0.35rem 0.85rem" }}>
                  Tổng Doanh Thu: {formatCurrency(totalRevenueVal)}
                </span>
              </div>

              <div className="table-responsive">
                <table className="architect-table">
                  <thead>
                    <tr>
                      <th>Thời Gian</th>
                      <th>Khách Hàng</th>
                      <th>Gói Bản Quyền</th>
                      <th>Loại Giao Dịch</th>
                      <th>Phương Thức</th>
                      <th>Số Tiền</th>
                      <th>Người Thực Hiện</th>
                      <th>Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{new Date(tx.created_at).toLocaleString("vi-VN")}</td>
                        <td><strong>{tx.customer_name}</strong></td>
                        <td>
                          <span className="code-chip">{tx.plan_type}</span>
                        </td>
                        <td>
                          <span className="pill-status pill-info">
                            {tx.transaction_type === "new_key" ? "Cấp Key Mới" : "Gia Hạn"}
                          </span>
                        </td>
                        <td>{tx.payment_method}</td>
                        <td><strong style={{ color: "var(--success)", fontSize: "0.95rem" }}>{formatCurrency(tx.amount)}</strong></td>
                        <td><small>{tx.actor}</small></td>
                        <td><small style={{ color: "var(--text-muted)" }}>{tx.notes || "--"}</small></td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          Chưa có giao dịch thanh toán nào được ghi nhận.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: AI PROVIDERS */}
          {/* ========================================================================= */}
          {activeMenu === "providers" && (
            <div className="card-panel">
              <div className="card-panel-header">
                <div>
                  <h2 className="card-panel-title">Cấu Hình AI Providers Gateway ({providers.length})</h2>
                  <div className="card-panel-subtitle">Quản lý các kết nối API OpenAI, Gemini, Claude và Text-to-Speech</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1.5rem" }}>
                {/* Providers List */}
                <div>
                  {providers.map((prov) => (
                    <div key={prov.id} className="card-panel" style={{ marginBottom: "1rem", background: "#f8fafc", boxShadow: "none", border: "1px solid var(--border-light)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <strong style={{ color: "var(--text-dark)", fontSize: "0.95rem" }}>{prov.name}</strong>
                        <span className="code-chip">{prov.provider_type}</span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        Model Vision/Analysis: <strong>{prov.model}</strong>
                      </div>
                      {prov.tts_model && (
                        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          Model Text-To-Speech: <strong>{prov.tts_model}</strong>
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: "var(--text-dim)", marginTop: "0.35rem" }}>
                        Secret Key: <code>{prov.masked_key}</code>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.85rem", paddingTop: "0.65rem", borderTop: "1px solid var(--border-light)" }}>
                        <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.78rem" }}>
                          {providerStatus[prov.id] || "✓ Gateway sẵn sàng"}
                        </span>
                        <button
                          type="button"
                          className="btn-icon-action"
                          onClick={() => void handleTestProvider(prov)}
                        >
                          <Cpu size={13} /> Kiểm tra Latency
                        </button>
                      </div>
                    </div>
                  ))}
                  {providers.length === 0 && (
                    <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                      Chưa có AI Provider nào. Hãy tạo mới ở biểu mẫu bên phải.
                    </div>
                  )}
                </div>

                {/* Add Provider Form */}
                <form onSubmit={(e) => void handleCreateProvider(e)} className="card-panel" style={{ background: "#ffffff" }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: "1rem", color: "var(--text-dark)" }}>+ Thêm AI Gateway Mới</h3>
                  <div className="form-group-light">
                    <label className="form-label-light">Tên Provider *</label>
                    <input
                      required
                      className="form-input-light"
                      value={providerForm.name}
                      onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                      placeholder="OpenAI Production 4o"
                    />
                  </div>
                  <div className="form-group-light">
                    <label className="form-label-light">Loại Provider *</label>
                    <select
                      className="form-select-light"
                      value={providerForm.provider_type}
                      onChange={(e) => {
                        const provider_type = e.target.value;
                        const capabilities = ["openai", "openai-compatible"].includes(provider_type)
                          ? "analysis, vision, transcription, tts"
                          : provider_type === "custom"
                          ? "analysis"
                          : "analysis, vision";
                        const tts_model = ["openai", "openai-compatible"].includes(provider_type) ? "tts-1" : "";
                        setProviderForm({ ...providerForm, provider_type, capabilities, tts_model });
                      }}
                    >
                      <option value="openai">OpenAI (Official)</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="anthropic">Anthropic Claude</option>
                      <option value="openai-compatible">OpenAI Compatible (Groq / OpenRouter)</option>
                    </select>
                  </div>
                  <div className="form-group-light">
                    <label className="form-label-light">Base URL *</label>
                    <input
                      type="url"
                      required
                      className="form-input-light"
                      value={providerForm.base_url}
                      onChange={(e) => setProviderForm({ ...providerForm, base_url: e.target.value })}
                    />
                  </div>
                  <div className="form-group-light">
                    <label className="form-label-light">Model Name *</label>
                    <input
                      required
                      className="form-input-light"
                      value={providerForm.model}
                      onChange={(e) => setProviderForm({ ...providerForm, model: e.target.value })}
                      placeholder="gpt-4o-mini"
                    />
                  </div>
                  <div className="form-group-light">
                    <label className="form-label-light">API Key (Secret) *</label>
                    <input
                      required
                      type="password"
                      className="form-input-light"
                      value={providerForm.api_key}
                      onChange={(e) => setProviderForm({ ...providerForm, api_key: e.target.value })}
                      placeholder="sk-..."
                    />
                  </div>
                  <button type="submit" className="btn-primary-action" style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }} disabled={loading}>
                    Lưu AI Provider
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: TELEMETRY & LOGS */}
          {/* ========================================================================= */}
          {activeMenu === "telemetry" && (
            <div className="card-panel">
              <div className="card-panel-header">
                <div>
                  <h2 className="card-panel-title">Nhật Ký Telemetry & Báo Cáo Sự Cố ({logs.length})</h2>
                  <div className="card-panel-subtitle">Ghi nhận tự động lỗi crash, FFmpeg render fail từ các bản Desktop</div>
                </div>
                <button type="button" className="btn-pill-action" onClick={() => void refresh()}>
                  <RotateCw size={15} /> Làm mới Logs
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {logs.map((log) => (
                  <div key={log.id} style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.35rem" }}>
                      <span className={`pill-status pill-${log.severity === "fatal" ? "fatal" : log.severity === "error" ? "blocked" : "warning"}`}>
                        {log.severity.toUpperCase()}
                      </span>
                      <strong style={{ color: "var(--text-dark)", fontSize: "0.9rem" }}>{log.event_name}</strong>
                      <span className="code-chip" style={{ fontSize: "0.72rem" }}>v{log.app_version}</span>
                      {log.created_at && (
                        <small style={{ marginLeft: "auto", color: "var(--text-dim)" }}>
                          {new Date(log.created_at).toLocaleString("vi-VN")}
                        </small>
                      )}
                    </div>
                    <div style={{ fontSize: "0.84rem", color: "var(--text-main)", background: "#ffffff", padding: "0.65rem", borderRadius: "6px", border: "1px solid #edf2f7", fontFamily: "var(--font-mono)" }}>
                      {log.message}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div style={{ textAlign: "center", padding: "3.5rem", color: "var(--text-muted)" }}>
                    <Check size={16} color="var(--success)" style={{ verticalAlign: "middle", marginRight: "0.3rem" }} />
                    Không có sự cố nào được ghi nhận. Hệ thống vận hành hoàn toàn ổn định.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button
        type="button"
        className="floating-action-fab"
        onClick={() => setShowCreateModal(true)}
        title="Cấp License Mới"
      >
        <Settings size={22} />
      </button>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* MODAL: CREATE LICENSE */}
      {showCreateModal && (
        <div className="modal-backdrop-light">
          <div className="modal-card-light" style={{ maxWidth: "600px" }}>
            <div className="modal-header-light">
              <div>
                <h3 className="modal-title-light">Cấp License Khách Hàng Mới</h3>
                <span className="modal-subtitle-light">Sinh mã kích hoạt 12 ký tự duy nhất cho thiết bị</span>
              </div>
              <button type="button" className="sidebar-toggle-btn" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateLicense(e)} className="modal-body-light">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group-light">
                  <label className="form-label-light">Tên khách hàng / Studio *</label>
                  <input
                    required
                    className="form-input-light"
                    value={licenseForm.customer_name}
                    onChange={(e) => setLicenseForm({ ...licenseForm, customer_name: e.target.value })}
                    placeholder="Studio Media ABC"
                  />
                </div>
                <div className="form-group-light">
                  <label className="form-label-light">Email / SĐT liên hệ *</label>
                  <input
                    required
                    className="form-input-light"
                    value={licenseForm.customer_contact}
                    onChange={(e) => setLicenseForm({ ...licenseForm, customer_contact: e.target.value })}
                    placeholder="contact@studio.vn"
                  />
                </div>
              </div>

              <div className="form-group-light">
                <label className="form-label-light">Device ID máy khách (HWID) *</label>
                <input
                  required
                  className="form-input-light"
                  value={licenseForm.hwid}
                  onChange={(e) => setLicenseForm({ ...licenseForm, hwid: normalizeHwid(e.target.value) })}
                  placeholder="JACS-WIN-11223344556677889900AABBCCDDEEFF"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group-light">
                  <label className="form-label-light">Ngày hết hạn (để trống nếu vĩnh viễn)</label>
                  <input
                    type="datetime-local"
                    className="form-input-light"
                    value={licenseForm.expires_at}
                    onChange={(e) => setLicenseForm({ ...licenseForm, expires_at: e.target.value })}
                  />
                </div>
                <div className="form-group-light">
                  <label className="form-label-light">Giới hạn Job/ngày</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input-light"
                    value={licenseForm.max_jobs_per_day}
                    onChange={(e) => setLicenseForm({ ...licenseForm, max_jobs_per_day: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group-light">
                  <label className="form-label-light">Logo Branding URL</label>
                  <input
                    type="url"
                    className="form-input-light"
                    value={licenseForm.logo_url}
                    onChange={(e) => setLicenseForm({ ...licenseForm, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="form-group-light">
                  <label className="form-label-light">Ghi chú</label>
                  <input
                    className="form-input-light"
                    value={licenseForm.notes}
                    onChange={(e) => setLicenseForm({ ...licenseForm, notes: e.target.value })}
                    placeholder="Hợp đồng doanh nghiệp..."
                  />
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", marginTop: "0.5rem", border: "1px solid var(--border-light)" }}>
                <span className="form-label-light" style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-dark)" }}>Thông tin thanh toán & Doanh thu</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group-light" style={{ margin: 0 }}>
                    <label className="form-label-light">Số tiền thu (VND)</label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      className="form-input-light"
                      value={licenseForm.amount}
                      onChange={(e) => setLicenseForm({ ...licenseForm, amount: e.target.value })}
                    />
                  </div>
                  <div className="form-group-light" style={{ margin: 0 }}>
                    <label className="form-label-light">Gói bản quyền</label>
                    <select
                      className="form-select-light"
                      value={licenseForm.plan_type}
                      onChange={(e) => setLicenseForm({ ...licenseForm, plan_type: e.target.value })}
                    >
                      <option value="1_month">1 Tháng</option>
                      <option value="3_months">3 Tháng</option>
                      <option value="6_months">6 Tháng</option>
                      <option value="1_year">1 Năm</option>
                      <option value="lifetime">Vĩnh viễn (Lifetime)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer-light">
                <button type="button" className="btn-secondary-light" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary-action" disabled={loading}>
                  Xác nhận Cấp Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT LICENSE */}
      {editingLicense && (
        <div className="modal-backdrop-light">
          <div className="modal-card-light" style={{ maxWidth: "560px" }}>
            <div className="modal-header-light">
              <div>
                <h3 className="modal-title-light">Sửa License: {editingLicense.key_hint}</h3>
                <span className="modal-subtitle-light">Khách hàng: {editingLicense.customer_name}</span>
              </div>
              <button type="button" className="sidebar-toggle-btn" onClick={() => setEditingLicense(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSaveEdit(e)} className="modal-body-light">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group-light">
                  <label className="form-label-light">Tên khách hàng</label>
                  <input
                    className="form-input-light"
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                  />
                </div>
                <div className="form-group-light">
                  <label className="form-label-light">Liên hệ</label>
                  <input
                    className="form-input-light"
                    value={editForm.customer_contact}
                    onChange={(e) => setEditForm({ ...editForm, customer_contact: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group-light">
                  <label className="form-label-light">Hạn dùng</label>
                  <input
                    type="datetime-local"
                    className="form-input-light"
                    value={editForm.expires_at}
                    onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                  />
                </div>
                <div className="form-group-light">
                  <label className="form-label-light">Giới hạn Job/ngày</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input-light"
                    value={editForm.max_jobs_per_day}
                    onChange={(e) => setEditForm({ ...editForm, max_jobs_per_day: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group-light">
                <label className="form-label-light">Logo Branding URL</label>
                <input
                  type="url"
                  className="form-input-light"
                  value={editForm.logo_url}
                  onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
                />
              </div>

              <div className="form-group-light">
                <label className="form-label-light">Ghi chú</label>
                <input
                  className="form-input-light"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-footer-light">
                <button type="button" className="btn-secondary-light" onClick={() => setEditingLicense(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary-action" disabled={loading}>
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RENEW */}
      {renewingLicense && (
        <div className="modal-backdrop-light">
          <div className="modal-card-light" style={{ maxWidth: "500px" }}>
            <div className="modal-header-light">
              <div>
                <h3 className="modal-title-light">Gia hạn License: {renewingLicense.key_hint}</h3>
                <span className="modal-subtitle-light">Khách hàng: {renewingLicense.customer_name}</span>
              </div>
              <button type="button" className="sidebar-toggle-btn" onClick={() => setRenewingLicense(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void handleRenewSubmit(e)} className="modal-body-light">
              <div className="form-group-light">
                <label className="form-label-light">Ngày hết hạn mới *</label>
                <input
                  type="datetime-local"
                  required
                  className="form-input-light"
                  value={renewForm.expires_at}
                  onChange={(e) => setRenewForm({ ...renewForm, expires_at: e.target.value })}
                />
              </div>

              <div className="form-group-light">
                <label className="form-label-light">Lý do gia hạn *</label>
                <input
                  required
                  className="form-input-light"
                  value={renewForm.reason}
                  onChange={(e) => setRenewForm({ ...renewForm, reason: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group-light">
                  <label className="form-label-light">Số tiền thu (VND)</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    className="form-input-light"
                    value={renewForm.amount}
                    onChange={(e) => setRenewForm({ ...renewForm, amount: e.target.value })}
                  />
                </div>
                <div className="form-group-light">
                  <label className="form-label-light">Gói gia hạn</label>
                  <select
                    className="form-select-light"
                    value={renewForm.plan_type}
                    onChange={(e) => setRenewForm({ ...renewForm, plan_type: e.target.value })}
                  >
                    <option value="1_month">1 Tháng</option>
                    <option value="3_months">3 Tháng</option>
                    <option value="6_months">6 Tháng</option>
                    <option value="1_year">1 Năm</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer-light">
                <button type="button" className="btn-secondary-light" onClick={() => setRenewingLicense(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary-action" disabled={loading}>
                  Xác Nhận Gia Hạn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET HWID */}
      {resettingHwidLicense && (
        <div className="modal-backdrop-light">
          <div className="modal-card-light" style={{ maxWidth: "520px" }}>
            <div className="modal-header-light">
              <div>
                <h3 className="modal-title-light">Đổi Device ID (Chuyển máy tính)</h3>
                <span className="modal-subtitle-light">License: {resettingHwidLicense.key_hint}</span>
              </div>
              <button type="button" className="sidebar-toggle-btn" onClick={() => setResettingHwidLicense(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void handleResetHwidSubmit(e)} className="modal-body-light">
              <div className="form-group-light">
                <label className="form-label-light">Device ID máy mới *</label>
                <input
                  required
                  className="form-input-light"
                  value={hwidResetForm.hwid}
                  onChange={(e) => setHwidResetForm({ ...hwidResetForm, hwid: normalizeHwid(e.target.value) })}
                  placeholder="JACS-WIN-..."
                />
              </div>

              <div className="form-group-light">
                <label className="form-label-light">Lý do chuyển máy *</label>
                <input
                  required
                  className="form-input-light"
                  value={hwidResetForm.reason}
                  onChange={(e) => setHwidResetForm({ ...hwidResetForm, reason: e.target.value })}
                />
              </div>

              <div className="modal-footer-light">
                <button type="button" className="btn-secondary-light" onClick={() => setResettingHwidLicense(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn-primary-action" disabled={loading}>
                  Xác Nhận Đổi Máy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE */}
      {deletingLicense && (
        <div className="modal-backdrop-light">
          <div className="modal-card-light" style={{ maxWidth: "440px" }}>
            <div className="modal-header-light">
              <h3 className="modal-title-light" style={{ color: "var(--danger)" }}>Xác nhận Xóa License</h3>
              <button type="button" className="sidebar-toggle-btn" onClick={() => setDeletingLicense(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body-light">
              <p>Bạn có chắc chắn muốn xóa vĩnh viễn license <strong>{deletingLicense.key_hint}</strong> của khách hàng <strong>{deletingLicense.customer_name}</strong>?</p>
              <p style={{ color: "var(--danger)", fontSize: "0.82rem", marginTop: "0.5rem" }}>Client sử dụng key này sẽ bị ngắt quyền truy cập ngay lập tức.</p>
              <div className="modal-footer-light">
                <button type="button" className="btn-secondary-light" onClick={() => setDeletingLicense(null)}>
                  Hủy
                </button>
                <button type="button" className="btn-primary-action" style={{ background: "var(--danger)", borderColor: "var(--danger)" }} onClick={() => void handleDeleteLicense()}>
                  Xóa Vĩnh Viễn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GENERATED KEY SUCCESS */}
      {generatedKey && (
        <div className="modal-backdrop-light">
          <div className="modal-card-light" style={{ maxWidth: "520px" }}>
            <div className="modal-header-light">
              <h3 className="modal-title-light" style={{ color: "var(--success)" }}>
                <Sparkles size={20} style={{ verticalAlign: "middle", marginRight: "0.4rem" }} />
                Cấp License Thành Công!
              </h3>
              <button type="button" className="sidebar-toggle-btn" onClick={() => setGeneratedKey("")}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body-light">
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                Hãy copy và gửi License Key này cho khách hàng để kích hoạt trên ứng dụng Desktop JACS Studio:
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", border: "1px solid var(--border-light)", padding: "0.85rem 1rem", borderRadius: "8px", margin: "1rem 0" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--primary)", letterSpacing: "0.05em", fontFamily: "var(--font-mono)" }}>
                  {generatedKey}
                </span>
                <button
                  type="button"
                  className="btn-primary-action"
                  style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
                  onClick={() => void copyText(generatedKey)}
                >
                  {keyCopied ? (
                    <>
                      <Check size={14} /> Đã Copy
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy Key
                    </>
                  )}
                </button>
              </div>
              <small style={{ color: "var(--text-muted)", display: "block" }}>
                🔒 Key chỉ hiển thị một lần duy nhất lúc tạo. Hệ thống không lưu plaintext key.
              </small>
              <div className="modal-footer-light">
                <button type="button" className="btn-primary-action" onClick={() => setGeneratedKey("")}>
                  Đã Lưu Mã Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
