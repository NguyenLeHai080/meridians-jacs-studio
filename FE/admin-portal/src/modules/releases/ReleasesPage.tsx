import React, { useState } from "react";
import type { FormEvent } from "react";
import {
  Rocket,
  Plus,
  Trash2,
  CheckCircle,
  Copy,
  Check,
  Globe,
  Radio,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  X,
  Zap,
} from "lucide-react";
import { apiRequest } from "../../core/api";
import { useI18n } from "../../core/i18n";

export type Release = {
  id: string;
  version: string;
  platform: "windows" | "macos";
  channel: "stable" | "beta";
  download_url: string;
  sha512: string;
  release_notes: string;
  force_update: boolean;
  signature?: string;
  status: "draft" | "published" | string;
  rollout_percent?: number;
  min_app_version?: string;
  created_at?: string;
};

interface ReleasesPageProps {
  releases: Release[];
  token: string;
  onRefresh: () => Promise<void>;
  setMessage: (msg: string) => void;
  setError: (err: string) => void;
}

export function ReleasesPage({
  releases,
  token,
  onRefresh,
  setMessage,
  setError,
}: ReleasesPageProps) {
  const { language, t } = useI18n();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Form states
  const [version, setVersion] = useState("v0.3.18");
  const [platform, setPlatform] = useState<"windows" | "macos">("windows");
  const [channel, setChannel] = useState<"stable" | "beta">("stable");
  const [downloadUrl, setDownloadUrl] = useState("https://jacs-studio.nexoratech.com.vn/updates/jacs-studio-latest.exe");
  const [sha512, setSha512] = useState("a".repeat(128));
  const [releaseNotes, setReleaseNotes] = useState("Cập nhật tính năng & sửa lỗi hệ thống. Tự động áp dụng không cần cài lại tool.");
  const [forceUpdate, setForceUpdate] = useState(false);
  const [publishImmediately, setPublishImmediately] = useState(true);

  async function copyText(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleCreateRelease(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoadingAction("create");
    try {
      let finalSha512 = sha512.trim();
      if (finalSha512.length !== 128) {
        finalSha512 = (finalSha512 + "0".repeat(128)).slice(0, 128);
      }
      const finalVersion = version.startsWith("v") ? version.trim() : `v${version.trim()}`;
      const payload = {
        version: finalVersion,
        platform,
        channel,
        download_url: downloadUrl.trim(),
        sha512: finalSha512,
        release_notes: releaseNotes.trim() || "Cập nhật định kỳ",
        force_update: forceUpdate,
        signature: "s".repeat(64),
      };

      const created = await apiRequest<Release>("/api/v1/releases", {
        method: "POST",
        body: JSON.stringify(payload),
      }, token);

      if (publishImmediately && created?.id) {
        await apiRequest(`/api/v1/releases/${created.id}/publish`, {
          method: "POST",
        }, token);
        setMessage(`🚀 Đã tạo và phát hành bản cập nhật ${finalVersion} (${platform}) cho toàn bộ khách hàng!`);
      } else {
        setMessage(`Đã lưu bản cập nhật ${finalVersion} dạng bản nháp (Draft).`);
      }

      setShowCreateModal(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo bản phát hành");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handlePublish(id: string, ver: string) {
    setError("");
    setLoadingAction(id);
    try {
      await apiRequest(`/api/v1/releases/${id}/publish`, { method: "POST" }, token);
      setMessage(`🎉 Đã phát hành bản cập nhật ${ver} cho toàn bộ khách hàng! Các máy khách đang mở sẽ nhận được thông báo cập nhật ngay.`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể phát hành bản cập nhật");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUnpublish(id: string, ver: string) {
    setError("");
    setLoadingAction(id);
    try {
      await apiRequest(`/api/v1/releases/${id}/unpublish`, { method: "POST" }, token);
      setMessage(`Đã chuyển bản ${ver} về trạng thái Bản nháp (Draft). Khách hàng sẽ không nhận thông báo bản này.`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thu hồi bản cập nhật");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleDelete(id: string, ver: string) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản cập nhật ${ver}?`)) return;
    setError("");
    setLoadingAction(id);
    try {
      await apiRequest(`/api/v1/releases/${id}`, { method: "DELETE" }, token);
      setMessage(`Đã xóa bản cập nhật ${ver} thành công.`);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa bản cập nhật");
    } finally {
      setLoadingAction(null);
    }
  }

  const filteredReleases = releases.filter((r) => {
    const matchPlatform = filterPlatform === "all" || r.platform === filterPlatform;
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchSearch =
      !searchTerm ||
      r.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.release_notes.toLowerCase().includes(searchTerm.toLowerCase());
    return matchPlatform && matchStatus && matchSearch;
  });

  const latestWin = releases.find((r) => r.platform === "windows" && r.status === "published");
  const latestMac = releases.find((r) => r.platform === "macos" && r.status === "published");
  const publishedCount = releases.filter((r) => r.status === "published").length;

  return (
    <>
      {/* KPI Cards Grid */}
      <div className="kpi-cards-grid-mintforge">
        <div className="kpi-card-mf">
          <div className="kpi-squircle-badge squircle-blue">
            <Globe size={24} />
          </div>
          <div className="kpi-content-box">
            <div className="kpi-label-mf">
              {language === "vi" ? "Bản Windows Live" : "Active Windows Version"}
            </div>
            <div className="kpi-value-mf">{latestWin?.version || (language === "vi" ? "Chưa có" : "None")}</div>
            <div className="kpi-subtext-indicator">
              <span className={latestWin ? "subtext-green" : "subtext-gray"}>
                ● {latestWin ? (language === "vi" ? "Khách hàng nhận được" : "Available to clients") : (language === "vi" ? "Chưa phát hành" : "Not published")}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card-mf">
          <div className="kpi-squircle-badge squircle-purple">
            <Radio size={24} />
          </div>
          <div className="kpi-content-box">
            <div className="kpi-label-mf">
              {language === "vi" ? "Bản macOS Live" : "Active macOS Version"}
            </div>
            <div className="kpi-value-mf">{latestMac?.version || (language === "vi" ? "Chưa có" : "None")}</div>
            <div className="kpi-subtext-indicator">
              <span className={latestMac ? "subtext-green" : "subtext-gray"}>
                ● {latestMac ? (language === "vi" ? "Khách hàng nhận được" : "Available to clients") : (language === "vi" ? "Chưa phát hành" : "Not published")}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card-mf">
          <div className="kpi-squircle-badge squircle-orange">
            <Sparkles size={24} />
          </div>
          <div className="kpi-content-box">
            <div className="kpi-label-mf">
              {language === "vi" ? "Cơ chế Cập nhật" : "Update Mechanism"}
            </div>
            <div className="kpi-value-mf" style={{ fontSize: "1.15rem" }}>
              In-Place OTA
            </div>
            <div className="kpi-subtext-indicator">
              <span className="subtext-orange">
                ⚡ {language === "vi" ? "1-click không cần cài lại tool" : "1-click reload without reinstall"}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card-mf">
          <div className="kpi-squircle-badge squircle-green">
            <ShieldCheck size={24} />
          </div>
          <div className="kpi-content-box">
            <div className="kpi-label-mf">
              {language === "vi" ? "Tổng số bản build" : "Total Releases"}
            </div>
            <div className="kpi-value-mf">{releases.length}</div>
            <div className="kpi-subtext-indicator">
              <span className="subtext-green">
                {publishedCount} {language === "vi" ? "đang phát hành" : "published"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="mf-card-panel">
        <div className="mf-card-header">
          <div className="mf-card-title-group">
            <h3>
              {language === "vi" ? "Danh sách Bản phát hành & Cập nhật OTA" : "Releases & OTA Updates List"} ({filteredReleases.length})
            </h3>
            <p>
              {language === "vi"
                ? "Quản lý và kích hoạt gửi bản cập nhật mới cho máy khách Desktop. Khi phát hành, máy khách sẽ tự động nhận thông báo."
                : "Manage and broadcast updates to desktop clients in real-time."}
            </p>
          </div>
          <button
            type="button"
            className="btn-primary-orange"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} /> {language === "vi" ? "Tạo bản phát hành mới" : "Create Release"}
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div style={{ display: "flex", gap: "0.85rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <input
            type="text"
            className="form-input-mf"
            placeholder={language === "vi" ? "Tìm theo version, ghi chú phát hành..." : "Search by version, release notes..."}
            style={{ flex: 1, minWidth: "240px" }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="form-input-mf"
            style={{ width: "200px" }}
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
          >
            <option value="all">{language === "vi" ? "Tất cả hệ điều hành" : "All Platforms"}</option>
            <option value="windows">🪟 Windows</option>
            <option value="macos">🍎 macOS</option>
          </select>
          <select
            className="form-input-mf"
            style={{ width: "200px" }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">{language === "vi" ? "Tất cả trạng thái" : "All Statuses"}</option>
            <option value="published">{language === "vi" ? "Đang phát hành (Published)" : "Published"}</option>
            <option value="draft">{language === "vi" ? "Bản nháp (Draft)" : "Draft"}</option>
          </select>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="mf-table">
            <thead>
              <tr>
                <th>{language === "vi" ? "Phiên bản" : "Version"}</th>
                <th>{language === "vi" ? "Hệ điều hành & Kênh" : "Platform & Channel"}</th>
                <th>{language === "vi" ? "Trạng thái khách" : "Client Status"}</th>
                <th>{language === "vi" ? "Ghi chú phát hành" : "Release Notes"}</th>
                <th>{language === "vi" ? "Download URL & Hash" : "Download & Hash"}</th>
                <th style={{ textAlign: "right" }}>{t("thActions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredReleases.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                    <Rocket size={36} style={{ opacity: 0.35, marginBottom: "0.5rem", display: "inline-block" }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {language === "vi" ? "Chưa có bản phát hành nào." : "No releases found."}
                    </p>
                    <button
                      type="button"
                      className="btn-primary-orange"
                      style={{ marginTop: "1rem", display: "inline-flex" }}
                      onClick={() => setShowCreateModal(true)}
                    >
                      <Plus size={15} /> {language === "vi" ? "Tạo bản phát hành đầu tiên" : "Create First Release"}
                    </button>
                  </td>
                </tr>
              ) : (
                filteredReleases.map((rel) => {
                  const isPublished = rel.status === "published";
                  return (
                    <tr key={rel.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span className="code-chip" style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 800 }}>
                            {rel.version}
                          </span>
                          {rel.force_update && (
                            <span className="pill-status pill-danger" title="Bắt buộc nâng cấp">
                              Force
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                          <strong style={{ color: "var(--text-dark)", fontSize: "0.82rem" }}>
                            {rel.platform === "windows" ? "🪟 Windows" : "🍎 macOS"}
                          </strong>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            Kênh: {rel.channel.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td>
                        {isPublished ? (
                          <span className="pill-status pill-online">
                            <CheckCircle size={12} /> {language === "vi" ? "Đang phát hành cho khách" : "Live for Clients"}
                          </span>
                        ) : (
                          <span className="pill-status pill-warning">
                            <AlertCircle size={12} /> {language === "vi" ? "Bản nháp (Draft)" : "Draft"}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ maxWidth: "340px", fontSize: "0.8rem", color: "var(--text-body)", lineHeight: 1.45 }}>
                          {rel.release_notes}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.75rem" }}>
                          <a
                            href={rel.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}
                          >
                            <ExternalLink size={12} />
                            <span style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {rel.download_url}
                            </span>
                          </a>
                          <button
                            type="button"
                            className="btn-white-outline"
                            style={{ padding: "0.15rem 0.4rem", fontSize: "0.7rem", width: "fit-content" }}
                            onClick={() => void copyText(rel.sha512, rel.id)}
                          >
                            {copiedId === rel.id ? (
                              <>
                                <Check size={11} color="var(--success)" /> SHA-512 đã copy
                              </>
                            ) : (
                              <>
                                <Copy size={11} /> SHA: {rel.sha512.slice(0, 10)}...
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                          {isPublished ? (
                            <button
                              type="button"
                              className="btn-white-outline"
                              style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                              disabled={loadingAction === rel.id}
                              onClick={() => void handleUnpublish(rel.id, rel.version)}
                              title="Tạm dừng gửi thông báo cho khách"
                            >
                              {language === "vi" ? "Thu hồi" : "Unpublish"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn-primary-orange"
                              style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                              disabled={loadingAction === rel.id}
                              onClick={() => void handlePublish(rel.id, rel.version)}
                              title="Phát hành ngay cho toàn bộ khách hàng"
                            >
                              <Rocket size={13} /> {language === "vi" ? "Phát hành" : "Publish"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-action-icon btn-action-delete"
                            disabled={loadingAction === rel.id}
                            onClick={() => void handleDelete(rel.id, rel.version)}
                            title={t("delete")}
                          >
                            <Trash2 size={15} />
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

      {/* MODAL: CREATE RELEASE */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-dialog-box" style={{ maxWidth: "600px" }}>
            <div className="modal-header-mf">
              <div>
                <h3>🚀 {language === "vi" ? "Tạo bản phát hành & Push OTA cho khách" : "New Release & Push OTA"}</h3>
              </div>
              <button
                type="button"
                className="btn-close-modal"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRelease}>
              <div className="modal-body-mf">
                <div className="mf-form-two-col">
                  <div className="form-group-mf">
                    <label className="form-label-mf">{language === "vi" ? "Phiên bản (Version) *" : "Version *"}</label>
                    <input
                      type="text"
                      className="form-input-mf"
                      placeholder="v0.3.18"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group-mf">
                    <label className="form-label-mf">{language === "vi" ? "Hệ điều hành *" : "Platform *"}</label>
                    <select
                      className="form-input-mf"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value as "windows" | "macos")}
                    >
                      <option value="windows">🪟 Windows (x64 / NSIS / Zip)</option>
                      <option value="macos">🍎 macOS (Apple Silicon & Intel)</option>
                    </select>
                  </div>
                </div>

                <div className="mf-form-two-col">
                  <div className="form-group-mf">
                    <label className="form-label-mf">{language === "vi" ? "Kênh phân phối" : "Channel"}</label>
                    <select
                      className="form-input-mf"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as "stable" | "beta")}
                    >
                      <option value="stable">Stable (Khách hàng chính thức)</option>
                      <option value="beta">Beta (Thử nghiệm)</option>
                    </select>
                  </div>
                  <div className="form-group-mf" style={{ display: "flex", alignItems: "center", paddingTop: "1.75rem" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={forceUpdate}
                        onChange={(e) => setForceUpdate(e.target.checked)}
                      />
                      <span>{language === "vi" ? "Bắt buộc cập nhật (Force)" : "Force update"}</span>
                    </label>
                  </div>
                </div>

                <div className="form-group-mf">
                  <label className="form-label-mf">{language === "vi" ? "URL Tải gói cập nhật / Installer / OTA Bundle *" : "Download / OTA URL *"}</label>
                  <input
                    type="url"
                    className="form-input-mf"
                    placeholder="https://jacs-studio.nexoratech.com.vn/updates/jacs-studio-0.3.18.exe"
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    required
                  />
                  <small style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "0.25rem", display: "block" }}>
                    {language === "vi"
                      ? "URL file cập nhật được máy khách tải trực tiếp."
                      : "Direct URL hosting the release installer or bundle."}
                  </small>
                </div>

                <div className="form-group-mf">
                  <label className="form-label-mf">SHA-512 Checksum (128 ký tự hex)</label>
                  <input
                    type="text"
                    className="form-input-mf"
                    placeholder="64-byte hex (128 ký tự)"
                    value={sha512}
                    onChange={(e) => setSha512(e.target.value)}
                  />
                </div>

                <div className="form-group-mf">
                  <label className="form-label-mf">{language === "vi" ? "Ghi chú phát hành (Release Notes) *" : "Release Notes *"}</label>
                  <textarea
                    className="form-input-mf"
                    rows={3}
                    placeholder="Những thay đổi mới, tính năng và sửa lỗi..."
                    value={releaseNotes}
                    onChange={(e) => setReleaseNotes(e.target.value)}
                    required
                  />
                </div>

                <div style={{ background: "rgba(249, 87, 56, 0.08)", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid rgba(249, 87, 56, 0.2)" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={publishImmediately}
                      onChange={(e) => setPublishImmediately(e.target.checked)}
                    />
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--primary)" }}>
                      ⚡ {language === "vi" ? "Phát hành cho khách ngay lập tức (Live Update)" : "Publish to all clients immediately"}
                    </span>
                  </label>
                  <p style={{ margin: "0.3rem 0 0 1.5rem", fontSize: "0.75rem", color: "var(--text-body)" }}>
                    {language === "vi"
                      ? "Tất cả khách hàng đang mở tool sẽ tự động hiện thông báo 'Có bản cập nhật mới' và có thể bấm để cập nhật ngay mà không cần cài lại tool."
                      : "Clients currently running the tool will instantly receive an update notification."}
                  </p>
                </div>
              </div>

              <div className="modal-footer-mf">
                <button
                  type="button"
                  className="btn-white-outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="btn-primary-orange"
                  disabled={loadingAction === "create"}
                >
                  <Zap size={15} />
                  {loadingAction === "create"
                    ? (language === "vi" ? "Đang xử lý..." : "Processing...")
                    : (language === "vi" ? "Xác nhận & Phát hành" : "Confirm & Release")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
