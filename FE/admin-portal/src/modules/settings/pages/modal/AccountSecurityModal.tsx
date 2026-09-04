import React, { useState } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import { settingsService } from "../../services/settingsService";

interface AccountSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const AccountSecurityModal: React.FC<AccountSecurityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới không khớp nhau");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await settingsService.changePassword(currentPassword, newPassword);
      onSuccess("✓ Đổi mật khẩu tài khoản quản trị thành công!");
      onClose();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi đổi mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("accountModalTitle")}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div className="error-alert">{error}</div>}

        <div className="form-group-mf">
          <label className="form-label-mf">Mật khẩu hiện tại *</label>
          <input
            type="password"
            className="form-input-mf"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Mật khẩu mới (tối thiểu 6 ký tự) *</label>
          <input
            type="password"
            className="form-input-mf"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Xác nhận mật khẩu mới *</label>
          <input
            type="password"
            className="form-input-mf"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="btn-white-outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary-orange" disabled={loading}>
            {loading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
