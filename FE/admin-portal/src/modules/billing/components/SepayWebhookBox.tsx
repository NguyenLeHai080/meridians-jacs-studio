import React, { useState } from "react";
import { Zap, Copy, Check, ShieldCheck, Key, ExternalLink } from "lucide-react";
import type { BankConfig } from "../../../core/types";
import { billingService } from "../services/billingService";

interface SepayWebhookBoxProps {
  bankConfig: BankConfig;
  onUpdateConfig?: (cfg: BankConfig) => void;
  onCopySuccess: (msg: string) => void;
}

export const SepayWebhookBox: React.FC<SepayWebhookBoxProps> = ({
  bankConfig,
  onUpdateConfig,
  onCopySuccess,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [apiKey, setApiKey] = useState(bankConfig.sepay_api_key || "");
  const [isSavingKey, setIsSavingKey] = useState(false);

  const webhookUrl = window.location.origin
    ? `${window.location.origin}/api/v1/billing/webhook/sepay`
    : "https://jacs-studio.nexoratech.com.vn/api/v1/billing/webhook/sepay";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      onCopySuccess("✓ Đã copy link Webhook SePay!");
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingKey(true);
    try {
      const updated = await billingService.saveBankConfig({
        ...bankConfig,
        sepay_api_key: apiKey.trim() || undefined,
      });
      if (onUpdateConfig) onUpdateConfig(updated);
      onCopySuccess("Đã lưu cấu hình SePay API Key thành công!");
    } catch {
      onCopySuccess("Lỗi khi lưu API Key SePay");
    } finally {
      setIsSavingKey(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* SePay Webhook Automated Integration Box */}
      <div className="mf-card-panel" style={{ borderLeft: "4px solid #10b981" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              className="squircle-badge squircle-green"
              style={{ width: "30px", height: "30px", borderRadius: "8px", display: "grid", placeItems: "center" }}
            >
              <Zap size={16} />
            </span>
            <strong style={{ fontSize: "1rem", color: "var(--text-dark)" }}>
              Tích Hợp Webhook SePay (Tự Động 100%)
            </strong>
          </div>
          <span className="pill-status pill-online" style={{ fontSize: "0.75rem" }}>
            Webhook Sẵn Sàng
          </span>
        </div>

        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 1rem 0", lineHeight: 1.5 }}>
          Khi khách hàng quét mã VietQR chuyển khoản, SePay sẽ gửi webhook trực tiếp về endpoint bên dưới để tự động kích hoạt / cộng ngày sử dụng cho License và tạo lịch sử dòng tiền.
        </p>

        {/* Webhook URL Box */}
        <div className="form-group-mf" style={{ marginBottom: "1rem" }}>
          <label className="form-label-mf">URL Webhook Nhận Dữ Liệu SePay (Cấu hình trên my.sepay.vn):</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              className="form-input-mf"
              readOnly
              value={webhookUrl}
              style={{ background: "#f1f5f9", fontWeight: 600, color: "var(--primary)", fontSize: "0.85rem" }}
            />
            <button
              type="button"
              className="btn-primary-orange"
              style={{ whiteSpace: "nowrap", padding: "0.5rem 1rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              onClick={handleCopy}
            >
              {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
              {copiedUrl ? "Đã chép" : "Copy URL"}
            </button>
          </div>
        </div>

        {/* SePay API Key Configuration */}
        <form onSubmit={handleSaveApiKey} style={{ background: "#f0fdf4", padding: "1rem", borderRadius: "10px", border: "1px solid #bbf7d0", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label className="form-label-mf" style={{ color: "#166534", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Key size={14} /> Mã Xác Thực SePay API Key (Bảo Mật)
            </label>
            {bankConfig.sepay_api_key && (
              <span style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                <ShieldCheck size={13} /> Đã Bật Bảo Mật
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              className="form-input-mf"
              placeholder="Nhập API Key SePay của bạn (VD: SEPAY_API_KEY_...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ background: "#ffffff", flex: 1 }}
            />
            <button
              type="submit"
              className="btn-white-outline"
              disabled={isSavingKey}
              style={{ whiteSpace: "nowrap", padding: "0.5rem 0.9rem", color: "#166534", borderColor: "#86efac", fontWeight: 600 }}
            >
              {isSavingKey ? "Đang lưu..." : "Lưu Khóa"}
            </button>
          </div>
        </form>

        {/* Guide Steps */}
        <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border)", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--text-main)", display: "block", marginBottom: "0.4rem" }}>
            Hướng dẫn kết nối SePay trong 3 bước:
          </strong>
          <div>1. Đăng nhập <a href="https://my.sepay.vn" target="_blank" rel="noreferrer" style={{ color: "var(--primary)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: "2px" }}>my.sepay.vn <ExternalLink size={11} /></a> và liên kết tài khoản ngân hàng tương ứng.</div>
          <div>2. Vào mục <strong>Tích hợp Webhook</strong> ➔ Thêm URL Webhook ở trên.</div>
          <div>3. Đặt cú pháp chuyển khoản khách hàng là <code>JACS &lt;MÃ_KEY&gt;</code> để hệ thống tự động nhận diện.</div>
        </div>
      </div>
    </div>
  );
};
