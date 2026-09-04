import React, { useState, useEffect } from "react";
import { Check, DollarSign, RotateCw, Sparkles } from "lucide-react";
import type { BankConfig } from "../../../core/types";
import { billingService } from "../services/billingService";

interface PricingPlansCardProps {
  bankConfig: BankConfig;
  onUpdate: (updated: BankConfig) => void;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

const DEFAULT_PLANS = {
  "1_month": 500000,
  "3_months": 1350000,
  "6_months": 2500000,
  "1_year": 4500000,
  "lifetime": 10000000,
};

export const PricingPlansCard: React.FC<PricingPlansCardProps> = ({
  bankConfig,
  onUpdate,
  onNotify,
}) => {
  const [plans, setPlans] = useState<Record<string, number>>(bankConfig.plans_pricing || DEFAULT_PLANS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bankConfig.plans_pricing) {
      setPlans({
        ...DEFAULT_PLANS,
        ...bankConfig.plans_pricing,
      });
    }
  }, [bankConfig]);

  const handleChange = (key: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setPlans((prev) => ({ ...prev, [key]: num }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: BankConfig = {
        ...bankConfig,
        plans_pricing: plans,
      };
      const res = await billingService.saveBankConfig(payload);
      onUpdate(res);
      if (onNotify) onNotify("Đã lưu bảng giá các gói License thành công!", "success");
    } catch (err: any) {
      if (onNotify) onNotify(err instanceof Error ? err.message : "Lỗi lưu bảng giá", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <DollarSign size={18} style={{ color: "var(--primary)" }} />
            <h3>Bảng Giá Gói Bản Quyền License</h3>
          </div>
          <p>Thiết lập số tiền thanh toán khi khách quét mã VietQR gia hạn hoặc cấp mới</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.85rem" }}>
          {/* Gói 1 Tháng */}
          <div className="form-group-mf" style={{ background: "var(--bg-card-alt, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
            <label className="form-label-mf" style={{ fontWeight: 700, color: "var(--text-main)" }}>
              📅 Gói 1 Tháng
            </label>
            <input
              type="number"
              className="form-input-mf"
              value={plans["1_month"] ?? 500000}
              onChange={(e) => handleChange("1_month", e.target.value)}
              min={0}
              step={10000}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "4px", fontWeight: 600 }}>
              {(plans["1_month"] ?? 500000).toLocaleString()} VNĐ
            </span>
          </div>

          {/* Gói 3 Tháng */}
          <div className="form-group-mf" style={{ background: "var(--bg-card-alt, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
            <label className="form-label-mf" style={{ fontWeight: 700, color: "var(--text-main)" }}>
              📅 Gói 3 Tháng
            </label>
            <input
              type="number"
              className="form-input-mf"
              value={plans["3_months"] ?? 1350000}
              onChange={(e) => handleChange("3_months", e.target.value)}
              min={0}
              step={10000}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "4px", fontWeight: 600 }}>
              {(plans["3_months"] ?? 1350000).toLocaleString()} VNĐ
            </span>
          </div>

          {/* Gói 6 Tháng */}
          <div className="form-group-mf" style={{ background: "var(--bg-card-alt, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
            <label className="form-label-mf" style={{ fontWeight: 700, color: "var(--text-main)" }}>
              📅 Gói 6 Tháng
            </label>
            <input
              type="number"
              className="form-input-mf"
              value={plans["6_months"] ?? 2500000}
              onChange={(e) => handleChange("6_months", e.target.value)}
              min={0}
              step={10000}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "4px", fontWeight: 600 }}>
              {(plans["6_months"] ?? 2500000).toLocaleString()} VNĐ
            </span>
          </div>

          {/* Gói 1 Năm */}
          <div className="form-group-mf" style={{ background: "var(--bg-card-alt, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
            <label className="form-label-mf" style={{ fontWeight: 700, color: "var(--text-main)" }}>
              ⭐ Gói 1 Năm (VIP)
            </label>
            <input
              type="number"
              className="form-input-mf"
              value={plans["1_year"] ?? 4500000}
              onChange={(e) => handleChange("1_year", e.target.value)}
              min={0}
              step={10000}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "4px", fontWeight: 600 }}>
              {(plans["1_year"] ?? 4500000).toLocaleString()} VNĐ
            </span>
          </div>

          {/* Gói Trọn Đời */}
          <div className="form-group-mf" style={{ background: "var(--bg-card-alt, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
            <label className="form-label-mf" style={{ fontWeight: 700, color: "var(--text-main)" }}>
              <Sparkles size={13} style={{ display: "inline", marginRight: "3px", color: "#eab308" }} />
              Gói Trọn Đời (Lifetime)
            </label>
            <input
              type="number"
              className="form-input-mf"
              value={plans["lifetime"] ?? 10000000}
              onChange={(e) => handleChange("lifetime", e.target.value)}
              min={0}
              step={10000}
              required
            />
            <span style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "4px", fontWeight: 600 }}>
              {(plans["lifetime"] ?? 10000000).toLocaleString()} VNĐ
            </span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button
            type="submit"
            className="btn-primary-orange"
            disabled={isSaving}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            {isSaving ? <RotateCw size={15} className="animate-spin" /> : <Check size={15} />}
            Lưu Bảng Giá Gói
          </button>
        </div>
      </form>
    </div>
  );
};
