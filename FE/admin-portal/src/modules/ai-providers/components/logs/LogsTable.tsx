import React from "react";
import { Eye, CheckCircle2, AlertTriangle } from "lucide-react";
import type { RequestLogRow } from "../../pages/AiRequestLogsPage";

interface LogsTableProps {
  logs: RequestLogRow[];
  loading: boolean;
  onViewDetail: (log: RequestLogRow) => void;
}

export const LogsTable: React.FC<LogsTableProps> = ({ logs, loading, onViewDetail }) => {
  const getLatencyBadge = (latency: number) => {
    if (latency < 800) {
      return <span className="text-emerald-600 font-mono font-bold">{latency}ms</span>;
    }
    if (latency < 2500) {
      return <span className="text-blue-600 font-mono font-bold">{latency}ms</span>;
    }
    return <span className="text-amber-600 font-mono font-bold">{latency}ms</span>;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <th className="py-2.5 px-3.5 whitespace-nowrap">Thời Gian</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Trạng Thái</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Model AI</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Key & Khách Hàng</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Độ Trễ</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Tokens In / Out</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-right">Chi Phí / Credits</th>
              <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Chi Tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading && logs.length === 0 ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={8} className="py-3 px-3">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Không tìm thấy nhật ký request nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isFail = log.status === "Fail";
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-500 font-mono text-[10.5px]">
                      {new Date(log.timestamp).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isFail ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>{log.status_code || 500} Fail</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{log.status_code || 200} OK</span>
                        </span>
                      )}
                    </td>

                    {/* Model */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-xs text-slate-800 font-medium">
                      {log.model}
                    </td>

                    {/* Key & Customer */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="text-slate-800 text-xs font-medium">
                        {log.customer_name || log.client_name || "Client Tool"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {log.key || "JACS-DEFAULT"}
                      </div>
                    </td>

                    {/* Latency */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getLatencyBadge(log.latency_ms)}
                    </td>

                    {/* Tokens */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[10.5px] text-slate-600">
                      <span className="text-blue-600 font-semibold">{log.tokens_in}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-purple-600 font-semibold">{log.tokens_out}</span>
                      <span className="text-slate-400 text-[10px] ml-1">({log.total_tokens})</span>
                    </td>

                    {/* Cost / Credits */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-[10.5px]">
                      <div className="text-amber-700 font-bold">
                        {log.cost_vnd > 0 ? `${Math.round(log.cost_vnd).toLocaleString("vi-VN")} ₫` : "Free"}
                      </div>
                      {log.credit_used > 0 && (
                        <div className="text-[10px] text-slate-400">
                          {log.credit_used} credits
                        </div>
                      )}
                    </td>

                    {/* Details button */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => onViewDetail(log)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Xem chi tiết request & latency"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
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
