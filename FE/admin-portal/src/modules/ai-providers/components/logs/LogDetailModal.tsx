import React from "react";
import { X, Activity, AlertTriangle } from "lucide-react";
import type { RequestLogRow } from "../../pages/AiRequestLogsPage";

interface LogDetailModalProps {
  log: RequestLogRow | null;
  onClose: () => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Activity className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Chi Tiết Request AI & Độ Trễ</h3>
              <p className="text-[10.5px] font-mono text-blue-600 font-semibold">{log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] block font-medium">Model AI</span>
            <span className="font-mono font-bold text-slate-800">{log.model}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] block font-medium">Độ trễ phản hồi (Latency)</span>
            <span className="font-mono font-bold text-blue-600">{log.latency_ms} ms</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] block font-medium">Khách hàng / Key</span>
            <span className="font-semibold text-slate-800">{log.customer_name || log.client_name}</span>
            <span className="text-[10px] font-mono text-slate-400 block">{log.key}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] block font-medium">Trạng thái HTTP</span>
            <span className={`font-mono font-bold ${log.status === "Fail" ? "text-rose-600" : "text-emerald-600"}`}>
              {log.status_code} ({log.status})
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] block font-medium">Tokens Sử Dụng</span>
            <span className="font-mono text-slate-700">
              In: {log.tokens_in} | Out: {log.tokens_out} | Total: {log.total_tokens}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] block font-medium">Chi Phí / Credits</span>
            <span className="font-mono text-amber-700 font-bold">
              {Math.round(log.cost_vnd).toLocaleString("vi-VN")} ₫ ({log.credit_used} cr)
            </span>
          </div>
        </div>

        {log.error_message && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div>
              <div className="font-semibold text-rose-800">Chi tiết lỗi</div>
              <div>{log.error_message}</div>
            </div>
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <span className="text-[10px] font-mono text-slate-400 block mb-1">Payload JSON Debug:</span>
          <pre className="text-[10.5px] font-mono text-slate-700 overflow-x-auto max-h-32">
            {JSON.stringify(log, null, 2)}
          </pre>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
