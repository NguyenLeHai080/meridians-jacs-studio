import React from "react";
import { Zap, Copy, QrCode } from "lucide-react";
import type { BankConfig } from "../../../core/types";
import { useI18n } from "../../../core/i18n";

interface SepayWebhookBoxProps {
  bankConfig: BankConfig;
  onCopySuccess: (msg: string) => void;
}

export const SepayWebhookBox: React.FC<SepayWebhookBoxProps> = ({
  bankConfig,
  onCopySuccess,
}) => {
  const { t } = useI18n();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Live VietQR Preview Card */}
      <div
        className="mf-card-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: "340px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <QrCode size={18} color="var(--primary)" />
            <strong style={{ fontSize: "0.95rem", color: "var(--text-dark)" }}>
              {bankConfig.custom_qr_url ? t("customQrTitle") : t("liveQrTitle")}
            </strong>
          </div>

          <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-light)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            {bankConfig.custom_qr_url ? (
              <img
                src={bankConfig.custom_qr_url}
                alt="Custom Bank QR"
                style={{ width: "100%", height: "auto", borderRadius: "8px", objectFit: "contain", maxHeight: "260px" }}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : bankConfig.bank_bin && bankConfig.account_number ? (
              <img
                src={`https://img.vietqr.io/image/${bankConfig.bank_bin}-${bankConfig.account_number}-${bankConfig.qr_template || "compact2"}.png?amount=${bankConfig.plans_pricing?.["1_month"] || 500000}&addInfo=JACS%20DEMO&accountName=${encodeURIComponent(bankConfig.account_name)}`}
                alt="VietQR Live Preview"
                style={{ width: "100%", height: "auto", borderRadius: "8px" }}
              />
            ) : (
              <div style={{ padding: "3rem 1rem", color: "var(--text-muted)" }}>
                Vui lòng chọn ngân hàng và nhập số tài khoản
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SePay Webhook Automated Integration Box */}
      <div className="mf-card-panel" style={{ borderLeft: "4px solid #10b981" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="squircle-badge squircle-green" style={{ width: "28px", height: "28px", borderRadius: "6px", display: "grid", placeItems: "center" }}>
              <Zap size={15} />
            </span>
            <strong style={{ fontSize: "0.95rem", color: "var(--text-dark)" }}>Tích Hợp Webhook SePay (Tự Động 100%)</strong>
          </div>
          <span className="pill-status pill-online" style={{ fontSize: "0.72rem" }}>Webhook Ready</span>
        </div>

        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0 0 0.75rem 0", lineHeight: 1.4 }}>
          Hệ thống đã xây dựng sẵn Webhook chuẩn SePay. Khi tiền về tài khoản ngân hàng, SePay sẽ bắn thông báo về đường link bên dưới để tự động gia hạn:
        </p>

        <div className="form-group-mf" style={{ marginBottom: "0.75rem" }}>
          <label className="form-label-mf">URL Webhook Nhận Dữ Liệu SePay (Copy vào my.sepay.vn):</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              className="form-input-mf"
              readOnly
              value="https://jacs-studio.nexoratech.com.vn/api/webhook/sepay"
              style={{ background: "#f1f5f9", fontWeight: 600, color: "var(--primary)", fontSize: "0.82rem" }}
            />
            <button
              type="button"
              className="btn-primary-orange"
              style={{ whiteSpace: "nowrap", padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
              onClick={() => {
                navigator.clipboard.writeText("https://jacs-studio.nexoratech.com.vn/api/webhook/sepay");
                onCopySuccess("✓ Đã copy link Webhook SePay!");
              }}
            >
              <Copy size={13} /> Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
