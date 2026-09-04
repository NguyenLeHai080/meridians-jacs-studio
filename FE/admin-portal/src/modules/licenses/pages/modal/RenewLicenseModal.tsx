import React, { useState } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import type { License } from "../../../../core/types";
import { licenseService } from "../../services/licenseService";

interface RenewLicenseModalProps {
  license: License | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const RenewLicenseModal: React.FC<RenewLicenseModalProps> = ({
  license,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [renewDays, setRenewDays] = useState("30");
  const [amount, setAmount] = useState("500000");
  const [planName, setPlanName] = useState("Gia hạn 30 ngày");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;
    setError("");
    setLoading(true);

    try {
      const currentExpiry = license.expires_at ? new Date(license.expires_at) : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      baseDate.setDate(baseDate.getDate() + (parseInt(renewDays) || 30));
      baseDate.setHours(23, 59, 59, 999);

      await licenseService.renew(license.id, {
        expires_at: baseDate.toISOString(),
        amount: parseFloat(amount) || 0,
        plan_type: planName.trim(),
        reason: `Gia hạn bản quyền cho ${license.customer_name}`,
        payment_method: "bank_transfer",
      });
      onSuccess(`Đã gia hạn thành công license cho ${license.customer_name}`);
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi khi gia hạn license");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("renewTitle")}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div className="error-alert">{error}</div>}

        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Gia hạn license cho khách hàng: <strong>{license?.customer_name}</strong>
        </p>

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">Số ngày cộng thêm</label>
            <input
              type="number"
              className="form-input-mf"
              value={renewDays}
              onChange={(e) => setRenewDays(e.target.value)}
            />
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Số tiền thu (VNĐ)</label>
            <input
              type="number"
              className="form-input-mf"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Tên gói / Lý do gia hạn</label>
          <input
            type="text"
            className="form-input-mf"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="btn-white-outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary-orange" disabled={loading}>
            {loading ? "Đang gia hạn..." : "Xác nhận gia hạn"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
