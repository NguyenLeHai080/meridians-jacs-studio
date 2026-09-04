import React, { useState, useEffect, useCallback } from "react";
import { Download, Upload, RotateCw, Check, User } from "lucide-react";
import type { SystemSettings, SystemInfo } from "../../../core/types";
import { settingsService } from "../services/settingsService";
import { AccountSecurityModal } from "./modal/AccountSecurityModal";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers settings translation

interface SettingsPageProps {
  settings?: SystemSettings;
  setSettings?: (s: SystemSettings) => void;
  systemInfo?: SystemInfo | null;
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  isAccountModalOpen?: boolean;
  setIsAccountModalOpen?: (open: boolean) => void;
  onNotify?: (msg: string, type?: "success" | "error") => void;
  onOpenAccountModal?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings: propSettings,
  setSettings: propSetSettings,
  systemInfo: propSystemInfo,
  onRefresh: propOnRefresh,
  setMessage: propSetMessage,
  setError: propSetError,
  isAccountModalOpen = false,
  setIsAccountModalOpen,
  onNotify,
  onOpenAccountModal,
}) => {
  const { t } = useI18n();

  const [localSettings, setLocalSettings] = useState<SystemSettings>(
    propSettings || {
      app_name: "JACS Studio Server",
      default_days_valid: 30,
      default_max_jobs: 200,
      telemetry_enabled: true,
      auto_backup: true,
      notification_email: "admin@example.com",
      studio_brand_name: "JACS Studio",
      custom_logo_url: "",
    }
  );

  const [localSystemInfo, setLocalSystemInfo] = useState<SystemInfo | null>(propSystemInfo || null);

  const activeSettings = propSettings || localSettings;
  const activeSystemInfo = propSystemInfo !== undefined ? propSystemInfo : localSystemInfo;

  const fetchSettingsData = useCallback(async () => {
    try {
      const [sets, info] = await Promise.allSettled([
        settingsService.getSettings(),
        settingsService.getInfo(),
      ]);
      if (sets.status === "fulfilled") setLocalSettings(sets.value);
      if (info.status === "fulfilled") setLocalSystemInfo(info.value);
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    if (!propSettings || propSystemInfo === undefined) {
      fetchSettingsData();
    }
  }, [propSettings, propSystemInfo, fetchSettingsData]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const updateSettingsField = (next: SystemSettings) => {
    if (propSetSettings) propSetSettings(next);
    else setLocalSettings(next);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [internalAccountModal, setInternalAccountModal] = useState(false);

  const showAccount = isAccountModalOpen || internalAccountModal;
  const closeAccount = () => {
    setInternalAccountModal(false);
    if (setIsAccountModalOpen) setIsAccountModalOpen(false);
  };

  const handleOpenAccount = () => {
    if (onOpenAccountModal) {
      onOpenAccountModal();
    } else {
      setInternalAccountModal(true);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await settingsService.updateSettings(activeSettings);
      updateSettingsField(updated);
      notify("✓ Đã lưu cài đặt hệ thống thành công!", "success");
      if (propOnRefresh) await propOnRefresh();
      else await fetchSettingsData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi lưu cài đặt", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const blob = await settingsService.exportBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jacs-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      notify("✓ Đã tải bản sao lưu cơ sở dữ liệu", "success");
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi sao lưu", "error");
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        await settingsService.restoreBackup(data);
        notify("✓ Khôi phục dữ liệu hệ thống thành công!", "success");
        if (propOnRefresh) await propOnRefresh();
        else await fetchSettingsData();
      } catch (err: any) {
        notify(err instanceof Error ? err.message : "File backup không đúng định dạng", "error");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Account Security Banner */}
      <div className="mf-card-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <strong style={{ fontSize: "0.95rem", color: "var(--text-dark)" }}>Bảo Mật Tài Khoản Quản Trị</strong>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>
            Tài khoản hiện tại: <strong>Admin (SUPER_ADMIN)</strong>. Định kỳ đổi mật khẩu để tăng cường an toàn.
          </p>
        </div>
        <button
          type="button"
          className="btn-white-outline"
          onClick={handleOpenAccount}
        >
          <User size={15} color="var(--primary)" /> Đổi Mật Khẩu Admin
        </button>
      </div>

      <div className="mf-two-col-grid">
        {/* Settings Form */}
        <div className="mf-card-panel">
          <div className="mf-card-header">
            <div className="mf-card-title-group">
              <h3>{t("settingsTitle")}</h3>
              <p>{t("settingsSubtitle")}</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="form-group-mf">
              <label className="form-label-mf">Tên Phần Mềm / Studio</label>
              <input
                type="text"
                className="form-input-mf"
                value={activeSettings.studio_brand_name}
                onChange={(e) => updateSettingsField({ ...activeSettings, studio_brand_name: e.target.value })}
              />
            </div>

            <div className="mf-form-two-col">
              <div className="form-group-mf">
                <label className="form-label-mf">Thời hạn mặc định khi tạo Key (ngày)</label>
                <input
                  type="number"
                  className="form-input-mf"
                  value={activeSettings.default_days_valid}
                  onChange={(e) => updateSettingsField({ ...activeSettings, default_days_valid: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="form-group-mf">
                <label className="form-label-mf">Giới hạn Render mặc định/ngày</label>
                <input
                  type="number"
                  className="form-input-mf"
                  value={activeSettings.default_max_jobs}
                  onChange={(e) => updateSettingsField({ ...activeSettings, default_max_jobs: parseInt(e.target.value) || 200 })}
                />
              </div>
            </div>

            <div className="form-group-mf">
              <label className="form-label-mf">Email nhận thông báo cảnh báo</label>
              <input
                type="email"
                className="form-input-mf"
                value={activeSettings.notification_email || ""}
                onChange={(e) => updateSettingsField({ ...activeSettings, notification_email: e.target.value })}
              />
            </div>

            <div className="form-group-mf" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                id="telemetry-chk"
                checked={activeSettings.telemetry_enabled}
                onChange={(e) => updateSettingsField({ ...activeSettings, telemetry_enabled: e.target.checked })}
              />
              <label htmlFor="telemetry-chk" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                Kích hoạt thu thập Telemetry và nhật ký sự cố máy khách
              </label>
            </div>

            <button
              type="submit"
              className="btn-primary-orange"
              disabled={isSaving}
              style={{ width: "fit-content", marginTop: "0.5rem" }}
            >
              {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
              {t("btnSaveSettings")}
            </button>
          </form>
        </div>

        {/* Backup & System Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Backup & Restore Panel */}
          <div className="mf-card-panel">
            <div className="mf-card-header">
              <div className="mf-card-title-group">
                <h3>Sao Lưu & Khôi Phục Dữ Liệu</h3>
                <p>Xuất bản sao lưu toàn bộ dữ liệu SQLite/Postgres hoặc khôi phục từ file JSON</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn-white-outline"
                style={{ justifyContent: "center" }}
                onClick={handleDownloadBackup}
              >
                <Download size={15} /> {t("btnBackupDb")}
              </button>

              <label
                className="btn-white-outline"
                style={{ justifyContent: "center", cursor: "pointer" }}
              >
                <Upload size={15} /> {t("btnRestoreDb")}
                <input
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={handleRestoreBackup}
                />
              </label>
            </div>
          </div>

          {/* System Runtime Info */}
          {activeSystemInfo && (
            <div className="mf-card-panel">
              <div className="mf-card-header">
                <div className="mf-card-title-group">
                  <h3>Thông Tin Runtime Hệ Thống</h3>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.8rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Phiên bản Server:</span>
                  <strong>v{activeSystemInfo.version}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Môi trường:</span>
                  <span className="code-chip">{activeSystemInfo.environment.toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Python:</span>
                  <span>{activeSystemInfo.python_version}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Database Backend:</span>
                  <span>{activeSystemInfo.store_backend}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AccountSecurityModal
        isOpen={showAccount}
        onClose={closeAccount}
        onSuccess={(msg) => notify(msg, "success")}
      />
    </div>
  );
};
