import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getToken } from "../../../core/session";
import { apiRequest } from "../../../core/api";
import { showToast } from "../../../core/swal";
import { LogsKpiCards } from "../components/logs/LogsKpiCards";
import { LogsFilterToolbar } from "../components/logs/LogsFilterToolbar";
import { LogsTable } from "../components/logs/LogsTable";
import { LogDetailModal } from "../components/logs/LogDetailModal";

export interface RequestLogRow {
  id: string;
  timestamp: string;
  model: string;
  provider: string;
  key: string;
  status: "Oke" | "Fail";
  status_code: number;
  tokens_in: number;
  tokens_out: number;
  total_tokens: number;
  cost_vnd: number;
  credit_used: number;
  latency_ms: number;
  feature_name?: string;
  client_name?: string;
  customer_name?: string;
  hwid?: string;
  license_id?: string;
  error_message?: string;
}

export interface SummaryData {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  success_rate_pct: number;
  avg_latency_ms: number;
  total_cost_vnd: number;
  total_tokens: number;
}

export interface AvailableKeyInfo {
  provider_id: string;
  provider_name: string;
  masked_key: string;
  is_primary: boolean;
  base_url?: string;
}

interface AiRequestLogsPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const AiRequestLogsPage: React.FC<AiRequestLogsPageProps> = ({
  searchTerm: globalSearch = "",
  onNotify,
}) => {
  const token = getToken() ?? "";
  const [logs, setLogs] = useState<RequestLogRow[]>([]);
  const [availableKeys, setAvailableKeys] = useState<AvailableKeyInfo[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("all");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [liveMode, setLiveMode] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RequestLogRow | null>(null);

  const isFetchingRef = useRef(false);
  const selectedKeyRef = useRef(selectedKey);
  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  const fetchLogs = useCallback(
    async (targetKeyOverride?: string) => {
      if (!token || isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        setLoading(true);
        const activeKey = targetKeyOverride !== undefined ? targetKeyOverride : selectedKeyRef.current;
        const keyParam = activeKey && activeKey !== "all" ? `&key=${encodeURIComponent(activeKey)}` : "";
        const res = await apiRequest<{
          summary: SummaryData;
          logs: RequestLogRow[];
          total: number;
          available_keys?: AvailableKeyInfo[];
        }>(`/api/v1/telemetry/global-requests?limit=300${keyParam}`, {}, token);

        if (res && res.logs) {
          setLogs(res.logs);
          setSummary(res.summary);
          if (res.available_keys) {
            setAvailableKeys(res.available_keys);
          }
        }
      } catch {
        // silently handled
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [token]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Live polling mode
  useEffect(() => {
    if (!liveMode) return;
    const timer = setInterval(() => {
      fetchLogs();
    }, 4000);
    return () => clearInterval(timer);
  }, [liveMode, fetchLogs]);

  // Key change
  const handleKeyChange = (k: string) => {
    setSelectedKey(k);
    fetchLogs(k);
  };

  // Filter logs
  const query = (globalSearch || localSearch).toLowerCase().trim();
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      if (selectedKey !== "all" && !log.key.toLowerCase().includes(selectedKey.toLowerCase())) {
        return false;
      }
      if (query) {
        const matchModel = log.model?.toLowerCase().includes(query);
        const matchKey = log.key?.toLowerCase().includes(query);
        const matchCust = log.customer_name?.toLowerCase().includes(query) || log.client_name?.toLowerCase().includes(query);
        const matchFeat = log.feature_name?.toLowerCase().includes(query);
        if (!matchModel && !matchKey && !matchCust && !matchFeat) return false;
      }
      return true;
    });
  }, [logs, statusFilter, selectedKey, query]);

  const defaultSummary: SummaryData = useMemo(() => {
    const total = logs.length;
    const successful = logs.filter((l) => l.status === "Oke").length;
    const failed = logs.filter((l) => l.status === "Fail").length;
    const totalTokens = logs.reduce((acc, l) => acc + (l.total_tokens || 0), 0);
    const totalCost = logs.reduce((acc, l) => acc + (l.cost_vnd || 0), 0);
    const totalLat = logs.reduce((acc, l) => acc + (l.latency_ms || 0), 0);
    return {
      total_requests: summary?.total_requests ?? total,
      successful_requests: summary?.successful_requests ?? successful,
      failed_requests: summary?.failed_requests ?? failed,
      success_rate_pct: summary?.success_rate_pct ?? (total > 0 ? (successful / total) * 100 : 100),
      avg_latency_ms: summary?.avg_latency_ms ?? (total > 0 ? Math.round(totalLat / total) : 0),
      total_cost_vnd: summary?.total_cost_vnd ?? totalCost,
      total_tokens: summary?.total_tokens ?? totalTokens,
    };
  }, [summary, logs]);

  const keyList = useMemo(() => {
    return availableKeys.map((k) => k.masked_key);
  }, [availableKeys]);

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📡 Nhật Ký Request AI & Giám Sát Độ Trễ</span>
          </h2>
          <p className="text-xs text-slate-500">
            Theo dõi lưu lượng gọi API Gateway, độ trễ từng key nhà cung cấp và nhật ký tiêu thụ tokens theo thời gian thực
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <LogsKpiCards summary={defaultSummary} loading={loading} />

      {/* Filter toolbar */}
      <LogsFilterToolbar
        searchQuery={localSearch}
        onSearchChange={setLocalSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        selectedKey={selectedKey}
        onKeyChange={handleKeyChange}
        availableKeys={keyList}
        liveMode={liveMode}
        onToggleLive={() => setLiveMode((prev) => !prev)}
        loading={loading}
        onRefresh={() => fetchLogs()}
      />

      {/* High-density single-line table */}
      <LogsTable
        logs={filteredLogs}
        loading={loading}
        onViewDetail={(log) => setSelectedRow(log)}
      />

      {/* Detail Modal */}
      <LogDetailModal
        log={selectedRow}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
};
