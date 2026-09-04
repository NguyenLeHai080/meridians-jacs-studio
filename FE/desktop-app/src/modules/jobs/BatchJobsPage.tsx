import { useEffect, useMemo, useState } from "react";
import type { Job, ProviderProfile } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { normalizePastedUrl, providerIsReady, sourceNameFromUrl } from "../../core/job-utils";
import { defaultVoice, voicesForLanguage } from "../../core/voice-packs";
import { Icon } from "../../shared/Icon";
import { StatusPill } from "../../shared/StatusPill";
import { Pagination } from "../../shared/Pagination";
import { Modal } from "../../shared/Modal";

type Source = {
  id: string;
  name: string;
  source: string;
  sourceType: "file" | "url";
  localPath?: string;
};

const LANGUAGE_OPTIONS = [
  ["vi", "Tiếng Việt"],
  ["en", "English"],
  ["ja", "日本語"],
  ["ko", "한국어"],
  ["zh-CN", "中文 · Trung Quốc"],
  ["zh-TW", "繁體中文 · Đài Loan"],
  ["th", "ไทย · Thái Lan"],
  ["id", "Indonesia"],
  ["ms", "Melayu · Malaysia"],
  ["fil", "Filipino"],
  ["fr", "Français"],
  ["es", "Español"],
  ["pt-BR", "Português · Brazil"],
  ["de", "Deutsch"],
  ["it", "Italiano"],
  ["ru", "Русский"],
  ["tr", "Türkçe"],
  ["ar", "العربية"],
  ["hi", "हिन्दी"],
  ["nl", "Nederlands"],
] as const;
const LANGUAGE_LABELS = Object.fromEntries(LANGUAGE_OPTIONS) as Record<string, string>;

const STAGE_LABELS: Record<string, string> = {
  queued: "Đang chờ",
  downloading: "Đang tải video",
  probing: "Đọc metadata",
  analyzing: "Đang phân tích AI",
  outlining: "Đang lập kịch bản",
  script_review: "Chờ duyệt kịch bản",
  generating_voice: "Đang tạo voice",
  matching_scenes: "Đang khớp cảnh",
  timeline_review: "Chờ duyệt timeline",
  rendering: "Đang render",
  qa: "Đang kiểm tra chất lượng",
  completed: "Đã hoàn tất",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

export function BatchJobsPage({
  jobs,
  onAddJob,
  onCancelJob,
  onRetryJob,
  onDeleteJobs,
  onOpenTimeline,
}: {
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onCancelJob?: (jobId: string) => void;
  onRetryJob?: (jobId: string) => void;
  onDeleteJobs?: (jobIds: string[]) => void;
  onOpenTimeline?: (jobId: string) => void;
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [urlText, setUrlText] = useState("");
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [message, setMessage] = useState("");

  // Preset configuration state
  const [mode, setMode] = useState<Job["mode"]>("local-cpu");
  const [providerId, setProviderId] = useState("");
  const [splitScenes, setSplitScenes] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<Job["aspectRatio"]>("9:16");
  const [narratorEnabled, setNarratorEnabled] = useState(true);
  const [narratorGender, setNarratorGender] = useState<"male" | "female">("female");
  const [languages, setLanguages] = useState<string[]>(["vi"]);
  const [keepOriginalAudio, setKeepOriginalAudio] = useState(true);
  const [emphasizeHook, setEmphasizeHook] = useState(true);
  const [highlightOnly, setHighlightOnly] = useState(false);
  const [backgroundMusic, setBackgroundMusic] = useState(false);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);

  const [sourcePage, setSourcePage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);
  const sourcePageSize = 5;
  const queuePageSize = 8;

  const processJobs = useMemo(() => jobs.filter((job) => !job.sourceOnly), [jobs]);
  const pagedSources = useMemo(
    () => sources.slice((sourcePage - 1) * sourcePageSize, sourcePage * sourcePageSize),
    [sources, sourcePage]
  );
  const pagedJobs = useMemo(
    () => processJobs.slice((queuePage - 1) * queuePageSize, queuePage * queuePageSize),
    [processJobs, queuePage]
  );

  useEffect(() => {
    void getRuntime().getProviderProfiles().then(setProviders).catch(() => setProviders([]));
  }, []);

  useEffect(() => {
    const persisted = jobs
      .filter((job) => job.localPath || job.sourceType === "url")
      .map((job) => ({
        id: job.id,
        name: job.name,
        source: job.source,
        sourceType: (job.sourceType || "file") as "file" | "url",
        localPath: job.localPath,
      }));
    setSources((current) => {
      const merged = new Map(current.map((item) => [item.id, item]));
      persisted.forEach((item) => merged.set(item.id, { ...merged.get(item.id), ...item }));
      return [...merged.values()];
    });
  }, [jobs]);

  async function chooseVideos() {
    const picked = await getRuntime().pickVideos?.();
    if (!picked?.length) return;
    const existing = new Set(sources.map((item) => item.localPath || item.source));
    const stamp = Date.now();
    const additions = picked
      .filter((file) => !existing.has(file))
      .map((localPath, index) => ({
        id: `${localPath}-${stamp}-${index}`,
        name: localPath.split(/[\\/]/).pop() || localPath,
        source: localPath,
        sourceType: "file" as const,
        localPath,
      }));
    setSources((current) => [...current, ...additions]);
    setSelectedSources((current) => [...new Set([...current, ...additions.map((item) => item.id)])]);
    additions.forEach((source) =>
      onAddJob({
        id: source.id,
        name: source.name.replace(/\.[^.]+$/, ""),
        source: source.name,
        sourceType: "file",
        localPath: source.localPath,
        sourceOnly: true,
        mode: "local-cpu",
        status: "queued",
        stage: "queued",
        progress: 0,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        synced: true,
      })
    );
    setMessage(`Đã nạp ${additions.length} file video vào danh sách nguồn.`);
  }

  function addUrl() {
    const urls = urlText.split(/[\n,]+/).map(normalizePastedUrl).filter(Boolean);
    const invalid = urls.find((url) => !/^https?:\/\//i.test(url));
    if (!urls.length || invalid) {
      setMessage("Mỗi URL phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    const existing = new Set(sources.map((item) => item.source));
    const stamp = Date.now();
    const additions = urls
      .filter((url) => !existing.has(url))
      .map((url, index) => ({
        id: `${url}-${stamp}-${index}`,
        name: sourceNameFromUrl(url),
        source: url,
        sourceType: "url" as const,
      }));
    setSources((current) => [...current, ...additions]);
    setSelectedSources((current) => [...new Set([...current, ...additions.map((item) => item.id)])]);
    additions.forEach((source) =>
      onAddJob({
        id: source.id,
        name: source.name,
        source: source.source,
        sourceType: "url",
        sourceOnly: true,
        mode: "local-cpu",
        status: "queued",
        stage: "downloading",
        progress: 0,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        synced: true,
      })
    );
    setUrlText("");
    setIsUrlModalOpen(false);
    setMessage(`Đã thêm ${additions.length} URL video vào danh sách.`);
  }

  function toggleSelectSource(id: string) {
    setSelectedSources((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAllSources() {
    setSelectedSources((current) =>
      current.length === sources.length ? [] : sources.map((s) => s.id)
    );
  }

  function toggleSelectJob(id: string) {
    setSelectedJobIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAllJobs() {
    setSelectedJobIds((current) =>
      current.length === processJobs.length ? [] : processJobs.map((j) => j.id)
    );
  }

  function deleteSelectedJobs() {
    if (!onDeleteJobs || !selectedJobIds.length) return;
    if (!window.confirm(`Xoá ${selectedJobIds.length} job đã chọn khỏi queue?`)) return;
    onDeleteJobs(selectedJobIds);
    setSelectedJobIds([]);
  }

  function createBatch() {
    const chosen = sources.filter((source) => selectedSources.includes(source.id));
    if (!chosen.length) {
      setMessage("Hãy tích chọn ít nhất 1 nguồn video để tạo job.");
      return;
    }
    const stamp = Date.now();
    let count = 0;
    chosen.forEach((source, sIdx) => {
      languages.forEach((lang, lIdx) => {
        const langSuffix = languages.length > 1 ? ` · ${LANGUAGE_LABELS[lang] || lang}` : "";
        const langVoice = narratorEnabled ? defaultVoice(lang, narratorGender).id : undefined;
        onAddJob({
          id: `job-${stamp}-${sIdx}-${lIdx}`,
          name: `${source.name.replace(/\.[^.]+$/, "")}${langSuffix}`,
          source: source.sourceType === "url" ? source.source : source.name,
          sourceType: source.sourceType,
          localPath: source.localPath,
          mode,
          splitScenes,
          aspectRatio,
          narratorEnabled,
          narratorGender,
          narratorVoice: langVoice,
          languages: [lang],
          keepOriginalAudio,
          emphasizeHook,
          highlightOnly,
          backgroundMusic,
          status: "queued",
          stage: source.sourceType === "url" ? "downloading" : "queued",
          progress: 0,
          createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        });
        count++;
      });
    });
    setIsPresetModalOpen(false);
    setMessage(`⚡ Đã tạo thành công ${count} job và đưa vào hàng đợi render.`);
  }

  return (
    <div className="page-stack page-enter">
      {/* Header */}
      <div className="page-title">
        <div>
          <p className="eyebrow">BATCH PROCESSING / PIPELINE</p>
          <h2>Tạo Job Hàng Loạt</h2>
          <p>Nạp nhiều video hoặc URL, áp dụng preset xử lý và đưa vào hàng đợi render tự động.</p>
        </div>
        <div className="page-title-actions">
          <button type="button" className="btn-secondary" onClick={() => void chooseVideos()}>
            <Icon name="plus" size={13} /> + Thêm video máy
          </button>
          <button type="button" className="btn-secondary" onClick={() => setIsUrlModalOpen(true)}>
            <Icon name="link" size={13} /> + Thêm Link URL
          </button>
          <button type="button" className="btn-secondary" onClick={() => setIsPresetModalOpen(true)}>
            <Icon name="sliders" size={13} /> ⚙️ Cấu hình Preset
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={createBatch}
            disabled={!selectedSources.length}
          >
            <Icon name="spark" size={14} /> Chạy {selectedSources.length * languages.length} Job
          </button>
        </div>
      </div>

      {message && <p className="form-help">{message}</p>}

      {/* Section 1: Nguồn Video Đầu Vào (Table) */}
      <section className="panel-card">
        <div className="panel-head">
          <div>
            <p className="eyebrow">INPUT SOURCES</p>
            <h3>Danh sách nguồn video ({sources.length})</h3>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="btn-secondary" onClick={toggleAllSources}>
              {selectedSources.length === sources.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
          </div>
        </div>

        <div className="jacs-table-wrapper">
          <table className="jacs-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={sources.length > 0 && selectedSources.length === sources.length}
                    onChange={toggleAllSources}
                  />
                </th>
                <th>Tên Video / Nguồn</th>
                <th>Loại Nguồn</th>
                <th>Đường dẫn / URL</th>
                <th style={{ textAlign: "right" }}>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {pagedSources.length > 0 ? (
                pagedSources.map((source) => {
                  const isSelected = selectedSources.includes(source.id);
                  return (
                    <tr
                      key={source.id}
                      className={isSelected ? "is-selected" : ""}
                      onClick={() => toggleSelectSource(source.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSource(source.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td>
                        <strong style={{ color: "#ffffff" }}>{source.name}</strong>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: "rgba(255,255,255,0.06)",
                            fontSize: "10.5px",
                          }}
                        >
                          {source.sourceType === "url" ? "🌐 URL" : "📁 File"}
                        </span>
                      </td>
                      <td>
                        <small style={{ color: "#94a3b8" }}>{source.source}</small>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ color: "#10b981", fontWeight: 700, fontSize: "11px" }}>
                          Sẵn sàng
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    Chưa có nguồn video nào. Bấm <strong>"+ Thêm video máy"</strong> hoặc <strong>"+ Thêm Link URL"</strong> để bắt đầu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sources.length > sourcePageSize && (
          <Pagination
            total={sources.length}
            pageSize={sourcePageSize}
            page={sourcePage}
            onPageChange={setSourcePage}
          />
        )}
      </section>

      {/* Section 2: Hàng đợi Render Hàng Loạt (Queue Table) */}
      <section className="panel-card" style={{ marginTop: "14px" }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">BATCH RENDER QUEUE</p>
            <h3>Hàng đợi render ({processJobs.length})</h3>
          </div>
          {selectedJobIds.length > 0 && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {onCancelJob && selectedJobIds.some((id) => {
                const j = jobs.find((item) => item.id === id);
                return j?.status === "running" || j?.status === "queued";
              }) && (
                <button
                  type="button"
                  className="button-danger"
                  style={{ background: "rgba(239, 68, 68, 0.2)", borderColor: "#ef4444", color: "#fca5a5" }}
                  onClick={() => {
                    const activeSelected = selectedJobIds.filter((id) => {
                      const j = jobs.find((item) => item.id === id);
                      return j?.status === "running" || j?.status === "queued";
                    });
                    if (!activeSelected.length) return;
                    if (!window.confirm(`Hủy ${activeSelected.length} job đã chọn?`)) return;
                    activeSelected.forEach((id) => onCancelJob(id));
                  }}
                >
                  <Icon name="x" size={12} /> Hủy ({selectedJobIds.filter((id) => {
                    const j = jobs.find((item) => item.id === id);
                    return j?.status === "running" || j?.status === "queued";
                  }).length}) job
                </button>
              )}

              {onRetryJob && selectedJobIds.some((id) => {
                const j = jobs.find((item) => item.id === id);
                return j?.status === "failed" || j?.status === "cancelled";
              }) && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ borderColor: "#38bdf8", color: "#38bdf8" }}
                  onClick={() => {
                    const retrySelected = selectedJobIds.filter((id) => {
                      const j = jobs.find((item) => item.id === id);
                      return j?.status === "failed" || j?.status === "cancelled";
                    });
                    retrySelected.forEach((id) => onRetryJob(id));
                  }}
                >
                  <Icon name="refresh" size={12} /> Chạy lại ({selectedJobIds.filter((id) => {
                    const j = jobs.find((item) => item.id === id);
                    return j?.status === "failed" || j?.status === "cancelled";
                  }).length}) job
                </button>
              )}

              <button type="button" className="button-danger" onClick={deleteSelectedJobs}>
                <Icon name="trash" size={12} /> Xóa {selectedJobIds.length} job
              </button>
            </div>
          )}
        </div>

        <div className="jacs-table-wrapper">
          <table className="jacs-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={processJobs.length > 0 && selectedJobIds.length === processJobs.length}
                    onChange={toggleAllJobs}
                  />
                </th>
                <th>Tên Job</th>
                <th>Trạng thái</th>
                <th>Tiến trình</th>
                <th>Ngôn ngữ</th>
                <th>Thời gian</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedJobs.length > 0 ? (
                pagedJobs.map((job) => (
                  <tr key={job.id} className={selectedJobIds.includes(job.id) ? "is-selected" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedJobIds.includes(job.id)}
                        onChange={() => toggleSelectJob(job.id)}
                      />
                    </td>
                    <td>
                      <strong style={{ color: "#ffffff" }}>{job.name}</strong>
                    </td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                    <td style={{ minWidth: "120px" }}>
                      <div className="job-progress">
                        <div className="progress-track">
                          <i style={{ width: `${job.progress}%` }} />
                        </div>
                        <small>{job.progress}%</small>
                      </div>
                    </td>
                    <td>{LANGUAGE_LABELS[job.languages?.[0] || ""] || "Tiếng Việt"}</td>
                    <td>
                      <small style={{ color: "#94a3b8" }}>{job.createdAt}</small>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {onOpenTimeline && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => onOpenTimeline(job.id)}
                        >
                          Dựng
                        </button>
                      )}
                      {job.outputPath && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => void getRuntime().revealPath(job.outputPath!)}
                        >
                          Mở file
                        </button>
                      )}
                      {(job.status === "failed" || job.status === "cancelled") && onRetryJob && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => onRetryJob(job.id)}
                        >
                          Chạy lại
                        </button>
                      )}
                      {(job.status === "running" || job.status === "queued") && onCancelJob && (
                        <button
                          type="button"
                          className="text-button"
                          style={{ color: "#f87171" }}
                          onClick={() => onCancelJob(job.id)}
                        >
                          Hủy
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    Chưa có job nào trong hàng đợi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {processJobs.length > queuePageSize && (
          <Pagination
            total={processJobs.length}
            pageSize={queuePageSize}
            page={queuePage}
            onPageChange={setQueuePage}
          />
        )}
      </section>

      {/* Modal Cấu hình Preset Hàng Loạt */}
      <Modal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        title="Cấu hình Preset Xử Lý Hàng Loạt"
        eyebrow="BATCH PROCESSING PRESET"
        maxWidth="600px"
      >
        <div className="field-pair">
          <label className="field-label">
            Engine Thực Thi
            <select value={mode} onChange={(e) => setMode(e.target.value as Job["mode"])}>
              <option value="local-gpu">GPU Local (NVIDIA / Apple)</option>
              <option value="local-cpu">CPU Local Fallback</option>
              <option value="hybrid">Hybrid (AI Cloud + Render Local)</option>
            </select>
          </label>

          <label className="field-label">
            Tỷ lệ Khung Hình
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as Job["aspectRatio"])}
            >
              <option value="9:16">9:16 Shorts / TikTok / Reels</option>
              <option value="16:9">16:9 YouTube Ngang</option>
              <option value="1:1">1:1 Square</option>
            </select>
          </label>
        </div>

        <div className="field-pair" style={{ marginTop: "12px" }}>
          <label className="field-label">
            Giới tính Giọng Đọc
            <select
              value={narratorGender}
              onChange={(e) => setNarratorGender(e.target.value as "male" | "female")}
            >
              <option value="female">Nữ (Truyền cảm / Tự nhiên)</option>
              <option value="male">Nam (Trầm ấm / Bản tin)</option>
            </select>
          </label>

          <label className="field-label">
            Ngôn ngữ Đầu Ra
            <select
              value={languages[0] || "vi"}
              onChange={(e) => setLanguages([e.target.value])}
            >
              {LANGUAGE_OPTIONS.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#cbd5e1", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={narratorEnabled}
              onChange={(e) => setNarratorEnabled(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#f95738" }}
            />
            Tự động tạo giọng đọc Voice AI theo ngữ cảnh kịch bản
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#cbd5e1", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={keepOriginalAudio}
              onChange={(e) => setKeepOriginalAudio(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#f95738" }}
            />
            Giữ âm thanh nền gốc của video (Bilingual audio)
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#cbd5e1", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={splitScenes}
              onChange={(e) => setSplitScenes(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#f95738" }}
            />
            Tách phân cảnh thành từng job con độc lập
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "22px" }}>
          <button type="button" className="button-quiet" onClick={() => setIsPresetModalOpen(false)}>
            Đóng
          </button>
          <button type="button" className="btn-primary" onClick={createBatch}>
            Áp dụng & Tạo Job
          </button>
        </div>
      </Modal>

      {/* Modal Thêm URL */}
      <Modal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        title="Thêm Video Từ URL"
        eyebrow="BATCH URL IMPORTER"
        maxWidth="500px"
      >
        <label className="field-label">
          Dán URL (TikTok, MP4, HLS... Mỗi URL một dòng)
          <textarea
            rows={5}
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mp4"
          />
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
          <button type="button" className="button-quiet" onClick={() => setIsUrlModalOpen(false)}>
            Hủy
          </button>
          <button type="button" className="btn-primary" onClick={addUrl}>
            Thêm vào danh sách
          </button>
        </div>
      </Modal>
    </div>
  );
}
