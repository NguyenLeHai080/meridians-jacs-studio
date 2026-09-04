import React, { useState, useEffect } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import type { License } from "../../../../core/types";
import { licenseService, type UpdateLicensePayload } from "../../services/licenseService";

interface EditLicenseModalProps {
  license: License | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const EditLicenseModal: React.FC<EditLicenseModalProps> = ({
  license,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [maxJobs, setMaxJobs] = useState("200");
  const [premiumAi, setPremiumAi] = useState(true);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (license) {
      setCustomerName(license.customer_name);
      setCustomerContact(license.customer_contact || "");
      setMaxJobs(String(license.max_jobs_per_day || 200));
      setPremiumAi(license.premium_ai ?? true);
      setExpiresAt(license.expires_at || null);
      setNotes(license.notes || "");
    }
  }, [license]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;
    setError("");
    setLoading(true);

    try {
      const payload: UpdateLicensePayload = {
        customer_name: customerName.trim(),
        customer_contact: customerContact.trim(),
        max_jobs_per_day: parseInt(maxJobs) || 200,
        premium_ai: premiumAi,
        notes: notes.trim() || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      await licenseService.update(license.id, payload);
      onSuccess(`Đã cập nhật thông tin license cho ${customerName}`);
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi khi cập nhật license");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("editTitle")}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div className="error-alert">{error}</div>}

        <div className="form-group-mf">
          <label className="form-label-mf">Tên khách hàng / Doanh nghiệp *</label>
          <input
            type="text"
            className="form-input-mf"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Liên hệ (Email / SĐT / Zalo)</label>
          <input
            type="text"
            className="form-input-mf"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
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

        <div className="form-group-mf" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            id="edit-premium-ai"
            checked={premiumAi}
            onChange={(e) => setPremiumAi(e.target.checked)}
          />
          <label htmlFor="edit-premium-ai" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
            Mở khóa Full Quyền AI
          </label>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Ghi chú</label>
          <textarea
            className="form-input-mf"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="btn-white-outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary-orange" disabled={loading}>
            {loading ? "Đang lưu..." : t("saveChanges")}
          </button>
        </div>
      </form>
    </Modal>
  );
};
