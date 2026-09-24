import React, { useState, useMemo } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import { normalizeHwid, licenseHwidError } from "../../utils/hwidHelper";
import { licenseService, type CreateLicensePayload } from "../../services/licenseService";
import { Sparkles, KeyRound, Loader2, Calendar, Clock, Infinity as InfinityIcon } from "lucide-react";

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
  
  // Expiration State: DateTime Picker + Lifetime toggle
  const [isLifetime, setIsLifetime] = useState(false);
  const [expiryDateTime, setExpiryDateTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(23, 59, 0, 0);
    // Format YYYY-MM-DDTHH:mm for datetime-local
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  });

  const [maxJobs, setMaxJobs] = useState("200");
  const [premiumAi, setPremiumAi] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Compute calculated expiration date and days count
  const expiryPreview = useMemo(() => {
    if (isLifetime) {
      return {
        isLifetime: true,
        expiresDate: null,
        days: 0,
        text: "♾️ Bản quyền Vĩnh Viễn: API Key không bao giờ hết hạn.",
      };
    }

    if (!expiryDateTime) {
      return { isLifetime: false, expiresDate: null, days: 0, text: "Vui lòng chọn thời gian hết hạn" };
    }

    const target = new Date(expiryDateTime);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (days < 0) {
      return {
        isLifetime: false,
        expiresDate: target,
        days,
        text: `⚠️ Thời gian đã chọn ở quá khứ: ${target.toLocaleString("vi-VN")}`,
      };
    }

    return {
      isLifetime: false,
      expiresDate: target,
      days,
      text: `📅 Hết hạn vào: ${target.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })} (còn khoảng ${days} ngày)`,
    };
  }, [isLifetime, expiryDateTime]);

  const generateRandomHwid = () => {
    const chars = "0123456789ABCDEF";
    let hex = "";
    for (let i = 0; i < 32; i++) {
      hex += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `JACS-WIN-${hex}`;
  };

  const handleAutoGenerateHwid = () => {
    setHwid(generateRandomHwid());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // If HWID is blank, auto-generate one
    const targetHwid = hwid.trim() ? hwid.trim() : generateRandomHwid();
    const normHwid = normalizeHwid(targetHwid);
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
        days_valid: isLifetime ? 36500 : (expiryPreview.days > 0 ? expiryPreview.days : 30),
        expires_at: !isLifetime && expiryPreview.expiresDate ? expiryPreview.expiresDate.toISOString() : null,
        max_jobs_per_day: parseInt(maxJobs) || 200,
        premium_ai: premiumAi,
        notes: notes.trim() || null,
        logo_url: null,
      };

      const created = await licenseService.create(payload);
      
      // Auto-copy generated key if available
      if ((created as any).key) {
        navigator.clipboard.writeText((created as any).key).catch(() => {});
      }

      onSuccess(`Đã cấp API Key thành công cho ${customerName}! Mã key: ${(created as any).key || created.key_hint}`);
      onClose();
      // Reset form
      setCustomerName("");
      setCustomerContact("");
      setHwid("");
      setNotes("");
      setIsLifetime(false);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi khi cấp license");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("createTitle", "Cấp / Thêm API Key Mới")}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Customer Name */}
        <div>
          <label className="block text-slate-700 mb-1 font-semibold">Tên khách hàng / Đơn vị *</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
            required
            placeholder="VD: Nguyễn Văn A hoặc Studio Media Plus"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        {/* Customer Contact */}
        <div>
          <label className="block text-slate-700 mb-1 font-semibold">Liên hệ (Email / Zalo / Phone) *</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
            required
            placeholder="VD: 0988888888 hoặc contact@domain.com"
            value={customerContact}
            onChange={(e) => setCustomerContact(e.target.value)}
          />
        </div>

        {/* HWID Device */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-700 font-semibold">Mã máy khách (HWID / Device ID)</label>
            <button
              type="button"
              onClick={handleAutoGenerateHwid}
              className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
            >
              <Sparkles className="w-3 h-3" />
              <span>Tự sinh mã máy</span>
            </button>
          </div>
          <input
            type="text"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 font-mono text-[11px] focus:outline-none focus:bg-white focus:border-blue-500"
            placeholder="Để trống để hệ thống tự tạo slot máy sẵn"
            value={hwid}
            onChange={(e) => setHwid(e.target.value)}
          />
        </div>

        {/* Expiration Settings (THỜI HẠN KEY: DateTime Picker + Vĩnh Viễn) */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-slate-800 font-bold flex items-center gap-1.5 text-xs">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Thời Hạn Sử Dụng (Hạn Key)</span>
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

          {/* DateTime Picker (Only when not lifetime) */}
          {!isLifetime ? (
            <div>
              <label className="block text-slate-600 text-[11px] font-medium mb-1">
                Chọn ngày và giờ hết hạn:
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  required={!isLifetime}
                  value={expiryDateTime}
                  onChange={(e) => setExpiryDateTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-700 text-xs flex items-center gap-2 font-medium">
              <InfinityIcon className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Bản quyền Vĩnh Viễn được kích hoạt: API Key này sẽ không bao giờ bị hết hạn.</span>
            </div>
          )}

          {/* Real-time Expiration Preview */}
          {!isLifetime && (
            <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80 font-medium">
              {expiryPreview.text}
            </div>
          )}
        </div>

        {/* Quota & Notes */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-700 mb-1 font-semibold">Giới hạn Render / Ngày</label>
            <input
              type="number"
              min="10"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
              value={maxJobs}
              onChange={(e) => setMaxJobs(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-slate-700 mb-1 font-semibold">Ghi chú nội bộ</label>
            <input
              type="text"
              placeholder="VD: Khách hàng dự án studio"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* AI Gateway Permission */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="create-premium-ai"
            checked={premiumAi}
            onChange={(e) => setPremiumAi(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
          />
          <label htmlFor="create-premium-ai" className="text-slate-700 font-medium cursor-pointer">
            Mở khóa đầy đủ quyền AI (OpenAI, Claude, Gemini qua Gateway)
          </label>
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
            <KeyRound className="w-3.5 h-3.5" />
            <span>Tạo & Cấp API Key</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
