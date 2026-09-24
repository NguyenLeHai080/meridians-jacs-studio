import React, { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import type { CreateClientInput } from "../types";

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateClientInput) => Promise<boolean>;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [tier, setTier] = useState<"standard" | "pro" | "enterprise">("pro");
  const [credits, setCredits] = useState(100);
  const [amount, setAmount] = useState(1500000);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    const success = await onSubmit({
      name: name.trim(),
      contact: contact.trim(),
      tier,
      credits_balance: credits,
      amount,
      plan_type: tier,
      payment_method: paymentMethod,
    });
    setSubmitting(false);

    if (success) {
      setName("");
      setContact("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <UserPlus className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Thêm Khách Hàng & Cấp Quyền</h3>
              <p className="text-[10.5px] text-slate-500">
                Đăng ký hồ sơ khách hàng mới và tự động khởi tạo license đầu tiên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Tên Khách Hàng / Đơn Vị *</label>
            <input
              type="text"
              required
              placeholder="VD: Cty TNHH Truyền Thông Sen Vàng"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1 font-semibold">Thông Tin Liên Hệ (Email / Phone / Telegram)</label>
            <input
              type="text"
              placeholder="VD: contact@senvang.vn | 0988776655"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Gói Bản Quyền (Tier)</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
              >
                <option value="standard">Standard (Cơ bản)</option>
                <option value="pro">Pro (Chuyên nghiệp)</option>
                <option value="enterprise">Enterprise (Doanh nghiệp)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Credits Ban Đầu</label>
              <input
                type="number"
                min="0"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Giá Thanh Toán (VNĐ)</label>
              <input
                type="number"
                min="0"
                step="50000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Phương Thức Thanh Toán</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-medium"
              >
                <option value="bank_transfer">Chuyển Khoản Ngân Hàng</option>
                <option value="momo">Ví MoMo</option>
                <option value="crypto">USDT / Crypto</option>
                <option value="cash">Tiền mặt</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Tạo Khách Hàng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
