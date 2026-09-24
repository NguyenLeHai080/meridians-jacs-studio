import React from "react";
import { X, Clock, AlertTriangle } from "lucide-react";
import type { JobItem } from "../types";

interface JobDetailModalProps {
  job: JobItem | null;
  onClose: () => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, onClose }) => {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{job.name}</h3>
              <p className="text-[10.5px] font-mono text-slate-400">ID: {job.id}</p>
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
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block font-medium">Khách hàng</span>
            <span className="font-semibold text-slate-800">{job.customer_name || "Vãng lai / Admin"}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block font-medium">License Key</span>
            <span className="font-mono text-slate-700">{job.license_key || "SYS-ROOT"}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block font-medium">Chế độ & Loại</span>
            <span className="font-mono text-blue-600 uppercase font-semibold">{job.execution_mode} • {job.kind}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block font-medium">Trạng thái & Tiến độ</span>
            <span className="font-semibold text-amber-600">{job.status} ({job.progress}%)</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block font-medium">Credits & Tokens</span>
            <span className="font-mono text-emerald-600 font-semibold">{job.credits_used} credits • {job.tokens_used} tokens</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block font-medium">Thời gian xử lý</span>
            <span className="font-mono text-slate-700">{job.duration_seconds} giây</span>
          </div>
        </div>

        {job.error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div>
              <div className="font-semibold text-rose-800">Lỗi phát sinh</div>
              <div>{job.error}</div>
            </div>
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <span className="text-[10px] font-mono text-slate-400 block mb-1">Payload JSON Debug:</span>
          <pre className="text-[10.5px] font-mono text-slate-700 overflow-x-auto max-h-32">
            {JSON.stringify(job, null, 2)}
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
