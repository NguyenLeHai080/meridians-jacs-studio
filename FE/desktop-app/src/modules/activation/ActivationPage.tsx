import React, { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiRequestError, getApiBaseUrl, validateLicense } from "../../core/api";
import { getRuntime } from "../../core/runtime";
import type { MachineInfo } from "../../core/types";
import { LegalTermsModal } from "../legal/LegalTermsModal";
import { popup } from "../../shared/popup";
import {
  ShieldLockFill,
  CpuFill,
  KeyFill,
  CheckCircleFill,
  ExclamationTriangleFill,
  ClipboardCheck,
  Clipboard,
  ShieldCheck,
  Check2,
  Trash3Fill,
  FileEarmarkTextFill,
  LaptopFill,
  GearFill,
} from "react-bootstrap-icons";

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
  const [legalAccepted, setLegalAccepted] = useState(true);
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
      popup.success("✓ Kích hoạt bản quyền chính hãng thành công!");
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
        popup.error("Kích hoạt thất bại", hint);
      } else {
        const msg = error instanceof Error ? error.message : "Kích hoạt thất bại";
        setMessage(msg);
        popup.error("Kích hoạt thất bại", msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function clear() {
    const confirmed = await popup.confirmDelete(
      "Gỡ Bỏ Bản Quyền",
      "Bạn có chắc chắn muốn gỡ bỏ license khỏi thiết bị này?"
    );
    if (!confirmed) return;
    await getRuntime().clearLicense();
    setSaved(false);
    setKey("");
    setMessage("Đã xóa license cục bộ. Bạn có thể nhập key mới.");
    popup.info("Đã gỡ bỏ bản quyền khỏi thiết bị");
    onActivated?.(false);
  }

  const copyHwid = () => {
    if (!machine?.machineId) return;
    void getRuntime().copyText(machine.machineId);
    setCopied(true);
    popup.success("✓ Đã copy mã định danh thiết bị HWID!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="activation-workspace-root animate-fade-in"
      style={{
        padding: "10px 16px 80px 16px",
        width: "100%",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        height: "100%",
        flex: "1 1 0%",
        overflowY: "auto",
      }}
    >
      {/* 1. Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px", flexShrink: 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              padding: "2px 8px",
              borderRadius: "5px",
              fontSize: "10.5px",
              fontWeight: 800,
              color: "#fbbf24",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "3px",
            }}
          >
            <ShieldLockFill size={10} /> BẢN QUYỀN & MÃ THIẾT BỊ · HARDWARE ACTIVATION GATE
          </div>
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <KeyFill size={18} color="#fbbf24" />
            License & Bản Quyền Thiết Bị (HWID)
          </h1>
          <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "2px 0 0" }}>
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
            background: saved ? "rgba(52, 211, 153, 0.15)" : "rgba(245, 158, 11, 0.15)",
            color: saved ? "#34d399" : "#fbbf24",
            border: saved ? "1px solid rgba(52, 211, 153, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)",
            fontWeight: 800,
            fontSize: "11px",
            fontFamily: "'DM Mono', monospace",
            flexShrink: 0,
          }}
        >
          <i
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: saved ? "#34d399" : "#fbbf24",
            }}
          />
          {saved ? "● BẢN QUYỀN HỢP LỆ" : "○ CHƯA KÍCH HOẠT"}
        </span>
      </div>

      {message && (
        <p className={message.includes("✓") || message.includes("thành công") ? "form-success" : "form-error"}>
          {message}
        </p>
      )}

      {/* 2. Main Two-Column Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "16px",
          marginBottom: "16px",
        }}
      >
        {/* Card 1: Device Information */}
        <section
          style={{
            background: "rgba(16, 20, 30, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                DEVICE IDENTIFICATION
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
                Thông Tin Thiết Bị (HWID)
              </h3>
            </div>
            <CpuFill size={20} color="#38bdf8" />
          </div>

          <p style={{ fontSize: "12.5px", color: "#94a3b8", lineHeight: 1.5, margin: "0 0 14px" }}>
            Mã định danh phần cứng duy nhất của máy tính. Dùng mã này gửi cho Quản trị viên để cấp hoặc gia hạn license.
          </p>

          <div
            style={{
              background: "rgba(0, 0, 0, 0.4)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "13.5px",
                fontWeight: 700,
                color: "#38bdf8",
                letterSpacing: "0.5px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {machine?.machineId ?? "Đang đọc mã phần cứng..."}
            </span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "4px 10px", fontSize: "11.5px", flexShrink: 0 }}
              onClick={copyHwid}
            >
              {copied ? <ClipboardCheck size={12} color="#34d399" /> : <Clipboard size={12} />}
              {copied ? "Đã copy!" : "Copy HWID"}
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <div
              style={{
                flex: "1 1 100px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "6px",
                padding: "8px 10px",
              }}
            >
              <small style={{ fontSize: "10.5px", color: "#94a3b8", display: "block" }}>Hệ điều hành</small>
              <strong style={{ fontSize: "12px", color: "#f8fafc" }}>
                {machine?.platform === "macos" ? "macOS" : machine?.platform === "windows" ? "Windows" : "Linux"}
              </strong>
            </div>

            <div
              style={{
                flex: "1 1 100px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "6px",
                padding: "8px 10px",
              }}
            >
              <small style={{ fontSize: "10.5px", color: "#94a3b8", display: "block" }}>Kiến trúc CPU</small>
              <strong style={{ fontSize: "12px", color: "#f8fafc" }}>{machine?.arch ?? "x64"}</strong>
            </div>

            <div
              style={{
                flex: "1 1 100px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "6px",
                padding: "8px 10px",
              }}
            >
              <small style={{ fontSize: "10.5px", color: "#94a3b8", display: "block" }}>Phiên bản App</small>
              <strong style={{ fontSize: "12px", color: "#34d399" }}>{machine?.appVersion ?? "v0.8.18"}</strong>
            </div>
          </div>
        </section>

        {/* Card 2: Key Activation */}
        <section
          style={{
            background: "rgba(16, 20, 30, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                ACTIVATE KEY
              </span>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
                Nhập License Key
              </h3>
            </div>
            <KeyFill size={20} color="#f59e0b" />
          </div>

          <form onSubmit={(e) => void activate(e)} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label className="field-label">
              Mã Bản Quyền (License Key)
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
                  background: "rgba(0, 0, 0, 0.35)",
                  borderColor: "rgba(245, 158, 11, 0.3)",
                }}
              />
            </label>

            <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: 0, display: "flex", alignItems: "center", gap: "4px" }}>
              <ShieldCheck size={13} color="#10b981" /> Key được xác thực trực tuyến với hệ thống và gắn cố định với HWID.
            </p>

            {/* Legal Confirmation Checkbox */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                fontSize: "12px",
                color: "#e2e8f0",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "8px",
                padding: "10px 12px",
                cursor: "pointer",
                lineHeight: 1.45,
              }}
            >
              <input
                type="checkbox"
                checked={legalAccepted}
                onChange={(e) => setLegalAccepted(e.target.checked)}
                style={{ marginTop: "2px", accentColor: "#10b981", cursor: "pointer", width: "15px", height: "15px" }}
              />
              <span>
                Tôi xác nhận chịu trách nhiệm pháp lý 100% về bản quyền nội dung, tuân thủ pháp luật Nhà nước và đồng ý bắt đầu sử dụng JACS Studio theo Thỏa thuận dịch vụ.
              </span>
            </label>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !key.trim() || !legalAccepted}
                style={{
                  flex: 1,
                  background: !legalAccepted ? "rgba(255, 255, 255, 0.1)" : "linear-gradient(135deg, #f59e0b, #d97706)",
                  boxShadow: !legalAccepted ? "none" : "0 0 14px rgba(245, 158, 11, 0.4)",
                  padding: "9px 16px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  cursor: !legalAccepted ? "not-allowed" : "pointer",
                }}
              >
                <Check2 size={15} /> {submitting ? "Đang xác thực..." : "Kích Hoạt Bản Quyền"}
              </button>

              {saved && (
                <button
                  type="button"
                  onClick={() => void clear()}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#f87171",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Trash3Fill size={12} /> Gỡ Key
                </button>
              )}
            </div>

            <div style={{ textAlign: "center", marginTop: "6px" }}>
              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#38bdf8",
                  fontSize: "12px",
                  cursor: "pointer",
                  textDecoration: "underline",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onClick={() => setShowTerms(true)}
              >
                <FileEarmarkTextFill size={12} />
                <span>Xem Thỏa thuận sử dụng & Luật miễn trừ trách nhiệm</span>
              </button>
            </div>
          </form>
        </section>
      </div>

      <div style={{ padding: "8px 12px", background: "rgba(0, 0, 0, 0.2)", borderRadius: "6px", display: "inline-block" }}>
        <p style={{ font: "11px 'DM Mono', monospace", color: "#64748b", margin: 0 }}>
          API Server: <code>{getApiBaseUrl()}</code>
        </p>
      </div>

      <LegalTermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
