import React, { useEffect, useState } from "react";
import { ApiRequestError, getApiBaseUrl, validateLicense } from "../../core/api";
import { getRuntime } from "../../core/runtime";
import type { MachineInfo } from "../../core/types";
import { Icon } from "../../shared/Icon";
import { LicenseRenewalModal } from "../renewal/LicenseRenewalModal";

export function ActivationGate({
  onActivated,
}: {
  onActivated: (customLogoUrl?: string) => void;
}) {
  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  useEffect(() => {
    // 1. Read real Machine info
    void getRuntime().getMachineInfo().then(setMachine);

    // 2. Test server connectivity
    void fetch(`${getApiBaseUrl()}/health/live`, { signal: AbortSignal.timeout(3000) })
      .then((r) => setServerOnline(r.ok))
      .catch(() => setServerOnline(false));
  }, []);

  async function handleCopyHwid() {
    if (!machine?.machineId) return;
    try {
      await getRuntime().copyText(machine.machineId);
      setCopiedHwid(true);
      setTimeout(() => setCopiedHwid(false), 2200);
    } catch {
      // Fallback
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!machine) {
      setIsError(true);
      setMessage("Đang đọc thông tin thiết bị. Vui lòng thử lại sau giây lát.");
      return;
    }

    const cleanKey = key.replace(/[\s\u200b-\u200d\ufeff]+/g, "").toUpperCase();
    if (!cleanKey) {
      setIsError(true);
      setMessage("Vui lòng nhập mã License Key.");
      return;
    }

    setLoading(true);
    try {
      const response = await validateLicense(cleanKey, machine.machineId);
      await getRuntime().saveLicense(cleanKey);

      // Save custom logo if issued by Admin
      const customLogo = response.logo_url || undefined;
      if (customLogo) {
        try {
          const prefs = await getRuntime().getPreferences();
          await getRuntime().savePreferences({
            ...prefs,
            logoPath: customLogo,
            brandKitLogo: customLogo,
          });
        } catch {
          // best effort
        }
      }

      setMessage("Kích hoạt thành công! Đang mở khóa không gian làm việc...");
      setTimeout(() => {
        onActivated(customLogo);
      }, 600);
    } catch (err) {
      setIsError(true);
      if (err instanceof ApiRequestError) {
        const hint =
          err.code === "LICENSE_HWID_MISMATCH"
            ? "Mã key này đã được gán cho một thiết bị khác. Vui lòng liên hệ Admin để đổi máy."
            : err.code === "LICENSE_EXPIRED"
            ? "Mã key đã hết hạn sử dụng. Vui lòng liên hệ Admin để gia hạn."
            : err.code === "LICENSE_HWID_INVALID"
            ? "Mã máy không hợp lệ. Vui lòng chạy ứng dụng Desktop thật."
            : err.code === "LICENSE_INVALID"
            ? "License key không tồn tại, chưa được cấp hoặc đã bị khóa."
            : err.message;
        setMessage(hint);
      } else {
        setMessage(err instanceof Error ? err.message : "Kích hoạt thất bại. Vui lòng kiểm tra kết nối mạng.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="activation-gate-shell">
      <div className="activation-gate-bg-grid" />
      <div className="activation-gate-glow orb-1" />
      <div className="activation-gate-glow orb-2" />

      <div className="activation-gate-card animate-scale-in">
        <div className="gate-header">
          <div className="gate-logo-badge">
            <Icon name="key" size={26} />
          </div>
          <h1 className="gate-title">JACS STUDIO</h1>
          <p className="gate-subtitle">Judicious AI Content Scanner & Video Synthesis Engine</p>
        </div>

        <div className="gate-section device-info-section">
          <div className="device-info-label">
            <span>MÃ MÁY THIẾT BỊ (DEVICE ID)</span>
            <span className={`server-status-pill ${serverOnline ? "is-online" : "is-offline"}`}>
              <span className="dot" /> {serverOnline ? "Server Online" : "Server Đang Kết Nối"}
            </span>
          </div>

          <div className="device-hwid-box">
            <code className="device-hwid-text">
              {machine?.machineId || "Đang đọc mã máy thiết bị..."}
            </code>
            <button
              type="button"
              className={`gate-copy-btn ${copiedHwid ? "is-copied" : ""}`}
              onClick={handleCopyHwid}
              disabled={!machine?.machineId}
            >
              <Icon name={copiedHwid ? "check" : "copy" as never} size={14} />
              <span>{copiedHwid ? "Đã Copy" : "Copy Mã Máy"}</span>
            </button>
          </div>

          <p className="device-info-hint">
            💡 Gửi mã máy này cho Quản trị viên để cấp quyền sử dụng và nhận mã License Key.
          </p>
        </div>

        <form onSubmit={handleActivate} className="gate-form">
          <div className="form-field-group">
            <label className="gate-input-label">MÃ LICENSE KEY CỦA BẠN</label>
            <input
              type="text"
              className="gate-key-input"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="JACS-XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>

          {message && (
            <div className={`gate-message-banner ${isError ? "msg-error" : "msg-success"} animate-fade-in`}>
              <Icon name={isError ? "alert" : "check"} size={16} />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            className="gate-submit-btn"
            disabled={loading || !key.trim() || !machine}
          >
            {loading ? (
              <span>Đang kiểm tra bản quyền...</span>
            ) : (
              <>
                <span>Kích Hoạt & Mở Khóa Tool</span>
                <Icon name="arrow" size={16} />
              </>
            )}
          </button>

          <div style={{ marginTop: "0.85rem", textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setShowRenewalModal(true)}
              style={{
                background: "transparent",
                border: "1px dashed rgba(249, 115, 22, 0.6)",
                color: "#f97316",
                padding: "0.55rem 1rem",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Icon name="zap" size={15} />
              Gia hạn bản quyền / Nâng cấp gói (Quét mã VietQR)
            </button>
          </div>
        </form>

        <LicenseRenewalModal
          isOpen={showRenewalModal}
          onClose={() => setShowRenewalModal(false)}
          currentKey={key}
          onSuccess={() => {
            if (key) {
              void handleActivate({ preventDefault: () => {} } as React.FormEvent);
            }
          }}
        />

        <div className="gate-footer">
          <div className="gate-meta-row">
            <span>
              Nền tảng: <strong>{machine?.platform === "windows" ? "Windows" : machine?.platform === "macos" ? "macOS" : "Linux"}</strong>
            </span>
            <span>
              Kiến trúc: <strong>{machine?.arch || "x64"}</strong>
            </span>
            <span>
              Phiên bản: <strong>v{machine?.appVersion || "0.3.17"}</strong>
            </span>
          </div>
          <div className="gate-env-hint">
            Kết nối API: <code>{getApiBaseUrl()}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
