import React from "react";
import { ShieldCheck, Save } from "lucide-react";
import type { FailoverConfigData } from "../services/providerService";

interface ProviderFailoverCardProps {
  failoverConfig: FailoverConfigData;
  setFailoverConfig: React.Dispatch<React.SetStateAction<FailoverConfigData>>;
  isSavingFailover: boolean;
  onSaveFailover: () => void;
}

export const ProviderFailoverCard: React.FC<ProviderFailoverCardProps> = ({
  failoverConfig,
  setFailoverConfig,
  isSavingFailover,
  onSaveFailover,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight m-0">
              Cơ Chế Chuyển Mạch Tự Động & Dự Phòng (Failover Engine)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Bảo vệ độ sẵn sàng 99.9% cho các yêu cầu sinh ảnh qua API & Studio
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Đang bật tự động dự phòng</span>
        </span>
      </div>

      {/* Body 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 text-[11px]">
        {/* Column 1 */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-800 block">
            Tự động chuyển mạch dự phòng
          </span>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Tự động chuyển sang NCC phụ (Standby) khi NCC chính trả lỗi 5xx hoặc timeout.
          </p>
          <label className="flex items-center gap-2 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={failoverConfig.enabled}
              onChange={(e) =>
                setFailoverConfig((prev) => ({ ...prev, enabled: e.target.checked }))
              }
              className="w-3.5 h-3.5 rounded text-orange-500 focus:ring-orange-500 border-slate-300"
            />
            <span className="text-[11px] font-bold text-slate-800">Kích hoạt Failover</span>
          </label>
        </div>

        {/* Column 2 */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-800 block">
            Giới hạn Timeout phản hồi
          </span>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Thời gian tối đa chờ phản hồi ảnh từ NCC trước khi kích hoạt chuyển mạch.
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <input
              type="number"
              min={5}
              max={300}
              value={failoverConfig.timeout_seconds}
              onChange={(e) =>
                setFailoverConfig((prev) => ({
                  ...prev,
                  timeout_seconds: Number(e.target.value) || 45,
                }))
              }
              className="w-16 px-2 py-1 text-center text-[11px] font-bold rounded-lg border border-slate-200 focus:outline-none focus:border-orange-500 bg-slate-50"
            />
            <span className="text-[11px] font-medium text-slate-600">giây</span>
          </div>
        </div>

        {/* Column 3: Policy Notes */}
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 text-[11px] space-y-1.5 text-slate-700">
          <div className="font-bold text-amber-900 flex items-center gap-1.5">
            <span>🛡️</span>
            <span>Chính sách quyết toán NCC</span>
          </div>
          <ul className="space-y-1 text-slate-600 pl-0.5 text-[11px]">
            <li className="flex items-start gap-1.5">
              <span className="text-orange-500 font-bold">•</span>
              <span>Chỉ tính tiền khi ảnh thành công (Fail = 0đ)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-orange-500 font-bold">•</span>
              <span>Ảnh tham chiếu (Reference) miễn phí 100%</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-orange-500 font-bold">•</span>
              <span>Tự động rollback 100% ví khách khi lỗi mạng.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer Save Button */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          onClick={onSaveFailover}
          disabled={isSavingFailover}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save size={13} />
          <span>{isSavingFailover ? "Đang lưu..." : "Lưu Cấu Hình Dự Phòng"}</span>
        </button>
      </div>
    </div>
  );
};
