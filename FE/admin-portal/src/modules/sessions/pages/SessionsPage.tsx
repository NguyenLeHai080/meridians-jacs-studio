import React, { useState, useEffect, useCallback } from "react";
import { RotateCw } from "lucide-react";
import type { ClientSession } from "../../../core/types";
import { useSessions } from "../hooks/useSessions";
import { sessionService } from "../services/sessionService";
import { Pagination } from "../../../components/common/Pagination";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers sessions translation

interface SessionsPageProps {
  sessions?: ClientSession[];
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const SessionsPage: React.FC<SessionsPageProps> = ({
  sessions: propSessions,
  onRefresh: propOnRefresh,
  setMessage: propSetMessage,
  setError: propSetError,
  searchTerm: _searchTerm,
  onNotify,
}) => {
  const { t, language } = useI18n();

  const [localSessions, setLocalSessions] = useState<ClientSession[]>(propSessions || []);
  const activeSessions = propSessions || localSessions;

  const fetchSessionsData = useCallback(async () => {
    try {
      const data = await sessionService.getSessions();
      setLocalSessions(data);
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    if (!propSessions) {
      fetchSessionsData();
    }
  }, [propSessions, fetchSessionsData]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    paginatedSessions,
    totalCount,
  } = useSessions(activeSessions);

  const handleRefresh = async () => {
    if (propOnRefresh) {
      await propOnRefresh();
    } else {
      await fetchSessionsData();
    }
  };

  const handleTerminateSession = async (licenseId: string) => {
    if (!confirm(t("confirmTerminate"))) return;
    try {
      await sessionService.terminateSession(licenseId);
      notify("Đã ngắt phiên hoạt động của client", "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Không ngắt được phiên", "error");
    }
  };

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <h3>{t("sessionsTitle")} ({totalCount})</h3>
          <p>{t("sessionsSubtitle")}</p>
        </div>
        <button type="button" className="btn-white-outline" onClick={() => void handleRefresh()}>
          <RotateCw size={15} /> {t("refresh")}
        </button>
      </div>

      <div className="table-responsive">
        <table className="mf-table">
          <thead>
            <tr>
              <th>{t("thCustomer")}</th>
              <th>{t("thKeyHint")}</th>
              <th>{t("thHwid")}</th>
              <th>{t("thPlatform")}</th>
              <th>{t("thIp")}</th>
              <th>{t("thTime")}</th>
              <th>{t("thStatus")}</th>
              <th style={{ textAlign: "right" }}>{t("thActions")}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSessions.map((sess) => (
              <tr key={sess.license_id}>
                <td><strong>{sess.customer_name}</strong></td>
                <td><span className="code-chip">{sess.key_hint}</span></td>
                <td><span className="code-chip" style={{ fontSize: "0.72rem" }}>{sess.hwid}</span></td>
                <td>{sess.last_platform || "Windows"} · v{sess.last_app_version || "0.3.17"}</td>
                <td><code>{sess.last_ip || "0.0.0.0"}</code></td>
                <td>
                  {sess.last_seen_at ? (
                    <span style={{ fontSize: "0.78rem" }}>
                      {new Date(sess.last_seen_at).toLocaleTimeString(
                        language === "vi" ? "vi-VN" : language === "jp" ? "ja-JP" : "en-US"
                      )}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-dim)" }}>--</span>
                  )}
                </td>
                <td>
                  <span className={`pill-status ${sess.is_online ? "pill-online" : "pill-offline"}`}>
                    {sess.is_online ? `● ${t("statusOnline")}` : t("statusOffline")}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="btn-white-outline"
                    style={{ padding: "0.3rem 0.6rem", color: "var(--danger)" }}
                    onClick={() => void handleTerminateSession(sess.license_id)}
                    title={t("btnTerminate")}
                  >
                    {t("btnTerminate")}
                  </button>
                </td>
              </tr>
            ))}
            {activeSessions.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  {t("noSessionsFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={totalCount}
        pageSize={pageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};
