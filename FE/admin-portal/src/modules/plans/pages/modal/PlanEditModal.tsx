import React, { useState, useEffect } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import type { PlanItem } from "../../utils/planHelper";

interface PlanEditModalProps {
  plan: PlanItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: PlanItem) => Promise<void>;
}

export const PlanEditModal: React.FC<PlanEditModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSave,
}) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState<PlanItem>({
    id: "",
    name: "",
    days: 30,
    price: 500000,
    max_jobs_per_day: 100,
    discount_percent: 0,
    description: "",
    active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (plan) {
      setFormData({ ...plan });
    } else {
      setFormData({
        id: `plan_${Date.now().toString().slice(-4)}`,
        name: "",
        days: 30,
        price: 500000,
        max_jobs_per_day: 100,
        discount_percent: 0,
        description: "",
        active: true,
      });
    }
  }, [plan, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Vui lòng nhập tên gói cước");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi lưu gói cước");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("editModalTitle")}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div className="error-alert">{error}</div>}

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">Mã gói (ID) *</label>
            <input
              type="text"
              className="form-input-mf"
              required
              readOnly={Boolean(plan)}
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.trim() })}
            />
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Tên gói hiển thị *</label>
            <input
              type="text"
              className="form-input-mf"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
        </div>

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">Thời hạn (ngày)</label>
            <input
              type="number"
              className="form-input-mf"
              value={formData.days}
              onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 30 })}
            />
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Giá niêm yết (VNĐ)</label>
            <input
              type="number"
              className="form-input-mf"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">Giới hạn Render/ngày</label>
            <input
              type="number"
              className="form-input-mf"
              value={formData.max_jobs_per_day}
              onChange={(e) => setFormData({ ...formData, max_jobs_per_day: parseInt(e.target.value) || 100 })}
            />
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Chiết khấu (%)</label>
            <input
              type="number"
              className="form-input-mf"
              value={formData.discount_percent || 0}
              onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Mô tả gói</label>
          <textarea
            className="form-input-mf"
            rows={2}
            value={formData.description || ""}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="form-group-mf" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            id="plan-active-chk"
            checked={formData.active !== false}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          />
          <label htmlFor="plan-active-chk" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
            Đang mở bán trên Tool Desktop
          </label>
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
