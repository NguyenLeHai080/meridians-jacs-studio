import React, { useState, useEffect, useCallback } from "react";
import { Plus, Rocket, Download, Trash2 } from "lucide-react";
import type { Release } from "../services/releaseService";
import { useReleases } from "../hooks/useReleases";
import { CreateReleaseModal } from "./modal/CreateReleaseModal";
import { releaseService } from "../services/releaseService";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers releases translation

interface ReleasesPageProps {
  releases?: Release[];
  onRefresh?: () => Promise<void>;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const ReleasesPage: React.FC<ReleasesPageProps> = ({
  releases: propReleases,
  onRefresh: propOnRefresh,
  setMessage: propSetMessage,
  setError: propSetError,
  onNotify,
}) => {
  const { t, language } = useI18n();

  const [localReleases, setLocalReleases] = useState<Release[]>(propReleases || []);
  const activeReleases = propReleases || localReleases;

  const fetchReleasesData = useCallback(async () => {
    try {
      const data = await releaseService.getReleases();
      setLocalReleases(data);
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    if (!propReleases) {
      fetchReleasesData();
    }
  }, [propReleases, fetchReleasesData]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const {
    platformFilter,
    setPlatformFilter,
    filteredReleases,
    totalCount,
  } = useReleases(activeReleases);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRefresh = async () => {
    if (propOnRefresh) await propOnRefresh();
    else await fetchReleasesData();
  };

  const handleDelete = async (r: Release) => {
    if (!confirm(`Bạn có chắc muốn xóa bản phát hành v${r.version}?`)) return;
    try {
      await releaseService.deleteRelease(r.id);
      notify(`Đã xóa bản phát hành v${r.version}`, "success");
      await handleRefresh();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi xóa bản phát hành", "error");
    }
  };

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <h3>{t("releasesTitle")} ({totalCount})</h3>
          <p>{t("releasesSubtitle")}</p>
        </div>
        <button
          type="button"
          className="btn-primary-orange"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={16} /> {t("publishBtn")}
        </button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <select
          className="form-input-mf"
          style={{ width: "auto", minWidth: "160px" }}
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
        >
          <option value="all">Tất cả nền tảng</option>
          <option value="windows">Windows</option>
          <option value="darwin">macOS</option>
          <option value="linux">Linux</option>
        </select>
      </div>

      <div className="table-responsive">
        <table className="mf-table">
          <thead>
            <tr>
              <th>{t("thVersion")}</th>
              <th>{t("thPlatform")}</th>
              <th>{t("thChannel")}</th>
              <th>{t("thSha256")}</th>
              <th>{t("thSize")}</th>
              <th>{t("thTime")}</th>
              <th style={{ textAlign: "right" }}>{t("thActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredReleases.map((r) => (
              <tr key={r.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Rocket size={15} color="var(--primary)" />
                    <strong>v{r.version}</strong>
                  </div>
                </td>
                <td>{r.platform}</td>
                <td>
                  <span className="pill-status pill-active" style={{ fontSize: "0.72rem" }}>
                    {r.channel.toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className="code-chip" style={{ fontSize: "0.7rem" }} title={r.sha256}>
                    {r.sha256.slice(0, 12)}...
                  </span>
                </td>
                <td>{(r.file_size_bytes / (1024 * 1024)).toFixed(1)} MB</td>
                <td style={{ fontSize: "0.78rem" }}>
                  {new Date(r.published_at).toLocaleString(
                    language === "vi" ? "vi-VN" : language === "jp" ? "ja-JP" : "en-US"
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div className="table-actions-row">
                    <a
                      href={r.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-icon-action action-edit"
                      title="Download"
                    >
                      <Download size={13} />
                    </a>
                    <button
                      type="button"
                      className="btn-icon-action action-delete"
                      onClick={() => void handleDelete(r)}
                      title={t("delete")}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredReleases.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                  Chưa có bản phát hành nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateReleaseModal
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
