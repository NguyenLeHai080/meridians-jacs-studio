import React, { useEffect, useState } from "react";
import { ApiRequestError, getApiBaseUrl, validateLicense } from "../../core/api";
import { getRuntime } from "../../core/runtime";
import type { MachineInfo } from "../../core/types";
import { Icon } from "../../shared/Icon";
import { LicenseRenewalModal } from "../renewal/LicenseRenewalModal";
import { LegalTermsModal } from "../legal/LegalTermsModal";

type Props = {
  onActivated: (customLogo?: string, customerName?: string) => void;
};

export function ActivationGate({ onActivated }: Props) {
  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [copiedHwid, setCopiedHwid] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  
  // Legal Terms Agreement Gate
  const [showLegalGate, setShowLegalGate] = useState(false);
  const [showLegalView, setShowLegalView] = useState(false);
  const [pendingActivation, setPendingActivation] = useState<{
    key: string;
    customLogo?: string;
    customerName?: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    void getRuntime()
      .getMachineInfo()
      .then((info) => {
        if (mounted) setMachine(info);
      });

    // Check server connection status
    fetch(`${getApiBaseUrl()}/api/v1/system/terms`)
      .then((res) => {
        if (mounted) setServerOnline(res.ok);
      })
      .catch(() => {
        if (mounted) setServerOnline(false);
      });

    return () => {
      mounted = false;
    };
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
      
      // Store pending activation and open Legal Terms Agreement Modal
      setPendingActivation({
        key: cleanKey,
        customLogo: response.logo_url || undefined,
        customerName: response.customer_name || undefined,
      });
      setShowLegalGate(true);
    } catch (err) {
      setIsError(true);
      if (err instanceof ApiRequestError) {
        const hint =
          err.code === "LICENSE_HWID_MISMATCH"
            ? "Mã key này đã được gán cho một thiết bị khác. Vui lòng liên hệ Admin để đổi máy."
            : err.code === "LICENSE_EXPIRED"
            ? "Mã key đã hết hạn sử dụng. Vui lòng gia hạn thêm."
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

  async function handleAgreeAndUnlock() {
    if (!pendingActivation) return;
    try {
      await getRuntime().saveLicense(pendingActivation.key);

      // Save custom logo and operator name if issued by Admin
      if (pendingActivation.customLogo || pendingActivation.customerName) {
        try {
          const prefs = await getRuntime().getPreferences();
          await getRuntime().savePreferences({
            ...prefs,
            operatorName: pendingActivation.customerName || prefs.operatorName,
            logoPath: pendingActivation.customLogo || prefs.logoPath,
            brandKitLogo: pendingActivation.customLogo || prefs.brandKitLogo,
          });
        } catch {
          // best effort
        }
      }

      setShowLegalGate(false);
      setMessage("Kích hoạt thành công! Đang mở khóa không gian làm việc...");
      setTimeout(() => {
        onActivated(pendingActivation.customLogo, pendingActivation.customerName);
      }, 400);
    } catch {
      setIsError(true);
      setMessage("Lỗi khi lưu bản quyền vào hệ thống cục bộ.");
    }
  }

  return (
    <div className="activation-gate-shell">
      <div className="activation-gate-bg-grid" />
      <div className="activation-gate-glow orb-1" />
      <div className="activation-gate-glow orb-2" />

      <div className="activation-gate-card animate-scale-in">
        <div className="gate-header">
          <div className="gate-logo-badge" style={{ padding: 0, overflow: "hidden", border: "2px solid rgba(56, 189, 248, 0.45)", boxShadow: "0 0 24px rgba(56, 189, 248, 0.4)" }}>
            <img src="./icon.png" alt="JACS Studio" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
              <Icon name={copiedHwid ? "check" : ("copy" as never)} size={14} />
              <span>{copiedHwid ? "Đã Copy" : "Copy Mã Máy"}</span>
            </button>
          </div>

          <p className="device-info-hint">
            💡 Gửi mã máy này cho Quản trị viên để cấp quyền sử dụng hoặc quét mã gia hạn bên dưới.
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

          <div className="gate-renewal-wrapper" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              type="button"
              className="gate-renewal-btn"
              onClick={() => setShowRenewalModal(true)}
            >
              <Icon name="zap" size={15} />
              <span>Gia hạn bản quyền / Nâng cấp gói (Quét mã VietQR)</span>
            </button>

            <button
              type="button"
              style={{
                background: "transparent",
                border: "none",
                color: "#60a5fa",
                fontSize: "12px",
                cursor: "pointer",
                padding: "4px 0",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                textDecoration: "underline",
              }}
              onClick={() => setShowLegalView(true)}
            >
              <Icon name="shield" size={13} />
              <span>Xem Luật Miễn Trừ Trách Nhiệm & Điều Khoản Sử Dụng</span>
            </button>
          </div>
        </form>

        <div className="gate-footer">
          <div className="gate-meta-row">
            <span>
              Nền tảng: <strong>{machine?.platform === "windows" ? "Windows" : machine?.platform === "macos" ? "macOS" : "Linux"}</strong>
            </span>
            <span>
              Kiến trúc: <strong>{machine?.arch || "x64"}</strong>
            </span>
            <span>
              Phiên bản: <strong>v{machine?.appVersion || "0.3.31"}</strong>
            </span>
          </div>
          <div className="gate-env-hint">
            Kết nối API: <code>{getApiBaseUrl()}</code>
          </div>
        </div>
      </div>

      {/* Renewal Modal */}
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

      {/* Mandatory Agreement Gate upon entering Key */}
      <LegalTermsModal
        isOpen={showLegalGate}
        onClose={() => setShowLegalGate(false)}
        requireAgreement={true}
        onAgreeAndProceed={handleAgreeAndUnlock}
      />

      {/* Standalone View Modal from Link */}
      <LegalTermsModal
        isOpen={showLegalView}
        onClose={() => setShowLegalView(false)}
        requireAgreement={false}
      />
    </div>
  );
}
