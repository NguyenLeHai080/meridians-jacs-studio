import React, { useState, useMemo, useEffect } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import type { License } from "../../../../core/types";
import { licenseService } from "../../services/licenseService";
import { Clock, Infinity as InfinityIcon, Loader2, RefreshCw } from "lucide-react";

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
  const [isLifetime, setIsLifetime] = useState(false);
  const [expiryDateTime, setExpiryDateTime] = useState("");
  const [amount, setAmount] = useState("500000");
  const [planName, setPlanName] = useState("Gia hạn thời hạn bản quyền");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize expiry date when modal opens with license
  useEffect(() => {
    if (license) {
      setError("");
      if (!license.expires_at) {
        setIsLifetime(true);
        setExpiryDateTime("");
      } else {
        setIsLifetime(false);
        const currentExp = new Date(license.expires_at);
        const base = currentExp > new Date() ? currentExp : new Date();
        // Default extend by 30 days
        base.setDate(base.getDate() + 30);
        base.setHours(23, 59, 0, 0);
        const offset = base.getTimezoneOffset() * 60000;
        setExpiryDateTime(new Date(base.getTime() - offset).toISOString().slice(0, 16));
      }
    }
  }, [license, isOpen]);

  // Realtime expiry preview
  const expiryPreview = useMemo(() => {
    if (isLifetime) {
      return {
        text: "♾️ Chuyển thành Bản quyền Vĩnh Viễn: API Key sẽ không bao giờ hết hạn.",
        isLifetime: true,
      };
    }
    if (!expiryDateTime) {
      return { text: "Vui lòng chọn ngày và giờ hết hạn mới.", isLifetime: false };
    }
    const target = new Date(expiryDateTime);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return {
        text: `⚠️ Thời gian đã chọn ở quá khứ: ${target.toLocaleString("vi-VN")}`,
        isLifetime: false,
      };
    }

    return {
      text: `📅 Hạn mới đến: ${target.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })} (còn khoảng ${days} ngày)`,
      isLifetime: false,
    };
  }, [isLifetime, expiryDateTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;
    setError("");

    if (!isLifetime) {
      if (!expiryDateTime) {
        setError("Vui lòng chọn ngày và giờ hết hạn mới");
        return;
      }
      const target = new Date(expiryDateTime);
      if (target <= new Date()) {
        setError("Thời gian hết hạn mới phải ở tương lai");
        return;
      }
    }

    setLoading(true);

    try {
      const finalExpiresAt = isLifetime ? null : new Date(expiryDateTime).toISOString();

      await licenseService.renew(license.id, {
        expires_at: finalExpiresAt,
        amount: parseFloat(amount) || 0,
        plan_type: planName.trim() || "Gia hạn license",
        reason: isLifetime 
          ? `Nâng cấp vĩnh viễn cho ${license.customer_name}` 
          : `Gia hạn đến ${new Date(expiryDateTime).toLocaleDateString("vi-VN")} cho ${license.customer_name}`,
        payment_method: "bank_transfer",
      });
      onSuccess(`Đã gia hạn thành công thời hạn key cho ${license.customer_name}`);
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi khi gia hạn license");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("renewTitle", "Gia Hạn & Cập Nhật Hạn Key")}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* License Info Banner */}
        {license && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-700">
            <div>
              <div className="font-semibold text-slate-800 text-xs">{license.customer_name}</div>
              <div className="text-[11px] text-slate-500 font-mono">{license.key_hint}</div>
            </div>
            <div className="text-right text-[11px]">
              <span className="text-slate-500">Hạn hiện tại: </span>
              <span className="font-medium text-slate-800">
                {license.expires_at ? new Date(license.expires_at).toLocaleDateString("vi-VN") : "♾️ Vĩnh viễn"}
              </span>
            </div>
          </div>
        )}

        {/* EXPIRATION DATE & TIME (DATETIME PICKER + VĨNH VIỄN) */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-slate-800 font-bold flex items-center gap-1.5 text-xs">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Thời Hạn & Ngày Hết Hạn Mới</span>
            </label>

            {/* Lifetime Checkbox Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLifetime}
                onChange={(e) => setIsLifetime(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-slate-700 font-semibold text-xs flex items-center gap-1">
                <InfinityIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Vĩnh viễn</span>
              </span>
            </label>
          </div>

          {/* DateTime Picker */}
          {!isLifetime ? (
            <div>
              <label className="block text-slate-600 text-[11px] font-medium mb-1">
                Chọn ngày và giờ hết hạn mới:
              </label>
              <input
                type="datetime-local"
                required={!isLifetime}
                value={expiryDateTime}
                onChange={(e) => setExpiryDateTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          ) : (
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-700 text-xs flex items-center gap-2 font-medium">
              <InfinityIcon className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Bản quyền Vĩnh Viễn: API Key này sẽ không còn giới hạn ngày hết hạn.</span>
            </div>
          )}

          {/* Real-time Expiration Preview */}
          {!isLifetime && (
            <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80 font-medium">
              {expiryPreview.text}
            </div>
          )}
        </div>

        {/* Pricing / Billing Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 mb-1 font-semibold">Số tiền thu (VNĐ)</label>
            <input
              type="number"
              min="0"
              step="10000"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-1 font-semibold">Tên gói / Ghi chú gia hạn</label>
            <input
              type="text"
              placeholder="VD: Gia hạn gói tiêu chuẩn"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Xác Nhận Gia Hạn</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
