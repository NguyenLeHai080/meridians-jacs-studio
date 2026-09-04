import React, { useState } from "react";
import { Upload, X, RotateCw, Check } from "lucide-react";
import type { BankConfig } from "../../../core/types";
import { VIETNAMESE_BANKS } from "../utils/bankConstants";
import { useI18n } from "../../../core/i18n";
import { billingService } from "../services/billingService";

interface BankConfigFormProps {
  bankConfig: BankConfig;
  setBankConfig: (cfg: BankConfig) => void;
  onSuccess: (msg: string) => void;
  onError: (err: string) => void;
}

export const BankConfigForm: React.FC<BankConfigFormProps> = ({
  bankConfig,
  setBankConfig,
  onSuccess,
  onError,
}) => {
  const { t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await billingService.saveBankConfig(bankConfig);
      setBankConfig(updated);
      onSuccess("Đã lưu cấu hình tài khoản ngân hàng & VietQR thành công!");
    } catch (err: any) {
      onError(err instanceof Error ? err.message : "Lỗi khi lưu cấu hình ngân hàng");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <h3>{t("bankBeneficiaryTitle")}</h3>
          <p>{t("bankBeneficiarySubtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="form-group-mf">
          <label className="form-label-mf">{t("labelBankSelect")}</label>
          <select
            className="form-input-mf"
            value={bankConfig.bank_bin}
            onChange={(e) => {
              const selected = VIETNAMESE_BANKS.find((b) => b.bin === e.target.value);
              setBankConfig({
                ...bankConfig,
                bank_bin: e.target.value,
                bank_name: selected?.name || bankConfig.bank_name,
              });
            }}
          >
            {VIETNAMESE_BANKS.map((b) => (
              <option key={b.bin} value={b.bin}>
                {b.name} ({b.short} - BIN {b.bin})
              </option>
            ))}
          </select>
        </div>

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">{t("labelAccountNumber")}</label>
            <input
              type="text"
              className="form-input-mf"
              placeholder="VD: 0988888888"
              value={bankConfig.account_number}
              onChange={(e) => setBankConfig({ ...bankConfig, account_number: e.target.value.trim() })}
              required
            />
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">{t("labelAccountName")}</label>
            <input
              type="text"
              className="form-input-mf"
              placeholder="VD: NGUYEN VAN A"
              value={bankConfig.account_name}
              onChange={(e) => setBankConfig({ ...bankConfig, account_name: e.target.value.toUpperCase() })}
              required
            />
          </div>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">{t("labelQrTemplate")}</label>
          <select
            className="form-input-mf"
            value={bankConfig.qr_template}
            onChange={(e) => setBankConfig({ ...bankConfig, qr_template: e.target.value })}
          >
            <option value="compact2">Compact 2 (Chuẩn nhỏ gọn - Đẹp nhất)</option>
            <option value="compact">Compact (Đơn giản)</option>
            <option value="qr_only">QR Only (Chỉ có mã QR không khung)</option>
          </select>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">{t("labelCustomQr")}</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="url"
              className="form-input-mf"
              placeholder="https://... hoặc nạp file ảnh từ máy"
              value={bankConfig.custom_qr_url || ""}
              onChange={(e) => setBankConfig({ ...bankConfig, custom_qr_url: e.target.value.trim() || undefined })}
              style={{ flex: 1 }}
            />
            <label
              className="btn-white-outline"
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.5rem 0.85rem",
                fontSize: "0.8rem",
                whiteSpace: "nowrap",
              }}
            >
              <Upload size={14} /> Chọn Ảnh QR
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      if (evt.target?.result) {
                        setBankConfig({ ...bankConfig, custom_qr_url: String(evt.target.result) });
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
            {bankConfig.custom_qr_url && (
              <button
                type="button"
                className="btn-white-outline"
                style={{ color: "var(--danger)", padding: "0.5rem" }}
                onClick={() => setBankConfig({ ...bankConfig, custom_qr_url: undefined })}
                title="Xóa ảnh tùy chỉnh, dùng VietQR tự động"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div
          className="form-group-mf"
          style={{ background: "#f0fdf4", padding: "0.85rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}
        >
          <label className="form-label-mf" style={{ color: "#166534", fontWeight: 700 }}>
            🔐 {t("labelSepayAuth")}
          </label>
          <input
            type="text"
            className="form-input-mf"
            placeholder="Nhập API Key SePay của bạn (VD: SEPAY_API_KEY_...)"
            value={bankConfig.sepay_api_key || ""}
            onChange={(e) => setBankConfig({ ...bankConfig, sepay_api_key: e.target.value.trim() || undefined })}
            style={{ background: "#ffffff" }}
          />
        </div>

        <button
          type="submit"
          className="btn-primary-orange"
          disabled={isSaving}
          style={{ marginTop: "1rem", justifyContent: "center" }}
        >
          {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
          {t("btnSaveBankConfig")}
        </button>
      </form>
    </div>
  );
};
