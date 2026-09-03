import { useEffect, useRef, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import {
  LayoutDashboard,
  Key,
  Laptop,
  CreditCard,
  Bot,
  FileText,
  Settings,
  Search,
  RotateCw,
  Bell,
  Power,
  Plus,
  X,
  Check,
  Copy,
  Pencil,
  Clock,
  Trash2,
  AlertTriangle,
  Zap,
  Lock,
  Unlock,
  ArrowUpRight,
  Globe,
  ChevronDown,
  MessageSquare,
  Wallet,
  Database,
  Server,
  Download,
  Upload,
  Shield,
  Activity,
  Menu,
  User,
  KeyRound,
  Rocket,
} from "lucide-react";
import { ApiRequestError, apiRequest } from "../../core/api";
import { clearToken, getToken, setToken } from "../../core/session";
import { useI18n } from "../../core/i18n";
import { ReleasesPage, type Release } from "../releases/ReleasesPage";

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
  provider_type: "openai" | "gemini" | "custom";
  base_url: string;
  model: string;
  tts_model?: string;
  capabilities: string[];
  is_enabled: boolean;
};

export type TelemetryLog = {
  id: string;
  machine_id: string;
  app_version: string;
  event_name: string;
  severity: "info" | "warning" | "error" | "fatal";
  message: string;
  details?: Record<string, unknown>;
  created_at: string;
};

export type BillingTransaction = {
  id: string;
  license_id?: string;
  customer_name: string;
  plan_name: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_type: "new_key" | "renewal" | "upgrade" | "adjustment";
  notes?: string;
  created_at: string;
  created_by?: string;
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

export type SystemSettings = {
  app_name: string;
  default_days_valid: number;
  default_max_jobs: number;
  telemetry_enabled: boolean;
  auto_backup: boolean;
  notification_email: string;
  studio_brand_name: string;
  custom_logo_url: string;
};

export type SystemInfo = {
  app_name: string;
  version: string;
  environment: string;
  python_version: string;
  platform: string;
  store_backend: string;
  telemetry_enabled: boolean;
  total_licenses: number;
  total_transactions: number;
  total_providers: number;
  total_telemetry_events: number;
  timestamp: string;
};

type MenuKey = "overview" | "licenses" | "sessions" | "billing" | "providers" | "telemetry" | "releases" | "settings";

const VALID_MENUS: MenuKey[] = [
  "overview",
  "licenses",
  "sessions",
  "billing",
  "providers",
  "telemetry",
  "releases",
  "settings",
];

function getInitialMenu(): MenuKey {
  if (typeof window === "undefined") return "overview";
  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase() as MenuKey;
  if (VALID_MENUS.includes(hash)) return hash;
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab") as MenuKey;
  if (VALID_MENUS.includes(tab)) return tab;
  return "overview";
}

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
  const { language, setLanguage, t } = useI18n();
  const [activeMenu, setActiveMenuState] = useState<MenuKey>(getInitialMenu);

  const setActiveMenu = (menu: MenuKey) => {
    setActiveMenuState(menu);
    if (typeof window !== "undefined") {
      window.location.hash = `/${menu}`;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const nextMenu = getInitialMenu();
      setActiveMenuState(nextMenu);
    };
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    if (typeof window !== "undefined" && !window.location.hash) {
      window.history.replaceState(null, "", `#/${getInitialMenu()}`);
    }
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);
  
  // Popover menus state
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showUserPopover, setShowUserPopover] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(true);

  // Search input ref
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  
  // Data states
  const [licenses, setLicenses] = useState<License[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    app_name: "JACS Studio Server",
    default_days_valid: 30,
    default_max_jobs: 200,
    telemetry_enabled: true,
    auto_backup: true,
    notification_email: "admin@example.com",
    studio_brand_name: "JACS Studio",
    custom_logo_url: "",
  });
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [logSeverityFilter, setLogSeverityFilter] = useState("all");
  
  // Account & Security Modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountEmail, setAccountEmail] = useState("admin@example.com");

  // License Modals & Forms
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [renewingLicense, setRenewingLicense] = useState<License | null>(null);
  const [resettingHwidLicense, setResettingHwidLicense] = useState<License | null>(null);
  const [deletingLicense, setDeletingLicense] = useState<License | null>(null);
  const [createdKeyData, setCreatedKeyData] = useState<{ raw_key: string; key_hint: string; customer_name: string } | null>(null);

  // Billing Modal
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<BillingTransaction | null>(null);
  const [txCustomerName, setTxCustomerName] = useState("");
  const [txPlanName, setTxPlanName] = useState("Standard Monthly");
  const [txAmount, setTxAmount] = useState("500000");
  const [txPaymentMethod, setTxPaymentMethod] = useState("bank_transfer");
  const [txType, setTxType] = useState<"new_key" | "renewal" | "upgrade" | "adjustment">("new_key");
  const [txNotes, setTxNotes] = useState("");

  // AI Provider Modals
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deletingProvider, setDeletingProvider] = useState<Provider | null>(null);
  const [editProviderForm, setEditProviderForm] = useState({
    name: "",
    provider_type: "openai" as "openai" | "gemini" | "custom",
    base_url: "",
    model: "",
    tts_model: "",
    api_key: "",
    capabilities: "",
  });

  // Telemetry Modals
  const [showCreateLogModal, setShowCreateLogModal] = useState(false);
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [manualLogForm, setManualLogForm] = useState({
    event_name: "manual_diagnostic_test",
    severity: "info" as "info" | "warning" | "error" | "fatal",
    message: "Admin manual system test check",
    app_version: "0.3.17",
    machine_id: "ADMIN-CONSOLE",
  });
  
  // Create License Form
  const [createCustomerName, setCreateCustomerName] = useState("");
  const [createCustomerContact, setCreateCustomerContact] = useState("");
  const [createHwid, setCreateHwid] = useState("");
  const [createDays, setCreateDays] = useState("30");
  const [createMaxJobs, setCreateMaxJobs] = useState("200");
  const [createPremiumAi, setCreatePremiumAi] = useState(true);
  const [createNotes, setCreateNotes] = useState("");
  const [createLogoUrl, setCreateLogoUrl] = useState("");
  const [createBillAmount, setCreateBillAmount] = useState("500000");
  const [createPlanName, setCreatePlanName] = useState("Standard 30 Days");

  // Edit License Form
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCustomerContact, setEditCustomerContact] = useState("");
  const [editMaxJobs, setEditMaxJobs] = useState("200");
  const [editPremiumAi, setEditPremiumAi] = useState(true);
  const [editNotes, setEditNotes] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState("");

  // Renew License Form
  const [renewDays, setRenewDays] = useState("30");
  const [renewAmount, setRenewAmount] = useState("500000");
  const [renewPlanName, setRenewPlanName] = useState("Gia hạn 30 ngày");

  // Reset HWID Form
  const [newHwid, setNewHwid] = useState("");
  const [hwidReason, setHwidReason] = useState("Khách hàng đổi máy tính mới");

  // Add Provider Form
  const [providerForm, setProviderForm] = useState({
    name: "",
    provider_type: "openai" as "openai" | "gemini" | "custom",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    tts_model: "tts-1",
    api_key: "",
    capabilities: "analysis, vision, transcription, tts",
  });
  const [providerStatus, setProviderStatus] = useState<Record<string, string>>({});

  // Copy Feedback state
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

  async function copyText(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedItemId(id);
    setTimeout(() => setCopiedItemId(null), 2000);
  }

  function handleRequestError(reason: unknown) {
    if (reason instanceof ApiRequestError && reason.status === 401) {
      clearToken();
      onLogout();
      return true;
    }
    return false;
  }

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserPopover(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotifPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [lics, provs, tlogs, txs, bsum, sess, sysSet, sysInf, rels] = await Promise.all([
        apiRequest<License[]>("/api/v1/licenses", {}, token),
        apiRequest<Provider[]>("/api/v1/ai-providers", {}, token),
        apiRequest<TelemetryLog[]>("/api/v1/telemetry/logs", {}, token),
        apiRequest<BillingTransaction[]>("/api/v1/billing/transactions", {}, token).catch(() => []),
        apiRequest<BillingSummary>("/api/v1/billing/summary", {}, token).catch(() => null),
        apiRequest<ClientSession[]>("/api/v1/clients/sessions", {}, token).catch(() => []),
        apiRequest<SystemSettings>("/api/v1/system/settings", {}, token).catch(() => systemSettings),
        apiRequest<SystemInfo>("/api/v1/system/info", {}, token).catch(() => null as unknown as SystemInfo),
        apiRequest<Release[]>("/api/v1/releases", {}, token).catch(() => []),
      ]);
      setLicenses(lics);
      setProviders(provs);
      setLogs(tlogs);
      setTransactions(txs);
      setBillingSummary(bsum);
      setSessions(sess);
      setReleases(rels || []);
      if (sysSet) {
        const unwrapped = (sysSet && typeof sysSet === "object" && "data" in sysSet && (sysSet as any).data !== sysSet ? (sysSet as any).data : sysSet) as SystemSettings;
        if (unwrapped) setSystemSettings(unwrapped);
      }
      if (sysInf) {
        const unwrapped = (sysInf && typeof sysInf === "object" && "data" in sysInf && (sysInf as any).data !== sysInf ? (sysInf as any).data : sysInf) as SystemInfo;
        if (unwrapped) setSystemInfo(unwrapped);
      }
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Lỗi khi tải dữ liệu từ máy chủ");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* ACCOUNT & SECURITY                                                        */
  /* -------------------------------------------------------------------------- */
  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError(language === "vi" ? "Mật khẩu mới và xác nhận mật khẩu không khớp" : "New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError(language === "vi" ? "Mật khẩu mới phải có tối thiểu 6 ký tự" : "New password must have at least 6 characters");
      return;
    }

    try {
      const res = await apiRequest<{ data: { access_token: string; message: string } }>("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          new_email: accountEmail.trim(),
        }),
      }, token);

      if (res.data.access_token) {
        setToken(res.data.access_token);
      }
      setShowAccountModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(res.data.message || (language === "vi" ? "Đã cập nhật tài khoản quản trị thành công" : "Admin account updated successfully"));
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không đổi được mật khẩu");
    }
  }

  /* -------------------------------------------------------------------------- */
  /* LICENSE CRUD HANDLERS                                                     */
  /* -------------------------------------------------------------------------- */
  async function handleCreateLicense(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    const normHwid = normalizeHwid(createHwid);
    const errHwid = licenseHwidError(normHwid);
    if (errHwid) {
      setError(errHwid);
      return;
    }

    try {
      const res = await apiRequest<{
        raw_key: string;
        license: License;
      }>("/api/v1/licenses", {
        method: "POST",
        body: JSON.stringify({
          customer_name: createCustomerName.trim(),
          customer_contact: createCustomerContact.trim(),
          hwid: normHwid,
          days_valid: parseInt(createDays) || 30,
          max_jobs_per_day: parseInt(createMaxJobs) || 200,
          premium_ai: createPremiumAi,
          notes: createNotes.trim() || undefined,
          logo_url: createLogoUrl.trim() || undefined,
          bill_amount: parseFloat(createBillAmount) || 0,
          plan_name: createPlanName.trim() || "Standard License",
        }),
      }, token);

      setShowCreateModal(false);
      const rawKey = (res as any)?.key || (res as any)?.raw_key || "";
      const keyHint = (res as any)?.key_hint || (res as any)?.license?.key_hint || "JACS-****-XXXX";
      const custName = (res as any)?.customer_name || (res as any)?.license?.customer_name || createCustomerName.trim();

      setCreatedKeyData({
        raw_key: rawKey,
        key_hint: keyHint,
        customer_name: custName,
      });

      setCreateCustomerName("");
      setCreateCustomerContact("");
      setCreateHwid("");
      setCreateNotes("");
      setCreateLogoUrl("");

      setMessage(`Đã cấp license thành công cho ${custName}`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không tạo được license");
    }
  }

  function openEditModal(lic: License) {
    setEditingLicense(lic);
    setEditCustomerName(lic.customer_name);
    setEditCustomerContact(lic.customer_contact);
    setEditMaxJobs(String(lic.max_jobs_per_day || 200));
    setEditPremiumAi(Boolean(lic.premium_ai));
    setEditNotes(lic.notes || "");
    setEditLogoUrl(lic.logo_url || "");
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingLicense) return;
    setError("");
    try {
      await apiRequest(`/api/v1/licenses/${editingLicense.id}`, {
        method: "PUT",
        body: JSON.stringify({
          customer_name: editCustomerName.trim(),
          customer_contact: editCustomerContact.trim(),
          max_jobs_per_day: parseInt(editMaxJobs) || 200,
          premium_ai: editPremiumAi,
          notes: editNotes.trim() || null,
          logo_url: editLogoUrl.trim() || null,
        }),
      }, token);
      setEditingLicense(null);
      setMessage(`Đã cập nhật license cho ${editCustomerName}`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không cập nhật được license");
    }
  }

  function openRenewModal(lic: License) {
    setRenewingLicense(lic);
    setRenewDays("30");
    setRenewAmount("500000");
    setRenewPlanName("Gia hạn 30 ngày");
  }

  async function handleRenewLicense(event: FormEvent) {
    event.preventDefault();
    if (!renewingLicense) return;
    setError("");
    try {
      await apiRequest(`/api/v1/licenses/${renewingLicense.id}/renew`, {
        method: "POST",
        body: JSON.stringify({
          additional_days: parseInt(renewDays) || 30,
          bill_amount: parseFloat(renewAmount) || 0,
          plan_name: renewPlanName.trim(),
          notes: `Gia hạn ${renewDays} ngày cho ${renewingLicense.customer_name}`,
        }),
      }, token);
      setRenewingLicense(null);
      setMessage(`Đã gia hạn thành công license cho ${renewingLicense.customer_name}`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không gia hạn được license");
    }
  }

  function openResetHwidModal(lic: License) {
    setResettingHwidLicense(lic);
    setNewHwid("");
    setHwidReason("Khách hàng thay đổi máy tính mới");
  }

  async function handleResetHwid(event: FormEvent) {
    event.preventDefault();
    if (!resettingHwidLicense) return;
    setError("");
    const normHwid = normalizeHwid(newHwid);
    const errHwid = licenseHwidError(normHwid);
    if (errHwid) {
      setError(errHwid);
      return;
    }

    try {
      await apiRequest(`/api/v1/licenses/${resettingHwidLicense.id}/hwid`, {
        method: "PUT",
        body: JSON.stringify({
          hwid: normHwid,
          reason: hwidReason.trim(),
        }),
      }, token);
      setResettingHwidLicense(null);
      setMessage(`Đã đổi mã máy thành công cho ${resettingHwidLicense.customer_name}`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không đổi được mã máy");
    }
  }

  async function toggleLicense(lic: License) {
    setError("");
    const newStatus = lic.status === "active" ? "blocked" : "active";
    try {
      await apiRequest(`/api/v1/licenses/${lic.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      }, token);
      setMessage(`Đã ${newStatus === "active" ? "mở khóa" : "khóa"} license ${lic.key_hint}`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không đổi được trạng thái");
    }
  }

  async function handleDeleteLicense() {
    if (!deletingLicense) return;
    setError("");
    try {
      await apiRequest(`/api/v1/licenses/${deletingLicense.id}`, { method: "DELETE" }, token);
      setDeletingLicense(null);
      setMessage(`Đã xóa vĩnh viễn license`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không xóa được license");
    }
  }

  /* -------------------------------------------------------------------------- */
  /* CLIENT SESSION HANDLER                                                    */
  /* -------------------------------------------------------------------------- */
  async function handleTerminateSession(licId: string) {
    setError("");
    try {
      await apiRequest(`/api/v1/clients/sessions/${licId}`, { method: "DELETE" }, token);
      setMessage("Đã ngắt phiên hoạt động của client");
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không ngắt được phiên");
    }
  }

  /* -------------------------------------------------------------------------- */
  /* BILLING CRUD HANDLERS                                                     */
  /* -------------------------------------------------------------------------- */
  async function handleCreateTransaction(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiRequest("/api/v1/billing/transactions", {
        method: "POST",
        body: JSON.stringify({
          customer_name: txCustomerName.trim(),
          plan_name: txPlanName.trim(),
          amount: parseFloat(txAmount) || 0,
          payment_method: txPaymentMethod,
          transaction_type: txType,
          notes: txNotes.trim() || undefined,
        }),
      }, token);
      setShowAddTransactionModal(false);
      setTxCustomerName("");
      setTxNotes("");
      setMessage("Đã thêm giao dịch tài chính thành công");
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không thêm được giao dịch");
    }
  }

  async function handleDeleteTransaction() {
    if (!deletingTransaction) return;
    setError("");
    try {
      await apiRequest(`/api/v1/billing/transactions/${deletingTransaction.id}`, { method: "DELETE" }, token);
      setDeletingTransaction(null);
      setMessage("Đã hủy/xóa giao dịch thành công");
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không xóa được giao dịch");
    }
  }

  /* -------------------------------------------------------------------------- */
  /* AI PROVIDER CRUD HANDLERS                                                 */
  /* -------------------------------------------------------------------------- */
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

  function openEditProviderModal(prov: Provider) {
    setEditingProvider(prov);
    setEditProviderForm({
      name: prov.name,
      provider_type: prov.provider_type,
      base_url: prov.base_url,
      model: prov.model,
      tts_model: prov.tts_model || "",
      api_key: "",
      capabilities: prov.capabilities.join(", "),
    });
  }

  async function handleSaveEditProvider(event: FormEvent) {
    event.preventDefault();
    if (!editingProvider) return;
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: editProviderForm.name.trim(),
        provider_type: editProviderForm.provider_type,
        base_url: editProviderForm.base_url.trim(),
        model: editProviderForm.model.trim(),
        tts_model: editProviderForm.tts_model.trim() || undefined,
        capabilities: editProviderForm.capabilities.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (editProviderForm.api_key.trim()) {
        payload.api_key = editProviderForm.api_key.trim();
      }
      await apiRequest(`/api/v1/ai-providers/${editingProvider.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }, token);
      setEditingProvider(null);
      setMessage(`Đã cập nhật provider ${editProviderForm.name}`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không cập nhật được provider");
    }
  }

  async function handleDeleteProvider() {
    if (!deletingProvider) return;
    setError("");
    try {
      await apiRequest(`/api/v1/ai-providers/${deletingProvider.id}`, { method: "DELETE" }, token);
      setDeletingProvider(null);
      setMessage("Đã xóa AI Provider thành công");
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không xóa được provider");
    }
  }

  async function handleTestProvider(prov: Provider) {
    setProviderStatus((prev) => ({ ...prev, [prov.id]: "..." }));
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
        [prov.id]: `✗ ${reason instanceof Error ? reason.message : "Lỗi"}`,
      }));
    }
  }

  /* -------------------------------------------------------------------------- */
  /* TELEMETRY CRUD HANDLERS                                                   */
  /* -------------------------------------------------------------------------- */
  async function handleCreateManualLog(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiRequest("/api/v1/telemetry/logs/manual", {
        method: "POST",
        body: JSON.stringify(manualLogForm),
      }, token);
      setShowCreateLogModal(false);
      setMessage("Đã ghi log kiểm tra hệ thống thành công");
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không tạo được log");
    }
  }

  async function handleDeleteSingleLog(logId: string) {
    setError("");
    try {
      await apiRequest(`/api/v1/telemetry/logs/${logId}`, { method: "DELETE" }, token);
      setMessage("Đã xóa log thành công");
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không xóa được log");
    }
  }

  async function handleClearAllLogs() {
    setError("");
    try {
      await apiRequest("/api/v1/telemetry/logs", { method: "DELETE" }, token);
      setShowClearLogsModal(false);
      setMessage("Đã dọn dẹp sạch toàn bộ logs");
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không xóa được logs");
    }
  }

  /* -------------------------------------------------------------------------- */
  /* SYSTEM SETTINGS & BACKUP HANDLERS                                         */
  /* -------------------------------------------------------------------------- */
  async function handleSaveSystemSettings(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await apiRequest("/api/v1/system/settings", {
        method: "PUT",
        body: JSON.stringify(systemSettings),
      }, token);
      setMessage("Đã lưu cấu hình hệ thống thành công");
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không lưu được cài đặt");
    }
  }

  async function handleExportBackup() {
    setError("");
    try {
      const res = await apiRequest<Record<string, unknown>>("/api/v1/system/export", {}, token);
      const exportData = (res && typeof res === "object" && "data" in res && (res as any).data !== res ? (res as any).data : res) || {};
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `jacs-studio-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setMessage("Đã xuất file sao lưu hệ thống JSON thành công");
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "Không xuất được file sao lưu");
    }
  }

  async function handleImportBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await apiRequest<{ imported_records?: number; data?: { imported_records?: number } }>("/api/v1/system/import", {
        method: "POST",
        body: JSON.stringify(json),
      }, token);
      const count = res?.imported_records ?? res?.data?.imported_records ?? 0;
      setMessage(`Đã khôi phục thành công ${count} bản ghi từ file backup`);
      await refresh();
    } catch (reason) {
      if (handleRequestError(reason)) return;
      setError(reason instanceof Error ? reason.message : "File sao lưu không hợp lệ");
    }
  }

  function logout() {
    clearToken();
    onLogout();
  }

  const filteredLicenses = (licenses || []).filter((lic) => {
    if (!lic) return false;
    const matchesSearch =
      !searchTerm ||
      (lic.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lic.customer_contact || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lic.key_hint || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lic.hwid || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lic.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredLogs = (logs || []).filter((l) => {
    if (!l) return false;
    return logSeverityFilter === "all" || l.severity === logSeverityFilter;
  });

  // Global search matches
  const searchMatchesLicenses = searchTerm
    ? (licenses || [])
        .filter(
          (l) =>
            l &&
            ((l.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
              (l.key_hint || "").toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .slice(0, 3)
    : [];
  const searchMatchesSessions = searchTerm
    ? (sessions || [])
        .filter(
          (s) =>
            s &&
            ((s.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
              (s.hwid || "").toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .slice(0, 3)
    : [];
  const searchMatchesProviders = searchTerm
    ? (providers || [])
        .filter(
          (p) =>
            p &&
            ((p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
              (p.model || "").toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .slice(0, 3)
    : [];

  const activeLicensesCount = (licenses || []).filter((l) => l?.status === "active").length;
  const onlineSessionsCount = (sessions || []).filter((s) => s?.is_online).length;
  const totalRevenueVal = billingSummary?.total_revenue || 0;
  const thisMonthRevenueVal = billingSummary?.this_month_revenue || 0;

  return (
    <div className="app-container">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div className="sidebar-mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR (MintForge Dark Slate Navy) */}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <a href="#" className="brand-logo" onClick={(e) => { e.preventDefault(); setActiveMenu("overview"); setMobileMenuOpen(false); }}>
            <div className="brand-logo-icon">MI</div>
            <div className="brand-title-box">
              <span className="brand-title">{t("appName")}</span>
              <span className="brand-badge-sub">{t("appSuite")}</span>
            </div>
          </a>
          {mobileMenuOpen && (
            <button
              type="button"
              className="btn-sidebar-logout"
              style={{ color: "#fff" }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="sidebar-menu">
          <div className="menu-heading">{t("workspaceSection")}</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "overview" ? "active" : ""}`}
            onClick={() => { setActiveMenu("overview"); setMobileMenuOpen(false); }}
          >
            <span className="menu-icon"><LayoutDashboard size={18} /></span>
            <span className="menu-label">{t("menuOverview")}</span>
          </button>

          <div className="menu-heading">{t("accessSection")}</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "licenses" ? "active" : ""}`}
            onClick={() => { setActiveMenu("licenses"); setMobileMenuOpen(false); }}
          >
            <span className="menu-icon"><Key size={18} /></span>
            <span className="menu-label">{t("menuLicenses")}</span>
            <span className="menu-badge badge-primary">{activeLicensesCount}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "sessions" ? "active" : ""}`}
            onClick={() => { setActiveMenu("sessions"); setMobileMenuOpen(false); }}
          >
            <span className="menu-icon"><Laptop size={18} /></span>
            <span className="menu-label">{t("menuSessions")}</span>
            <span className="menu-badge badge-primary">{sessions.length}</span>
          </button>

          <div className="menu-heading">{t("billingSection")}</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "billing" ? "active" : ""}`}
            onClick={() => { setActiveMenu("billing"); setMobileMenuOpen(false); }}
          >
            <span className="menu-icon"><CreditCard size={18} /></span>
            <span className="menu-label">{t("menuBilling")}</span>
            <span className="menu-badge badge-warning">{transactions.length}</span>
          </button>

          <div className="menu-heading">{t("serviceSection")}</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "providers" ? "active" : ""}`}
            onClick={() => { setActiveMenu("providers"); setMobileMenuOpen(false); }}
          >
            <span className="menu-icon"><Bot size={18} /></span>
            <span className="menu-label">{t("menuProviders")}</span>
            <span className="menu-badge badge-primary">{providers.length}</span>
          </button>

          <div className="menu-heading">{t("operationSection")}</div>
          <button
            type="button"
            className={`menu-item ${activeMenu === "telemetry" ? "active" : ""}`}
            onClick={() => { setActiveMenu("telemetry"); setMobileMenuOpen(false); }}
          >
            <span className="menu-icon"><FileText size={18} /></span>
            <span className="menu-label">{t("menuTelemetry")}</span>
            {logs.length > 0 && (
              <span className="menu-badge badge-warning">{logs.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "releases" ? "active" : ""}`}
            onClick={() => { setActiveMenu("releases"); setMobileMenuOpen(false); }}
          >
            <span className="menu-icon"><Rocket size={18} /></span>
            <span className="menu-label">{t("menuReleases")}</span>
            <span className="menu-badge badge-primary">{releases.filter((r) => r.status === "published").length}</span>
          </button>

          <button
            type="button"
            className={`menu-item ${activeMenu === "settings" ? "active" : ""}`}
            onClick={() => { setActiveMenu("settings"); setMobileMenuOpen(false); }}
          >
            <span className="menu-icon"><Settings size={18} /></span>
            <span className="menu-label">{t("menuSettings")}</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <div
            className="user-profile-strip"
            onClick={() => setShowUserPopover(!showUserPopover)}
            style={{ cursor: "pointer" }}
            title="Quản lý tài khoản"
          >
            <div className="user-avatar">AD</div>
            <div className="user-info-text">
              <div className="user-name">Admin Superuser</div>
              <div className="user-role">{t("superAdmin")}</div>
            </div>
            <button
              type="button"
              className="btn-sidebar-logout"
              onClick={(e) => { e.stopPropagation(); logout(); }}
              title={t("logout")}
            >
              <Power size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="main-wrapper">
        <header className="navbar">
          <div className="navbar-left">
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              title="Menu"
            >
              <Menu size={20} />
            </button>

            {/* Redesigned Search Pill with Live Results Popover */}
            <div className="search-container-relative" ref={searchContainerRef}>
              <div className="navbar-search-pill">
                <Search size={15} color="var(--primary)" />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShowSearchDropdown(true); }}
                  onFocus={() => setShowSearchDropdown(true)}
                />
                {searchTerm ? (
                  <button
                    type="button"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}
                    onClick={() => { setSearchTerm(""); setShowSearchDropdown(false); }}
                  >
                    <X size={14} />
                  </button>
                ) : (
                  <span className="search-shortcut-chip">⌘ K</span>
                )}
              </div>

              {/* Live Search Results Dropdown */}
              {showSearchDropdown && (
                <div className="search-dropdown-popover">
                  {searchTerm && (
                    <>
                      {searchMatchesLicenses.length > 0 && (
                        <div>
                          <div className="search-section-header"><Key size={12} /> {t("menuLicenses")}</div>
                          {searchMatchesLicenses.map((lic) => (
                            <button
                              key={lic.id}
                              type="button"
                              className="search-result-row"
                              onClick={() => { setActiveMenu("licenses"); setShowSearchDropdown(false); }}
                            >
                              <div>
                                <strong>{lic.customer_name}</strong>
                                <small style={{ display: "block" }}>{lic.key_hint} · {lic.status}</small>
                              </div>
                              <span className="code-chip">{lic.hwid.slice(0, 10)}...</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchMatchesSessions.length > 0 && (
                        <div>
                          <div className="search-section-header"><Laptop size={12} /> {t("menuSessions")}</div>
                          {searchMatchesSessions.map((sess) => (
                            <button
                              key={sess.license_id}
                              type="button"
                              className="search-result-row"
                              onClick={() => { setActiveMenu("sessions"); setShowSearchDropdown(false); }}
                            >
                              <div>
                                <strong>{sess.customer_name}</strong>
                                <small style={{ display: "block" }}>{sess.last_platform} · v{sess.last_app_version}</small>
                              </div>
                              <span className={`pill-status ${sess.is_online ? "pill-online" : "pill-offline"}`} style={{ fontSize: "0.68rem" }}>
                                {sess.is_online ? "Online" : "Offline"}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchMatchesProviders.length > 0 && (
                        <div>
                          <div className="search-section-header"><Bot size={12} /> {t("menuProviders")}</div>
                          {searchMatchesProviders.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="search-result-row"
                              onClick={() => { setActiveMenu("providers"); setShowSearchDropdown(false); }}
                            >
                              <strong>{p.name}</strong>
                              <small>{p.model}</small>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Quick Commands & Navigation */}
                  <div className="search-section-header">⚡ {language === "vi" ? "Lệnh Thao Tác Nhanh" : "Quick Actions"}</div>
                  <button
                    type="button"
                    className="search-result-row"
                    onClick={() => { setShowCreateModal(true); setShowSearchDropdown(false); }}
                  >
                    <span>🔑 {t("createLicense")}</span>
                    <small>Mở form cấp key</small>
                  </button>
                  <button
                    type="button"
                    className="search-result-row"
                    onClick={() => { setShowAddTransactionModal(true); setShowSearchDropdown(false); }}
                  >
                    <span>💳 {t("addTransaction")}</span>
                    <small>Nạp credit / Hóa đơn</small>
                  </button>
                  <button
                    type="button"
                    className="search-result-row"
                    onClick={() => { setActiveMenu("settings"); setShowSearchDropdown(false); }}
                  >
                    <span>⚙️ {t("menuSettings")}</span>
                    <small>Cấu hình & Backup</small>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="navbar-right">
            {/* Multi-language Selector Pill */}
            <div style={{ position: "relative" }}>
              <div
                className="lang-selector-pill"
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                style={{ cursor: "pointer" }}
              >
                <Globe size={14} color="var(--primary)" />
                <span className="lang-text-desktop">{language === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}</span>
                <span className="lang-text-mobile">{language === "vi" ? "🇻🇳 VN" : "🇬🇧 EN"}</span>
                <ChevronDown size={14} color="var(--text-muted)" />
              </div>

              {showLangDropdown && (
                <div style={{ position: "absolute", right: 0, top: "115%", background: "#1a1d2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", overflow: "hidden", minWidth: "140px", zIndex: 100, boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                  <button
                    type="button"
                    style={{ width: "100%", padding: "0.55rem 0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", background: language === "vi" ? "#262a40" : "transparent", color: "#fff", border: "none", fontSize: "0.8rem", cursor: "pointer", textAlign: "left" }}
                    onClick={() => { setLanguage("vi"); setShowLangDropdown(false); }}
                  >
                    🇻🇳 Tiếng Việt
                  </button>
                  <button
                    type="button"
                    style={{ width: "100%", padding: "0.55rem 0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", background: language === "en" ? "#262a40" : "transparent", color: "#fff", border: "none", fontSize: "0.8rem", cursor: "pointer", textAlign: "left" }}
                    onClick={() => { setLanguage("en"); setShowLangDropdown(false); }}
                  >
                    🇬🇧 English
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            <button
              type="button"
              className="btn-nav-action-orange"
              title={t("quickActionCreateLicense")}
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={18} />
            </button>

            {/* Notifications with Popover */}
            <div style={{ position: "relative" }} ref={notifMenuRef}>
              <button
                type="button"
                className="btn-nav-icon-plain"
                title={t("notifications")}
                onClick={() => { setShowNotifPopover(!showNotifPopover); setHasUnreadAlerts(false); }}
              >
                <Bell size={16} />
                {hasUnreadAlerts && logs.length > 0 && <span className="nav-dot-badge"></span>}
              </button>

              {showNotifPopover && (
                <div className="topbar-popover-card notif-popover-width">
                  <div className="notif-header-row">
                    <strong>{language === "vi" ? "Trung Tâm Thông Báo" : "Notification Center"}</strong>
                    <span className="badge-primary menu-badge">{logs.length}</span>
                  </div>

                  <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                    {logs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="notif-item"
                        onClick={() => { setActiveMenu("telemetry"); setShowNotifPopover(false); }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                          <span className={`pill-status pill-${log.severity === "fatal" ? "danger" : log.severity === "error" ? "danger" : "warning"}`} style={{ fontSize: "0.65rem", padding: "0.1rem 0.35rem" }}>
                            {log.severity.toUpperCase()}
                          </span>
                          <strong style={{ fontSize: "0.78rem", color: "#ffffff" }}>{log.event_name}</strong>
                          <span style={{ fontSize: "0.68rem", color: "var(--sidebar-heading)", marginLeft: "auto" }}>v{log.app_version}</span>
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.message}
                        </div>
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                        {t("noLogsFound")}
                      </div>
                    )}
                  </div>

                  <a
                    className="notif-footer-link"
                    onClick={() => { setActiveMenu("telemetry"); setShowNotifPopover(false); }}
                  >
                    {language === "vi" ? "Xem tất cả sự cố & logs ➔" : "View all logs & telemetry ➔"}
                  </a>
                </div>
              )}
            </div>

            {/* User Profile Popover */}
            <div style={{ position: "relative" }} ref={userMenuRef}>
              <div
                className="nav-avatar-photo"
                onClick={() => setShowUserPopover(!showUserPopover)}
                title="Tài khoản quản trị"
              >
                AD
              </div>

              {showUserPopover && (
                <div className="topbar-popover-card user-popover-width">
                  <div className="popover-user-header">
                    <div className="nav-avatar-photo" style={{ width: "42px", height: "42px" }}>AD</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: "block", color: "#ffffff", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Admin Superuser</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--sidebar-heading)", display: "block" }}>admin@example.com</span>
                      <span className="badge-primary menu-badge" style={{ marginTop: "0.25rem", display: "inline-block" }}>Super Admin</span>
                    </div>
                  </div>

                  <div className="popover-menu-list">
                    <button
                      type="button"
                      className="popover-menu-action"
                      onClick={() => { setShowAccountModal(true); setShowUserPopover(false); }}
                    >
                      <User size={15} color="var(--primary)" />
                      <span>{language === "vi" ? "Quản lý tài khoản & Đổi mật khẩu" : "Account & Password Security"}</span>
                    </button>

                    <button
                      type="button"
                      className="popover-menu-action"
                      onClick={() => { setActiveMenu("settings"); setShowUserPopover(false); }}
                    >
                      <Settings size={15} color="#94a3b8" />
                      <span>{t("menuSettings")}</span>
                    </button>

                    <button
                      type="button"
                      className="popover-menu-action"
                      onClick={() => { setLanguage(language === "vi" ? "en" : "vi"); setShowUserPopover(false); }}
                    >
                      <Globe size={15} color="#34d399" />
                      <span>{language === "vi" ? "Chuyển sang English 🇬🇧" : "Chuyển sang Tiếng Việt 🇻🇳"}</span>
                    </button>

                    <div className="popover-divider" />

                    <button
                      type="button"
                      className="popover-menu-action danger"
                      onClick={() => { logout(); setShowUserPopover(false); }}
                    >
                      <Power size={15} color="#ef4444" />
                      <span>{t("logout")}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-body-content">
          {/* Header Row */}
          <div className="page-header-row">
            <div className="page-title-group">
              <h1>
                {activeMenu === "overview" && t("overviewTitle")}
                {activeMenu === "licenses" && t("licensesTitle")}
                {activeMenu === "sessions" && t("sessionsTitle")}
                {activeMenu === "billing" && t("billingTitle")}
                {activeMenu === "providers" && t("providersTitle")}
                {activeMenu === "telemetry" && t("telemetryTitle")}
                {activeMenu === "releases" && (language === "vi" ? "Quản lý Bản phát hành & Cập nhật OTA 🚀" : "Releases & OTA Updates 🚀")}
                {activeMenu === "settings" && t("settingsTitle")}
              </h1>
              <p>
                {activeMenu === "overview" && t("overviewSubtitle")}
                {activeMenu === "licenses" && t("licensesSubtitle")}
                {activeMenu === "sessions" && t("sessionsSubtitle")}
                {activeMenu === "billing" && t("billingSubtitle")}
                {activeMenu === "providers" && t("providersSubtitle")}
                {activeMenu === "telemetry" && t("telemetrySubtitle")}
                {activeMenu === "releases" && (language === "vi" ? "Cung cấp bản cập nhật mới trực tiếp cho khách hàng. Người dùng chỉ cần 1 click để tải và áp dụng bản mới mà không cần cài lại tool." : "Broadcast updates to desktop clients with 1-click in-place update.")}
                {activeMenu === "settings" && t("settingsSubtitle")}
              </p>
            </div>

            <div className="page-actions-group">
              <button
                type="button"
                className="btn-white-outline"
                onClick={() => void refresh()}
              >
                <ArrowUpRight size={15} /> {t("refresh")}
              </button>
              <button
                type="button"
                className="btn-primary-orange"
                onClick={() => setShowCreateModal(true)}
              >
                <Zap size={15} /> {t("createLicense")}
              </button>
            </div>
          </div>

          {/* Flash Messages */}
          {message && (
            <div className="kpi-card-mf" style={{ background: "var(--success-light)", borderColor: "#a7f3d0", color: "var(--success-text)", marginBottom: "1.25rem", padding: "0.85rem 1.25rem" }}>
              <Check size={18} />
              <span style={{ fontWeight: 600 }}>{message}</span>
              <button type="button" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 800 }} onClick={() => setMessage("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {error && (
            <div className="kpi-card-mf" style={{ background: "var(--danger-light)", borderColor: "#fecaca", color: "var(--danger-text)", marginBottom: "1.25rem", padding: "0.85rem 1.25rem" }}>
              <AlertTriangle size={18} />
              <span style={{ fontWeight: 600 }}>{error}</span>
              <button type="button" style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 800 }} onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: OVERVIEW DASHBOARD */}
          {/* ========================================================================= */}
          {activeMenu === "overview" && (() => {
            const activePercent = licenses.length > 0 ? Math.round((activeLicensesCount / licenses.length) * 100) : 0;
            const onlinePercent = sessions.length > 0 ? Math.round((onlineSessionsCount / sessions.length) * 100) : 0;
            const lifetimeKeysCount = licenses.filter((l) => !l.expires_at).length;
            const inactiveKeysCount = licenses.length - activeLicensesCount;
            const donutDashOffset = Math.round(251 * (1 - (activePercent / 100)));

            return (
              <>
                <div className="kpi-cards-grid-mintforge">
                  {/* Card 1: Số dư / Doanh thu tháng này */}
                  <div className="kpi-card-mf" onClick={() => setActiveMenu("billing")} style={{ cursor: "pointer" }}>
                    <div className="kpi-squircle-badge squircle-orange"><Wallet size={24} /></div>
                    <div className="kpi-content-box">
                      <div className="kpi-label-mf">{t("kpiBalanceLabel")}</div>
                      <div className="kpi-value-mf">{formatCurrency(thisMonthRevenueVal)}</div>
                      <div className="kpi-subtext-indicator">
                        <span className="subtext-green">{t("kpiBalanceSub1")}</span>
                        <span className="subtext-gray">{t("kpiBalanceSub2")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Tổng tiền nạp / Doanh thu */}
                  <div className="kpi-card-mf" onClick={() => setActiveMenu("billing")} style={{ cursor: "pointer" }}>
                    <div className="kpi-squircle-badge squircle-green"><ArrowUpRight size={24} /></div>
                    <div className="kpi-content-box">
                      <div className="kpi-label-mf">{t("kpiTotalRevenueLabel")}</div>
                      <div className="kpi-value-mf">{formatCurrency(totalRevenueVal)}</div>
                      <div className="kpi-subtext-indicator">
                        <span className="subtext-green">{t("kpiTotalRevenueSub1")}</span>
                        <span className="subtext-gray">{t("kpiTotalRevenueSub2")} ({transactions.length} tx)</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: License đang hoạt động */}
                  <div className="kpi-card-mf" onClick={() => setActiveMenu("licenses")} style={{ cursor: "pointer" }}>
                    <div className="kpi-squircle-badge squircle-blue"><Key size={24} /></div>
                    <div className="kpi-content-box">
                      <div className="kpi-label-mf">{t("kpiActiveKeysLabel")}</div>
                      <div className="kpi-value-mf">{activeLicensesCount} key</div>
                      <div className="kpi-subtext-indicator">
                        <span className="subtext-orange">↘ {inactiveKeysCount} {t("kpiActiveKeysSub1")}</span>
                        <span className="subtext-gray">/ {licenses.length} {t("kpiActiveKeysSub2")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Máy khách Desktop Online */}
                  <div className="kpi-card-mf" onClick={() => setActiveMenu("sessions")} style={{ cursor: "pointer" }}>
                    <div className="kpi-squircle-badge squircle-purple"><Laptop size={24} /></div>
                    <div className="kpi-content-box">
                      <div className="kpi-label-mf">{t("kpiDesktopOnlineLabel")}</div>
                      <div className="kpi-value-mf">{onlineSessionsCount} {language === "vi" ? "thiết bị" : "devices"}</div>
                      <div className="kpi-subtext-indicator">
                        <span className="subtext-green">↘ {onlinePercent}% {t("kpiDesktopOnlineSub1")}</span>
                        <span className="subtext-gray">{sessions.length} {t("kpiDesktopOnlineSub2")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CHARTS GRID (MintForge 2-Column Split) */}
                <div className="charts-grid-mintforge">
                  {/* Left Panel: Chi phí và request API */}
                  <div className="mf-card-panel">
                    <div className="mf-card-header">
                      <div className="mf-card-title-group">
                        <h3>{t("chartApiUsageTitle")}</h3>
                        <p>{t("chartApiUsageSubtitle")}</p>
                      </div>
                      <div className="mf-card-actions">
                        <select className="pill-dropdown-year" defaultValue="2026">
                          <option value="2026">2026 ▾</option>
                          <option value="2025">2025 ▾</option>
                        </select>
                        <button type="button" className="btn-dot-menu" title="Options">•••</button>
                      </div>
                    </div>

                    <div className="mf-chart-legend">
                      <span><span className="mf-legend-dot-orange">●</span> {t("chartCostLegend")}</span>
                      <span><span className="mf-legend-dot-navy">●</span> {t("chartRequestLegend")}</span>
                    </div>

                    <div style={{ height: "210px", width: "100%", position: "relative" }}>
                      <svg viewBox="0 0 600 200" width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                        <line x1="30" y1="20" x2="590" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="30" y1="60" x2="590" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="30" y1="100" x2="590" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="30" y1="140" x2="590" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="30" y1="170" x2="590" y2="170" stroke="#e5e7eb" strokeWidth="1" />

                        <text x="20" y="24" fontSize="10" fill="#9ca3af" textAnchor="end">4</text>
                        <text x="20" y="64" fontSize="10" fill="#9ca3af" textAnchor="end">3</text>
                        <text x="20" y="104" fontSize="10" fill="#9ca3af" textAnchor="end">2</text>
                        <text x="20" y="144" fontSize="10" fill="#9ca3af" textAnchor="end">1</text>
                        <text x="20" y="174" fontSize="10" fill="#9ca3af" textAnchor="end">0</text>

                        <path
                          d="M 50 170 Q 200 170 320 168 T 480 160 T 570 145"
                          fill="none"
                          stroke="#f95738"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                        <circle cx="570" cy="145" r="4.5" fill="#f95738" stroke="#ffffff" strokeWidth="2" />

                        <path
                          d="M 50 170 Q 240 170 380 169 T 570 166"
                          fill="none"
                          stroke="#1e293b"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {[t("dayThu"), t("dayFri"), t("daySat"), t("daySun"), t("dayMon"), t("dayTue"), t("dayWed")].map((day, idx) => {
                          const x = 50 + idx * 86;
                          return (
                            <text key={idx} x={x} y="190" fontSize="10" fill="#6b7280" textAnchor="middle" fontWeight="600">
                              {day}
                            </text>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Right Panel: Trạng thái API key (Emerald Donut) */}
                  <div className="mf-card-panel">
                    <div className="mf-card-header">
                      <div className="mf-card-title-group">
                        <h3>{t("chartKeyStatusTitle")}</h3>
                        <p>{licenses.length} {t("chartKeyStatusSub")}</p>
                      </div>
                      <button type="button" className="btn-dot-menu" title="Options">•••</button>
                    </div>

                    <div className="mf-donut-status-layout">
                      <div className="mf-donut-left">
                        <svg viewBox="0 0 100 100" width="160" height="160">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="11"
                            strokeLinecap="round"
                            strokeDasharray="251"
                            strokeDashoffset={donutDashOffset}
                            transform="rotate(-90 50 50)"
                          />
                        </svg>
                        <div className="mf-donut-center-text">
                          <span className="mf-donut-count">{activeLicensesCount}</span>
                          <span className="mf-donut-label">API key</span>
                        </div>
                      </div>

                      <div className="mf-donut-breakdown">
                        <div className="mf-breakdown-row">
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ color: "#10b981" }}>●</span> {t("donutStatusActive")}
                          </span>
                          <strong style={{ color: "var(--text-dark)" }}>{activeLicensesCount}</strong>
                        </div>
                        <div className="mf-breakdown-row">
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ color: "#9ca3af" }}>●</span> {t("donutStatusOther")}
                          </span>
                          <strong style={{ color: "var(--text-dark)" }}>{inactiveKeysCount}</strong>
                        </div>
                        <div className="mf-breakdown-row">
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ color: "#f95738" }}>●</span> {t("donutStatusLifetime")}
                          </span>
                          <strong style={{ color: "var(--text-dark)" }}>{lifetimeKeysCount}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}

          {/* ========================================================================= */}
          {/* VIEW: LICENSES MANAGEMENT */}
          {/* ========================================================================= */}
          {activeMenu === "licenses" && (
            <div className="mf-card-panel">
              <div className="mf-card-header">
                <div className="mf-card-title-group">
                  <h3>{t("licensesTitle")} ({filteredLicenses.length})</h3>
                  <p>{t("licensesSubtitle")}</p>
                </div>
                <button
                  type="button"
                  className="btn-primary-orange"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} /> {t("createLicense")}
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div style={{ display: "flex", gap: "0.85rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                <input
                  type="text"
                  className="form-input-mf"
                  placeholder={language === "vi" ? "Tìm theo tên khách hàng, email, Key Hint, Device ID..." : "Search by customer name, email, key hint, HWID..."}
                  style={{ flex: 1, minWidth: "240px" }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="form-input-mf"
                  style={{ width: "220px" }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">{t("allStatus")}</option>
                  <option value="active">{t("statusActive")}</option>
                  <option value="blocked">{t("statusBlocked")}</option>
                  <option value="expired">{t("statusExpired")}</option>
                </select>
              </div>

              <div className="table-responsive">
                <table className="mf-table">
                  <thead>
                    <tr>
                      <th>{t("thCustomer")}</th>
                      <th>{t("thKeyHwid")}</th>
                      <th>{t("thExpiryLimits")}</th>
                      <th>{t("thDeviceLastSeen")}</th>
                      <th>{t("thStatus")}</th>
                      <th style={{ textAlign: "right" }}>{t("thActions")}</th>
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
                              <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "#fff1ec", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 800 }}>
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
                              className="btn-white-outline"
                              style={{ padding: "0.2rem 0.45rem", fontSize: "0.72rem" }}
                              onClick={() => void copyText(lic.key_hint, lic.id)}
                            >
                              {copiedItemId === lic.id ? (
                                <>
                                  <Check size={12} color="var(--success)" /> {t("copied")}
                                </>
                              ) : (
                                <>
                                  <Copy size={12} /> {t("copy")}
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
                              <strong style={{ color: "var(--text-dark)" }}>{new Date(lic.expires_at).toLocaleDateString(language === "vi" ? "vi-VN" : "en-US")}</strong>
                            ) : (
                              <span style={{ color: "var(--success-text)", fontWeight: 800, background: "var(--success-light)", padding: "0.15rem 0.45rem", borderRadius: "4px" }}>{t("lifetime")}</span>
                            )}
                          </div>
                          <small style={{ color: "var(--text-muted)", display: "block", marginTop: "0.15rem" }}>
                            {lic.max_jobs_per_day} {language === "vi" ? "jobs/ngày" : "jobs/day"} {lic.premium_ai ? "· Premium AI" : ""}
                          </small>
                        </td>
                        <td>
                          <div>{lic.last_platform || "--"} {lic.last_app_version ? `· v${lic.last_app_version}` : ""}</div>
                          <small style={{ color: "var(--text-muted)", display: "block" }}>{lic.last_ip || (language === "vi" ? "Chưa có IP" : "No IP")}</small>
                          <small style={{ color: lic.last_seen_at ? "var(--success)" : "var(--text-dim)", fontWeight: 600 }}>
                            {lic.last_seen_at ? `Online: ${new Date(lic.last_seen_at).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US")}` : (language === "vi" ? "Chưa online" : "Never")}
                          </small>
                        </td>
                        <td>
                          <span className={`pill-status pill-${lic.status === "active" ? "active" : lic.status === "blocked" ? "danger" : "warning"}`}>
                            ● {lic.status === "active" ? "Active" : lic.status === "blocked" ? "Blocked" : "Expired"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.3rem" }}>
                            <button
                              type="button"
                              className="btn-white-outline"
                              style={{ padding: "0.3rem 0.6rem" }}
                              onClick={() => openEditModal(lic)}
                              title={t("edit")}
                            >
                              <Pencil size={13} /> {t("edit")}
                            </button>
                            <button
                              type="button"
                              className="btn-white-outline"
                              style={{ padding: "0.3rem 0.6rem" }}
                              onClick={() => openRenewModal(lic)}
                              title={t("renew")}
                            >
                              <Clock size={13} /> {t("renew")}
                            </button>
                            <button
                              type="button"
                              className="btn-white-outline"
                              style={{ padding: "0.3rem 0.6rem" }}
                              onClick={() => openResetHwidModal(lic)}
                              title={t("resetHwid")}
                            >
                              <RotateCw size={13} /> {t("resetHwid")}
                            </button>
                            <button
                              type="button"
                              className="btn-white-outline"
                              style={{ padding: "0.3rem 0.6rem" }}
                              onClick={() => void toggleLicense(lic)}
                              title={lic.status === "active" ? "Khóa" : "Mở khóa"}
                            >
                              {lic.status === "active" ? <Lock size={13} /> : <Unlock size={13} />}
                            </button>
                            <button
                              type="button"
                              className="btn-white-outline"
                              style={{ padding: "0.3rem 0.6rem", color: "var(--danger)" }}
                              onClick={() => setDeletingLicense(lic)}
                              title={t("delete")}
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
                          {t("noLicensesFound")}
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
            <div className="mf-card-panel">
              <div className="mf-card-header">
                <div className="mf-card-title-group">
                  <h3>{t("sessionsTitle")} ({sessions.length})</h3>
                  <p>{t("sessionsSubtitle")}</p>
                </div>
                <button type="button" className="btn-white-outline" onClick={() => void refresh()}>
                  <RotateCw size={15} /> {t("refresh")}
                </button>
              </div>

              <div className="table-responsive">
                <table className="mf-table">
                  <thead>
                    <tr>
                      <th>{t("thCustomer")}</th>
                      <th>Key Hint</th>
                      <th>Device ID (HWID)</th>
                      <th>{t("thOsVersion")}</th>
                      <th>{t("thIp")}</th>
                      <th>{t("thTime")}</th>
                      <th>{t("thStatus")}</th>
                      <th style={{ textAlign: "right" }}>{t("thActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((sess) => (
                      <tr key={sess.license_id}>
                        <td><strong>{sess.customer_name}</strong></td>
                        <td><span className="code-chip">{sess.key_hint}</span></td>
                        <td><span className="code-chip" style={{ fontSize: "0.72rem" }}>{sess.hwid}</span></td>
                        <td>{sess.last_platform || "Windows"} · v{sess.last_app_version || "0.3.17"}</td>
                        <td><code>{sess.last_ip || "0.0.0.0"}</code></td>
                        <td>
                          {sess.last_seen_at ? (
                            <span style={{ fontSize: "0.78rem" }}>{new Date(sess.last_seen_at).toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US")}</span>
                          ) : (
                            <span style={{ color: "var(--text-dim)" }}>--</span>
                          )}
                        </td>
                        <td>
                          <span className={`pill-status ${sess.is_online ? "pill-online" : "pill-offline"}`}>
                            {sess.is_online ? `● ${t("statusOnline")}` : t("statusOffline")}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn-white-outline"
                            style={{ padding: "0.3rem 0.6rem", color: "var(--danger)" }}
                            onClick={() => void handleTerminateSession(sess.license_id)}
                            title={t("terminateSession")}
                          >
                            {t("terminateSession")}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          {t("noSessionsFound")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: BILLING & TRANSACTIONS */}
          {/* ========================================================================= */}
          {activeMenu === "billing" && (
            <div className="mf-card-panel">
              <div className="mf-card-header">
                <div className="mf-card-title-group">
                  <h3>{t("billingTitle")} ({transactions.length})</h3>
                  <p>{t("billingSubtitle")}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>
                    {formatCurrency(totalRevenueVal)}
                  </div>
                  <button
                    type="button"
                    className="btn-primary-orange"
                    onClick={() => setShowAddTransactionModal(true)}
                  >
                    <Plus size={16} /> {t("addTransaction")}
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="mf-table">
                  <thead>
                    <tr>
                      <th>{t("thTxId")}</th>
                      <th>{t("thCustomer")}</th>
                      <th>{t("thPlan")}</th>
                      <th>{t("thTxType")}</th>
                      <th>{t("thAmount")}</th>
                      <th>{t("thMethod")}</th>
                      <th>{t("thTime")}</th>
                      <th style={{ textAlign: "right" }}>{t("thActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td><span className="code-chip">{tx.id.slice(0, 10)}...</span></td>
                        <td>
                          <strong>{tx.customer_name}</strong>
                          {tx.notes && <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{tx.notes}</div>}
                        </td>
                        <td>{tx.plan_name}</td>
                        <td>
                          <span className="pill-status pill-active" style={{ fontSize: "0.72rem" }}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td><strong style={{ color: "var(--primary)" }}>{formatCurrency(tx.amount)}</strong></td>
                        <td>{tx.payment_method.toUpperCase()}</td>
                        <td style={{ fontSize: "0.78rem" }}>{new Date(tx.created_at).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn-white-outline"
                            style={{ padding: "0.25rem 0.5rem", color: "var(--danger)" }}
                            onClick={() => setDeletingTransaction(tx)}
                            title={t("delete")}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          {t("noTransactionsFound")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: AI PROVIDERS GATEWAY */}
          {/* ========================================================================= */}
          {activeMenu === "providers" && (
            <div className="mf-two-col-grid">
              <div className="mf-card-panel">
                <div className="mf-card-header">
                  <div className="mf-card-title-group">
                    <h3>{t("providersTitle")} ({providers.length})</h3>
                    <p>{t("providersSubtitle")}</p>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {providers.map((prov) => (
                    <div key={prov.id} style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <Bot size={18} color="var(--primary)" />
                          <strong style={{ fontSize: "0.95rem", color: "var(--text-dark)" }}>{prov.name}</strong>
                          <span className="code-chip">{prov.provider_type.toUpperCase()}</span>
                        </div>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <button
                            type="button"
                            className="btn-white-outline"
                            style={{ padding: "0.25rem 0.55rem", fontSize: "0.75rem" }}
                            onClick={() => void handleTestProvider(prov)}
                          >
                            {t("testLatency")}
                          </button>
                          <button
                            type="button"
                            className="btn-white-outline"
                            style={{ padding: "0.25rem 0.55rem", fontSize: "0.75rem" }}
                            onClick={() => openEditProviderModal(prov)}
                          >
                            <Pencil size={12} /> {t("edit")}
                          </button>
                          <button
                            type="button"
                            className="btn-white-outline"
                            style={{ padding: "0.25rem 0.55rem", fontSize: "0.75rem", color: "var(--danger)" }}
                            onClick={() => setDeletingProvider(prov)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Base URL: <code>{prov.base_url}</code> · Model: <strong>{prov.model}</strong>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>
                        {t("fieldCapabilities")}: {prov.capabilities.join(", ")}
                      </div>
                      {providerStatus[prov.id] && (
                        <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", fontWeight: 700, color: providerStatus[prov.id].startsWith("✓") ? "var(--success)" : "var(--danger)" }}>
                          {providerStatus[prov.id]}
                        </div>
                      )}
                    </div>
                  ))}
                  {providers.length === 0 && (
                    <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                      {t("noProvidersFound")}
                    </div>
                  )}
                </div>
              </div>

              {/* Add Provider Form */}
              <div className="mf-card-panel">
                <div className="mf-card-header">
                  <div className="mf-card-title-group">
                    <h3>{t("modalAddProviderTitle")}</h3>
                    <p>{language === "vi" ? "Kết nối thêm model OpenAI hoặc Gemini" : "Connect OpenAI or Gemini models"}</p>
                  </div>
                </div>

                <form onSubmit={handleCreateProvider} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldProviderName")}</label>
                    <input
                      type="text"
                      className="form-input-mf"
                      placeholder="OpenAI Main"
                      value={providerForm.name}
                      onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldType")}</label>
                    <select
                      className="form-input-mf"
                      value={providerForm.provider_type}
                      onChange={(e) => setProviderForm({ ...providerForm, provider_type: e.target.value as "openai" | "gemini" | "custom" })}
                    >
                      <option value="openai">OpenAI Compatible</option>
                      <option value="gemini">Google Gemini</option>
                      <option value="custom">Custom Endpoint</option>
                    </select>
                  </div>

                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldBaseUrl")}</label>
                    <input
                      type="text"
                      className="form-input-mf"
                      value={providerForm.base_url}
                      onChange={(e) => setProviderForm({ ...providerForm, base_url: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldModel")}</label>
                    <input
                      type="text"
                      className="form-input-mf"
                      value={providerForm.model}
                      onChange={(e) => setProviderForm({ ...providerForm, model: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldApiKey")}</label>
                    <input
                      type="password"
                      className="form-input-mf"
                      placeholder="sk-..."
                      value={providerForm.api_key}
                      onChange={(e) => setProviderForm({ ...providerForm, api_key: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldCapabilities")}</label>
                    <input
                      type="text"
                      className="form-input-mf"
                      value={providerForm.capabilities}
                      onChange={(e) => setProviderForm({ ...providerForm, capabilities: e.target.value })}
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary-orange" style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}>
                    <Plus size={16} /> {t("addProvider")}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: TELEMETRY & LOGS */}
          {/* ========================================================================= */}
          {activeMenu === "telemetry" && (
            <div className="mf-card-panel">
              <div className="mf-card-header">
                <div className="mf-card-title-group">
                  <h3>{t("telemetryTitle")} ({filteredLogs.length})</h3>
                  <p>{t("telemetrySubtitle")}</p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button type="button" className="btn-white-outline" onClick={() => setShowCreateLogModal(true)}>
                    <Plus size={15} /> {t("createManualLog")}
                  </button>
                  <button type="button" className="btn-white-outline" style={{ color: "var(--danger)" }} onClick={() => setShowClearLogsModal(true)}>
                    <Trash2 size={15} /> {t("clearLogs")}
                  </button>
                  <button type="button" className="btn-white-outline" onClick={() => void refresh()}>
                    <RotateCw size={15} /> {t("refresh")}
                  </button>
                </div>
              </div>

              {/* Severity Filter */}
              <div style={{ display: "flex", gap: "0.85rem", marginBottom: "1.25rem" }}>
                <select
                  className="form-input-mf"
                  style={{ width: "200px" }}
                  value={logSeverityFilter}
                  onChange={(e) => setLogSeverityFilter(e.target.value)}
                >
                  <option value="all">Tất cả mức độ (All Severities)</option>
                  <option value="fatal">FATAL</option>
                  <option value="error">ERROR</option>
                  <option value="warning">WARNING</option>
                  <option value="info">INFO</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {filteredLogs.map((log) => (
                  <div key={log.id} style={{ padding: "0.85rem 1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-light)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                      <span className={`pill-status pill-${log.severity === "fatal" ? "danger" : log.severity === "error" ? "danger" : "warning"}`} style={{ fontSize: "0.68rem" }}>
                        {log.severity.toUpperCase()}
                      </span>
                      <strong style={{ fontSize: "0.85rem", color: "var(--text-dark)" }}>{log.event_name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginLeft: "auto" }}>
                        v{log.app_version} · {new Date(log.created_at).toLocaleString(language === "vi" ? "vi-VN" : "en-US")}
                      </span>
                      <button
                        type="button"
                        className="btn-white-outline"
                        style={{ padding: "0.2rem 0.45rem", color: "var(--danger)" }}
                        onClick={() => void handleDeleteSingleLog(log.id)}
                        title={t("delete")}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {log.message}
                    </div>
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    {t("noLogsFound")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW: SETTINGS */}
          {/* ========================================================================= */}
          {activeMenu === "settings" && (
            <div className="mf-two-col-grid">
              {/* Left Column: System Configuration */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="mf-card-panel">
                  <div className="mf-card-header">
                    <div className="mf-card-title-group">
                      <h3>{language === "vi" ? "Cấu Hình Thương Hiệu & Mặc Định Cấp License" : "Studio Branding & License Defaults"}</h3>
                      <p>{language === "vi" ? "Tùy chỉnh thông số mặc định khi sinh license và logo studio" : "Customize default parameters when issuing licenses and studio logo"}</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveSystemSettings} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    <div className="mf-form-two-col">
                      <div className="form-group-mf">
                        <label className="form-label-mf">{language === "vi" ? "Tên Thương Hiệu Studio" : "Studio Brand Name"}</label>
                        <input
                          type="text"
                          className="form-input-mf"
                          value={systemSettings.studio_brand_name}
                          onChange={(e) => setSystemSettings({ ...systemSettings, studio_brand_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group-mf">
                        <label className="form-label-mf">{language === "vi" ? "Email Thông Báo Quản Trị" : "Admin Notification Email"}</label>
                        <input
                          type="email"
                          className="form-input-mf"
                          value={systemSettings.notification_email}
                          onChange={(e) => setSystemSettings({ ...systemSettings, notification_email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group-mf">
                      <label className="form-label-mf">{language === "vi" ? "Link Logo Thương Hiệu Chung (URL)" : "Global Studio Logo URL"}</label>
                      <input
                        type="url"
                        className="form-input-mf"
                        placeholder="https://example.com/logo.png"
                        value={systemSettings.custom_logo_url}
                        onChange={(e) => setSystemSettings({ ...systemSettings, custom_logo_url: e.target.value })}
                      />
                    </div>

                    <div className="mf-form-two-col">
                      <div className="form-group-mf">
                        <label className="form-label-mf">{language === "vi" ? "Số Ngày Mặc Định Cấp Key" : "Default License Duration (Days)"}</label>
                        <input
                          type="number"
                          className="form-input-mf"
                          value={systemSettings.default_days_valid}
                          onChange={(e) => setSystemSettings({ ...systemSettings, default_days_valid: parseInt(e.target.value) || 30 })}
                          required
                        />
                      </div>
                      <div className="form-group-mf">
                        <label className="form-label-mf">{language === "vi" ? "Giới Hạn Render Jobs/Ngày Mặc Định" : "Default Daily Render Jobs Limit"}</label>
                        <input
                          type="number"
                          className="form-input-mf"
                          value={systemSettings.default_max_jobs}
                          onChange={(e) => setSystemSettings({ ...systemSettings, default_max_jobs: parseInt(e.target.value) || 200 })}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ padding: "0.85rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "var(--text-dark)", display: "block" }}>
                          {language === "vi" ? "Nhận Tín Hiệu Telemetry Từ Máy Khách Desktop" : "Accept Desktop Client Telemetry"}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {language === "vi" ? "Cho phép thu thập nhật ký sự cố và phân tích từ tool Electron" : "Collect error logs and analysis telemetry from desktop apps"}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={systemSettings.telemetry_enabled}
                        onChange={(e) => setSystemSettings({ ...systemSettings, telemetry_enabled: e.target.checked })}
                        style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                      <button type="submit" className="btn-primary-orange">
                        <Check size={16} /> {t("saveChanges")}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Backup & Restore Panel */}
                <div className="mf-card-panel">
                  <div className="mf-card-header">
                    <div className="mf-card-title-group">
                      <h3>{language === "vi" ? "Sao Lưu & Phục Hồi Dữ Liệu Toàn Hệ Thống" : "Full System Backup & Disaster Recovery"}</h3>
                      <p>{language === "vi" ? "Xuất hoặc nhập toàn bộ dữ liệu License, Doanh thu, AI Providers dưới dạng JSON" : "Export or import full database snapshot containing licenses, billing, providers as JSON"}</p>
                    </div>
                  </div>

                  <div className="mf-form-two-col">
                    <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Download size={18} color="var(--primary)" />
                        <strong style={{ fontSize: "0.88rem", color: "var(--text-dark)" }}>{language === "vi" ? "Xuất Bản Sao Lưu" : "Export Backup"}</strong>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                        {language === "vi" ? "Tải xuống file JSON chứa toàn bộ dữ liệu máy chủ để lưu trữ an toàn." : "Download a complete JSON database snapshot for safe offline storage."}
                      </p>
                      <button
                        type="button"
                        className="btn-white-outline"
                        style={{ marginTop: "auto" }}
                        onClick={() => void handleExportBackup()}
                      >
                        <Download size={14} /> {language === "vi" ? "Tải File Backup (.json)" : "Download Backup (.json)"}
                      </button>
                    </div>

                    <div style={{ padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border-light)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Upload size={18} color="var(--success)" />
                        <strong style={{ fontSize: "0.88rem", color: "var(--text-dark)" }}>{language === "vi" ? "Khôi Phục Dữ Liệu" : "Restore Data"}</strong>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                        {language === "vi" ? "Chọn file backup JSON đã lưu trước đó để nhập dữ liệu vào hệ thống." : "Select previously exported JSON backup file to restore records."}
                      </p>
                      <label className="btn-white-outline" style={{ marginTop: "auto", cursor: "pointer", textAlign: "center" }}>
                        <Upload size={14} /> {language === "vi" ? "Chọn File Khôi Phục" : "Select Backup File"}
                        <input
                          type="file"
                          accept=".json"
                          style={{ display: "none" }}
                          onChange={(e) => void handleImportBackupFile(e)}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Runtime Diagnostics & System Information */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="mf-card-panel">
                  <div className="mf-card-header">
                    <div className="mf-card-title-group">
                      <h3>{language === "vi" ? "Chuẩn Đoán Môi Trường Server" : "Runtime Environment Diagnostics"}</h3>
                      <p>{language === "vi" ? "Trạng thái máy chủ API và kiến trúc thực thi" : "API server status and runtime architecture"}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Server size={15} color="var(--primary)" /> API Gateway Server
                      </span>
                      <span className="pill-status pill-online" style={{ fontSize: "0.72rem" }}>
                        ● Online (Port 8000)
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Activity size={15} color="var(--primary)" /> Desktop Native Engine
                      </span>
                      <strong style={{ fontSize: "0.82rem", color: "var(--text-dark)" }}>
                        v{systemInfo?.version || "0.3.17"} (Electron Native)
                      </strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Database size={15} color="var(--primary)" /> Store Storage Backend
                      </span>
                      <strong style={{ fontSize: "0.82rem", color: "var(--text-dark)" }}>
                        {systemInfo?.store_backend === "file" ? "Persistent JSON File" : "In-Memory Datastore"}
                      </strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Shield size={15} color="var(--primary)" /> Python & Runtime Platform
                      </span>
                      <strong style={{ fontSize: "0.82rem", color: "var(--text-dark)" }}>
                        Python {systemInfo?.python_version || "3.12"}
                      </strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <Key size={15} color="var(--primary)" /> {language === "vi" ? "Tổng License Đang Quản Lý" : "Total Managed Licenses"}
                      </span>
                      <strong style={{ fontSize: "0.88rem", color: "var(--primary)" }}>
                        {licenses.length} keys
                      </strong>
                    </div>
                  </div>
                </div>

                {/* API Docs quicklink */}
                <div className="mf-card-panel" style={{ background: "linear-gradient(135deg, #1a1d2e 0%, #262a40 100%)", color: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(249, 87, 56, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                      <Zap size={20} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "0.95rem", color: "#fff", display: "block" }}>OpenAPI Interactive Docs</strong>
                      <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>Swagger UI & Redoc Documentation</span>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.8)", margin: "0.5rem 0 1rem" }}>
                    {language === "vi" ? "Truy cập tài liệu đặc tả API Swagger UI để kiểm thử trực tiếp các endpoint của hệ thống." : "Access interactive Swagger UI documentation to test server endpoints."}
                  </p>
                  <a
                    href="http://localhost:8000/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary-orange"
                    style={{ textDecoration: "none", display: "inline-flex", width: "100%", justifyContent: "center" }}
                  >
                    <ArrowUpRight size={15} /> Mở Swagger API Docs (/docs)
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RELEASES & OTA UPDATES */}
          {activeMenu === "releases" && (
            <ReleasesPage
              releases={releases}
              token={token}
              onRefresh={refresh}
              setMessage={setMessage}
              setError={setError}
            />
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* MODAL: ACCOUNT & SECURITY */}
      {showAccountModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box" style={{ maxWidth: "480px" }}>
            <div className="modal-header-mf">
              <div>
                <h3>{language === "vi" ? "Quản Lý Tài Khoản & Đổi Mật Khẩu" : "Account & Password Security"}</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setShowAccountModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="modal-body-mf">
                <div className="form-group-mf">
                  <label className="form-label-mf">{language === "vi" ? "Email Quản Trị" : "Admin Email"}</label>
                  <input
                    type="email"
                    className="form-input-mf"
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-mf">
                  <label className="form-label-mf">{language === "vi" ? "Mật Khẩu Hiện Tại *" : "Current Password *"}</label>
                  <input
                    type="password"
                    className="form-input-mf"
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-mf">
                  <label className="form-label-mf">{language === "vi" ? "Mật Khẩu Mới (Tối thiểu 6 ký tự) *" : "New Password (Min 6 chars) *"}</label>
                  <input
                    type="password"
                    className="form-input-mf"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-mf">
                  <label className="form-label-mf">{language === "vi" ? "Xác Nhận Mật Khẩu Mới *" : "Confirm New Password *"}</label>
                  <input
                    type="password"
                    className="form-input-mf"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer-mf">
                <button type="button" className="btn-white-outline" onClick={() => setShowAccountModal(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary-orange">
                  <KeyRound size={16} /> {language === "vi" ? "Cập Nhật Mật Khẩu" : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE LICENSE */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box" style={{ maxWidth: "580px" }}>
            <div className="modal-header-mf">
              <div>
                <h3>{t("modalCreateLicenseTitle")}</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLicense}>
              <div className="modal-body-mf">
                <div className="mf-form-two-col">
                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldCustomerName")}</label>
                    <input
                      type="text"
                      className="form-input-mf"
                      placeholder="Nguyễn Văn A"
                      value={createCustomerName}
                      onChange={(e) => setCreateCustomerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldContact")}</label>
                    <input
                      type="text"
                      className="form-input-mf"
                      placeholder="client@gmail.com"
                      value={createCustomerContact}
                      onChange={(e) => setCreateCustomerContact(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldHwid")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    placeholder="JACS-WIN-4A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D"
                    value={createHwid}
                    onChange={(e) => setCreateHwid(e.target.value)}
                    required
                  />
                </div>

                <div className="mf-form-three-col">
                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldDays")}</label>
                    <input
                      type="number"
                      className="form-input-mf"
                      value={createDays}
                      onChange={(e) => setCreateDays(e.target.value)}
                    />
                  </div>
                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldMaxJobs")}</label>
                    <input
                      type="number"
                      className="form-input-mf"
                      value={createMaxJobs}
                      onChange={(e) => setCreateMaxJobs(e.target.value)}
                    />
                  </div>
                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldBillAmount")}</label>
                    <input
                      type="number"
                      className="form-input-mf"
                      value={createBillAmount}
                      onChange={(e) => setCreateBillAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldLogoUrl")}</label>
                  <input
                    type="url"
                    className="form-input-mf"
                    placeholder="https://example.com/logo.png"
                    value={createLogoUrl}
                    onChange={(e) => setCreateLogoUrl(e.target.value)}
                  />
                </div>

                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldNotes")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    placeholder="Creator Pro Plan"
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer-mf">
                <button type="button" className="btn-white-outline" onClick={() => setShowCreateModal(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary-orange">
                  <Plus size={16} /> {t("confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT LICENSE */}
      {editingLicense && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3>{t("modalEditLicenseTitle")} ({editingLicense.key_hint})</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setEditingLicense(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body-mf">
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldCustomerName")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldContact")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    value={editCustomerContact}
                    onChange={(e) => setEditCustomerContact(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldMaxJobs")}</label>
                  <input
                    type="number"
                    className="form-input-mf"
                    value={editMaxJobs}
                    onChange={(e) => setEditMaxJobs(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldLogoUrl")}</label>
                  <input
                    type="url"
                    className="form-input-mf"
                    value={editLogoUrl}
                    onChange={(e) => setEditLogoUrl(e.target.value)}
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldNotes")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer-mf">
                <button type="button" className="btn-white-outline" onClick={() => setEditingLicense(null)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary-orange">
                  {t("saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RENEW LICENSE */}
      {renewingLicense && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3>{t("modalRenewLicenseTitle")}</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setRenewingLicense(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRenewLicense}>
              <div className="modal-body-mf">
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldCustomerName")}</label>
                  <input type="text" className="form-input-mf" value={renewingLicense.customer_name} disabled />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldDays")}</label>
                  <input
                    type="number"
                    className="form-input-mf"
                    value={renewDays}
                    onChange={(e) => setRenewDays(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldBillAmount")}</label>
                  <input
                    type="number"
                    className="form-input-mf"
                    value={renewAmount}
                    onChange={(e) => setRenewAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer-mf">
                <button type="button" className="btn-white-outline" onClick={() => setRenewingLicense(null)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary-orange">
                  {t("confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET HWID */}
      {resettingHwidLicense && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3>{t("modalResetHwidTitle")}</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setResettingHwidLicense(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetHwid}>
              <div className="modal-body-mf">
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldOldHwid")}</label>
                  <input type="text" className="form-input-mf" value={resettingHwidLicense.hwid} disabled />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldNewHwid")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    placeholder="JACS-WIN-..."
                    value={newHwid}
                    onChange={(e) => setNewHwid(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldReason")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    value={hwidReason}
                    onChange={(e) => setHwidReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer-mf">
                <button type="button" className="btn-white-outline" onClick={() => setResettingHwidLicense(null)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary-orange">
                  {t("confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deletingLicense && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3 style={{ color: "var(--danger)" }}>{t("modalDeleteLicenseTitle")}</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setDeletingLicense(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-mf">
              <p>{t("modalDeleteConfirmText")}</p>
              <p><strong>{deletingLicense.customer_name}</strong> ({deletingLicense.key_hint})</p>
            </div>

            <div className="modal-footer-mf">
              <button type="button" className="btn-white-outline" onClick={() => setDeletingLicense(null)}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn-primary-orange"
                style={{ background: "var(--danger)" }}
                onClick={() => void handleDeleteLicense()}
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DISPLAY CREATED RAW KEY */}
      {createdKeyData && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3 style={{ color: "var(--success)" }}>{t("modalCreatedSuccessTitle")}</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setCreatedKeyData(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-mf">
              <p>{language === "vi" ? "Mã License Key kích hoạt cho khách hàng" : "License Key issued for customer"} <strong>{createdKeyData.customer_name}</strong>:</p>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  type="text"
                  className="form-input-mf"
                  value={createdKeyData.raw_key}
                  readOnly
                  style={{ fontFamily: "var(--font-mono)", fontWeight: 700, background: "#f8fafc" }}
                />
                <button
                  type="button"
                  className="btn-primary-orange"
                  onClick={() => void copyText(createdKeyData.raw_key, "created-raw-key")}
                >
                  {copiedItemId === "created-raw-key" ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <small style={{ color: "var(--text-muted)", display: "block", marginTop: "0.5rem" }}>
                🔒 {language === "vi" ? "Key chỉ hiển thị một lần duy nhất lúc tạo. Hệ thống không lưu trữ plaintext key." : "Key is displayed only once upon generation. The system does not store plaintext keys."}
              </small>
            </div>

            <div className="modal-footer-mf">
              <button type="button" className="btn-primary-orange" onClick={() => setCreatedKeyData(null)}>
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD TRANSACTION */}
      {showAddTransactionModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3>{t("modalAddTransactionTitle")}</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setShowAddTransactionModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction}>
              <div className="modal-body-mf">
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldCustomerName")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    placeholder="Studio Media ABC"
                    value={txCustomerName}
                    onChange={(e) => setTxCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="mf-form-two-col">
                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldPlanName")}</label>
                    <input
                      type="text"
                      className="form-input-mf"
                      value={txPlanName}
                      onChange={(e) => setTxPlanName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldBillAmount")}</label>
                    <input
                      type="number"
                      className="form-input-mf"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="mf-form-two-col">
                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldPaymentMethod")}</label>
                    <select
                      className="form-input-mf"
                      value={txPaymentMethod}
                      onChange={(e) => setTxPaymentMethod(e.target.value)}
                    >
                      <option value="bank_transfer">Chuyển Khoản (Bank)</option>
                      <option value="momo">Ví MoMo</option>
                      <option value="zalopay">ZaloPay</option>
                      <option value="crypto">USDT / Crypto</option>
                      <option value="cash">Tiền mặt (Cash)</option>
                    </select>
                  </div>
                  <div className="form-group-mf">
                    <label className="form-label-mf">{t("fieldTxType")}</label>
                    <select
                      className="form-input-mf"
                      value={txType}
                      onChange={(e) => setTxType(e.target.value as "new_key" | "renewal" | "upgrade" | "adjustment")}
                    >
                      <option value="new_key">Cấp Key Mới</option>
                      <option value="renewal">Gia Hạn Dịch Vụ</option>
                      <option value="upgrade">Nâng Cấp Gói</option>
                      <option value="adjustment">Điều Chỉnh Dòng Tiền</option>
                    </select>
                  </div>
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldNotes")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    placeholder="Mã tham chiếu ngân hàng..."
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer-mf">
                <button type="button" className="btn-white-outline" onClick={() => setShowAddTransactionModal(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary-orange">
                  <Plus size={16} /> {t("confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE TRANSACTION */}
      {deletingTransaction && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3 style={{ color: "var(--danger)" }}>Hủy Giao Dịch</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setDeletingTransaction(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-mf">
              <p>{t("modalDeleteConfirmText")}</p>
              <p><strong>{deletingTransaction.customer_name}</strong> - {formatCurrency(deletingTransaction.amount)}</p>
            </div>

            <div className="modal-footer-mf">
              <button type="button" className="btn-white-outline" onClick={() => setDeletingTransaction(null)}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn-primary-orange"
                style={{ background: "var(--danger)" }}
                onClick={() => void handleDeleteTransaction()}
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT AI PROVIDER */}
      {editingProvider && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3>{t("modalEditProviderTitle")} ({editingProvider.name})</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setEditingProvider(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProvider}>
              <div className="modal-body-mf">
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldProviderName")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    value={editProviderForm.name}
                    onChange={(e) => setEditProviderForm({ ...editProviderForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldBaseUrl")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    value={editProviderForm.base_url}
                    onChange={(e) => setEditProviderForm({ ...editProviderForm, base_url: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldModel")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    value={editProviderForm.model}
                    onChange={(e) => setEditProviderForm({ ...editProviderForm, model: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldApiKey")} (Để trống nếu không đổi)</label>
                  <input
                    type="password"
                    className="form-input-mf"
                    placeholder="••••••••"
                    value={editProviderForm.api_key}
                    onChange={(e) => setEditProviderForm({ ...editProviderForm, api_key: e.target.value })}
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">{t("fieldCapabilities")}</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    value={editProviderForm.capabilities}
                    onChange={(e) => setEditProviderForm({ ...editProviderForm, capabilities: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer-mf">
                <button type="button" className="btn-white-outline" onClick={() => setEditingProvider(null)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary-orange">
                  {t("saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE AI PROVIDER */}
      {deletingProvider && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3 style={{ color: "var(--danger)" }}>Xóa AI Provider</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setDeletingProvider(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-mf">
              <p>{t("modalDeleteConfirmText")}</p>
              <p><strong>{deletingProvider.name}</strong> ({deletingProvider.model})</p>
            </div>

            <div className="modal-footer-mf">
              <button type="button" className="btn-white-outline" onClick={() => setDeletingProvider(null)}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn-primary-orange"
                style={{ background: "var(--danger)" }}
                onClick={() => void handleDeleteProvider()}
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE MANUAL TEST LOG */}
      {showCreateLogModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3>{t("createManualLog")}</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setShowCreateLogModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateManualLog}>
              <div className="modal-body-mf">
                <div className="form-group-mf">
                  <label className="form-label-mf">Tên Sự Kiện (Event Name)</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    value={manualLogForm.event_name}
                    onChange={(e) => setManualLogForm({ ...manualLogForm, event_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">Mức Độ Nghiêm Trọng (Severity)</label>
                  <select
                    className="form-input-mf"
                    value={manualLogForm.severity}
                    onChange={(e) => setManualLogForm({ ...manualLogForm, severity: e.target.value as "info" | "warning" | "error" | "fatal" })}
                  >
                    <option value="info">INFO</option>
                    <option value="warning">WARNING</option>
                    <option value="error">ERROR</option>
                    <option value="fatal">FATAL</option>
                  </select>
                </div>
                <div className="form-group-mf">
                  <label className="form-label-mf">Nội Dung Thông Báo (Message)</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    value={manualLogForm.message}
                    onChange={(e) => setManualLogForm({ ...manualLogForm, message: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer-mf">
                <button type="button" className="btn-white-outline" onClick={() => setShowCreateLogModal(false)}>
                  {t("cancel")}
                </button>
                <button type="submit" className="btn-primary-orange">
                  <Plus size={16} /> {t("confirm")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CLEAR ALL LOGS */}
      {showClearLogsModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box">
            <div className="modal-header-mf">
              <div>
                <h3 style={{ color: "var(--danger)" }}>{t("clearLogs")}</h3>
              </div>
              <button type="button" className="btn-close-modal" onClick={() => setShowClearLogsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-mf">
              <p>Bạn có chắc chắn muốn xóa sạch toàn bộ ({logs.length}) nhật ký telemetry không? Hành động này sẽ dọn dẹp toàn bộ dữ liệu log sự cố.</p>
            </div>

            <div className="modal-footer-mf">
              <button type="button" className="btn-white-outline" onClick={() => setShowClearLogsModal(false)}>
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn-primary-orange"
                style={{ background: "var(--danger)" }}
                onClick={() => void handleClearAllLogs()}
              >
                {t("clearLogs")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
