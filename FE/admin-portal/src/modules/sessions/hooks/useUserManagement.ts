import { useState, useEffect, useMemo, useCallback } from "react";
import type { License, ClientSession, LicenseStatus } from "../../../core/types";
import {
  licenseService,
  type CreateLicensePayload,
  type UpdateLicensePayload,
  type RenewLicensePayload,
  type ResetHwidPayload,
} from "../../licenses/services/licenseService";
import { sessionService } from "../services/sessionService";
import Swal, { showToast, confirmDialog } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";

export const toLocalDateTimeInput = (isoString?: string | null) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = date.getDate();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const generatePlaceholderHwid = () => {
  const hex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  )
    .join("")
    .toUpperCase();
  return `JACS-WIN-${hex}`;
};

export type StatusFilter = "all" | "online" | "offline" | "active" | "expired" | "blocked";

export interface MergedUserItem extends License {
  liveSession?: ClientSession;
  isOnline: boolean;
  isExpired: boolean;
  daysRemaining: number | null;
  displayStatus: string;
}

export interface UseUserManagementOptions {
  externalSearch?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export function useUserManagement({ externalSearch = "", onNotify }: UseUserManagementOptions = {}) {
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

  const notify = useCallback(
    (msg: string, type: "success" | "error" | "info" | "warning" = "success") => {
      showToast(msg, type);
      if (onNotify && (type === "success" || type === "error")) onNotify(msg, type);
    },
    [onNotify]
  );

  const handleCopy = useCallback(
    (text: string, id: string) => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        setCopiedKey(id);
        setTimeout(() => setCopiedKey(null), 2000);
        if (text.includes("****")) {
          notify(t("toastKeyHintCopied"), "info");
        } else {
          notify(t("toastKeyCopied"), "success");
        }
      }
    },
    [notify, t]
  );

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
      notify(t("toastFetchFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (externalSearch) {
      setSearchQuery(externalSearch);
    }
  }, [externalSearch]);

  // Merge licenses with active session telemetry
  const mergedItems = useMemo<MergedUserItem[]>(() => {
    const sessionMap = new Map<string, ClientSession>();
    for (const sess of sessions) {
      if (sess.license_id) sessionMap.set(sess.license_id, sess);
      if (sess.hwid) sessionMap.set(sess.hwid, sess);
    }

    return licenses.map((lic) => {
      const liveSession = sessionMap.get(lic.id) || sessionMap.get(lic.hwid);
      const isOnline = liveSession?.is_online || false;

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
        displayStatus:
          lic.status === "blocked"
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
    const offline = mergedItems.filter(
      (i) => !i.isOnline && i.status === "active" && !i.isExpired
    ).length;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, pageSize]);

  // --- ACTIONS ---

  const handleOpenCreate = useCallback(() => {
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
  }, []);

  const handlePlanPresetChange = useCallback((preset: string) => {
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
  }, []);

  const handleCreateSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!createForm.customer_name.trim()) {
        notify(t("toastEnterCustomerName"), "error");
        return;
      }

      try {
        setActionLoading(true);
        const payload: CreateLicensePayload = {
          customer_name: createForm.customer_name.trim(),
          customer_contact: createForm.customer_contact.trim() || createForm.customer_name.trim(),
          hwid: createForm.hwid.trim() || generatePlaceholderHwid(),
          days_valid: 30,
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
          title: t("createSuccessTitle"),
          html: `<div style="text-align: left; font-size: 14px; color: #334155; line-height: 1.6;">
            <p style="margin: 0 0 10px;">${t("thCustomer")}: <b>${res.customer_name}</b> (${res.customer_contact || ""})</p>
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 14px; margin: 12px 0;">
              <label style="display: block; font-size: 12px; font-weight: 800; color: #15803d; margin-bottom: 6px;">
                ${t("fullKeyHeader")}
              </label>
              <div style="font-family: monospace; font-size: 16px; font-weight: 800; color: #047857; word-break: break-all; user-select: all; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #bbf7d0;">
                ${fullKey}
              </div>
            </div>
            <p style="font-size: 12.5px; color: #64748b; margin: 0;">
              ${t("newKeyHint")}
            </p>
          </div>`,
          icon: "success",
          confirmButtonText: t("btnCopiedAndClose"),
          confirmButtonColor: "#ea580c",
          backdrop: `rgba(15, 23, 42, 0.65)`,
        });
      } catch (err: any) {
        notify(err instanceof Error ? err.message : "Error", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [createForm, fetchData, notify, t]
  );

  const handleOpenRenew = useCallback((lic: License) => {
    setSelectedLicense(lic);
    const baseDate =
      lic.expires_at && new Date(lic.expires_at) > new Date()
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
  }, []);

  const handleRenewQuickPreset = useCallback((days: number) => {
    setSelectedLicense((currentLic) => {
      const baseDate =
        currentLic?.expires_at && new Date(currentLic.expires_at) > new Date()
          ? new Date(currentLic.expires_at)
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
      } else if (days === 18250) {
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
      return currentLic;
    });
  }, []);

  const handleRenewSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedLicense) return;
      if (!renewForm.new_expires_at) {
        notify(t("toastEnterNewExpiry"), "error");
        return;
      }

      const targetDate = new Date(renewForm.new_expires_at);
      if (targetDate <= new Date()) {
        notify(t("toastExpiryMustBeFuture"), "error");
        return;
      }

      try {
        setActionLoading(true);
        const payload: RenewLicensePayload = {
          expires_at: targetDate.toISOString(),
          amount: Number(renewForm.amount) || 0,
          plan_type:
            renewForm.preset_days >= 365 ? "1_year" : `${renewForm.preset_days}_days`,
          payment_method: renewForm.payment_method,
          reason:
            renewForm.reason.trim() ||
            `Renew ${selectedLicense.customer_name}`,
        };

        await licenseService.renew(selectedLicense.id, payload);
        notify(
          `${t("toastRenewSuccess")} ${selectedLicense.customer_name} (${targetDate.toLocaleDateString()})`,
          "success"
        );
        setShowRenewModal(false);
        await fetchData();
      } catch (err: any) {
        notify(err instanceof Error ? err.message : t("toastRenewFailed"), "error");
      } finally {
        setActionLoading(false);
      }
    },
    [selectedLicense, renewForm, fetchData, notify, t]
  );

  const handleOpenEdit = useCallback((lic: License) => {
    setSelectedLicense(lic);
    const fullKey = (lic as any).license_key || (lic as any).raw_key || (lic as any).key || lic.key_hint;
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
  }, []);

  const handleRegenerateKey = useCallback(
    async (lic: License) => {
      const confirmed = await confirmDialog({
        title: t("confirmRegenerateKeyTitle"),
        html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
          <p>${t("confirmRegenerateKeyMsg")} <b>${lic.customer_name}</b>?</p>
          <p style="font-size: 12.5px; color: #64748b; margin-top: 6px;">
            ${t("confirmRegenerateKeySub")}
          </p>
        </div>`,
        icon: "warning",
        confirmButtonText: t("btnCreateNewKey"),
        cancelButtonText: t("modalCancel"),
        isDestructive: false,
      });
      if (!confirmed) return;

      try {
        setActionLoading(true);
        const res = await licenseService.regenerateKey(lic.id);
        const newKey = (res as any).key || (res as any).license_key || res.key_hint;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(newKey);
        }
        setEditForm((prev) => ({ ...prev, license_key: newKey }));
        await Swal.fire({
          title: t("regenerateSuccessTitle"),
          html: `<div style="text-align: left; font-size: 14px; color: #334155; line-height: 1.6;">
            <p style="margin: 0 0 10px;">${t("thCustomer")}: <b>${lic.customer_name}</b></p>
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 14px; margin: 12px 0;">
              <label style="display: block; font-size: 12px; font-weight: 800; color: #15803d; margin-bottom: 6px;">
                ${t("newKeyNotice")}
              </label>
              <div style="font-family: monospace; font-size: 16px; font-weight: 800; color: #047857; word-break: break-all; user-select: all; background: #ffffff; padding: 8px 12px; border-radius: 6px; border: 1px solid #bbf7d0;">
                ${newKey}
              </div>
            </div>
            <p style="font-size: 12.5px; color: #64748b; margin: 0;">
              ${t("newKeyHint")}
            </p>
          </div>`,
          icon: "success",
          confirmButtonText: t("btnDone"),
          confirmButtonColor: "#ea580c",
        });
        await fetchData();
      } catch (err: any) {
        notify(err instanceof Error ? err.message : "Error", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [fetchData, notify, t]
  );

  const handleEditSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedLicense) return;

      if (!editForm.customer_name.trim()) {
        notify(t("toastEnterCustomerName"), "error");
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
          expires_at: editForm.expires_at
            ? new Date(editForm.expires_at).toISOString()
            : null,
        };

        await licenseService.update(selectedLicense.id, payload);

        if (editForm.status !== selectedLicense.status) {
          await licenseService.toggleStatus(selectedLicense.id, editForm.status as any);
        }

        notify(`✓ ${editForm.customer_name}`, "success");
        setShowEditModal(false);
        await fetchData();
      } catch (err: any) {
        notify(err instanceof Error ? err.message : "Error", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [selectedLicense, editForm, fetchData, notify, t]
  );

  const handleOpenResetHwid = useCallback((lic: License) => {
    setSelectedLicense(lic);
    setResetHwidForm({
      hwid: generatePlaceholderHwid(),
      reason: `Device reset for ${lic.customer_name}`,
    });
    setShowResetHwidModal(true);
  }, []);

  const handleResetHwidSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedLicense) return;
      if (!resetHwidForm.hwid.trim()) {
        notify(t("toastEnterHwid"), "error");
        return;
      }

      try {
        setActionLoading(true);
        const payload: ResetHwidPayload = {
          hwid: resetHwidForm.hwid.trim(),
          reason: resetHwidForm.reason.trim(),
        };

        await licenseService.resetHwid(selectedLicense.id, payload);
        notify(
          `${t("toastHwidResetSuccess")} ${selectedLicense.customer_name}`,
          "success"
        );
        setShowResetHwidModal(false);
        await fetchData();
      } catch (err: any) {
        notify(err instanceof Error ? err.message : "Error", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [selectedLicense, resetHwidForm, fetchData, notify, t]
  );

  const handleToggleStatus = useCallback(
    async (lic: License) => {
      const newStatus = lic.status === "active" ? "blocked" : "active";
      const isLocking = newStatus === "blocked";

      const confirmed = await confirmDialog({
        title: isLocking ? t("confirmLockTitle") : t("confirmUnlockTitle"),
        html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
          <p>${isLocking ? t("confirmLockMsg") : t("confirmUnlockMsg")} <b>${lic.customer_name}</b>?</p>
          <p style="font-size: 12.5px; color: #64748b; margin-top: 6px;">
            ${isLocking ? t("lockWarning") : t("unlockNotice")}
          </p>
        </div>`,
        icon: isLocking ? "warning" : "info",
        confirmButtonText: isLocking ? t("btnLockNow") : t("btnUnlockNow"),
        cancelButtonText: t("modalCancel"),
        isDestructive: isLocking,
      });

      if (!confirmed) return;

      try {
        await licenseService.toggleStatus(lic.id, newStatus);
        notify(`${isLocking ? t("toastLocked") : t("toastUnlocked")}: ${lic.customer_name}`, "success");
        await fetchData();
      } catch (err: any) {
        notify(
          err instanceof Error ? err.message : "Error",
          "error"
        );
      }
    },
    [fetchData, notify, t]
  );

  const handleTerminateSession = useCallback(
    async (lic: License) => {
      const confirmed = await confirmDialog({
        title: t("confirmTerminateTitle"),
        html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
          <p>${t("confirmTerminateMsg")} <b>${lic.customer_name}</b>?</p>
          <p style="font-size: 12.5px; color: #64748b; margin-top: 6px;">
            ${t("terminateNotice")}
          </p>
        </div>`,
        icon: "warning",
        confirmButtonText: t("btnTerminateNow"),
        cancelButtonText: t("modalCancel"),
        isDestructive: true,
      });

      if (!confirmed) return;

      try {
        await sessionService.terminateSession(lic.id);
        notify(t("toastSessionTerminated"), "success");
        await fetchData();
      } catch (err: any) {
        notify(err instanceof Error ? err.message : "Error", "error");
      }
    },
    [fetchData, notify, t]
  );

  const handleOpenDelete = useCallback(
    async (lic: License) => {
      const confirmed = await confirmDialog({
        title: t("confirmDeleteTitle"),
        html: `<div style="text-align: left; font-size: 13.5px; color: #475569; line-height: 1.6;">
          <p>${t("confirmDeleteMsg")} <b>${lic.customer_name}</b>?</p>
          <p style="margin: 6px 0 10px; font-size: 12.5px; color: #64748b;">
            Email: <b>${lic.customer_contact || "N/A"}</b><br/>
            License Key: <code style="color: #e11d48; font-weight: 700;">${lic.key_hint}</code>
          </p>
          <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #9f1239;">
            ${t("deleteWarningDetail")}
          </div>
        </div>`,
        icon: "warning",
        confirmButtonText: t("btnDeletePermanently"),
        cancelButtonText: t("modalCancel"),
        isDestructive: true,
      });

      if (!confirmed) return;

      try {
        setActionLoading(true);
        await licenseService.delete(lic.id);
        notify(`${t("toastUserDeleted")} ${lic.customer_name}`, "success");
        await fetchData();
      } catch (err: any) {
        notify(err instanceof Error ? err.message : "Error", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [fetchData, notify, t]
  );

  const handleDeleteSubmit = useCallback(async () => {
    if (!selectedLicense) return;
    try {
      setActionLoading(true);
      await licenseService.delete(selectedLicense.id);
      notify(`${t("toastUserDeleted")} ${selectedLicense.customer_name}`, "success");
      setShowDeleteModal(false);
      await fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : t("toastDeleteFailed"), "error");
    } finally {
      setActionLoading(false);
    }
  }, [selectedLicense, fetchData, notify, t]);

  const handleOpenLegalCert = useCallback((lic: License) => {
    setLegalCertLicense(lic);
    setShowLegalModal(true);
  }, []);

  return {
    licenses,
    sessions,
    loading,
    copiedKey,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    showCreateModal,
    setShowCreateModal,
    showRenewModal,
    setShowRenewModal,
    showEditModal,
    setShowEditModal,
    showResetHwidModal,
    setShowResetHwidModal,
    showDeleteModal,
    setShowDeleteModal,
    showLegalModal,
    setShowLegalModal,
    legalCertLicense,
    setLegalCertLicense,
    selectedLicense,
    setSelectedLicense,
    actionLoading,
    createForm,
    setCreateForm,
    renewForm,
    setRenewForm,
    editForm,
    setEditForm,
    resetHwidForm,
    setResetHwidForm,
    metrics,
    filteredItems,
    paginatedItems,
    totalPages,
    fetchData,
    handleCopy,
    handleOpenCreate,
    handlePlanPresetChange,
    handleCreateSubmit,
    handleOpenRenew,
    handleRenewQuickPreset,
    handleRenewSubmit,
    handleOpenEdit,
    handleRegenerateKey,
    handleEditSubmit,
    handleOpenResetHwid,
    handleResetHwidSubmit,
    handleToggleStatus,
    handleTerminateSession,
    handleOpenDelete,
    handleDeleteSubmit,
    handleOpenLegalCert,
  };
}
