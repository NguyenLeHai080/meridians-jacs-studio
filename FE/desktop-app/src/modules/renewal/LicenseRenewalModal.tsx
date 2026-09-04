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
  "1_month": 500000,
  "3_months": 1350000,
  "6_months": 2500000,
  "1_year": 4500000,
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
  const amount = (cfg.plans_pricing && cfg.plans_pricing[plan]) || DEFAULT_PRICING[plan] || 500000;
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
    months: plan === "1_month" ? 1 : plan === "3_months" ? 3 : plan === "6_months" ? 6 : 12,
  };
};

export function LicenseRenewalModal({
  isOpen,
  onClose,
  currentKey = "",
  onSuccess,
}: LicenseRenewalModalProps) {
  const [key, setKey] = useState(currentKey);
  const [selectedPlan, setSelectedPlan] = useState<"1_month" | "3_months" | "6_months" | "1_year">("1_month");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [qrData, setQrData] = useState<RenewQrResponse | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [newExpiryDate, setNewExpiryDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [initialExpiry, setInitialExpiry] = useState<string | null>(null);

  // Sync key & fresh bank config when modal opens
  useEffect(() => {
    if (isOpen) {
      setQrGenerated(false);
      setIsSuccess(false);
      setError(null);
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

  // Handle generating QR when user clicks Create QR button
  const handleGenerateQr = async () => {
    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey) {
      setError("Vui lòng nhập mã License Key của bạn.");
      return;
    }

    setLoadingQr(true);
    setError(null);
    try {
      const res = await getRenewQr(cleanKey, selectedPlan);
      setQrData(res);
      setQrGenerated(true);
    } catch {
      setQrData(createFallbackQr(cleanKey, selectedPlan));
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

  const planOptions = [
    {
      id: "1_month" as const,
      name: "1 Tháng",
      badge: "Gói Chuẩn",
      sub: "30 ngày sử dụng",
      price: 500000,
      save: "",
    },
    {
      id: "3_months" as const,
      name: "3 Tháng",
      badge: "Tiết Kiệm",
      sub: "90 ngày sử dụng",
      price: 1350000,
      save: "Giảm 10%",
    },
    {
      id: "6_months" as const,
      name: "6 Tháng",
      badge: "Phổ Biến",
      sub: "180 ngày sử dụng",
      price: 2500000,
      save: "Giảm 17%",
    },
    {
      id: "1_year" as const,
      name: "1 Năm",
      badge: "VIP Studio",
      sub: "365 ngày sử dụng",
      price: 4500000,
      save: "Giảm 25%",
    },
  ];

  if (!isOpen) return null;

  const currentPlanObj = planOptions.find((p) => p.id === selectedPlan) || planOptions[0];

  return (
    <div className="renewal-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="renewal-modal-card animate-scale-in" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="renewal-modal-header">
          <div className="renewal-header-left">
            <div className="renewal-icon-badge">
              <Icon name="zap" size={20} />
            </div>
            <div>
              <h3 className="renewal-title">Gia Hạn & Nâng Cấp Bản Quyền JACS Studio</h3>
              <p className="renewal-subtitle">
                {qrGenerated
                  ? "Quét mã VietQR bằng ứng dụng ngân hàng để tự động kích hoạt gia hạn"
                  : "Lựa chọn gói cước thời hạn phù hợp và bấm Tạo mã thanh toán VietQR"}
              </p>
            </div>
          </div>
          <button type="button" className="renewal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Key Input Section */}
        <div className="renewal-field-section">
          <label className="renewal-field-label">MÃ LICENSE KEY CỦA BẠN</label>
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
          />
        </div>

        {/* STEP 1: Select Plan Grid */}
        {!qrGenerated && !isSuccess && (
          <div className="renewal-field-section animate-fade-in">
            <label className="renewal-field-label">CHỌN GÓI THỜI HẠN GIA HẠN</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                marginTop: "6px",
              }}
            >
              {planOptions.map((p) => {
                const isSelected = selectedPlan === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlan(p.id)}
                    style={{
                      background: isSelected
                        ? "linear-gradient(145deg, rgba(249, 87, 56, 0.15), rgba(17, 22, 37, 0.95))"
                        : "rgba(255, 255, 255, 0.03)",
                      border: isSelected
                        ? "2px solid #f95738"
                        : "1px solid rgba(255, 255, 255, 0.09)",
                      borderRadius: "14px",
                      padding: "16px 14px",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      position: "relative",
                      boxShadow: isSelected
                        ? "0 0 20px rgba(249, 87, 56, 0.25)"
                        : "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "99px",
                          background: isSelected ? "#f95738" : "rgba(255, 255, 255, 0.08)",
                          color: "#ffffff",
                        }}
                      >
                        {p.badge}
                      </span>
                      {p.save && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#10b981",
                            background: "rgba(16, 185, 129, 0.15)",
                            padding: "2px 8px",
                            borderRadius: "99px",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                          }}
                        >
                          {p.save}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: "15px", fontWeight: 800, color: "#ffffff", marginBottom: "2px" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#94a3b8", marginBottom: "10px" }}>
                      {p.sub}
                    </div>

                    <div style={{ fontSize: "16px", fontWeight: 900, color: isSelected ? "#f95738" : "#38bdf8" }}>
                      {p.price.toLocaleString("vi-VN")} đ
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="gate-submit-btn"
                onClick={handleGenerateQr}
                disabled={loadingQr || !key.trim()}
                style={{ padding: "14px 20px", fontSize: "14.5px" }}
              >
                {loadingQr ? (
                  <span>Đang tạo mã VietQR...</span>
                ) : (
                  <>
                    <span>⚡ Tạo Mã Thanh Toán VietQR ({currentPlanObj.price.toLocaleString("vi-VN")} đ)</span>
                    <Icon name="arrow" size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: QR Payment Display with Live Verification */}
        {qrGenerated && !isSuccess && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
            {/* Plan Info Badge */}
            <div
              style={{
                width: "100%",
                background: "rgba(249, 87, 56, 0.08)",
                border: "1px solid rgba(249, 87, 56, 0.25)",
                borderRadius: "12px",
                padding: "10px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>GÓI ĐANG CHỌN</span>
                <strong style={{ fontSize: "14px", color: "#ffffff" }}>
                  {currentPlanObj.name} ({currentPlanObj.sub})
                </strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>SỐ TIỀN CẦN CHUYỂN</span>
                <strong style={{ fontSize: "16px", color: "#10b981", fontWeight: 900 }}>
                  {(qrData?.amount || currentPlanObj.price).toLocaleString("vi-VN")} đ
                </strong>
              </div>
            </div>

            {/* QR Code Container */}
            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
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
                  Không thể nạp ảnh QR
                </div>
              )}
            </div>

            {/* Transfer Syntax Pill */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "10px",
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "#94a3b8" }}>Nội dung chuyển khoản:</span>
              <strong style={{ color: "#f95738", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>
                {qrData?.transfer_content || formatTransferContent(key)}
              </strong>
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
                fontSize: "12.5px",
                fontWeight: 600,
                boxShadow: "0 0 15px rgba(16, 185, 129, 0.15)",
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", animation: "pulse 1.5s infinite" }} />
              <span>Đang chờ giao dịch từ ngân hàng... (Tự động kích hoạt khi nhận được tiền)</span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", width: "100%", gap: "10px", marginTop: "8px" }}>
              <button
                type="button"
                className="renewal-btn-cancel"
                onClick={() => setQrGenerated(false)}
                style={{ flex: 1, padding: "12px", justifyContent: "center" }}
              >
                ← Chọn Gói Khác
              </button>
              <button
                type="button"
                className="button-quiet"
                onClick={onClose}
                style={{ flex: 1, padding: "12px", justifyContent: "center" }}
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Success Screen */}
        {isSuccess && (
          <div
            className="animate-fade-in"
            style={{
              padding: "30px 20px",
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

            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#ffffff" }}>
              🎉 GIA HẠN THÀNH CÔNG!
            </h2>

            <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1", lineHeight: 1.5 }}>
              Mã bản quyền của bạn đã được kích hoạt thành công.
              <br />
              Thời hạn sử dụng mới:{" "}
              <strong style={{ color: "#38bdf8" }}>
                {newExpiryDate ? new Date(newExpiryDate).toLocaleDateString("vi-VN") : "Vĩnh viễn"}
              </strong>
            </p>

            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
              Đang tự động mở khóa không gian làm việc...
            </div>
          </div>
        )}

        {/* Feedback Error */}
        {error && (
          <div className="renewal-msg-banner error-banner animate-fade-in" style={{ marginTop: "12px" }}>
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Footer */}
        <div className="renewal-modal-footer">
          <div className="renewal-footer-legal">
            <button
              type="button"
              className="renewal-legal-link-btn"
              onClick={() => setShowTerms(true)}
            >
              <Icon name="shield" size={13} />
              <span>Xem Luật Miễn Trừ Trách Nhiệm & Quyền Sử Dụng Tool JACS Studio</span>
            </button>
          </div>
        </div>

        <LegalTermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      </div>
    </div>
  );
}
