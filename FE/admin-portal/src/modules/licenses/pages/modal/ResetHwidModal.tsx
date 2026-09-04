import React, { useState } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import type { License } from "../../../../core/types";
import { normalizeHwid, licenseHwidError } from "../../utils/hwidHelper";
import { licenseService } from "../../services/licenseService";

interface ResetHwidModalProps {
  license: License | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ResetHwidModal: React.FC<ResetHwidModalProps> = ({
  license,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [newHwid, setNewHwid] = useState("");
  const [reason, setReason] = useState("Khách hàng thay đổi máy tính mới");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;
    setError("");

    const normHwid = normalizeHwid(newHwid);
    const hwidErr = licenseHwidError(normHwid);
    if (hwidErr) {
      setError(hwidErr);
      return;
    }

    setLoading(true);
    try {
      await licenseService.resetHwid(license.id, {
        hwid: normHwid,
        reason: reason.trim(),
      });
      onSuccess(`Đã đổi mã máy thành công cho ${license.customer_name}`);
      onClose();
      setNewHwid("");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi khi đổi mã máy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("resetHwidTitle")}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div className="error-alert">{error}</div>}

        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Đổi mã máy cho khách hàng: <strong>{license?.customer_name}</strong>
        </p>

        <div className="form-group-mf">
          <label className="form-label-mf">Mã máy mới (HWID) *</label>
          <input
            type="text"
            className="form-input-mf"
            required
            placeholder="VD: JACS-WIN-1234567890ABCDEF1234567890ABCDEF"
            value={newHwid}
            onChange={(e) => setNewHwid(e.target.value)}
          />
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Lý do thay đổi</label>
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
          <button type="submit" className="btn-primary-orange" disabled={loading}>
            {loading ? "Đang đổi..." : "Xác nhận đổi mã máy"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
