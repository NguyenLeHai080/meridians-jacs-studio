import React, { useEffect, useState } from "react";
import { getRenewQr, validateLicense, RenewQrResponse } from "../../core/api";
import { getRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";

interface LicenseRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey?: string;
  onSuccess?: () => void;
}

export function LicenseRenewalModal({
  isOpen,
  onClose,
  currentKey = "",
  onSuccess,
}: LicenseRenewalModalProps) {
  const [key, setKey] = useState(currentKey);
  const [selectedPlan, setSelectedPlan] = useState<"1_month" | "3_months" | "6_months" | "1_year">("1_month");
  const [qrData, setQrData] = useState<RenewQrResponse | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load key from storage if not provided
  useEffect(() => {
    if (isOpen) {
      if (!key) {
        void getRuntime().readLicense().then((saved) => {
          if (saved) setKey(saved);
        });
      }
    }
  }, [isOpen, key]);

  // Fetch QR when plan or key changes
  useEffect(() => {
    if (!isOpen || !key.trim()) return;

    let mounted = true;
    setLoadingQr(true);
    setError(null);

    getRenewQr(key.trim(), selectedPlan)
      .then((data) => {
        if (mounted) setQrData(data);
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Không thể tạo mã VietQR gia hạn");
        }
      })
      .finally(() => {
        if (mounted) setLoadingQr(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, key, selectedPlan]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await getRuntime().copyText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const machine = await getRuntime().getMachineInfo();
      if (!machine) {
        throw new Error("Không thể xác định thiết bị phần cứng.");
      }
      const res = await validateLicense(key.trim(), machine.machineId);
      if (res.valid) {
        setSuccessMsg("🎉 Bản quyền của bạn đã được gia hạn và kích hoạt thành công!");
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setError("Hệ thống đang chờ giao dịch được ghi nhận. Vui lòng bấm kiểm tra lại sau khi chuyển khoản.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa tìm thấy giao dịch chuyển khoản hoặc key chưa được gia hạn.");
    } finally {
      setVerifying(false);
    }
  };

  const plans = [
    {
      id: "1_month" as const,
      name: "1 Tháng",
      duration: "30 ngày",
      badge: "Gói chuẩn",
      discount: "",
    },
    {
      id: "3_months" as const,
      name: "3 Tháng",
      duration: "90 ngày",
      badge: "Tiết kiệm",
      discount: "Tiết kiệm 10%",
    },
    {
      id: "6_months" as const,
      name: "6 Tháng",
      duration: "180 ngày",
      badge: "Phổ biến",
      discount: "Tiết kiệm 17%",
    },
    {
      id: "1_year" as const,
      name: "1 Năm",
      duration: "365 ngày",
      badge: "VIP Studio",
      discount: "Tiết kiệm 25%",
    },
  ];

  return (
    <div className="modal-backdrop animate-fade-in" style={{ zIndex: 9999 }}>
      <div
        className="panel-card"
        style={{
          maxWidth: "820px",
          width: "95%",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--surface-color, #131722)",
          color: "var(--text-color, #f1f5f9)",
          border: "1px solid var(--border-color, #2a2e3d)",
          borderRadius: "16px",
          padding: "1.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                <Icon name="zap" size={20} />
              </div>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
                Gia Hạn & Nâng Cấp Bản Quyền JACS Studio
              </h2>
            </div>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem", color: "rgba(255,255,255,0.65)" }}>
              Quét mã VietQR bằng app ngân hàng để tự động kích hoạt gia hạn thời gian sử dụng
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="button-quiet"
            style={{ padding: "0.4rem", borderRadius: "8px", color: "rgba(255,255,255,0.6)" }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Key input if needed */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem", color: "rgba(255,255,255,0.8)" }}>
            MÃ LICENSE KEY CỦA BẠN
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="VD: JACS-ABCD-1234-EF56"
              style={{
                flex: 1,
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.3)",
                color: "#fff",
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            />
          </div>
        </div>

        {/* Plan Selectors */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem", color: "rgba(255,255,255,0.8)" }}>
            CHỌN GÓI THỜI HẠN GIA HẠN
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
            {plans.map((p) => {
              const isSelected = selectedPlan === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  style={{
                    padding: "0.85rem 0.65rem",
                    borderRadius: "10px",
                    border: `2px solid ${isSelected ? "#f97316" : "rgba(255,255,255,0.1)"}`,
                    background: isSelected ? "rgba(249, 115, 22, 0.12)" : "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontSize: "0.72rem", color: isSelected ? "#f97316" : "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase" }}>
                    {p.badge}
                  </div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", margin: "0.2rem 0" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                    {p.duration}
                  </div>
                  {p.discount && (
                    <div style={{ fontSize: "0.7rem", color: "#4ade80", fontWeight: 700, marginTop: "0.25rem" }}>
                      {p.discount}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Two-Column QR & Transfer Details */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1.5rem", background: "rgba(0,0,0,0.25)", padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Column 1: QR Image */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            <div style={{ width: "240px", minHeight: "240px", background: "#fff", padding: "0.75rem", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
              {loadingQr ? (
                <div style={{ color: "#475569", fontSize: "0.85rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <Icon name="refresh" size={24} className="animate-spin" />
                  Đang tạo mã VietQR...
                </div>
              ) : qrData ? (
                <img
                  src={qrData.qr_url}
                  alt="VietQR Gia hạn"
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: "6px" }}
                />
              ) : (
                <div style={{ color: "#ef4444", fontSize: "0.8rem", padding: "1rem" }}>
                  {error || "Chưa thể tạo mã QR"}
                </div>
              )}
            </div>
            <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
              Quét bằng bất kỳ App Ngân hàng hoặc MoMo / ZaloPay
            </div>
          </div>

          {/* Column 2: Transfer details with 1-click copy */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {/* Bank Name */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: "0.6rem 0.85rem", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>NGÂN HÀNG THỤ HƯỞNG</div>
                  <strong style={{ fontSize: "0.95rem", color: "#fff" }}>{qrData?.bank_name || "--"}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => qrData && void copyToClipboard(qrData.bank_name, "bank")}
                  className="button-quiet"
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                >
                  {copiedField === "bank" ? "✓ Đã copy" : "Copy"}
                </button>
              </div>

              {/* Account Number */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: "0.6rem 0.85rem", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>SỐ TÀI KHOẢN (STK)</div>
                  <strong style={{ fontSize: "1.1rem", color: "#f97316", letterSpacing: "1px" }}>{qrData?.account_number || "--"}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => qrData && void copyToClipboard(qrData.account_number, "stk")}
                  className="button-quiet"
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                >
                  {copiedField === "stk" ? "✓ Đã copy" : "Copy"}
                </button>
              </div>

              {/* Account Name */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: "0.6rem 0.85rem", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>CHỦ TÀI KHOẢN</div>
                  <strong style={{ fontSize: "0.95rem", color: "#fff" }}>{qrData?.account_name || "--"}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => qrData && void copyToClipboard(qrData.account_name, "name")}
                  className="button-quiet"
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                >
                  {copiedField === "name" ? "✓ Đã copy" : "Copy"}
                </button>
              </div>

              {/* Amount */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", padding: "0.6rem 0.85rem", borderRadius: "8px" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.5)" }}>SỐ TIỀN THANH TOÁN</div>
                  <strong style={{ fontSize: "1.2rem", color: "#4ade80" }}>
                    {qrData ? formatCurrency(qrData.amount) : "--"}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => qrData && void copyToClipboard(String(qrData.amount), "amount")}
                  className="button-quiet"
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                >
                  {copiedField === "amount" ? "✓ Đã copy" : "Copy"}
                </button>
              </div>

              {/* Transfer Content */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(249, 115, 22, 0.08)", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px dashed rgba(249, 115, 22, 0.4)" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "#f97316", fontWeight: 700 }}>NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC ĐÚNG)</div>
                  <strong style={{ fontSize: "1.05rem", color: "#fff", fontFamily: "monospace" }}>{qrData?.transfer_content || `JACS ${key}`}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => qrData && void copyToClipboard(qrData.transfer_content, "content")}
                  className="button-quiet"
                  style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", background: "#f97316", color: "#fff" }}
                >
                  {copiedField === "content" ? "✓ Đã copy" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {error && (
          <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "0.85rem" }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: "8px", background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.3)", color: "#86efac", fontSize: "0.88rem", fontWeight: 700 }}>
            {successMsg}
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem" }}>
          <button
            type="button"
            onClick={onClose}
            className="button-quiet"
            style={{ padding: "0.65rem 1.25rem", borderRadius: "8px" }}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying || !key.trim()}
            style={{
              padding: "0.65rem 1.5rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.95rem",
              border: "none",
              cursor: verifying ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            }}
          >
            {verifying ? (
              <>
                <Icon name="refresh" size={16} className="animate-spin" />
                Đang kiểm tra...
              </>
            ) : (
              <>
                <Icon name="check" size={16} />
                Đã Chuyển Khoản - Kiểm Tra Kích Hoạt
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
