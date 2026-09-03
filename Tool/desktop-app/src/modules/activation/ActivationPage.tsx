import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiRequestError, getApiBaseUrl, validateLicense } from "../../core/api";
import { getRuntime } from "../../core/runtime";
import type { MachineInfo } from "../../core/types";
import { Icon } from "../../shared/Icon";
import { LegalTermsModal } from "../legal/LegalTermsModal";

export function ActivationPage({
  onActivated,
}: {
  onActivated?: (value: boolean) => void;
}) {
  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    void getRuntime().getMachineInfo().then(setMachine);
    void getRuntime().readLicense().then((value) => {
      if (!value) return;
      setKey(value);
      setSaved(true);
    });
  }, []);

  async function activate(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!machine || !key.trim()) return;
    const normalizedKey = key
      .replace(/[\s\u200b-\u200d\ufeff]+/g, "")
      .toUpperCase();
    setSubmitting(true);
    try {
      const resp = await validateLicense(normalizedKey, machine.machineId);
      await getRuntime().saveLicense(normalizedKey);
      if (resp.customer_name || resp.logo_url) {
        try {
          const prefs = await getRuntime().getPreferences();
          await getRuntime().savePreferences({
            ...prefs,
            operatorName: resp.customer_name || prefs.operatorName,
            logoPath: resp.logo_url || prefs.logoPath,
            brandKitLogo: resp.logo_url || prefs.brandKitLogo,
          });
        } catch {
          // ignore
        }
      }
      setKey(normalizedKey);
      setSaved(true);
      setMessage("✓ Kích hoạt bản quyền thành công trên thiết bị này.");
      onActivated?.(true);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        const hint =
          error.code === "LICENSE_HWID_MISMATCH"
            ? "Key này đang gán cho mã máy khác."
            : error.code === "LICENSE_EXPIRED"
            ? "Key đã hết hạn. Vui lòng gia hạn thêm."
            : error.code === "LICENSE_HWID_INVALID"
            ? "Mã máy không hợp lệ. Hãy dùng bản Electron đã cài đặt."
            : error.code === "LICENSE_INVALID"
            ? "Key sai, chưa được cấp hoặc đã bị khóa."
            : error.message;
        setMessage(`${hint} (${getApiBaseUrl()})`);
      } else {
        setMessage(error instanceof Error ? error.message : "Kích hoạt thất bại");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function clear() {
    if (!window.confirm("Gỡ bỏ license khỏi thiết bị này?")) return;
    await getRuntime().clearLicense();
    setSaved(false);
    setKey("");
    setMessage("Đã xóa license cục bộ. Bạn có thể nhập key mới.");
    onActivated?.(false);
  }

  const copyHwid = () => {
    if (!machine?.machineId) return;
    void getRuntime().copyText(machine.machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="page-stack page-enter">
      {/* Header */}
      <div className="page-title">
        <div>
          <p className="eyebrow">ACCOUNT & LICENSE</p>
          <h2>License & Thiết bị</h2>
          <p>
            Bản quyền được cấp theo mã phần cứng (HWID) duy nhất của thiết bị và mã hóa an toàn trên hệ điều hành.
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "99px",
            background: saved ? "rgba(16, 185, 129, 0.15)" : "rgba(249, 87, 56, 0.15)",
            color: saved ? "#10b981" : "#fb923c",
            fontWeight: 700,
            fontSize: "11px",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          <i
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: saved ? "#10b981" : "#fb923c",
            }}
          />
          {saved ? "ĐÃ KÍCH HOẠT" : "CHƯA KÍCH HOẠT"}
        </span>
      </div>

      {message && (
        <p className={message.includes("✓") || message.includes("thành công") ? "form-success" : "form-error"}>
          {message}
        </p>
      )}

      <div className="activation-card-grid">
        {/* Card 1: Device Information */}
        <section className="panel-card">
          <div className="panel-head">
            <div>
              <p className="eyebrow">DEVICE IDENTIFICATION</p>
              <h3>Thông tin thiết bị (HWID)</h3>
            </div>
            <Icon name="key" size={18} />
          </div>

          <p className="subtle">
            Mã định danh phần cứng máy tính của bạn. Dùng mã này gửi cho Quản trị viên để cấp hoặc gia hạn license.
          </p>

          <div className="hwid-badge-box">
            <span className="hwid-code">
              {machine?.machineId ?? "Đang đọc mã phần cứng..."}
            </span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "5px 10px", fontSize: "11px" }}
              onClick={copyHwid}
            >
              <Icon name="check" size={12} /> {copied ? "Đã copy!" : "Copy HWID"}
            </button>
          </div>

          <div className="device-meta-badges">
            <div className="device-badge-pill">
              <span>Hệ điều hành:</span>
              <strong>
                {machine?.platform === "macos"
                  ? "macOS"
                  : machine?.platform === "windows"
                  ? "Windows"
                  : "Linux"}
              </strong>
            </div>
            <div className="device-badge-pill">
              <span>Kiến trúc:</span>
              <strong>{machine?.arch ?? "x64"}</strong>
            </div>
            <div className="device-badge-pill">
              <span>Phiên bản:</span>
              <strong>{machine?.appVersion ?? "v0.3.21"}</strong>
            </div>
          </div>
        </section>

        {/* Card 2: Key Activation */}
        <section className="panel-card">
          <div className="panel-head">
            <div>
              <p className="eyebrow">ACTIVATE KEY</p>
              <h3>Nhập License Key</h3>
            </div>
          </div>

          <form onSubmit={(e) => void activate(e)}>
            <label className="field-label">
              Mã License
              <input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="JACS-XXXX-XXXX-XXXX"
                autoCapitalize="characters"
                required
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "14px",
                  letterSpacing: "0.08em",
                }}
              />
            </label>

            <p className="form-help">
              <Icon name="key" size={13} /> Key sẽ được xác thực với hệ thống bản quyền và khóa với phần cứng hiện tại.
            </p>

            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !key.trim()}
                style={{ flex: 1 }}
              >
                <Icon name="check" size={14} /> {submitting ? "Đang xác thực..." : "Kích hoạt tool"}
              </button>

              {saved && (
                <button
                  type="button"
                  className="button-danger"
                  onClick={() => void clear()}
                >
                  Gỡ license
                </button>
              )}
            </div>

            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#60a5fa",
                  fontSize: "12px",
                  cursor: "pointer",
                  textDecoration: "underline",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onClick={() => setShowTerms(true)}
              >
                <Icon name="shield" size={12} />
                <span>Xem Luật miễn trừ trách nhiệm & Quyền sử dụng</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      <p style={{ font: "10px 'DM Mono', monospace", color: "#64748b", marginTop: "10px" }}>
        API Server: <code>{getApiBaseUrl()}</code>
      </p>

      <LegalTermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
