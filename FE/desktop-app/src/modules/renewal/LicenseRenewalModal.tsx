import React, { useEffect, useState } from "react";
import { getRenewQr, getBankConfig, validateLicense, RenewQrResponse, BankConfigPublic } from "../../core/api";
import { getRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";
import { LegalTermsModal } from "../legal/LegalTermsModal";

interface LicenseRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey?: string;
  onSuccess?: () => void;
}

const DEFAULT_PRICING: Record<string, number> = {
  "1_month": 550000,
  "3_months": 1350000,
  "6_months": 2650000,
  "lifetime": 9650000,
};

function getStoredBankConfig(): BankConfigPublic {
  try {
    const raw = localStorage.getItem("jacs_bank_config_cache");
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    bank_name: "MB Bank (Quân Đội)",
    bank_bin: "970422",
    account_number: "10987353827",
    account_name: "NGUYEN LE HẢI",
    qr_template: "compact2",
    plans_pricing: DEFAULT_PRICING,
  };
}

export function formatTransferContent(licenseKey: string): string {
  const clean = (licenseKey || "").trim().toUpperCase();
  const token = clean.replace(/^(?:JACS[-_ ]*)+/i, "").replace(/-/g, "").slice(0, 8) || "KEY";
  return `JACS ${token}`;
}

const createFallbackQr = (licenseKey: string, plan: string): RenewQrResponse => {
  const cfg = getStoredBankConfig();
  const amount = (cfg.plans_pricing && cfg.plans_pricing[plan]) || DEFAULT_PRICING[plan] || 550000;
  const transferContent = formatTransferContent(licenseKey);
  const qrUrl = cfg.custom_qr_url || `https://img.vietqr.io/image/${cfg.bank_bin || "970422"}-${cfg.account_number || "10987353827"}-${cfg.qr_template || "compact2"}.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(cfg.account_name || "NGUYEN LE HAI")}`;
  
  return {
    qr_url: qrUrl,
    bank_name: cfg.bank_name || "MB Bank (Quân Đội)",
    bank_bin: cfg.bank_bin || "970422",
    account_number: cfg.account_number || "10987353827",
    account_name: cfg.account_name || "NGUYEN LE HẢI",
    amount: amount,
    transfer_content: transferContent,
    plan_type: plan,
    months: plan === "1_month" ? 1 : plan === "3_months" ? 3 : plan === "6_months" ? 6 : 999,
  };
};

export function LicenseRenewalModal({
  isOpen,
  onClose,
  currentKey = "",
  onSuccess,
}: LicenseRenewalModalProps) {
  const [key, setKey] = useState(currentKey);
  const [selectedPlan, setSelectedPlan] = useState<"1_month" | "3_months" | "6_months" | "lifetime">("6_months");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrData, setQrData] = useState<RenewQrResponse | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [, setVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [initialExpiry, setInitialExpiry] = useState<string | null>(null);
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);

  // Sync key & fresh bank config when modal opens
  useEffect(() => {
    if (isOpen) {
      setQrGenerated(false);
      setIsSuccess(false);
      setError(null);
      setShowContactAdminModal(false);
      if (currentKey) {
        setKey(currentKey);
      } else if (!key) {
        void getRuntime().readLicense().then((saved) => {
          if (saved) setKey(saved);
        });
      }

      // Check current expiry baseline
      const clean = (currentKey || key).trim().toUpperCase();
      if (clean) {
        void getRuntime().getMachineInfo().then((m) => {
          void validateLicense(clean, m?.machineId || "JACS-DESKTOP-HWID")
            .then((r) => setInitialExpiry(r.expires_at))
            .catch(() => {});
        });
      }

      void getBankConfig().catch(() => {});
    }
  }, [isOpen, currentKey]);

  // Handle generating QR when user clicks Plan button
  const handleSelectAndGenerateQr = async (planId: "1_month" | "3_months" | "6_months" | "lifetime") => {
    setSelectedPlan(planId);
    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey) {
      setError("Vui lòng nhập hoặc kiểm tra lại mã License Key của bạn.");
      return;
    }

    setLoadingQr(true);
    setError(null);
    try {
      const res = await getRenewQr(cleanKey, planId);
      setQrData(res);
      setQrGenerated(true);
    } catch {
      setQrData(createFallbackQr(cleanKey, planId));
      setQrGenerated(true);
    } finally {
      setLoadingQr(false);
    }
  };

  // Auto-polling for payment confirmation once QR is generated
  useEffect(() => {
    if (!isOpen || !qrGenerated || isSuccess) return;

    let mounted = true;
    const cleanKey = key.trim().toUpperCase();

    const interval = setInterval(async () => {
      try {
        const machine = await getRuntime().getMachineInfo();
        const res = await validateLicense(cleanKey, machine?.machineId || "JACS-DESKTOP-HWID");
        if (!mounted) return;

        // If expiry is renewed / changed or valid
        if (res.valid && res.expires_at && res.expires_at !== initialExpiry) {
          setIsSuccess(true);
          setNewExpiryDate(res.expires_at);
          await getRuntime().saveLicense(cleanKey);
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 2200);
        }
      } catch {
        // keep polling
      }
    }, 3500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isOpen, qrGenerated, isSuccess, key, initialExpiry, onSuccess, onClose]);

  const handleManualVerify = async () => {
    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey) {
      setError("Vui lòng nhập mã License Key.");
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const machine = await getRuntime().getMachineInfo();
      const res = await validateLicense(cleanKey, machine?.machineId || "JACS-DESKTOP-HWID");
      await getRuntime().saveLicense(cleanKey);
      setIsSuccess(true);
      setNewExpiryDate(res.expires_at);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Hệ thống chưa ghi nhận giao dịch. Nếu bạn vừa quét mã, vui lòng đợi vài giây để ngân hàng đối soát."
      );
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  const bankCfg = getStoredBankConfig();
  const planTitles: Record<string, { title: string; period: string; priceStr: string }> = {
    "1_month": {
      title: "GÓI TIẾT KIỆM (1 THÁNG)",
      period: "30 Ngày",
      priceStr: `${(bankCfg.plans_pricing?.["1_month"] || DEFAULT_PRICING["1_month"]).toLocaleString("vi-VN")} đ`,
    },
    "3_months": {
      title: "GÓI TIÊU CHUẨN (3 THÁNG)",
      period: "90 Ngày",
      priceStr: `${(bankCfg.plans_pricing?.["3_months"] || DEFAULT_PRICING["3_months"]).toLocaleString("vi-VN")} đ`,
    },
    "6_months": {
      title: "GÓI CƠ BẢN (6 THÁNG)",
      period: "180 Ngày",
      priceStr: `${(bankCfg.plans_pricing?.["6_months"] || DEFAULT_PRICING["6_months"]).toLocaleString("vi-VN")} đ`,
    },
    "lifetime": {
      title: "GÓI VĨNH VIỄN (LIFETIME VIP)",
      period: "Trọn Đời (Lifetime)",
      priceStr: `${(bankCfg.plans_pricing?.["lifetime"] || DEFAULT_PRICING["lifetime"]).toLocaleString("vi-VN")} đ`,
    },
  };

  const currentPlanMeta = planTitles[selectedPlan] || planTitles["6_months"];

  return (
    <div className="renewal-modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="renewal-modal-card animate-scale-in"
        style={{
          maxWidth: qrGenerated ? "640px" : "1180px",
          width: "96%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "#0c101d",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "20px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.85)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          className="renewal-modal-header"
          style={{
            padding: "16px 24px",
            background: "rgba(255, 255, 255, 0.02)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="renewal-header-left" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              className="renewal-icon-badge"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #ea580c, #dc2626)",
                display: "grid",
                placeItems: "center",
                color: "#ffffff",
                boxShadow: "0 0 16px rgba(234, 88, 12, 0.4)",
              }}
            >
              <Icon name="zap" size={20} />
            </div>
            <div>
              <h3 className="renewal-title" style={{ fontSize: "17px", fontWeight: 900, color: "#ffffff", margin: 0 }}>
                Gia Hạn & Nâng Cấp Bản Quyền JACS Studio
              </h3>
              <p className="renewal-subtitle" style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0 0" }}>
                {qrGenerated
                  ? "Quét mã VietQR bằng ứng dụng ngân hàng để hệ thống tự động kích hoạt ngay lập tức"
                  : "Chọn gói bản quyền phù hợp (1 tháng, 3 tháng, 6 tháng hoặc Vĩnh viễn) để tiếp tục sáng tạo không giới hạn"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="renewal-close-btn"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#94a3b8",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body Container with Scroll */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {/* Key Input Section */}
          <div
            className="renewal-field-section"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >
            <div style={{ flexShrink: 0 }}>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                MÃ LICENSE KEY HIỆN TẠI
              </label>
              <span style={{ fontSize: "11px", color: "#64748b" }}>Gia hạn trực tiếp vào mã phần cứng của máy này</span>
            </div>
            <input
              type="text"
              className="renewal-key-input"
              value={key}
              onChange={(e) => {
                setKey(e.target.value.toUpperCase());
                setQrGenerated(false);
              }}
              placeholder="JACS-XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              spellCheck={false}
              style={{
                flex: 1,
                maxWidth: "380px",
                background: "#060911",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: "8px",
                color: "#38bdf8",
                fontFamily: "'DM Mono', monospace",
                fontWeight: 700,
                fontSize: "13px",
                padding: "8px 12px",
                outline: "none",
              }}
            />
          </div>

          {/* ============================================================= */}
          {/* STEP 1: 4 PRICING TIERS: 1 THÁNG, 3 THÁNG, 6 THÁNG, VĨNH VIỄN */}
          {/* ============================================================= */}
          {!qrGenerated && !isSuccess && (
            <div
              className="animate-fade-in"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "14px",
                alignItems: "stretch",
              }}
            >
              {/* CARD 1: GÓI TIẾT KIỆM (1 THÁNG) */}
              <div
                style={{
                  background: "linear-gradient(180deg, #2b3345 0%, #1a202c 100%)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  borderRadius: "20px",
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                }}
              >
                <div>
                  {/* Title Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "16px", color: "#cbd5e1" }}>🎯</span>
                    <h4 style={{ fontSize: "13.5px", fontWeight: 900, color: "#ffffff", margin: 0, letterSpacing: "0.02em" }}>
                      GÓI TIẾT KIỆM (1 THÁNG)
                    </h4>
                  </div>

                  {/* Price Box */}
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      padding: "10px 12px",
                      textAlign: "center",
                      marginBottom: "16px",
                      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
                    }}
                  >
                    <div style={{ fontSize: "21px", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>
                      {(bankCfg.plans_pricing?.["1_month"] || DEFAULT_PRICING["1_month"]).toLocaleString("vi-VN")} đ
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        color: "#dc2626",
                        textDecoration: "line-through",
                        marginTop: "3px",
                      }}
                    >
                      Giá gốc: 750.000 đ (30 Ngày)
                    </div>
                  </div>

                  {/* Feature List */}
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", display: "flex", flexDirection: "column", gap: "8.5px" }}>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#f87171", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Kích hoạt bản quyền 1 thiết bị máy tính (HWID)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#f87171", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Tối đa 100 video render / ngày tốc độ cao</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#f87171", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Render kịch bản & Prompt qua ChatGPT & Gemini</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#f87171", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Tự động phân cảnh & Reframe 9:16 Auto-Crop</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#f87171", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Tạo giọng đọc AI TTS đa ngôn ngữ tiêu chuẩn</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#f87171", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Xuất video Full HD 1080p không Watermark</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#f87171", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Bảo hành phần mềm & Update OTA định kỳ</span>
                    </li>
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={() => handleSelectAndGenerateQr("1_month")}
                  disabled={loadingQr}
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1.5px solid rgba(255, 255, 255, 0.3)",
                    color: "#ffffff",
                    borderRadius: "99px",
                    padding: "11px 16px",
                    fontSize: "13px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
                    e.currentTarget.style.borderColor = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                  }}
                >
                  ĐĂNG KÝ
                </button>
              </div>

              {/* CARD 2: GÓI TIÊU CHUẨN (3 THÁNG) */}
              <div
                style={{
                  background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
                  border: "1.5px solid rgba(56, 189, 248, 0.4)",
                  borderRadius: "20px",
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.45)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                }}
              >
                <div>
                  {/* Title Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "16px", color: "#38bdf8" }}>⚡</span>
                    <h4 style={{ fontSize: "13.5px", fontWeight: 900, color: "#38bdf8", margin: 0, letterSpacing: "0.02em" }}>
                      GÓI TIÊU CHUẨN (3 THÁNG)
                    </h4>
                  </div>

                  {/* Price Box */}
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      padding: "10px 12px",
                      textAlign: "center",
                      marginBottom: "16px",
                      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
                    }}
                  >
                    <div style={{ fontSize: "21px", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>
                      {(bankCfg.plans_pricing?.["3_months"] || DEFAULT_PRICING["3_months"]).toLocaleString("vi-VN")} đ
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        color: "#dc2626",
                        textDecoration: "line-through",
                        marginTop: "3px",
                      }}
                    >
                      Giá gốc: 1.650.000 đ (90 Ngày)
                    </div>
                  </div>

                  {/* Feature List */}
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px 0", display: "flex", flexDirection: "column", gap: "8.5px" }}>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Kích hoạt bản quyền 1-2 thiết bị (Hỗ trợ đổi máy)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Tối đa 250 video render / ngày tốc độ cao</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Render AI: ChatGPT (GPT-4o), Claude 3.5 & Gemini Pro</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Bóc tách cảnh & Quét hook viral đa ngôn ngữ</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Tạo giọng đọc AI TTS & Voice Cloning cơ bản</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Xuất video 2K / 4K chuẩn nét không Watermark</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#e2e8f0", lineHeight: "1.4" }}>
                      <span style={{ color: "#38bdf8", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Hỗ trợ kỹ thuật & Update OTA tính năng mới</span>
                    </li>
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  type="button"
                  onClick={() => handleSelectAndGenerateQr("3_months")}
                  disabled={loadingQr}
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.3))",
                    border: "1.5px solid #38bdf8",
                    color: "#ffffff",
                    borderRadius: "99px",
                    padding: "11px 16px",
                    fontSize: "13px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow: "0 4px 12px rgba(56, 189, 248, 0.25)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#38bdf8";
                    e.currentTarget.style.color = "#0f172a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.3))";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                >
                  ĐĂNG KÝ
                </button>
              </div>

              {/* CARD 3: GÓI CƠ BẢN (6 THÁNG) - FEATURED / MOST POPULAR */}
              <div
                style={{
                  background: "linear-gradient(180deg, #991b1b 0%, #7f1d1d 50%, #580a0a 100%)",
                  border: "2px solid #ef4444",
                  borderRadius: "20px",
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 16px 45px rgba(220, 38, 38, 0.35)",
                  position: "relative",
                  transform: "scale(1.02)",
                  zIndex: 2,
                }}
              >
                <div>
                  {/* Badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-10px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#ef4444",
                      color: "#ffffff",
                      fontSize: "9.5px",
                      fontWeight: 900,
                      padding: "2px 10px",
                      borderRadius: "99px",
                      letterSpacing: "0.04em",
                      boxShadow: "0 2px 8px rgba(239, 68, 68, 0.6)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ★ KHUYÊN DÙNG
                  </div>

                  {/* Title Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", marginTop: "2px" }}>
                    <span style={{ fontSize: "16px", color: "#ffffff" }}>🚀</span>
                    <h4 style={{ fontSize: "13.5px", fontWeight: 900, color: "#ffffff", margin: 0, letterSpacing: "0.02em" }}>
                      GÓI CƠ BẢN (6 THÁNG)
                    </h4>
                  </div>

                  {/* Price Box */}
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      padding: "10px 12px",
                      textAlign: "center",
                      marginBottom: "16px",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    <div style={{ fontSize: "21px", fontWeight: 900, color: "#0f172a", lineHeight: 1.1 }}>
                      {(bankCfg.plans_pricing?.["6_months"] || DEFAULT_PRICING["6_months"]).toLocaleString("vi-VN")} đ
                    </div>
                    <div
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 700,
                        color: "#dc2626",
                        textDecoration: "line-through",
                        marginTop: "3px",
                      }}
                    >
                      Giá gốc: 3.300.000 đ (180 Ngày)
                    </div>
                  </div>

                  {/* Feature List */}
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#ffffff", lineHeight: "1.4" }}>
                      <span style={{ color: "#ffffff", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Kích hoạt bản quyền 2 thiết bị (Hỗ trợ đổi máy)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#ffffff", lineHeight: "1.4" }}>
                      <span style={{ color: "#ffffff", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Tối đa 500 video render / ngày tốc độ cao</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#ffffff", lineHeight: "1.4" }}>
                      <span style={{ color: "#ffffff", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Render AI: GPT-4o, Claude 3.5 & Gemini Pro</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#ffffff", lineHeight: "1.4" }}>
                      <span style={{ color: "#ffffff", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>AI bóc tách kịch bản & Quét hook viral đa ngữ</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#ffffff", lineHeight: "1.4" }}>
                      <span style={{ color: "#ffffff", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Tích hợp Voice Cloning & TTS không giới hạn</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#ffffff", lineHeight: "1.4" }}>
                      <span style={{ color: "#ffffff", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Xuất video 4K 60FPS Multi-thread GPU Accel</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#ffffff", lineHeight: "1.4" }}>
                      <span style={{ color: "#ffffff", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Bảo hành phần mềm & Update 1 năm</span>
                    </li>
                  </ul>
                </div>

                {/* Bottom Section */}
                <div>
                  <button
                    type="button"
                    onClick={() => handleSelectAndGenerateQr("6_months")}
                    disabled={loadingQr}
                    style={{
                      width: "100%",
                      background: "#ffffff",
                      border: "none",
                      color: "#991b1b",
                      borderRadius: "99px",
                      padding: "11px 16px",
                      fontSize: "13.5px",
                      fontWeight: 900,
                      letterSpacing: "0.04em",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.4)";
                    }}
                  >
                    ĐĂNG KÝ
                  </button>

                  <p
                    style={{
                      fontSize: "9.5px",
                      color: "#fecdd3",
                      fontStyle: "italic",
                      textAlign: "center",
                      margin: "8px 0 0 0",
                      lineHeight: "1.35",
                    }}
                  >
                    Gói bản quyền được nhiều Creator & Studio lựa chọn nhất.
                  </p>
                </div>
              </div>

              {/* CARD 4: GÓI VĨNH VIỄN (LIFETIME VIP) */}
              <div
                style={{
                  background: "linear-gradient(180deg, #880000 0%, #600202 50%, #3e0000 100%)",
                  border: "1.5px solid #facc15",
                  borderRadius: "20px",
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 14px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(250, 204, 21, 0.15)",
                }}
              >
                <div>
                  {/* Title Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "16px", color: "#facc15" }}>👑</span>
                    <h4 style={{ fontSize: "13.5px", fontWeight: 900, color: "#fef08a", margin: 0, letterSpacing: "0.02em" }}>
                      GÓI VĨNH VIỄN (LIFETIME VIP)
                    </h4>
                  </div>

                  {/* Price Box */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #facc15 0%, #eab308 100%)",
                      borderRadius: "14px",
                      padding: "9px 12px",
                      textAlign: "center",
                      marginBottom: "16px",
                      boxShadow: "0 4px 14px rgba(234, 179, 8, 0.35)",
                    }}
                  >
                    <div style={{ fontSize: "17px", fontWeight: 900, color: "#0f172a", letterSpacing: "0.02em", lineHeight: 1.2 }}>
                      LIÊN HỆ ADMIN
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#451a03", marginTop: "2px" }}>
                      Từ {(bankCfg.plans_pricing?.["lifetime"] || DEFAULT_PRICING["lifetime"]).toLocaleString("vi-VN")} đ • Trọn Đời
                    </div>
                  </div>

                  {/* Feature List */}
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 14px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#fef08a", lineHeight: "1.35" }}>
                      <span style={{ color: "#facc15", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Kích hoạt Trọn Đời Vĩnh Viễn (Lifetime VIP)</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#fef08a", lineHeight: "1.35" }}>
                      <span style={{ color: "#facc15", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Không giới hạn số lượng render video / ngày</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#fef08a", lineHeight: "1.35" }}>
                      <span style={{ color: "#facc15", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Kích hoạt song song 5 – 10 máy tính Studio</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#fef08a", lineHeight: "1.35" }}>
                      <span style={{ color: "#facc15", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Full Multi-AI Engine: GPT, Claude, Gemini & Custom</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#fef08a", lineHeight: "1.35" }}>
                      <span style={{ color: "#facc15", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Độc quyền Batch Render & Auto-Queue đa luồng</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#fef08a", lineHeight: "1.35" }}>
                      <span style={{ color: "#facc15", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Bảo hành & Update tính năng mới Vĩnh viễn</span>
                    </li>
                    <li style={{ display: "flex", alignItems: "flex-start", gap: "7px", fontSize: "11px", color: "#fef08a", lineHeight: "1.35" }}>
                      <span style={{ color: "#facc15", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>Hỗ trợ kỹ thuật 1-1 riêng 24/7 & Setup Studio</span>
                    </li>
                  </ul>
                </div>

                {/* Bottom Section */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowContactAdminModal(true)}
                    style={{
                      width: "100%",
                      background: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)",
                      border: "1.5px solid #facc15",
                      color: "#ffffff",
                      borderRadius: "99px",
                      padding: "11px 16px",
                      fontSize: "13px",
                      fontWeight: 900,
                      letterSpacing: "0.04em",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(250, 204, 21, 0.35)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.4)";
                    }}
                  >
                    LIÊN HỆ ADMIN
                  </button>

                  <p
                    style={{
                      fontSize: "9.5px",
                      color: "#fde68a",
                      fontStyle: "italic",
                      textAlign: "center",
                      margin: "8px 0 0 0",
                      lineHeight: "1.35",
                      opacity: 0.9,
                    }}
                  >
                    Giải pháp tối ưu nhất cho Studio chuyên nghiệp và Agency.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 2: VIETQR PAYMENT DISPLAY WITH LIVE AUTO-POLLING         */}
          {/* ============================================================= */}
          {qrGenerated && !isSuccess && (
            <div
              className="animate-fade-in"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "16px",
                maxWidth: "460px",
                margin: "0 auto",
              }}
            >
              {/* Selected Plan Summary Card */}
              <div
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, rgba(234, 88, 12, 0.15), rgba(153, 27, 27, 0.15))",
                  border: "1px solid rgba(234, 88, 12, 0.4)",
                  borderRadius: "14px",
                  padding: "12px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                    GÓI GIA HẠN ĐÃ CHỌN
                  </span>
                  <strong style={{ fontSize: "14.5px", color: "#ffffff", display: "block", marginTop: "2px" }}>
                    {currentPlanMeta.title}
                  </strong>
                  <span style={{ fontSize: "11.5px", color: "#38bdf8" }}>Thời hạn: +{currentPlanMeta.period}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>
                    SỐ TIỀN THANH TOÁN
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: 900, color: "#10b981", marginTop: "2px" }}>
                    {(qrData?.amount || DEFAULT_PRICING[selectedPlan]).toLocaleString("vi-VN")} đ
                  </div>
                </div>
              </div>

              {/* VietQR Code Frame */}
              <div
                style={{
                  background: "#ffffff",
                  padding: "16px",
                  borderRadius: "16px",
                  boxShadow: "0 14px 40px rgba(0, 0, 0, 0.6)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  maxWidth: "280px",
                  width: "100%",
                }}
              >
                {loadingQr ? (
                  <div style={{ height: "240px", display: "grid", placeItems: "center", color: "#000" }}>
                    <Icon name="refresh" size={28} className="animate-spin" />
                  </div>
                ) : qrData?.qr_url ? (
                  <img
                    src={qrData.qr_url}
                    alt="VietQR Gia Hạn"
                    style={{ width: "100%", height: "auto", borderRadius: "8px", display: "block" }}
                  />
                ) : (
                  <div style={{ height: "200px", display: "grid", placeItems: "center", color: "#666" }}>
                    Không thể nạp ảnh VietQR
                  </div>
                )}
              </div>

              {/* Transfer Syntax Details */}
              <div
                style={{
                  width: "100%",
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "12px",
                  padding: "10px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  fontSize: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                  <span>Ngân hàng thụ hưởng:</span>
                  <strong style={{ color: "#ffffff" }}>{qrData?.bank_name || "MB Bank"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                  <span>Chủ tài khoản:</span>
                  <strong style={{ color: "#ffffff" }}>{qrData?.account_name || "NGUYEN LE HẢI"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8" }}>
                  <span>Số tài khoản:</span>
                  <strong style={{ color: "#38bdf8", fontFamily: "'DM Mono', monospace" }}>
                    {qrData?.account_number || "10987353827"}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed rgba(255,255,255,0.1)", paddingTop: "6px", marginTop: "2px" }}>
                  <span style={{ color: "#f97316", fontWeight: 700 }}>Nội dung chuyển khoản:</span>
                  <strong style={{ color: "#f97316", fontFamily: "'DM Mono', monospace", fontSize: "13.5px" }}>
                    {qrData?.transfer_content || formatTransferContent(key)}
                  </strong>
                </div>
              </div>

              {/* Live Polling Status Indicator */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  borderRadius: "99px",
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  fontSize: "12px",
                  fontWeight: 600,
                  boxShadow: "0 0 15px rgba(16, 185, 129, 0.15)",
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", animation: "pulse 1.5s infinite" }} />
                <span>Đang chờ giao dịch từ ngân hàng... (Tự động kích hoạt khi nhận được tiền)</span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", width: "100%", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setQrGenerated(false)}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ← Chọn Gói Khác
                </button>
                <button
                  type="button"
                  onClick={handleManualVerify}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    background: "linear-gradient(135deg, #ea580c, #dc2626)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(234, 88, 12, 0.35)",
                  }}
                >
                  Tôi Đã Chuyển Khoản
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STEP 3: SUCCESS SCREEN                                        */}
          {/* ============================================================= */}
          {isSuccess && (
            <div
              className="animate-fade-in"
              style={{
                padding: "36px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "grid",
                  placeItems: "center",
                  color: "#ffffff",
                  boxShadow: "0 0 30px rgba(16, 185, 129, 0.5)",
                }}
              >
                <Icon name="check" size={34} />
              </div>

              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>
                🎉 GIA HẠN THÀNH CÔNG!
              </h2>

              <p style={{ margin: 0, fontSize: "13.5px", color: "#cbd5e1", lineHeight: 1.5 }}>
                Mã bản quyền của bạn đã được kích hoạt gia hạn thành công.
                <br />
                Thời hạn sử dụng mới:{" "}
                <strong style={{ color: "#38bdf8" }}>
                  {newExpiryDate ? new Date(newExpiryDate).toLocaleDateString("vi-VN") : "Vĩnh viễn (Lifetime)"}
                </strong>
              </p>

              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
                Đang tự động mở khóa toàn bộ tính năng...
              </div>
            </div>
          )}

          {/* Feedback Error */}
          {error && (
            <div
              className="animate-fade-in"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#f87171",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "12.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "14px",
              }}
            >
              <Icon name="alert" size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Bottom Legal Link Bar */}
        <div
          className="renewal-modal-footer"
          style={{
            padding: "12px 24px",
            background: "rgba(255, 255, 255, 0.02)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            className="renewal-legal-link-btn"
            onClick={() => setShowTerms(true)}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
          >
            <Icon name="shield" size={13} />
            <span>Xem Văn Bản Điều Khoản & Chứng Thực Pháp Lý JACS Studio</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "#94a3b8",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        </div>

        <LegalTermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />

        {/* Contact Admin Modal for Lifetime Package */}
        {showContactAdminModal && (
          <div
            className="legal-modal-overlay animate-fade-in"
            style={{ zIndex: 110000 }}
            onClick={() => setShowContactAdminModal(false)}
          >
            <div
              className="jacs-modal-card animate-scale-in"
              style={{ maxWidth: "480px", width: "90%", padding: "24px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #facc15, #eab308)",
                    color: "#0f172a",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto 12px",
                    fontSize: "24px",
                    boxShadow: "0 0 20px rgba(250, 204, 21, 0.4)",
                  }}
                >
                  👑
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#ffffff", margin: 0 }}>
                  ĐĂNG KÝ GÓI VĨNH VIỄN (LIFETIME VIP)
                </h3>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "6px 0 0 0" }}>
                  Bản quyền trọn đời, mở khóa toàn bộ tính năng Studio và hỗ trợ kỹ thuật 1-1 riêng 24/7.
                </p>
              </div>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "18px",
                  fontSize: "12.5px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Mức giá đầu tư:</span>
                  <strong style={{ color: "#facc15", fontWeight: 900, fontSize: "14px" }}>
                    Từ 9.650.000 đ
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Số lượng máy kích hoạt:</span>
                  <strong style={{ color: "#ffffff" }}>5 – 10 Thiết bị Studio</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#94a3b8" }}>Hỗ trợ kỹ thuật:</span>
                  <strong style={{ color: "#10b981" }}>Setup 1-1 & Bảo hành Vĩnh viễn</strong>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowContactAdminModal(false);
                    handleSelectAndGenerateQr("lifetime");
                  }}
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, #ea580c, #dc2626)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "10px",
                    padding: "12px",
                    fontSize: "13.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 16px rgba(234, 88, 12, 0.4)",
                  }}
                >
                  <span>⚡ Tạo Mã VietQR Thanh Toán Ngay (9.650.000 đ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.open("https://t.me/jacs_support", "_blank");
                  }}
                  style={{
                    width: "100%",
                    background: "#0088cc",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "10px",
                    padding: "12px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <span>💬 Nhắn Tin Telegram Với Admin Hỗ Trợ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowContactAdminModal(false)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#94a3b8",
                    borderRadius: "10px",
                    padding: "10px",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    marginTop: "4px",
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
