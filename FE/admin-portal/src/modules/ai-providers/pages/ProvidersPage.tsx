import React, { useState, useEffect, useCallback } from "react";
import { Plus, Bot, Zap, Trash2, Power } from "lucide-react";
import type { Provider } from "../../../core/types";
import { useProviders } from "../hooks/useProviders";
import { ProviderModal } from "./modal/ProviderModal";
import { providerService } from "../services/providerService";
import { DataTable, StatusBadge, Button, Column } from "../../../components/common";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers providers translation

interface ProvidersPageProps {
  providers?: Provider[];
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const ProvidersPage: React.FC<ProvidersPageProps> = ({
  providers: propProviders,
  onRefresh: propOnRefresh,
  setMessage: propSetMessage,
  setError: propSetError,
  searchTerm: propSearchTerm = "",
  onNotify,
}) => {
  const { t } = useI18n();

  const [localProviders, setLocalProviders] = useState<Provider[]>(propProviders || []);
  const activeProviders = propProviders || localProviders;

  const fetchProvidersData = useCallback(async () => {
    try {
      const data = await providerService.getProviders();
      setLocalProviders(data);
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    if (!propProviders) {
      fetchProvidersData();
    }
  }, [propProviders, fetchProvidersData]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const { searchTerm, setSearchTerm, filteredProviders, totalCount, enabledCount } =
    useProviders(activeProviders);

  useEffect(() => {
    if (propSearchTerm) {
      setSearchTerm(propSearchTerm);
    }
  }, [propSearchTerm, setSearchTerm]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleRefresh = async () => {
    if (propOnRefresh) await propOnRefresh();
    else await fetchProvidersData();
  };

  const handleToggleStatus = async (p: Provider) => {
    try {
      await providerService.toggleProvider(p.id, !p.is_enabled);
      notify(`Đã ${!p.is_enabled ? "bật" : "tắt"} provider ${p.name}`, "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi đổi trạng thái", "error");
    }
  };

  const handleDelete = async (p: Provider) => {
    if (!confirm(`Bạn có chắc muốn xóa provider ${p.name}?`)) return;
    try {
      await providerService.deleteProvider(p.id);
      notify(`Đã xóa provider ${p.name}`, "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi xóa provider", "error");
    }
  };

  const handleTestLatency = async (p: Provider) => {
    setTestingId(p.id);
    try {
      const res = await providerService.testLatency(p.id);
      notify(`✓ Provider ${p.name}: Độ trễ ${res.latency_ms}ms (Trạng thái: ${res.status})`, "success");
    } catch (err: any) {
      notify(`✗ Kết nối provider ${p.name} thất bại: ${err instanceof Error ? err.message : "Unknown"}`, "error");
    } finally {
      setTestingId(null);
    }
  };

  const columns: Column<Provider>[] = [
    {
      key: "name",
      header: t("thName"),
      render: (p) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Bot size={16} color="var(--primary)" />
          <strong>{p.name}</strong>
        </div>
      ),
    },
    {
      key: "type",
      header: t("thType"),
      render: (p) => <span className="code-chip">{p.provider_type.toUpperCase()}</span>,
    },
    {
      key: "model",
      header: t("thModel"),
      render: (p) => <code>{p.model}</code>,
    },
    {
      key: "ttsModel",
      header: t("thTtsModel"),
      render: (p) => (p.tts_model ? <code>{p.tts_model}</code> : <span style={{ color: "var(--text-dim)" }}>--</span>),
    },
    {
      key: "capabilities",
      header: t("thCapabilities"),
      render: (p) => (
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          {p.capabilities.map((cap: string) => (
            <span key={cap} className="code-chip" style={{ fontSize: "0.68rem" }}>
              {cap}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: t("thStatus"),
      render: (p) => (
        <StatusBadge
          status={p.is_enabled ? "active" : "danger"}
          label={p.is_enabled ? t("statusActive") : t("statusLocked")}
        />
      ),
    },
    {
      key: "actions",
      header: t("thActions"),
      align: "right",
      render: (p) => (
        <div className="table-actions-row">
          <Button
            variant="outline"
            size="sm"
            style={{ padding: "0.25rem 0.5rem", fontSize: "0.72rem" }}
            onClick={() => void handleTestLatency(p)}
            disabled={testingId === p.id}
            title={t("testLatencyBtn")}
            icon={<Zap size={12} color="var(--primary)" />}
          >
            {testingId === p.id ? "Testing..." : "Test"}
          </Button>
          <button
            type="button"
            className="btn-icon-action action-edit"
            onClick={() => void handleToggleStatus(p)}
            title={p.is_enabled ? "Tạm tắt" : "Kích hoạt"}
          >
            <Power size={13} color={p.is_enabled ? "#10b981" : "#94a3b8"} />
          </button>
          <button
            type="button"
            className="btn-icon-action action-delete"
            onClick={() => void handleDelete(p)}
            title={t("delete")}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        title={`${t("providersTitle")} (${enabledCount}/${totalCount} active)`}
        subtitle={t("providersSubtitle")}
        headerActions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus size={16} />}
          >
            {t("addProviderBtn")}
          </Button>
        }
        search={{
          value: searchTerm,
          onChange: setSearchTerm,
          placeholder: "Tìm theo tên, model AI...",
        }}
        columns={columns}
        data={filteredProviders}
        emptyTitle={t("noProvidersFound")}
      />

      <ProviderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(msg) => {
          notify(msg, "success");
          void handleRefresh();
        }}
      />
    </>
  );
};
