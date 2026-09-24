import React from "react";
import { Eye, XCircle, Trash2, Clock, CheckCircle2, AlertTriangle, Play, Cpu, Cloud, Layers } from "lucide-react";
import type { JobItem } from "../types";

interface JobTableProps {
  jobs: JobItem[];
  loading: boolean;
  onView: (job: JobItem) => void;
  onCancel: (job: JobItem) => void;
  onDelete: (job: JobItem) => void;
}

export const JobTable: React.FC<JobTableProps> = ({
  jobs,
  loading,
  onView,
  onCancel,
  onDelete,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            Đang chạy
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Hoàn thành
          </span>
        );
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Hàng đợi
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Thất bại
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-500" />
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "hybrid":
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] text-purple-600 font-mono font-medium">
            <Layers className="w-3 h-3 text-purple-500" /> Hybrid
          </span>
        );
      case "cloud":
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] text-blue-600 font-mono font-medium">
            <Cloud className="w-3 h-3 text-blue-500" /> Cloud
          </span>
        );
      case "local":
        return (
          <span className="inline-flex items-center gap-1 text-[10.5px] text-emerald-600 font-mono font-medium">
            <Cpu className="w-3 h-3 text-emerald-500" /> Local
          </span>
        );
      default:
        return <span className="text-[10.5px] text-slate-600 font-mono">{mode}</span>;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <th className="py-2.5 px-3.5 whitespace-nowrap">Tác Vụ & Mã Job</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Khách Hàng & Key</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Chế Độ & Loại</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Trạng Thái</th>
              <th className="py-2.5 px-3 whitespace-nowrap min-w-[140px]">Tiến Độ & Giai Đoạn</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Tiêu Thụ</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Thời Gian</th>
              <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading && jobs.length === 0 ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={8} className="py-3 px-3">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Không tìm thấy tác vụ nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const isRunning = job.status === "running" || job.status === "queued";
                return (
                  <tr
                    key={job.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Name & Job ID */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                          <Play className="w-3 h-3" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 text-xs">{job.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {job.client_job_id || job.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Customer & License */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="text-slate-800 text-xs font-medium">
                        {job.customer_name || "Vãng lai / Admin"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {job.license_key || "SYS-ROOT"}
                      </div>
                    </td>

                    {/* Mode & Kind */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getModeBadge(job.execution_mode)}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono uppercase font-semibold">
                          {job.kind}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getStatusBadge(job.status)}
                    </td>

                    {/* Progress Bar & Stage */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-medium">
                        <span className="truncate max-w-[100px]">{job.stage || "Idle"}</span>
                        <span className="font-mono text-blue-600 font-bold">{job.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            job.status === "failed"
                              ? "bg-rose-500"
                              : job.status === "completed"
                              ? "bg-emerald-500"
                              : "bg-blue-600"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
                        />
                      </div>
                    </td>

                    {/* Consumption: tokens, credits, duration */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[10.5px]">
                      <div className="text-amber-700 font-bold">{job.credits_used ?? 0} cr</div>
                      <div className="text-slate-400 text-[10px]">{job.duration_seconds ?? 0}s</div>
                    </td>

                    {/* Created at */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-[10.5px]">
                      {new Date(job.created_at).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onView(job)}
                          title="Xem chi tiết"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {isRunning && (
                          <button
                            onClick={() => onCancel(job)}
                            title="Hủy tác vụ này"
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onDelete(job)}
                          title="Xóa bản ghi tác vụ"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
