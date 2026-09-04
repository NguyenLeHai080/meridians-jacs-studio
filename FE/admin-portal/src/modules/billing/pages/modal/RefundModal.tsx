import React, { useState } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import { billingService } from "../../services/billingService";

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("500000");
  const [reason, setReason] = useState("Khách yêu cầu hoàn tiền dịch vụ");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await billingService.createTransaction({
        customer_name: customerName.trim(),
        amount: -Math.abs(parseFloat(amount) || 0),
        plan_type: "refund",
        payment_method: "bank_transfer",
        transaction_type: "refund",
        notes: reason.trim() || "Hoàn tiền cho khách hàng",
      });
      onSuccess(`Đã ghi nhận hoàn tiền thành công cho ${customerName}`);
      onClose();
      setCustomerName("");
      setReason("Khách yêu cầu hoàn tiền dịch vụ");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi ghi nhận hoàn tiền");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ghi Nhận Hoàn Tiền (Refund)">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div className="error-alert">{error}</div>}

        <div className="form-group-mf">
          <label className="form-label-mf">Tên khách hàng / Người nhận hoàn *</label>
          <input
            type="text"
            className="form-input-mf"
            required
            placeholder="VD: Nguyen Van A"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Số tiền hoàn (VNĐ) *</label>
          <input
            type="number"
            className="form-input-mf"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Lý do hoàn tiền</label>
          <input
            type="text"
            className="form-input-mf"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="btn-white-outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </button>
          <button
            type="submit"
            className="btn-white-outline"
            style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "↩️ Xác nhận hoàn tiền"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
