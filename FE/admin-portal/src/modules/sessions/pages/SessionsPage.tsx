import React, { useState, useEffect, useCallback } from "react";
import { RotateCw } from "lucide-react";
import type { ClientSession } from "../../../core/types";
import { useSessions } from "../hooks/useSessions";
import { sessionService } from "../services/sessionService";
import { DataTable, StatusBadge, Button, Column } from "../../../components/common";
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

  const columns: Column<ClientSession>[] = [
    {
      key: "customer",
      header: t("thCustomer"),
      render: (sess) => <strong>{sess.customer_name}</strong>,
    },
    {
      key: "keyHint",
      header: t("thKeyHint"),
      render: (sess) => <span className="code-chip">{sess.key_hint}</span>,
    },
    {
      key: "hwid",
      header: t("thHwid"),
      render: (sess) => (
        <span className="code-chip" style={{ fontSize: "0.72rem" }}>
          {sess.hwid}
        </span>
      ),
    },
    {
      key: "platform",
      header: t("thPlatform"),
      render: (sess) => (
        <span>
          {sess.last_platform || "Windows"} · v{sess.last_app_version || "0.3.17"}
        </span>
      ),
    },
    {
      key: "ip",
      header: t("thIp"),
      render: (sess) => <code>{sess.last_ip || "0.0.0.0"}</code>,
    },
    {
      key: "time",
      header: t("thTime"),
      render: (sess) => (
        <span>
          {sess.last_seen_at ? (
            <span style={{ fontSize: "0.78rem" }}>
              {new Date(sess.last_seen_at).toLocaleTimeString(
                language === "vi" ? "vi-VN" : language === "jp" ? "ja-JP" : "en-US"
              )}
            </span>
          ) : (
            <span style={{ color: "var(--text-dim)" }}>--</span>
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: t("thStatus"),
      render: (sess) => (
        <StatusBadge
          status={sess.is_online ? "online" : "offline"}
          label={sess.is_online ? t("statusOnline") : t("statusOffline")}
        />
      ),
    },
    {
      key: "actions",
      header: t("thActions"),
      align: "right",
      render: (sess) => (
        <Button
          variant="outline"
          size="sm"
          style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
          onClick={() => void handleTerminateSession(sess.license_id)}
          title={t("btnTerminate")}
        >
          {t("btnTerminate")}
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      title={`${t("sessionsTitle")} (${totalCount})`}
      subtitle={t("sessionsSubtitle")}
      headerActions={
        <Button variant="outline" size="sm" onClick={() => void handleRefresh()} icon={<RotateCw size={14} />}>
          {t("refresh")}
        </Button>
      }
      columns={columns}
      data={paginatedSessions}
      keyExtractor={(s) => s.license_id}
      emptyTitle={t("noSessionsFound")}
      pagination={{
        currentPage,
        totalPages,
        onPageChange: setCurrentPage,
        totalItems: totalCount,
        pageSize,
        pageSizeOptions: [5, 10, 20, 50],
        onPageSizeChange: setPageSize,
      }}
    />
  );
};
