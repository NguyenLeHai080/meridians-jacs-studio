import React, { useState } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import { billingService } from "../../services/billingService";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [customerName, setCustomerName] = useState("");
  const [planType, setPlanType] = useState("1_month");
  const [amount, setAmount] = useState("500000");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [txType, setTxType] = useState("deposit");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await billingService.createTransaction({
        customer_name: customerName.trim(),
        plan_type: planType,
        amount: Math.abs(parseFloat(amount) || 0),
        payment_method: paymentMethod,
        transaction_type: txType,
        notes: notes.trim() || undefined,
      });
      onSuccess(`Đã thêm giao dịch nạp tiền cho ${customerName}`);
      onClose();
      setCustomerName("");
      setNotes("");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi thêm giao dịch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ghi Nhận Nạp Tiền & Doanh Thu">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div className="error-alert">{error}</div>}

        <div className="form-group-mf">
          <label className="form-label-mf">Tên khách hàng / Doanh nghiệp *</label>
          <input
            type="text"
            className="form-input-mf"
            required
            placeholder="VD: Nguyen Van A"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">Gói mua</label>
            <select
              className="form-input-mf"
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
            >
              <option value="1_month">1 Tháng (500k)</option>
              <option value="3_months">3 Tháng (1.35M)</option>
              <option value="6_months">6 Tháng (2.5M)</option>
              <option value="1_year">1 Năm (4.5M)</option>
              <option value="lifetime">Vĩnh viễn</option>
              <option value="custom">Tùy biến</option>
            </select>
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Số tiền nạp (VNĐ) *</label>
            <input
              type="number"
              className="form-input-mf"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">Phương thức thanh toán</label>
            <select
              className="form-input-mf"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="bank_transfer">Chuyển khoản VietQR</option>
              <option value="momo">Ví MoMo</option>
              <option value="cash">Tiền mặt</option>
              <option value="crypto">USDT / Crypto</option>
            </select>
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Loại giao dịch</label>
            <select
              className="form-input-mf"
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
            >
              <option value="deposit">Nạp tiền Credit</option>
              <option value="new_key">Cấp Key Mới</option>
              <option value="renewal">Gia hạn License</option>
            </select>
          </div>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Ghi chú</label>
          <textarea
            className="form-input-mf"
            rows={2}
            placeholder="VD: Khách chuyển khoản SePay STK VietinBank..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="btn-white-outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary-orange" disabled={loading}>
            {loading ? "Đang ghi nhận..." : "+ Lưu giao dịch"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
