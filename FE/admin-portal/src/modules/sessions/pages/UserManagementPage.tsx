import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  UserPlus,
  RotateCw,
  Search,
  Calendar,
  CalendarPlus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  Power,
  Copy,
  Check,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Sparkles,
  Info,
  X,
  CreditCard,
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import type { License, ClientSession, LicenseStatus } from "../../../core/types";
import { licenseService, type CreateLicensePayload, type UpdateLicensePayload, type RenewLicensePayload, type ResetHwidPayload } from "../../licenses/services/licenseService";
import { sessionService } from "../services/sessionService";
import { useI18n } from "../../../core/i18n";
import Swal, { showToast, confirmDialog, alertSuccess, alertError } from "../../../core/swal";

const toLocalDateTimeInput = (isoString?: string | null) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};



interface UserManagementPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export type StatusFilter = "all" | "online" | "offline" | "active" | "expired" | "blocked";

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  searchTerm: externalSearch = "",
  onNotify,
}) => {
  const { t } = useI18n();

  // Data states
  const [licenses, setLicenses] = useState<License[]>([]);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetHwidModal, setShowResetHwidModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalCertLicense, setLegalCertLicense] = useState<License | null>(null);

  // Selected item for modals
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);

  const handleOpenLegalCert = (lic: License) => {
    setLegalCertLicense(lic);
    setShowLegalModal(true);
  };


  // Action loading states
  const [actionLoading, setActionLoading] = useState(false);

  // Create Modal Form Data
  const [createForm, setCreateForm] = useState({
    customer_name: "",
    customer_contact: "",
    hwid: "",
    plan_preset: "30_days",
    expires_at: "",
    amount: 500000,
    payment_method: "bank_transfer",
    max_jobs_per_day: 100,
    premium_ai: true,
    notes: "",
  });

  // Renew Modal Form Data
  const [renewForm, setRenewForm] = useState({
    preset_days: 30,
    new_expires_at: "",
    amount: 500000,
    payment_method: "bank_transfer",
    reason: "Gia hạn bản quyền sử dụng phần mềm",
  });

  // Edit Modal Form Data
  const [editForm, setEditForm] = useState({
    customer_name: "",
    customer_contact: "",
    max_jobs_per_day: 100,
    premium_ai: true,
    notes: "",
    expires_at: "",
    status: "active" as LicenseStatus,
    license_key: "",
    hwid: "",
  });

  // Reset HWID Form Data
  const [resetHwidForm, setResetHwidForm] = useState({
    hwid: "",
    reason: "Khách hàng đổi sang máy tính mới",
  });

  const notify = (msg: string, type: "success" | "error" | "info" | "warning" = "success") => {
    showToast(msg, type);
    if (onNotify && (type === "success" || type === "error")) onNotify(msg, type);
  };

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(id);
      setTimeout(() => setCopiedKey(null), 2000);
      if (text.includes("****")) {
        notify("Đã copy key hint (Lưu ý: Key cũ bị ẩn dấu sao, bạn có thể bấm 'Cấp Key Mới' trong phần Sửa để lấy Key đầy đủ)", "info");
      } else {
        notify("Đã sao chép License Key đầy đủ vào bộ nhớ tạm", "success");
      }
    }
  };


  // Helper to generate a compliant HWID format
  const generatePlaceholderHwid = () => {
    const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("").toUpperCase();
    return `JACS-WIN-${hex}`;
  };

  // Fetch all licenses and active sessions
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [licsRes, sessRes] = await Promise.allSettled([
        licenseService.getLicenses(),
        sessionService.getSessions(),
      ]);

      if (licsRes.status === "fulfilled" && Array.isArray(licsRes.value)) {
        setLicenses(licsRes.value);
      }
      if (sessRes.status === "fulfilled" && Array.isArray(sessRes.value)) {
        setSessions(sessRes.value);
      }
    } catch {
      notify("Không thể tải dữ liệu người dùng & máy khách", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (externalSearch) {
      setSearchQuery(externalSearch);
    }
  }, [externalSearch]);

  // Merge licenses with active session telemetry
  const mergedItems = useMemo(() => {
    const sessionMap = new Map<string, ClientSession>();
    for (const sess of sessions) {
      if (sess.license_id) sessionMap.set(sess.license_id, sess);
      if (sess.hwid) sessionMap.set(sess.hwid, sess);
    }

    return licenses.map((lic) => {
      const liveSession = sessionMap.get(lic.id) || sessionMap.get(lic.hwid);
      const isOnline = liveSession?.is_online || false;
      
      // Calculate expiry status
      const now = new Date();
      const expiresAt = lic.expires_at ? new Date(lic.expires_at) : null;
      const isExpired = expiresAt ? expiresAt < now : false;
      
      let daysRemaining: number | null = null;
      if (expiresAt) {
        const diffMs = expiresAt.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        ...lic,
        liveSession,
        isOnline,
        isExpired,
        daysRemaining,
        displayStatus: lic.status === "blocked" 
          ? "blocked" 
          : isExpired 
            ? "expired" 
            : isOnline 
              ? "online" 
              : lic.status,
      };
    });
  }, [licenses, sessions]);

  // Compute top stat metrics
  const metrics = useMemo(() => {
    const total = mergedItems.length;
    const online = mergedItems.filter((i) => i.isOnline).length;
    const offline = mergedItems.filter((i) => !i.isOnline && i.status === "active" && !i.isExpired).length;
    const active = mergedItems.filter((i) => i.status === "active" && !i.isExpired).length;
    const expired = mergedItems.filter((i) => i.isExpired).length;
    const blocked = mergedItems.filter((i) => i.status === "blocked").length;
    const expiredOrBlocked = mergedItems.filter((i) => i.isExpired || i.status === "blocked").length;
    const aiProCount = mergedItems.filter((i) => i.premium_ai).length;

    return { total, online, offline, active, expired, blocked, expiredOrBlocked, aiProCount };
  }, [mergedItems]);

  // Filter and search
  const filteredItems = useMemo(() => {
    let list = mergedItems;

    // Filter by status tab
    if (statusFilter === "online") {
      list = list.filter((i) => i.isOnline);
    } else if (statusFilter === "offline") {
      list = list.filter((i) => !i.isOnline && i.status === "active" && !i.isExpired);
    } else if (statusFilter === "active") {
      list = list.filter((i) => i.status === "active" && !i.isExpired);
    } else if (statusFilter === "expired") {
      list = list.filter((i) => i.isExpired);
    } else if (statusFilter === "blocked") {
      list = list.filter((i) => i.status === "blocked");
    }

    // Search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.customer_name?.toLowerCase().includes(q) ||
          i.customer_contact?.toLowerCase().includes(q) ||
          i.key_hint?.toLowerCase().includes(q) ||
          i.hwid?.toLowerCase().includes(q) ||
          i.last_ip?.toLowerCase().includes(q) ||
          i.notes?.toLowerCase().includes(q)
      );
    }

    // Sort: Online first, then newest
    return list.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [mergedItems, statusFilter, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, pageSize]);

  // --- ACTIONS ---

  // 1. Open Create Modal with default calculated date
  const handleOpenCreate = () => {
    const defaultExp = new Date();
    defaultExp.setDate(defaultExp.getDate() + 30);
    defaultExp.setHours(23, 59, 59, 0);

    setCreateForm({
      customer_name: "",
      customer_contact: "",
      hwid: generatePlaceholderHwid(),
      plan_preset: "30_days",
      expires_at: defaultExp.toISOString().slice(0, 16),
      amount: 500000,
      payment_method: "bank_transfer",
      max_jobs_per_day: 100,
      premium_ai: true,
      notes: "",
    });
    setShowCreateModal(true);
  };

  // Preset plan helper for Create
  const handlePlanPresetChange = (preset: string) => {
    const exp = new Date();
    let price = 500000;

    if (preset === "1_day") {
      exp.setDate(exp.getDate() + 1);
      price = 50000;
    } else if (preset === "7_days") {
      exp.setDate(exp.getDate() + 7);
      price = 150000;
    } else if (preset === "30_days") {
      exp.setDate(exp.getDate() + 30);
      price = 500000;
    } else if (preset === "90_days") {
      exp.setDate(exp.getDate() + 90);
      price = 1350000;
    } else if (preset === "365_days") {
      exp.setDate(exp.getDate() + 365);
      price = 4500000;
    } else if (preset === "lifetime") {
      exp.setFullYear(exp.getFullYear() + 50);
      price = 10000000;
    }

    exp.setHours(23, 59, 59, 0);
    setCreateForm((prev) => ({
      ...prev,
      plan_preset: preset,
      expires_at: exp.toISOString().slice(0, 16),
      amount: price,
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.customer_name.trim()) {
      notify("Vui lòng nhập tên khách hàng / người dùng", "error");
      return;
    }

    try {
      setActionLoading(true);
      const payload: CreateLicensePayload = {
        customer_name: createForm.customer_name.trim(),
        customer_contact: createForm.customer_contact.trim() || createForm.customer_name.trim(),
        hwid: createForm.hwid.trim() || generatePlaceholderHwid(),
        days_valid: 30, // calculated by expires_at on BE
        max_jobs_per_day: Number(createForm.max_jobs_per_day) || 100,
        premium_ai: Boolean(createForm.premium_ai),
        notes: createForm.notes.trim() || null,
      };

      const res = await licenseService.create({
        ...payload,
        expires_at: createForm.expires_at ? new Date(createForm.expires_at).toISOString() : null,
        amount: Number(createForm.amount) || 0,
        plan_type: createForm.plan_preset,
        payment_method: createForm.payment_method,
      } as any);

      setShowCreateModal(false);
      await fetchData();

      const fullKey = (res as any).key || (res as any).license_key || res.key_hint;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(fullKey);
      }

      await Swal.fire({
        title: "🎉 Đã tạo người dùng & cấp Key thành công!",
        html: `<div style="text-align: left; font-size: 14px; color: #334155; line-height: 1.6;">
          <p style="margin: 0 0 10px;">Khách hàng: <b>${res.customer_name}</b> (${res.customer_contact || ""})</p>
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 14px; margin: 12px 0;">
            <label style="display: block; font-size: 12px; font-weight: 800; color: #15803d; margin-bottom: 6px;">
              🔑 LICENSE KEY ĐẦY ĐỦ (GỬI CHO KHÁCH HÀNG):
            </label>
            <div style="font-family: monospace; font-size: 16px; font-weight: 800; color: #047857; word-break: break-all; user-select: all; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #bbf7d0;">
              ${fullKey}
            </div>
          </div>
          <p style="font-size: 12.5px; color: #64748b; margin: 0;">
            💡 Đã tự động sao chép License Key vào bộ nhớ tạm. Hãy gửi mã này cho khách hàng kích hoạt trên ứng dụng Desktop.
          </p>
        </div>`,
        icon: "success",
        confirmButtonText: "📋 Đã Sao Chép & Đóng",
        confirmButtonColor: "#ea580c",
        backdrop: `rgba(15, 23, 42, 0.65)`,
      });
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Tạo người dùng thất bại", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Open Renew Modal with Date Picker
  const handleOpenRenew = (lic: License) => {
    setSelectedLicense(lic);
    
    // Start from current expiry if in future, else from now
    const baseDate = lic.expires_at && new Date(lic.expires_at) > new Date() 
      ? new Date(lic.expires_at) 
      : new Date();
    
    const newExp = new Date(baseDate);
    newExp.setDate(newExp.getDate() + 30);
    newExp.setHours(23, 59, 59, 0);

    setRenewForm({
      preset_days: 30,
      new_expires_at: toLocalDateTimeInput(newExp.toISOString()),
      amount: 500000,
      payment_method: "bank_transfer",
      reason: `Gia hạn bản quyền cho ${lic.customer_name}`,
    });
    setShowRenewModal(true);
  };

  // Quick preset adder for Renew Modal
  const handleRenewQuickPreset = (days: number) => {
    const baseDate = selectedLicense?.expires_at && new Date(selectedLicense.expires_at) > new Date()
      ? new Date(selectedLicense.expires_at)
      : new Date();
    
    const target = new Date(baseDate);
    let amount = 500000;

    if (days === 7) {
      target.setDate(target.getDate() + 7);
      amount = 150000;
    } else if (days === 30) {
      target.setDate(target.getDate() + 30);
      amount = 500000;
    } else if (days === 90) {
      target.setDate(target.getDate() + 90);
      amount = 1350000;
    } else if (days === 180) {
      target.setDate(target.getDate() + 180);
      amount = 2500000;
    } else if (days === 365) {
      target.setDate(target.getDate() + 365);
      amount = 4500000;
    } else if (days === 18250) { // 50 years (lifetime)
      target.setFullYear(target.getFullYear() + 50);
      amount = 10000000;
    }

    target.setHours(23, 59, 59, 0);
    setRenewForm((prev) => ({
      ...prev,
      preset_days: days,
      new_expires_at: toLocalDateTimeInput(target.toISOString()),
      amount,
    }));
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicense) return;
    if (!renewForm.new_expires_at) {
      notify("Vui lòng chọn ngày hết hạn mới", "error");
      return;
    }

    const targetDate = new Date(renewForm.new_expires_at);
    if (targetDate <= new Date()) {
      notify("Ngày hết hạn mới phải ở tương lai", "error");
      return;
    }

    try {
      setActionLoading(true);
      const payload: RenewLicensePayload = {
        expires_at: targetDate.toISOString(),
        amount: Number(renewForm.amount) || 0,
        plan_type: renewForm.preset_days >= 365 ? "1_year" : `${renewForm.preset_days}_days`,
        payment_method: renewForm.payment_method,
        reason: renewForm.reason.trim() || `Gia hạn bản quyền cho ${selectedLicense.customer_name}`,
      };

      await licenseService.renew(selectedLicense.id, payload);
      notify(`Đã gia hạn thành công cho ${selectedLicense.customer_name} đến ${targetDate.toLocaleDateString("vi-VN")}`, "success");
      setShowRenewModal(false);
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Gia hạn thất bại", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Open Edit Modal
  const handleOpenEdit = (lic: License) => {
    setSelectedLicense(lic);
    const fullKey = lic.license_key || lic.raw_key || lic.key || lic.key_hint;
    setEditForm({
      customer_name: lic.customer_name || "",
      customer_contact: lic.customer_contact || "",
      max_jobs_per_day: lic.max_jobs_per_day || 100,
      premium_ai: Boolean(lic.premium_ai),
      notes: lic.notes || "",
      expires_at: toLocalDateTimeInput(lic.expires_at),
      status: lic.status || "active",
      license_key: fullKey,
      hwid: lic.hwid || "",
    });
    setShowEditModal(true);
  };

  // Cấp lại License Key mới
  const handleRegenerateKey = async (lic: License) => {
    const confirmed = await confirmDialog({
      title: "Cấp lại License Key mới?",
      html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
        <p>Bạn có chắc muốn cấp mã License Key mới cho <b>${lic.customer_name}</b>?</p>
        <p style="font-size: 12.5px; color: #64748b; margin-top: 6px;">
          Key cũ sẽ bị vô hiệu hóa. Hệ thống sẽ sinh mã Key mới đầy đủ để gửi cho khách hàng.
        </p>
      </div>`,
      icon: "warning",
      confirmButtonText: "Tạo Key Mới",
      cancelButtonText: "Hủy bỏ",
      isDestructive: false,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await licenseService.regenerateKey(lic.id);
      const newKey = res.key || res.license_key || res.key_hint;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(newKey);
      }
      setEditForm((prev) => ({ ...prev, license_key: newKey }));
      await Swal.fire({
        title: "🔑 Đã cấp License Key mới thành công!",
        html: `<div style="text-align: left; font-size: 14px; color: #334155; line-height: 1.6;">
          <p style="margin: 0 0 10px;">Khách hàng: <b>${lic.customer_name}</b></p>
          <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 14px; margin: 12px 0;">
            <label style="display: block; font-size: 12px; font-weight: 800; color: #15803d; margin-bottom: 6px;">
              LICENSE KEY MỚI (ĐÃ TỰ ĐỘNG SAO CHÉP):
            </label>
            <div style="font-family: monospace; font-size: 16px; font-weight: 800; color: #047857; word-break: break-all; user-select: all; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #bbf7d0;">
              ${newKey}
            </div>
          </div>
          <p style="font-size: 12.5px; color: #64748b; margin: 0;">
            💡 Đã tự động sao chép mã Key mới vào bộ nhớ tạm. Hãy gửi mã này cho khách hàng kích hoạt.
          </p>
        </div>`,
        icon: "success",
        confirmButtonText: "Hoàn Tất",
        confirmButtonColor: "#ea580c",
      });
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không thể cấp lại key", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicense) return;

    if (!editForm.customer_name.trim()) {
      notify("Vui lòng nhập tên người dùng / khách hàng", "error");
      return;
    }

    try {
      setActionLoading(true);
      const payload: UpdateLicensePayload = {
        customer_name: editForm.customer_name.trim(),
        customer_contact: editForm.customer_contact.trim(),
        max_jobs_per_day: Number(editForm.max_jobs_per_day) || 100,
        premium_ai: editForm.premium_ai,
        notes: editForm.notes.trim() || null,
        expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null,
      };

      await licenseService.update(selectedLicense.id, payload);

      if (editForm.status !== selectedLicense.status) {
        await licenseService.toggleStatus(selectedLicense.id, editForm.status as any);
      }

      notify(`Đã cập nhật thông tin ${editForm.customer_name}`, "success");
      setShowEditModal(false);
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Cập nhật thất bại", "error");
    } finally {
      setActionLoading(false);
    }
  };


  // 4. Open Reset HWID Modal
  const handleOpenResetHwid = (lic: License) => {
    setSelectedLicense(lic);
    setResetHwidForm({
      hwid: generatePlaceholderHwid(),
      reason: `Đổi máy cho khách hàng ${lic.customer_name}`,
    });
    setShowResetHwidModal(true);
  };

  const handleResetHwidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicense) return;
    if (!resetHwidForm.hwid.trim()) {
      notify("Vui lòng nhập mã máy (HWID) mới", "error");
      return;
    }

    try {
      setActionLoading(true);
      const payload: ResetHwidPayload = {
        hwid: resetHwidForm.hwid.trim(),
        reason: resetHwidForm.reason.trim(),
      };

      await licenseService.resetHwid(selectedLicense.id, payload);
      notify(`Đã reset mã máy thành công cho ${selectedLicense.customer_name}`, "success");
      setShowResetHwidModal(false);
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không thể reset mã máy", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Toggle Status (Active <-> Blocked)
  const handleToggleStatus = async (lic: License) => {
    const newStatus = lic.status === "active" ? "blocked" : "active";
    const isLocking = newStatus === "blocked";
    const actionName = isLocking ? "khóa" : "mở khóa";

    const confirmed = await confirmDialog({
      title: isLocking ? "Tạm khóa người dùng?" : "Mở khóa tài khoản?",
      html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
        <p>Bạn có chắc muốn <b>${actionName}</b> tài khoản của khách hàng <b>${lic.customer_name}</b>?</p>
        <p style="font-size: 12.5px; color: #64748b; margin-top: 6px;">
          ${isLocking 
            ? "⚠️ Khi bị khóa, máy khách sử dụng License này sẽ bị từ chối kết nối và ngắt phiên ngay lập tức." 
            : "✓ Sau khi mở khóa, khách hàng có thể tiếp tục sử dụng ứng dụng bình thường."}
        </p>
      </div>`,
      icon: isLocking ? "warning" : "info",
      confirmButtonText: isLocking ? "Khóa ngay" : "Mở khóa",
      cancelButtonText: "Hủy bỏ",
      isDestructive: isLocking,
    });

    if (!confirmed) return;

    try {
      await licenseService.toggleStatus(lic.id, newStatus);
      notify(`Đã ${actionName} tài khoản ${lic.customer_name}`, "success");
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : `Không thể ${actionName} tài khoản`, "error");
    }
  };

  // 6. Terminate Session
  const handleTerminateSession = async (lic: License) => {
    const confirmed = await confirmDialog({
      title: "Ngắt kết nối phiên máy khách?",
      html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
        <p>Bạn có chắc muốn ngắt phiên trực tuyến của <b>${lic.customer_name}</b>?</p>
        <p style="font-size: 12.5px; color: #64748b; margin-top: 6px;">
          Ứng dụng desktop trên máy khách sẽ nhận lệnh đăng xuất khỏi phiên làm việc hiện tại.
        </p>
      </div>`,
      icon: "warning",
      confirmButtonText: "Ngắt phiên",
      cancelButtonText: "Hủy bỏ",
      isDestructive: true,
    });

    if (!confirmed) return;

    try {
      await sessionService.terminateSession(lic.id);
      notify("Đã ngắt phiên máy khách thành công", "success");
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không thể ngắt phiên", "error");
    }
  };

  // 7. Delete License / User
  const handleOpenDelete = async (lic: License) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận xóa người dùng?",
      html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
        <p>Bạn có chắc muốn xóa vĩnh viễn người dùng <b>${lic.customer_name}</b>?</p>
        <p style="margin: 6px 0 10px; font-size: 12.5px; color: #64748b;">
          Email / Liên hệ: <b>${lic.customer_contact || "N/A"}</b><br/>
          License Key: <code style="color: #e11d48; font-weight: 700;">${lic.key_hint}</code>
        </p>
        <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #9f1239;">
          ⚠️ <b>Cảnh báo:</b> License key và mọi dữ liệu phiên kết nối HWID liên quan sẽ bị xóa vĩnh viễn khỏi hệ thống!
        </div>
      </div>`,
      icon: "warning",
      confirmButtonText: "Xóa vĩnh viễn",
      cancelButtonText: "Hủy bỏ",
      isDestructive: true,
    });

    if (!confirmed) return;

    try {
      setActionLoading(true);
      await licenseService.delete(lic.id);
      notify(`Đã xóa vĩnh viễn người dùng ${lic.customer_name}`, "success");
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không thể xóa người dùng", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedLicense) return;
    try {
      setActionLoading(true);
      await licenseService.delete(selectedLicense.id);
      notify(`Đã xóa vĩnh viễn người dùng ${selectedLicense.customer_name}`, "success");
      setShowDeleteModal(false);
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không thể xóa người dùng", "error");
    } finally {
      setActionLoading(false);
    }
  };


  return (
    <div className="user-management-page" style={{ padding: "1.25rem 1.5rem" }}>
      
      {/* 1. Header with Breadcrumb & Primary Action */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <span>JACS Studio</span>
            <span>/</span>
            <span>Quản trị</span>
            <span>/</span>
            <span style={{ color: "#ea580c", fontWeight: 600 }}>Quản lý máy người dùng</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
            Quản lý máy người dùng
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Tạo tài khoản, cấp phát bản quyền, kiểm soát thiết bị máy khách và gia hạn đăng ký hệ thống
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "9px 14px",
              color: "#475569",
              fontSize: "13px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          >
            <RotateCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "9px 18px",
              fontSize: "13.5px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(234, 88, 12, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            <UserPlus size={16} />
            + Thêm người dùng
          </button>
        </div>
      </div>

      {/* 2. Top 4 Metric Stat Cards (MintForge Reference Style) */}
      <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
        
        {/* Card 1: Tổng người dùng */}
        <div className="stats-card">
          <div className="stats-card-icon circle-orange">
            <Users size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 600 }}>Tổng người dùng</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2, margin: "2px 0" }}>
              {metrics.total}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Toàn hệ thống</div>
          </div>
        </div>

        {/* Card 2: Đang hoạt động / Online */}
        <div className="stats-card">
          <div className="stats-card-icon circle-green">
            <UserCheck size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 600 }}>Đang hoạt động</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#059669", lineHeight: 1.2, margin: "2px 0", display: "flex", alignItems: "baseline", gap: "8px" }}>
              {metrics.active}
              {metrics.online > 0 && (
                <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 700, background: "#ecfdf5", padding: "1px 7px", borderRadius: "12px", border: "1px solid #a7f3d0" }}>
                  🟢 {metrics.online} Online
                </span>
              )}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Bản quyền còn hạn</div>
          </div>
        </div>

        {/* Card 3: Hết hạn / Đang khóa */}
        <div className="stats-card">
          <div className="stats-card-icon circle-rose">
            <UserX size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 600 }}>Hết hạn / Khóa</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: metrics.expiredOrBlocked > 0 ? "#e11d48" : "#64748b", lineHeight: 1.2, margin: "2px 0" }}>
              {metrics.expiredOrBlocked}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Cần gia hạn xử lý</div>
          </div>
        </div>

        {/* Card 4: Quyền hạn & AI Pro */}
        <div className="stats-card">
          <div className="stats-card-icon circle-blue">
            <ShieldCheck size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: 600 }}>Bản quyền & AI Pro</div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#2563eb", lineHeight: 1.2, margin: "2px 0" }}>
              {metrics.aiProCount} <span style={{ fontSize: "14px", fontWeight: 600, color: "#64748b" }}>/ {metrics.total} Pro</span>
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Đã kích hoạt AI cao cấp</div>
          </div>
        </div>

      </div>

      {/* 3. Main Data Container (Filter, Search, Table) */}
      <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
        
        {/* Table Top Controls Header */}
        <div style={{ padding: "1.1rem 1.35rem", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          
          <div>
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Danh sách máy người dùng
            </h2>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              {filteredItems.length} tài khoản & thiết bị được quản lý
            </div>
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
            <Search size={15} style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Tìm tên, email, HWID, key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
                background: "#f8fafc",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

        </div>

        {/* Filter Tabs & Page Size Bar */}
        <div style={{ padding: "8px 1.35rem", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          
          {/* Status Tabs */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { key: "all", label: `Tất cả (${metrics.total})` },
              { key: "online", label: `🟢 Online (${metrics.online})` },
              { key: "offline", label: `⚪ Offline (${metrics.offline})` },
              { key: "expired", label: `🔴 Hết hạn (${metrics.expired})` },
              { key: "blocked", label: `🟡 Tạm khóa (${metrics.blocked})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key as StatusFilter)}
                style={{
                  background: statusFilter === tab.key ? "#ffffff" : "transparent",
                  color: statusFilter === tab.key ? "#ea580c" : "#64748b",
                  border: statusFilter === tab.key ? "1px solid #cbd5e1" : "1px solid transparent",
                  borderRadius: "6px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: statusFilter === tab.key ? 750 : 600,
                  cursor: "pointer",
                  boxShadow: statusFilter === tab.key ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Rows per page selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b" }}>
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{ padding: "4px 8px", borderRadius: "5px", border: "1px solid #cbd5e1", fontSize: "12px", background: "#ffffff", outline: "none", cursor: "pointer" }}
            >
              <option value={10}>10 dòng</option>
              <option value={25}>25 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
            <span>/ trang</span>
          </div>

        </div>

        {/* 4. Table Body */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", minWidth: "1520px", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "11.5px", fontWeight: 750, letterSpacing: "0.4px" }}>
                <th style={{ padding: "14px 18px", width: "18%", minWidth: "240px" }}>NGƯỜI DÙNG / KHÁCH HÀNG</th>
                <th style={{ padding: "14px 14px", width: "10%", minWidth: "130px" }}>VAI TRÒ & GÓI</th>
                <th style={{ padding: "14px 14px", width: "14%", minWidth: "200px" }}>MÃ MÁY & PHIÊN (HWID)</th>
                <th style={{ padding: "14px 14px", width: "14%", minWidth: "210px" }}>LICENSE KEY</th>
                <th style={{ padding: "14px 14px", width: "11%", minWidth: "150px" }}>HẠN SỬ DỤNG</th>
                <th style={{ padding: "14px 14px", width: "18%", minWidth: "280px" }}>TRẠNG THÁI</th>
                <th style={{ padding: "14px 18px", width: "15%", minWidth: "300px", textAlign: "right" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                    <Users size={36} style={{ margin: "0 auto 10px", opacity: 0.35 }} />
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#64748b" }}>Không tìm thấy người dùng hoặc thiết bị nào</div>
                    <p style={{ fontSize: "12px", margin: "4px 0 0" }}>Thử thay đổi từ khóa tìm kiếm hoặc bấm nút "+ Thêm người dùng" ở góc trên.</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const initials = (item.customer_name || "Khách")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const formattedExp = item.expires_at 
                    ? new Date(item.expires_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "Vô thời hạn";

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* 1. NGƯỜI DÙNG */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              background: "linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)",
                              color: "#ea580c",
                              fontWeight: 800,
                              fontSize: "13px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              border: "1.5px solid #ffedd5",
                            }}
                          >
                            {initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 750, color: "#0f172a", fontSize: "13.5px", whiteSpace: "nowrap" }}>
                              {item.customer_name}
                            </div>
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", whiteSpace: "nowrap" }}>
                              {item.customer_contact || "Chưa có liên hệ"}
                            </div>
                            {item.notes && (
                              <div style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic", marginTop: "2px", whiteSpace: "nowrap" }}>
                                💬 {item.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. VAI TRÒ & GÓI */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                            <span
                              style={{
                                background: "#eff6ff",
                                color: "#2563eb",
                                border: "1px solid #bfdbfe",
                                borderRadius: "4px",
                                padding: "2px 7px",
                                fontSize: "10.5px",
                                fontWeight: 800,
                                textTransform: "uppercase",
                                whiteSpace: "nowrap",
                              }}
                            >
                              USER
                            </span>
                            {item.premium_ai && (
                              <span
                                style={{
                                  background: "#fef3c7",
                                  color: "#d97706",
                                  border: "1px solid #fde68a",
                                  borderRadius: "4px",
                                  padding: "2px 7px",
                                  fontSize: "10px",
                                  fontWeight: 850,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Sparkles size={10} /> AI Pro
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: "11.5px", color: "#64748b", whiteSpace: "nowrap" }}>
                            Tối đa: <strong>{item.max_jobs_per_day}</strong> jobs/ngày
                          </span>
                        </div>
                      </td>

                      {/* 3. MÃ MÁY & PHIÊN (HWID) */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <span
                              onClick={() => handleCopy(item.hwid, `hwid-${item.id}`)}
                              title={`Click để sao chép toàn bộ HWID:\n${item.hwid}`}
                              style={{
                                fontFamily: "monospace",
                                fontSize: "11.5px",
                                background: "#f8fafc",
                                color: "#334155",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                border: "1px solid #e2e8f0",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                whiteSpace: "nowrap",
                                maxWidth: "190px",
                              }}
                            >
                              <Laptop size={12} color="#64748b" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.hwid.slice(0, 16)}...
                              </span>
                              {copiedKey === `hwid-${item.id}` ? <Check size={11} color="#16a34a" style={{ flexShrink: 0 }} /> : <Copy size={11} color="#94a3b8" style={{ flexShrink: 0 }} />}
                            </span>
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                            <span>{item.last_platform || "windows"} • {item.last_app_version || "v0.8.26"}</span>
                            {item.last_ip && <span style={{ color: "#94a3b8" }}>({item.last_ip})</span>}
                          </div>
                        </div>
                      </td>

                      {/* 4. LICENSE KEY */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {(() => {
                            const fullKey = item.license_key || item.raw_key || item.key || item.key_hint;
                            const isFull = !fullKey.includes("****");
                            return (
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "nowrap" }}>
                                <span
                                  onClick={() => handleCopy(fullKey, `key-${item.id}`)}
                                  title={`Click để sao chép Key:\n${fullKey}`}
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: "12px",
                                    fontWeight: 750,
                                    color: isFull ? "#047857" : "#0284c7",
                                    background: isFull ? "#f0fdf4" : "#f0f9ff",
                                    border: isFull ? "1px solid #86efac" : "1px solid #bae6fd",
                                    padding: "4px 9px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <span>{fullKey}</span>
                                  {copiedKey === `key-${item.id}` ? (
                                    <Check size={12} color="#16a34a" style={{ flexShrink: 0 }} />
                                  ) : (
                                    <Copy size={12} color={isFull ? "#16a34a" : "#38bdf8"} style={{ flexShrink: 0 }} />
                                  )}
                                </span>
                                {!isFull && (
                                  <button
                                    type="button"
                                    onClick={() => handleRegenerateKey(item)}
                                    title="Tạo lại Key mới đầy đủ (không có dấu sao)"
                                    style={{
                                      background: "#fff7ed",
                                      border: "1px solid #fed7aa",
                                      color: "#ea580c",
                                      padding: "3px 6px",
                                      borderRadius: "4px",
                                      fontSize: "10px",
                                      fontWeight: 750,
                                      cursor: "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                      whiteSpace: "nowrap",
                                      flexShrink: 0,
                                    }}
                                  >
                                    <RefreshCw size={10} /> Cấp Key
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                            Tạo: {new Date(item.created_at).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                      </td>

                      {/* 5. HẠN SỬ DỤNG (EXPIRY) */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ fontSize: "12.5px", fontWeight: 750, color: item.isExpired ? "#e11d48" : "#0f172a", whiteSpace: "nowrap" }}>
                            {formattedExp}
                          </div>
                          {item.expires_at && item.daysRemaining !== null && (
                            <div style={{ whiteSpace: "nowrap" }}>
                              {item.daysRemaining > 5 ? (
                                <span style={{ fontSize: "11px", color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: "10px", border: "1px solid #bbf7d0", fontWeight: 700, whiteSpace: "nowrap" }}>
                                  Còn {item.daysRemaining} ngày
                                </span>
                              ) : item.daysRemaining > 0 ? (
                                <span style={{ fontSize: "11px", color: "#d97706", background: "#fffbeb", padding: "2px 8px", borderRadius: "10px", border: "1px solid #fde68a", fontWeight: 700, whiteSpace: "nowrap" }}>
                                  ⚠️ Sắp hết ({item.daysRemaining} ngày)
                                </span>
                              ) : (
                                <span style={{ fontSize: "11px", color: "#e11d48", background: "#fff1f2", padding: "2px 8px", borderRadius: "10px", border: "1px solid #fecdd3", fontWeight: 800, whiteSpace: "nowrap" }}>
                                  Đã hết hạn
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. TRẠNG THÁI & PHÁP LÝ (1 hàng ngang trải đều) */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}>
                          {item.status === "blocked" ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11.5px", fontWeight: 750, color: "#d97706", background: "#fffbeb", border: "1px solid #fde68a", padding: "4px 9px", borderRadius: "8px", whiteSpace: "nowrap", flexShrink: 0, height: "26px", boxSizing: "border-box" }}>
                              <Lock size={12} color="#d97706" /> Tạm Khóa
                            </span>
                          ) : item.isExpired ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11.5px", fontWeight: 750, color: "#e11d48", background: "#fff1f2", border: "1px solid #fecdd3", padding: "4px 9px", borderRadius: "8px", whiteSpace: "nowrap", flexShrink: 0, height: "26px", boxSizing: "border-box" }}>
                              <Clock size={12} color="#e11d48" /> Hết Hạn
                            </span>
                          ) : item.isOnline ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: 750, color: "#059669", background: "#ecfdf5", border: "1px solid #6ee7b7", padding: "4px 9px", borderRadius: "8px", whiteSpace: "nowrap", flexShrink: 0, height: "26px", boxSizing: "border-box", boxShadow: "0 1px 3px rgba(16, 185, 129, 0.15)" }}>
                              <span style={{ width: "6.5px", height: "6.5px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px rgba(16, 185, 129, 0.8)", display: "inline-block" }} />
                              Online
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: 750, color: "#64748b", background: "#f8fafc", border: "1px solid #cbd5e1", padding: "4px 9px", borderRadius: "8px", whiteSpace: "nowrap", flexShrink: 0, height: "26px", boxSizing: "border-box" }}>
                              <span style={{ width: "6.5px", height: "6.5px", borderRadius: "50%", background: "#94a3b8", display: "inline-block" }} />
                              Offline
                            </span>
                          )}

                          {/* Huy Hiệu Cam Kết Pháp Lý (Cùng hàng ngang) */}
                          {item.terms_accepted !== false ? (
                            <div
                              onClick={() => handleOpenLegalCert(item)}
                              title="Click để xem Chứng chỉ & Biên bản cam kết pháp lý (Hiệu lực Nhà nước)"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                fontSize: "11.5px",
                                fontWeight: 700,
                                color: "#047857",
                                background: "#f0fdf4",
                                border: "1px solid #86efac",
                                padding: "4px 9px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                height: "26px",
                                boxSizing: "border-box",
                                transition: "all 0.15s ease",
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.background = "#dcfce7")}
                              onMouseOut={(e) => (e.currentTarget.style.background = "#f0fdf4")}
                            >
                              <ShieldCheck size={13} color="#059669" />
                              <span>Chịu trách nhiệm 100%</span>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11.5px",
                                fontWeight: 650,
                                color: "#d97706",
                                background: "#fffbeb",
                                border: "1px solid #fde68a",
                                padding: "4px 8px",
                                borderRadius: "8px",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                height: "26px",
                                boxSizing: "border-box",
                              }}
                            >
                              <span>⏳ Chờ xác nhận</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 7. THAO TÁC */}
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                          
                          {/* Xem Chứng chỉ Pháp lý */}
                          <button
                            type="button"
                            onClick={() => handleOpenLegalCert(item)}
                            title="Xem Văn bản Điều khoản & Chứng thực Pháp lý (Hiệu lực Nhà nước)"
                            style={{
                              background: "#f0fdf4",
                              border: "1px solid #86efac",
                              color: "#059669",
                              padding: "6px 11px",
                              borderRadius: "7px",
                              fontSize: "12px",
                              fontWeight: 750,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <ShieldCheck size={13} />
                            <span>Pháp lý</span>
                          </button>

                          {/* Gia Hạn (Renew with Date Picker) */}
                          <button
                            type="button"
                            onClick={() => handleOpenRenew(item)}
                            title="Gia hạn ngày sử dụng (Date Picker)"
                            style={{
                              background: "#fff7ed",
                              border: "1px solid #fed7aa",
                              color: "#ea580c",
                              padding: "6px 11px",
                              borderRadius: "7px",
                              fontSize: "12px",
                              fontWeight: 750,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <CalendarPlus size={13} />
                            <span>Gia hạn</span>
                          </button>

                          {/* Sửa thông tin */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Chỉnh sửa thông tin"
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#475569",
                              padding: "6px 8px",
                              borderRadius: "7px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Reset HWID đổi máy */}
                          <button
                            type="button"
                            onClick={() => handleOpenResetHwid(item)}
                            title="Reset mã máy (Đổi máy tính mới)"
                            style={{
                              background: "#ffffff",
                              border: "1px solid #cbd5e1",
                              color: "#0284c7",
                              padding: "6px 8px",
                              borderRadius: "7px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <RefreshCw size={13} />
                          </button>

                          {/* Toggle Khóa/Mở */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            title={item.status === "active" ? "Tạm khóa tài khoản" : "Mở khóa tài khoản"}
                            style={{
                              background: item.status === "active" ? "#ffffff" : "#fef3c7",
                              border: item.status === "active" ? "1px solid #cbd5e1" : "1px solid #fde68a",
                              color: item.status === "active" ? "#64748b" : "#d97706",
                              padding: "6px 8px",
                              borderRadius: "7px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            {item.status === "active" ? <Lock size={13} /> : <Unlock size={13} />}
                          </button>

                          {/* Ngắt phiên (nếu online) */}
                          {item.isOnline && (
                            <button
                              type="button"
                              onClick={() => handleTerminateSession(item)}
                              title="Ngắt kết nối phiên làm việc này"
                              style={{
                                background: "#fff1f2",
                                border: "1px solid #fecdd3",
                                color: "#e11d48",
                                padding: "6px 8px",
                                borderRadius: "7px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Power size={13} />
                            </button>
                          )}

                          {/* Xóa */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(item)}
                            title="Xóa người dùng vĩnh viễn"
                            style={{
                              background: "#fff1f2",
                              border: "1px solid #fecdd3",
                              color: "#f43f5e",
                              padding: "6px 8px",
                              borderRadius: "7px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Trash2 size={13} />
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

        {/* 5. Pagination Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>

          
          <div style={{ fontSize: "12.5px", color: "#64748b" }}>
            Hiển thị <strong>{filteredItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(currentPage * pageSize, filteredItems.length)}</strong> trong tổng số <strong>{filteredItems.length}</strong> bản ghi
          </div>

          <div style={{ display: "flex", gap: "5px" }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "4px 8px",
                color: currentPage <= 1 ? "#cbd5e1" : "#475569",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span style={{ padding: "4px 6px", color: "#94a3b8" }}>...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      style={{
                        background: currentPage === p ? "#ea580c" : "#ffffff",
                        color: currentPage === p ? "#ffffff" : "#475569",
                        border: currentPage === p ? "1px solid #ea580c" : "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontWeight: currentPage === p ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "4px 8px",
                color: currentPage >= totalPages ? "#cbd5e1" : "#475569",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={15} />
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM NGƯỜI DÙNG / CẤP MÁY MỚI */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "600px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            
            {/* Header */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#ffedd5", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Thêm Người Dùng & Cấp Bản Quyền
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Tạo tài khoản và mã máy cho khách hàng</span>
                </div>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, margin: 0 }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                
                {/* Name & Contact */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Tên người dùng / Khách hàng <span style={{ color: "#e11d48" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={createForm.customer_name}
                      onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Email hoặc Số điện thoại <span style={{ color: "#e11d48" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="user@example.com hoặc 0912..."
                      value={createForm.customer_contact}
                      onChange={(e) => setCreateForm({ ...createForm, customer_contact: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* HWID (Device ID) */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", margin: 0 }}>
                      Mã máy (Device ID / HWID)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, hwid: generatePlaceholderHwid() })}
                      style={{ background: "none", border: "none", color: "#0284c7", fontSize: "11px", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                    >
                      ↺ Tạo mã mẫu
                    </button>
                  </div>
                  <input
                    type="text"
                    value={createForm.hwid}
                    onChange={(e) => setCreateForm({ ...createForm, hwid: e.target.value })}
                    placeholder="JACS-WIN-..."
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontFamily: "monospace", outline: "none", boxSizing: "border-box", background: "#f8fafc" }}
                  />
                  <span style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginTop: "3px" }}>
                    💡 Khách hàng có thể đổi mã máy khi mở app lần đầu nếu dùng mã mẫu.
                  </span>
                </div>

                {/* Plan Presets */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Chọn Gói Bản Quyền & Thời Hạn Nhanh
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {[
                      { key: "1_day", label: "1 Ngày", desc: "Dùng thử" },
                      { key: "7_days", label: "7 Ngày", desc: "1 Tuần" },
                      { key: "30_days", label: "30 Ngày", desc: "1 Tháng ⭐" },
                      { key: "90_days", label: "90 Ngày", desc: "3 Tháng" },
                      { key: "365_days", label: "1 Năm", desc: "365 Ngày" },
                      { key: "lifetime", label: "Vĩnh Viễn", desc: "Trọn đời" },
                    ].map((p) => {
                      const isSel = createForm.plan_preset === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => handlePlanPresetChange(p.key)}
                          style={{
                            background: isSel ? "#fff7ed" : "#f8fafc",
                            border: isSel ? "1.5px solid #ea580c" : "1px solid #e2e8f0",
                            color: isSel ? "#ea580c" : "#334155",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: "12.5px" }}>{p.label}</div>
                          <div style={{ fontSize: "10.5px", color: isSel ? "#c2410c" : "#94a3b8", marginTop: "2px" }}>{p.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* EXACT DATE PICKER */}
                <div style={{ background: "#f8fafc", border: "1.5px solid #fed7aa", borderRadius: "8px", padding: "10px 14px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 800, color: "#c2410c", marginBottom: "6px" }}>
                    <Calendar size={14} /> CHỌN CHÍNH XÁC NGÀY HẾT HẠN (DATE PICKER):
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.expires_at}
                    onChange={(e) => setCreateForm({ ...createForm, expires_at: e.target.value })}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #fdba74", fontSize: "13px", fontWeight: 700, color: "#0f172a", outline: "none", background: "#ffffff", boxSizing: "border-box" }}
                  />
                </div>

                {/* Billing & Payment */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Số tiền thu (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: Number(e.target.value) || 0 })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 700, color: "#ea580c", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Hình thức thanh toán
                    </label>
                    <select
                      value={createForm.payment_method}
                      onChange={(e) => setCreateForm({ ...createForm, payment_method: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#ffffff", cursor: "pointer" }}
                    >
                      <option value="bank_transfer">Chuyển khoản SePay VietQR</option>
                      <option value="manual_bank">Chuyển khoản khác</option>
                      <option value="cash">Tiền mặt</option>
                      <option value="free">Miễn phí / Quà tặng</option>
                    </select>
                  </div>
                </div>

                {/* AI Pro & Max Jobs */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                    <input
                      type="checkbox"
                      checked={createForm.premium_ai}
                      onChange={(e) => setCreateForm({ ...createForm, premium_ai: e.target.checked })}
                      style={{ width: "16px", height: "16px", accentColor: "#ea580c" }}
                    />
                    <Sparkles size={14} color="#ea580c" />
                    Kích hoạt gói tính năng AI Cao Cấp (AI Pro)
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>Max jobs:</span>
                    <input
                      type="number"
                      value={createForm.max_jobs_per_day}
                      onChange={(e) => setCreateForm({ ...createForm, max_jobs_per_day: Number(e.target.value) || 100 })}
                      style={{ width: "65px", padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "12px", textAlign: "center", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Ghi chú nội bộ
                  </label>
                  <input
                    type="text"
                    placeholder="Khách quen / Nguồn Facebook / Hỗ trợ team..."
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

              </div>

              {/* Footer */}
              <div style={{ padding: "14px 22px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#f8fafc" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 20px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(234, 88, 12, 0.3)",
                  }}
                >
                  {actionLoading ? "Đang tạo..." : "Xác Nhận Tạo Người Dùng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: GIA HẠN BẢN QUYỀN ĐĂNG KÝ VỚI DATE PICKER (RENEW SUBSCRIPTION) */}
      {/* ========================================================================= */}
      {showRenewModal && selectedLicense && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "580px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            
            {/* Header */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#ffedd5", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <CalendarPlus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Gia Hạn Bản Quyền: {selectedLicense.customer_name}
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Cộng thêm ngày sử dụng hoặc chọn ngày hết hạn mới</span>
                </div>
              </div>
              <button type="button" onClick={() => setShowRenewModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRenewSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, margin: 0 }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                
                {/* Current Info Box */}
                <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
                  <div>
                    <span style={{ color: "#64748b" }}>Khách hàng:</span>{" "}
                    <strong style={{ color: "#0f172a" }}>{selectedLicense.customer_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Key Hint:</span>{" "}
                    <span style={{ fontFamily: "monospace", color: "#0284c7", fontWeight: 700 }}>{selectedLicense.key_hint}</span>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Hạn dùng hiện tại:</span>{" "}
                    <strong style={{ color: selectedLicense.expires_at && new Date(selectedLicense.expires_at) < new Date() ? "#e11d48" : "#16a34a" }}>
                      {selectedLicense.expires_at ? new Date(selectedLicense.expires_at).toLocaleDateString("vi-VN") : "Vô thời hạn"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748b" }}>Trạng thái:</span>{" "}
                    <span style={{ fontWeight: 700, color: selectedLicense.status === "active" ? "#16a34a" : "#e11d48", textTransform: "capitalize" }}>
                      {selectedLicense.status}
                    </span>
                  </div>
                </div>

                {/* Quick Extension Presets */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    ⚡ Chọn Mốc Gia Hạn Nhanh:
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                    {[
                      { days: 7, label: "+7 Ngày", sub: "1 Tuần" },
                      { days: 30, label: "+30 Ngày", sub: "1 Tháng ⭐" },
                      { days: 90, label: "+90 Ngày", sub: "3 Tháng" },
                      { days: 180, label: "+180 Ngày", sub: "6 Tháng" },
                      { days: 365, label: "+1 Năm", sub: "365 Ngày" },
                      { days: 18250, label: "♾️ Vĩnh Viễn", sub: "Trọn đời" },
                    ].map((p) => {
                      const isSel = renewForm.preset_days === p.days;
                      return (
                        <button
                          key={p.days}
                          type="button"
                          onClick={() => handleRenewQuickPreset(p.days)}
                          style={{
                            background: isSel ? "#fff7ed" : "#f8fafc",
                            border: isSel ? "1.5px solid #ea580c" : "1px solid #e2e8f0",
                            color: isSel ? "#ea580c" : "#334155",
                            borderRadius: "8px",
                            padding: "8px 10px",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: "13px" }}>{p.label}</div>
                          <div style={{ fontSize: "10.5px", color: isSel ? "#c2410c" : "#94a3b8", marginTop: "2px" }}>{p.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* EXACT DATE PICKER */}
                <div style={{ background: "#fff7ed", border: "1.5px solid #fdba74", borderRadius: "10px", padding: "12px 16px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", fontWeight: 800, color: "#ea580c", marginBottom: "6px" }}>
                    <Calendar size={15} /> CHỌN CHÍNH XÁC NGÀY & GIỜ HẾT HẠN MỚI (DATE PICKER):
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={renewForm.new_expires_at}
                    onChange={(e) => setRenewForm({ ...renewForm, new_expires_at: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1.5px solid #f97316",
                      fontSize: "13.5px",
                      fontWeight: 800,
                      color: "#0f172a",
                      outline: "none",
                      background: "#ffffff",
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ fontSize: "11px", color: "#c2410c", marginTop: "4px" }}>
                    💡 Bạn có thể chọn bất kỳ ngày giờ nào trên lịch. Hệ thống sẽ tự động chuyển trạng thái bản quyền sang "Hoạt động".
                  </div>
                </div>

                {/* Payment & Amount */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Số tiền thu gia hạn (VNĐ)
                    </label>
                    <input
                      type="number"
                      value={renewForm.amount}
                      onChange={(e) => setRenewForm({ ...renewForm, amount: Number(e.target.value) || 0 })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 700, color: "#ea580c", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Hình thức thanh toán
                    </label>
                    <select
                      value={renewForm.payment_method}
                      onChange={(e) => setRenewForm({ ...renewForm, payment_method: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#ffffff", cursor: "pointer" }}
                    >
                      <option value="bank_transfer">Chuyển khoản SePay VietQR</option>
                      <option value="manual_bank">Chuyển khoản khác</option>
                      <option value="cash">Tiền mặt</option>
                      <option value="free">Miễn phí / Tặng kèm</option>
                    </select>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Lý do / Ghi chú gia hạn
                  </label>
                  <input
                    type="text"
                    value={renewForm.reason}
                    onChange={(e) => setRenewForm({ ...renewForm, reason: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

              </div>

              {/* Footer */}
              <div style={{ padding: "14px 22px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#f8fafc" }}>
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 22px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 750,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 10px rgba(234, 88, 12, 0.35)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <CalendarPlus size={15} />
                  {actionLoading ? "Đang xử lý..." : "⚡ Xác Nhận Gia Hạn Ngay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CHỈNH SỬA THÔNG TIN NGƯỜI DÙNG & BẢN QUYỀN (EDIT MODAL) */}
      {/* ========================================================================= */}
      {showEditModal && selectedLicense && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "580px", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            
            {/* Header */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fff7ed", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Chỉnh Sửa Người Dùng & Bản Quyền
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {selectedLicense.customer_name} • Key Hint: {selectedLicense.key_hint}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, margin: 0 }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                
                {/* 1. LICENSE KEY MANAGEMENT BANNER */}
                <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: "10px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "12px", fontWeight: 800, color: "#c2410c", display: "flex", alignItems: "center", gap: "5px" }}>
                      🔑 LICENSE KEY (BẢN QUYỀN MÁY):
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const currentKey = editForm.license_key || selectedLicense.license_key || selectedLicense.raw_key || selectedLicense.key || selectedLicense.key_hint;
                          handleCopy(currentKey, `modal-edit-${selectedLicense.id}`);
                        }}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #fdba74",
                          color: "#ea580c",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {copiedKey === `modal-edit-${selectedLicense.id}` ? (
                          <>
                            <Check size={12} color="#16a34a" /> Đã chép
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> Sao chép Key
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRegenerateKey(selectedLicense)}
                        style={{
                          background: "#ea580c",
                          border: "none",
                          color: "#ffffff",
                          fontSize: "11.5px",
                          fontWeight: 750,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <RefreshCw size={11} /> Cấp lại Key mới
                      </button>
                    </div>
                  </div>

                  <div style={{
                    fontFamily: "monospace",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    color: (editForm.license_key && !editForm.license_key.includes("****")) ? "#047857" : "#0284c7",
                    background: "#ffffff",
                    border: "1px solid #fdba74",
                    borderRadius: "6px",
                    padding: "7px 10px",
                    letterSpacing: "0.5px",
                    wordBreak: "break-all",
                    userSelect: "all",
                  }}>
                    {editForm.license_key || selectedLicense.license_key || selectedLicense.raw_key || selectedLicense.key || selectedLicense.key_hint}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "#9a3412" }}>
                    <span>
                      🖥️ <strong>HWID máy:</strong> {selectedLicense.hwid ? <span style={{ fontFamily: "monospace", color: "#334155" }}>{selectedLicense.hwid}</span> : <span style={{ color: "#16a34a" }}>Chưa gắn máy (Sẵn sàng kích hoạt)</span>}
                    </span>
                    {(editForm.license_key && editForm.license_key.includes("****")) && (
                      <span style={{ color: "#ea580c", fontWeight: 700 }}>
                        ⚠️ Bấm "Cấp lại Key mới" để lấy mã đầy đủ
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Customer Name & Contact */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Tên người dùng / Khách hàng <span style={{ color: "#e11d48" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Nguyễn Văn A..."
                      value={editForm.customer_name}
                      onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Email / SĐT / Zalo liên hệ
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 0988xxx hoặc user@domain.com"
                      value={editForm.customer_contact}
                      onChange={(e) => setEditForm({ ...editForm, customer_contact: e.target.value })}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* 3. Expiry Date & Status */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      <Calendar size={13} color="#ea580c" /> Ngày & Giờ hết hạn (Date Picker)
                    </label>
                    <input
                      type="datetime-local"
                      value={editForm.expires_at}
                      onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        fontWeight: 650,
                        color: "#0f172a",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px", display: "block" }}>
                      Để trống = Vô thời hạn (Vĩnh viễn)
                    </span>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Trạng thái tài khoản
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as LicenseStatus })}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        fontWeight: 650,
                        outline: "none",
                        boxSizing: "border-box",
                        background: editForm.status === "active" ? "#f0fdf4" : editForm.status === "blocked" ? "#fff1f2" : "#f8fafc",
                        color: editForm.status === "active" ? "#16a34a" : editForm.status === "blocked" ? "#e11d48" : "#334155",
                      }}
                    >
                      <option value="active">🟢 Hoạt Động (Active)</option>
                      <option value="blocked">🔴 Tạm Khóa / Vô hiệu hóa (Blocked)</option>
                      <option value="expired">🟡 Hết Hạn (Expired)</option>
                    </select>
                  </div>
                </div>

                {/* 4. Features & Quota */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                      Số tác vụ tối đa / ngày (Max jobs)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999999}
                      value={editForm.max_jobs_per_day}
                      onChange={(e) => setEditForm({ ...editForm, max_jobs_per_day: Number(e.target.value) || 100 })}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: 600, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px", fontWeight: 700, color: "#0f172a" }}>
                      <input
                        type="checkbox"
                        checked={editForm.premium_ai}
                        onChange={(e) => setEditForm({ ...editForm, premium_ai: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: "#ea580c" }}
                      />
                      <Sparkles size={14} color="#ea580c" />
                      Kích hoạt gói tính năng AI Pro
                    </label>
                    <span style={{ fontSize: "11px", color: "#64748b", marginTop: "2px", marginLeft: "24px" }}>
                      Mở khóa toàn bộ mô hình AI nâng cao
                    </span>
                  </div>
                </div>

                {/* 5. Notes */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Ghi chú nội bộ
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Khách hàng mua qua kênh Zalo, gói VIP..."
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", outline: "none", boxSizing: "border-box", resize: "vertical" }}
                  />
                </div>

              </div>

              {/* Footer */}
              <div style={{ padding: "14px 22px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#f8fafc" }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                    color: "#ffffff",
                    border: "none",
                    padding: "8px 22px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 750,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(234, 88, 12, 0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Edit2 size={14} />
                  {actionLoading ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RESET HWID ĐỔI MÁY (RESET HWID MODAL) */}
      {/* ========================================================================= */}
      {showResetHwidModal && selectedLicense && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#f0f9ff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                    Reset Mã Máy (Đổi Máy Tính Mới)
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>{selectedLicense.customer_name} ({selectedLicense.key_hint})</span>
                </div>
              </div>
              <button type="button" onClick={() => setShowResetHwidModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetHwidSubmit} style={{ display: "flex", flexDirection: "column", margin: 0 }}>
              <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "12px" }}>
                
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  Mã máy hiện tại: <span style={{ fontFamily: "monospace", color: "#334155", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{selectedLicense.hwid}</span>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", margin: 0 }}>
                      Mã máy (HWID) mới:
                    </label>
                    <button
                      type="button"
                      onClick={() => setResetHwidForm({ ...resetHwidForm, hwid: generatePlaceholderHwid() })}
                      style={{ background: "none", border: "none", color: "#0284c7", fontSize: "11px", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                    >
                      ↺ Sinh mã mới
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={resetHwidForm.hwid}
                    onChange={(e) => setResetHwidForm({ ...resetHwidForm, hwid: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "4px" }}>
                    Lý do đổi máy:
                  </label>
                  <input
                    type="text"
                    value={resetHwidForm.reason}
                    onChange={(e) => setResetHwidForm({ ...resetHwidForm, reason: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12.5px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

              </div>

              <div style={{ padding: "14px 22px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#f8fafc" }}>
                <button
                  type="button"
                  onClick={() => setShowResetHwidModal(false)}
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ background: "#0284c7", color: "#ffffff", border: "none", padding: "8px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: actionLoading ? "not-allowed" : "pointer" }}
                >
                  {actionLoading ? "Đang cập nhật..." : "Xác Nhận Đổi Máy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: XÁC NHẬN XÓA (DELETE MODAL) */}
      {/* ========================================================================= */}
      {showDeleteModal && selectedLicense && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "460px", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", overflow: "hidden" }}>
            
            <div style={{ padding: "18px 22px", display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#fff1f2", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
                  Xác Nhận Xóa Người Dùng?
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", margin: 0, lineHeight: 1.4 }}>
                  Bạn có chắc muốn xóa tài khoản <strong>{selectedLicense.customer_name}</strong> (Key: <span style={{ fontFamily: "monospace", color: "#e11d48" }}>{selectedLicense.key_hint}</span>)? Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>

            <div style={{ padding: "14px 22px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", gap: "10px", background: "#f8fafc" }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={actionLoading}
                style={{ background: "#e11d48", color: "#ffffff", border: "none", padding: "8px 20px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: actionLoading ? "not-allowed" : "pointer" }}
              >
                {actionLoading ? "Đang xóa..." : "Xóa Vĩnh Viễn"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: VĂN BẢN ĐIỀU KHOẢN & CHỨNG THỰC PHÁP LÝ (LEGAL CERTIFICATE) */}
      {/* ========================================================================= */}
      {showLegalModal && legalCertLicense && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8, 12, 20, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "20px",
          }}
          onClick={() => setShowLegalModal(false)}
        >
          <div
            style={{
              background: "#080c14",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "840px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-scale-up"
          >
            {/* Top Bar */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#0f172a",
                color: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 750 }}>
                <span style={{ fontSize: "17px" }}>⚖️</span>
                <span>VĂN BẢN ĐIỀU KHOẢN & CHỨNG THỰC PHÁP LÝ JACS STUDIO</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const fullText = `JACS STUDIO COMPLIANCE & LEGAL CERTIFICATE
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM — Độc lập • Tự do • Hạnh phúc
DOC-REF: JACS-LEGAL-2026-v2.4 - 2026

Điều Khoản Sử Dụng & Miễn Trừ Trách Nhiệm Pháp Lý JACS Studio
Khách hàng: ${legalCertLicense.customer_name}
HWID: ${legalCertLicense.hwid}
License Key: ${legalCertLicense.license_key || legalCertLicense.key_hint}
Trạng thái: ĐÃ XÁC NHẬN CHỊU TRÁCH NHIỆM 100% VỀ BẢN QUYỀN NỘI DUNG VÀ API`;
                    navigator.clipboard.writeText(fullText);
                    notify("Đã sao chép văn bản pháp lý & chứng chỉ", "success");
                  }}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f1f5f9",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Copy size={13} />
                  Sao chép
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#f1f5f9",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ExternalLink size={13} />
                  In / PDF
                </button>

                <button
                  type="button"
                  onClick={() => setShowLegalModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Paper Sheet Viewport */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px 20px 36px 20px",
                background: "#080c14",
              }}
            >
              <div
                style={{
                  maxWidth: "760px",
                  margin: "0 auto",
                  background: "#ffffff",
                  color: "#0f172a",
                  borderRadius: "12px",
                  padding: "36px 40px 44px 40px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                  fontSize: "13px",
                  lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              >
                {/* Document Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: "14px", marginBottom: "20px" }}>
                  <div>
                    <h2 style={{ fontSize: "17px", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>
                      JACS STUDIO COMPLIANCE & LEGAL CERTIFICATE
                    </h2>
                    <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM — Độc lập • Tự do • Hạnh phúc
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, fontFamily: "monospace", color: "#334155", border: "1px solid #cbd5e1" }}>
                      DOC-REF: JACS-LEGAL-2026-v2.4 - 2026
                    </span>
                  </div>
                </div>

                {/* Document Title */}
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                  <h1 style={{ fontSize: "19px", fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>
                    Điều Khoản Sử Dụng & Miễn Trừ Trách Nhiệm Pháp Lý JACS Studio
                  </h1>
                  <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", margin: 0 }}>
                    Văn bản có hiệu lực thi hành từ ngày 2026-01-01 cho toàn bộ người dùng và giấy phép JACS Studio
                  </p>
                </div>

                {/* Audit Evidence Box (Thông Tin Bằng Chứng Pháp Lý) */}
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1.5px solid #86efac",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 800, color: "#166534", marginBottom: "8px" }}>
                    <ShieldCheck size={16} />
                    CHỨNG THỰC CAM KẾT PHÁP LÝ & BẢN QUYỀN CỦA KHÁCH HÀNG (CÓ HIỆU LỰC NHÀ NƯỚC)
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                    <div>
                      <span style={{ color: "#64748b" }}>Khách hàng / Doanh nghiệp:</span>{" "}
                      <strong style={{ color: "#0f172a" }}>{legalCertLicense.customer_name}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Thông tin liên hệ:</span>{" "}
                      <strong style={{ color: "#0f172a" }}>{legalCertLicense.customer_contact || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Mã phần cứng (HWID):</span>{" "}
                      <span style={{ fontFamily: "monospace", color: "#334155", fontWeight: 600 }}>{legalCertLicense.hwid}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Mã License Key:</span>{" "}
                      <span style={{ fontFamily: "monospace", color: "#047857", fontWeight: 700 }}>{legalCertLicense.license_key || legalCertLicense.key_hint}</span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Thời điểm ký cam kết:</span>{" "}
                      <strong style={{ color: "#0f172a" }}>
                        {legalCertLicense.terms_accepted_at
                          ? new Date(legalCertLicense.terms_accepted_at).toLocaleString("vi-VN")
                          : "Đã xác nhận chấp thuận"}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Trạng thái cam kết:</span>{" "}
                      <strong style={{ color: "#16a34a" }}>✓ ĐÃ KÝ CAM KẾT & CHỊU TRÁCH NHIỆM 100%</strong>
                    </div>
                  </div>
                </div>

                {/* 4 Articles Content */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#334155" }}>
                  <div>
                    <h3 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                      ĐIỀU 1. BẢN QUYỀN & TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM NỘI DUNG
                    </h3>
                    <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: "12.5px" }}>
                      <li>JACS Studio là bộ công cụ hỗ trợ biên tập, dựng video, trích xuất cảnh và tổng hợp giọng đọc AI tự động.</li>
                      <li><strong>Người dùng chịu trách nhiệm pháp lý 100%</strong> đối với toàn bộ video nguồn, hình ảnh, âm thanh và văn bản do chính người dùng nhập vào hoặc xử lý qua phần mềm.</li>
                      <li>Nhà phát triển JACS Studio không sở hữu, không lưu trữ và không chịu bất kỳ trách nhiệm pháp lý nào về tranh chấp quyền tác giả, bản quyền thương hiệu, quyền hình ảnh hoặc các khiếu nại liên quan đến nội dung do người dùng tạo ra.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                      ĐIỀU 2. QUY ĐỊNH SỬ DỤNG AI, VOICE CLONING & API BÊN THỨ BA (BYOK)
                    </h3>
                    <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: "12.5px" }}>
                      <li>Người dùng tự cấu hình và sử dụng API Key cá nhân (OpenAI, Gemini, ElevenLabs, Claude...) theo đúng chính sách điều khoản của từng nhà cung cấp dịch vụ tương ứng.</li>
                      <li>Toàn bộ API Key được mã hóa cục bộ bằng Windows DPAPI / Secure Storage trên thiết bị của khách hàng; hệ thống máy chủ JACS không lưu trữ khóa API thô của người dùng.</li>
                      <li>JACS Studio không chịu trách nhiệm đối với bất kỳ chi phí phát sinh, việc khóa tài khoản API hoặc tính chính xác của nội dung do mô hình AI của bên thứ ba sinh ra.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                      ĐIỀU 3. QUYỀN HẠN LICENSE, KHÓA HWID & CHỐNG BẺ KHÓA (ANTI-CRACK)
                    </h3>
                    <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: "12.5px" }}>
                      <li>Mỗi License Key được cấp quyền kích hoạt sử dụng trên số lượng thiết bị phần cứng (HWID) đã đăng ký theo gói dịch vụ.</li>
                      <li>Nghiêm cấm mọi hành vi đảo ngược mã nguồn (Reverse Engineering), bẻ khóa (Crack), chia sẻ trái phép hoặc bán lại license khi chưa có sự đồng ý bằng văn bản của JACS Studio.</li>
                      <li>Vi phạm điều khoản sẽ dẫn đến việc thu hồi và khóa vĩnh viễn License Key trên toàn hệ thống mà không được hoàn tiền.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                      ĐIỀU 4. QUYỀN RIÊNG TƯ, BẢO MẬT DỮ LIỆU & GIẢI QUYẾT TRANH CHẤP
                    </h3>
                    <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: "12.5px" }}>
                      <li>JACS Studio chỉ thu thập mã định danh phần cứng (HWID), phiên bản app và nhật ký sự cố (Crash logs) phục vụ mục đích kiểm soát bản quyền. Không thu thập nội dung video cá nhân.</li>
                      <li>Trong trường hợp xảy ra tranh chấp pháp lý, các bên cam kết ưu tiên thương lượng trên tinh thần tôn trọng quyền sở hữu trí tuệ và quy định pháp luật Việt Nam hiện hành.</li>
                    </ul>
                  </div>
                </div>

                {/* Official Stamp & Certificate Signature */}
                <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>ĐẠI DIỆN BAN PHÁP CHẾ & AN NINH MẠNG JACS:</div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>Jacs.Legal.Auth</div>
                    <div style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace" }}>
                      Ký duyệt điện tử: SHA256:8F92-4B10-AC99-2026-JACS-LEGAL
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", color: "#047857", fontWeight: 700 }}>
                      ✓ ISO/IEC 27001 • GDPR • VN CYBERSECURITY ACT
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Confirmation Box */}
            <div
              style={{
                padding: "14px 24px",
                background: "#0f172a",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a7f3d0", fontSize: "12px", fontWeight: 650 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <span>Người dùng đã tick chọn: "Xác nhận chịu trách nhiệm 100% về bản quyền nội dung và hoàn toàn đồng ý với tất cả điều khoản của JACS Studio"</span>
              </div>

              <button
                type="button"
                onClick={() => setShowLegalModal(false)}
                style={{
                  background: "#ea580c",
                  border: "none",
                  color: "#ffffff",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagementPage;
