import React, { useState, useEffect, useCallback } from "react";
import { Plus, Bot, Zap, Trash2, Power, Search } from "lucide-react";
import type { Provider } from "../../../core/types";
import { useProviders } from "../hooks/useProviders";
import { ProviderModal } from "./modal/ProviderModal";
import { providerService } from "../services/providerService";
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

  const { searchTerm, setSearchTerm, filteredProviders, totalCount, enabledCount } = useProviders(activeProviders);

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

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <h3>{t("providersTitle")} ({enabledCount}/{totalCount} active)</h3>
          <p>{t("providersSubtitle")}</p>
        </div>
        <button
          type="button"
          className="btn-primary-orange"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={16} /> {t("addProviderBtn")}
        </button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div className="table-search-box" style={{ maxWidth: "360px" }}>
          <Search size={14} color="#94a3b8" />
          <input
            type="text"
            placeholder="Tìm theo tên, model AI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-responsive">
        <table className="mf-table">
          <thead>
            <tr>
              <th>{t("thName")}</th>
              <th>{t("thType")}</th>
              <th>{t("thModel")}</th>
              <th>{t("thTtsModel")}</th>
              <th>{t("thCapabilities")}</th>
              <th>{t("thStatus")}</th>
              <th style={{ textAlign: "right" }}>{t("thActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProviders.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Bot size={16} color="var(--primary)" />
                    <strong>{p.name}</strong>
                  </div>
                </td>
                <td>
                  <span className="code-chip">{p.provider_type.toUpperCase()}</span>
                </td>
                <td><code>{p.model}</code></td>
                <td>{p.tts_model ? <code>{p.tts_model}</code> : <span style={{ color: "var(--text-dim)" }}>--</span>}</td>
                <td>
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                    {p.capabilities.map((cap: string) => (
                      <span key={cap} className="code-chip" style={{ fontSize: "0.68rem" }}>
                        {cap}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={`pill-status ${p.is_enabled ? "pill-active" : "pill-danger"}`}>
                    {p.is_enabled ? `● ${t("statusActive")}` : t("statusLocked")}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="table-actions-row">
                    <button
                      type="button"
                      className="btn-white-outline"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.72rem" }}
                      onClick={() => void handleTestLatency(p)}
                      disabled={testingId === p.id}
                      title={t("testLatencyBtn")}
                    >
                      <Zap size={12} color="var(--primary)" /> {testingId === p.id ? "Testing..." : "Test"}
                    </button>
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
                </td>
              </tr>
            ))}
            {filteredProviders.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  {t("noProvidersFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ProviderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(msg) => {
          notify(msg, "success");
          void handleRefresh();
        }}
      />
    </div>
  );
};
