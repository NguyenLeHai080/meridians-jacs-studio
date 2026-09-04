import React, { useState } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import { normalizeHwid, licenseHwidError } from "../../utils/hwidHelper";
import { licenseService, type CreateLicensePayload } from "../../services/licenseService";

interface CreateLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const CreateLicenseModal: React.FC<CreateLicenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [hwid, setHwid] = useState("");
  const [daysValid, setDaysValid] = useState("30");
  const [maxJobs, setMaxJobs] = useState("200");
  const [premiumAi, setPremiumAi] = useState(true);
  const [notes, setNotes] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normHwid = normalizeHwid(hwid);
    const hwidErr = licenseHwidError(normHwid);
    if (hwidErr) {
      setError(hwidErr);
      return;
    }

    setLoading(true);
    try {
      const payload: CreateLicensePayload = {
        customer_name: customerName.trim(),
        customer_contact: customerContact.trim(),
        hwid: normHwid,
        days_valid: parseInt(daysValid) || 30,
        max_jobs_per_day: parseInt(maxJobs) || 200,
        premium_ai: premiumAi,
        notes: notes.trim() || null,
        logo_url: logoUrl.trim() || null,
      };
      await licenseService.create(payload);
      onSuccess(`Đã cấp license thành công cho ${customerName}`);
      onClose();
      // Reset form
      setCustomerName("");
      setCustomerContact("");
      setHwid("");
      setNotes("");
      setLogoUrl("");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi khi cấp license");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("createTitle")}>
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

        <div className="form-group-mf">
          <label className="form-label-mf">Liên hệ (Email / Zalo / Phone) *</label>
          <input
            type="text"
            className="form-input-mf"
            required
            placeholder="VD: 0988888888 hoặc email@domain.com"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
          />
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Mã máy khách (HWID / Device ID) *</label>
          <input
            type="text"
            className="form-input-mf"
            required
            placeholder="VD: JACS-WIN-1234567890ABCDEF1234567890ABCDEF"
            value={hwid}
            onChange={(e) => setHwid(e.target.value)}
          />
        </div>

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">Số ngày sử dụng</label>
            <input
              type="number"
              className="form-input-mf"
              value={daysValid}
              onChange={(e) => setDaysValid(e.target.value)}
            />
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Giới hạn Render/ngày</label>
            <input
              type="number"
              className="form-input-mf"
              value={maxJobs}
              onChange={(e) => setMaxJobs(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group-mf" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            id="create-premium-ai"
            checked={premiumAi}
            onChange={(e) => setPremiumAi(e.target.checked)}
          />
          <label htmlFor="create-premium-ai" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
            Mở khóa Full Quyền AI (OpenAI, Gemini, v.v.)
          </label>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Ghi chú bổ sung</label>
          <textarea
            className="form-input-mf"
            rows={2}
            placeholder="VD: Khách hàng mua gói 1 năm..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="btn-white-outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary-orange" disabled={loading}>
            {loading ? "Đang xử lý..." : t("createLicense")}
          </button>
        </div>
      </form>
    </Modal>
  );
};
