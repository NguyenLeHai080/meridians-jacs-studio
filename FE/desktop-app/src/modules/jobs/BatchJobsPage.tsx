import React, { useEffect, useMemo, useState } from "react";
import type { Job, ProviderProfile } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { normalizePastedUrl, providerIsReady, sourceNameFromUrl } from "../../core/job-utils";
import { defaultVoice, voicesForLanguage } from "../../core/voice-packs";
import { StatusPill } from "../../shared/StatusPill";
import { Pagination } from "../../shared/Pagination";
import { Modal } from "../../shared/Modal";
import { popup } from "../../shared/popup";
import {
  LayersFill,
  PlusLg,
  Upload,
  Link45deg,
  Sliders,
  LightningChargeFill,
  Trash3Fill,
  ArrowRepeat,
  Check2,
  CpuFill,
  Film,
  CheckCircleFill,
  ExclamationTriangleFill,
  XCircleFill,
  ClockHistory,
  FolderFill,
  PlayFill,
  XLg,
  GearFill,
  CollectionPlayFill,
  FileEarmarkPlayFill,
  Globe2,
} from "react-bootstrap-icons";

type Source = {
  id: string;
  name: string;
  source: string;
  sourceType: "file" | "url";
  localPath?: string;
};

const LANGUAGE_OPTIONS = [
  ["vi", "Tiếng Việt (Việt Nam)"],
  ["en", "English (US / UK)"],
  ["ja", "日本語 · Tiếng Nhật"],
  ["ko", "한국어 · Tiếng Hàn"],
  ["zh-CN", "中文 · Trung Quốc"],
  ["zh-TW", "繁體中文 · Đài Loan"],
  ["th", "ไทย · Thái Lan"],
  ["id", "Bahasa Indonesia"],
  ["ms", "Melayu · Malaysia"],
  ["fil", "Filipino · Tagalog"],
  ["fr", "Français · Tiếng Pháp"],
  ["es", "Español · Tây Ban Nha"],
  ["pt-BR", "Português · Brazil"],
  ["de", "Deutsch · Tiếng Đức"],
  ["it", "Italiano · Tiếng Ý"],
  ["ru", "Русский · Tiếng Nga"],
  ["tr", "Türkçe · Thổ Nhĩ Kỳ"],
  ["ar", "العربية · Tiếng Ả Rập"],
  ["hi", "हिन्दी · Tiếng Hindi"],
  ["nl", "Nederlands · Tiếng Hà Lan"],
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
  const sourcePageSize = 6;
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

  // Metrics summary
  const runningJobsCount = useMemo(
    () => processJobs.filter((j) => j.status === "running" || j.status === "queued").length,
    [processJobs]
  );
  const completedJobsCount = useMemo(
    () => processJobs.filter((j) => j.status === "completed").length,
    [processJobs]
  );
  const failedJobsCount = useMemo(
    () => processJobs.filter((j) => j.status === "failed").length,
    [processJobs]
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
        mode: "local-gpu",
        status: "queued",
        stage: "queued",
        progress: 0,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        synced: true,
      })
    );
    popup.success(`Đã nạp ${additions.length} file video vào danh sách nguồn.`);
  }

  function addUrl() {
    const urls = urlText.split(/[\n,]+/).map(normalizePastedUrl).filter(Boolean);
    const invalid = urls.find((url) => !/^https?:\/\//i.test(url));
    if (!urls.length || invalid) {
      popup.error("URL không hợp lệ", "Mỗi URL phải bắt đầu bằng http:// hoặc https://");
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
        mode: "local-gpu",
        status: "queued",
        stage: "downloading",
        progress: 0,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        synced: true,
      })
    );
    setUrlText("");
    setIsUrlModalOpen(false);
    popup.success(`Đã thêm ${additions.length} URL video vào danh sách.`);
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

  async function deleteSelectedJobs() {
    if (!onDeleteJobs || !selectedJobIds.length) return;
    const confirmed = await popup.confirmDelete(
      "Xác Nhận Xóa Job",
      `Bạn có chắc chắn muốn xóa ${selectedJobIds.length} job đã chọn khỏi hàng đợi?`
    );
    if (!confirmed) return;
    onDeleteJobs(selectedJobIds);
    setSelectedJobIds([]);
    popup.success(`Đã xóa ${selectedJobIds.length} job khỏi hàng đợi.`);
  }

  function createBatch() {
    const chosen = sources.filter((source) => selectedSources.includes(source.id));
    if (!chosen.length) {
      popup.warning("Chưa chọn nguồn video", "Hãy tích chọn ít nhất 1 nguồn video để tạo job.");
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
    popup.success(`⚡ Đã tạo thành công ${count} job và đưa vào hàng đợi render.`);
  }

  return (
    <div
      className="batch-workspace-root animate-fade-in"
      style={{
        padding: "10px 16px 80px 16px",
        width: "100%",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        height: "100%",
        flex: "1 1 0%",
        overflowY: "auto",
      }}
    >
      {/* 1. Header Action Toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px", flexShrink: 0 }}>
        {/* Header Action Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void chooseVideos()}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
          >
            <Upload size={13} color="#38bdf8" /> + Thêm video máy
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsUrlModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
          >
            <Link45deg size={15} color="#a855f7" /> + Thêm Link URL
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsPresetModalOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
          >
            <Sliders size={13} color="#fbbf24" /> Cấu hình Preset
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={createBatch}
            disabled={!selectedSources.length}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 800,
              cursor: selectedSources.length ? "pointer" : "not-allowed",
              background: selectedSources.length ? "linear-gradient(135deg, #d97706, #f59e0b)" : "rgba(255,255,255,0.08)",
              border: "none",
              color: selectedSources.length ? "#12151f" : "#64748b",
              boxShadow: selectedSources.length ? "0 0 16px rgba(245, 158, 11, 0.4)" : "none",
            }}
          >
            <LightningChargeFill size={13} /> Chạy {selectedSources.length * languages.length} Job
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Summary Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "8px",
          marginBottom: "12px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: "rgba(18, 22, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              background: "rgba(56, 189, 248, 0.12)",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            <Film />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
              NGUỒN VIDEO SẴN SÀNG
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {sources.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>video</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(18, 22, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              background: "rgba(245, 158, 11, 0.12)",
              color: "#fbbf24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            <LayersFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
              HÀNG ĐỢI RENDER
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#fbbf24", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {processJobs.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>job</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(18, 22, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              background: runningJobsCount ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.06)",
              color: runningJobsCount ? "#fbbf24" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            <ClockHistory className={runningJobsCount ? "animate-spin" : ""} />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
              ĐANG XỬ LÝ / CHỜ
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: runningJobsCount ? "#fbbf24" : "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {runningJobsCount} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>đang chạy</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(18, 22, 32, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "8px",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "34px",
              height: "34px",
              borderRadius: "7px",
              background: "rgba(16, 185, 129, 0.12)",
              color: "#34d399",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              flexShrink: 0,
            }}
          >
            <CheckCircleFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
              ĐÃ HOÀN TẤT
            </div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#34d399", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {completedJobsCount} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>thành công</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section 1: Nguồn Video Đầu Vào (Table) */}
      <section
        style={{
          background: "rgba(16, 20, 30, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "10px",
          padding: "14px 16px",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              DANH SÁCH NGUỒN VIDEO ĐẦU VÀO
            </span>
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
              Nguồn Video Chọn Lọc ({sources.length}) · Đã chọn {selectedSources.length} nguồn
            </h3>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={toggleAllSources}
              style={{ fontSize: "11.5px", padding: "5px 12px" }}
            >
              {selectedSources.length === sources.length && sources.length > 0 ? "Bỏ chọn tất cả" : "Chọn tất cả nguồn"}
            </button>
          </div>
        </div>

        <div className="jacs-table-wrapper" style={{ border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "8px", overflow: "hidden" }}>
          <table className="jacs-table">
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.35)" }}>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={sources.length > 0 && selectedSources.length === sources.length}
                    onChange={toggleAllSources}
                    style={{ accentColor: "#f59e0b", cursor: "pointer" }}
                  />
                </th>
                <th>Tên Video / Tiêu Đề</th>
                <th>Loại Nguồn</th>
                <th>Đường dẫn / URL gốc</th>
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
                      style={{ cursor: "pointer", background: isSelected ? "rgba(245, 158, 11, 0.08)" : undefined }}
                    >
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSource(source.id)}
                          style={{ accentColor: "#f59e0b", cursor: "pointer" }}
                        />
                      </td>
                      <td>
                        <strong style={{ color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                          <Film size={13} color="#f59e0b" />
                          {source.name}
                        </strong>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            background: source.sourceType === "url" ? "rgba(168, 85, 247, 0.15)" : "rgba(56, 189, 248, 0.15)",
                            color: source.sourceType === "url" ? "#c084fc" : "#38bdf8",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          {source.sourceType === "url" ? <Globe2 size={11} /> : <FolderFill size={11} />}
                          {source.sourceType === "url" ? "URL Web" : "File máy"}
                        </span>
                      </td>
                      <td style={{ maxWidth: "320px" }}>
                        <small style={{ color: "#94a3b8", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {source.source}
                        </small>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ color: "#34d399", fontWeight: 700, fontSize: "11.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Check2 size={13} /> Sẵn sàng
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    <CollectionPlayFill size={28} style={{ opacity: 0.3, margin: "0 auto 8px", display: "block" }} />
                    Chưa có nguồn video nào. Bấm <strong>"+ Thêm video máy"</strong> hoặc <strong>"+ Thêm Link URL"</strong> để bắt đầu tạo job.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {sources.length > sourcePageSize && (
          <div style={{ marginTop: "12px" }}>
            <Pagination
              total={sources.length}
              pageSize={sourcePageSize}
              page={sourcePage}
              onPageChange={setSourcePage}
            />
          </div>
        )}
      </section>

      {/* 4. Section 2: Hàng đợi Render Hàng Loạt (Queue Table) */}
      <section
        style={{
          background: "rgba(16, 20, 30, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "10px",
          padding: "14px 16px",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              HÀNG ĐỢI RENDER TỰ ĐỘNG
            </span>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
              Tiến Trình & Trạng Thái Xử Lý ({processJobs.length})
            </h3>
          </div>

          {/* Bulk Queue Action Controls */}
          {selectedJobIds.length > 0 && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              {onCancelJob && selectedJobIds.some((id) => {
                const j = jobs.find((item) => item.id === id);
                return j?.status === "running" || j?.status === "queued";
              }) && (
                <button
                  type="button"
                  onClick={async () => {
                    const activeSelected = selectedJobIds.filter((id) => {
                      const j = jobs.find((item) => item.id === id);
                      return j?.status === "running" || j?.status === "queued";
                    });
                    if (!activeSelected.length) return;
                    const confirmed = await popup.confirm(
                      "Hủy Tiến Trình Job",
                      `Hủy ${activeSelected.length} job đang chạy / chờ xử lý đã chọn?`
                    );
                    if (!confirmed) return;
                    activeSelected.forEach((id) => onCancelJob(id));
                    popup.info(`Đã gửi lệnh hủy ${activeSelected.length} job.`);
                  }}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#f87171",
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <XLg size={11} /> Hủy ({selectedJobIds.filter((id) => {
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
                  onClick={() => {
                    const retrySelected = selectedJobIds.filter((id) => {
                      const j = jobs.find((item) => item.id === id);
                      return j?.status === "failed" || j?.status === "cancelled";
                    });
                    retrySelected.forEach((id) => onRetryJob(id));
                    popup.success(`Đã khởi động lại ${retrySelected.length} job.`);
                  }}
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    color: "#38bdf8",
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <ArrowRepeat size={12} /> Chạy lại ({selectedJobIds.filter((id) => {
                    const j = jobs.find((item) => item.id === id);
                    return j?.status === "failed" || j?.status === "cancelled";
                  }).length}) job
                </button>
              )}

              <button
                type="button"
                onClick={deleteSelectedJobs}
                style={{
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  color: "#fca5a5",
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Trash3Fill size={11} /> Xóa {selectedJobIds.length} job
              </button>
            </div>
          )}
        </div>

        <div className="jacs-table-wrapper" style={{ border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "8px", overflow: "hidden" }}>
          <table className="jacs-table">
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.35)" }}>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={processJobs.length > 0 && selectedJobIds.length === processJobs.length}
                    onChange={toggleAllJobs}
                    style={{ accentColor: "#f59e0b", cursor: "pointer" }}
                  />
                </th>
                <th>Tên Job</th>
                <th>Trạng thái</th>
                <th>Tiến trình Render</th>
                <th>Ngôn ngữ</th>
                <th>Thời gian</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedJobs.length > 0 ? (
                pagedJobs.map((job) => (
                  <tr key={job.id} className={selectedJobIds.includes(job.id) ? "is-selected" : ""}>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedJobIds.includes(job.id)}
                        onChange={() => toggleSelectJob(job.id)}
                        style={{ accentColor: "#f59e0b", cursor: "pointer" }}
                      />
                    </td>
                    <td>
                      <strong style={{ color: "#ffffff", display: "block" }}>{job.name}</strong>
                      <small style={{ color: "#64748b", fontSize: "11px" }}>
                        {STAGE_LABELS[job.stage || ""] || job.stage || "Đang xử lý"}
                      </small>
                    </td>
                    <td>
                      <StatusPill status={job.status} />
                    </td>
                    <td style={{ minWidth: "140px" }}>
                      <div className="job-progress">
                        <div className="progress-track" style={{ background: "rgba(255, 255, 255, 0.08)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                          <i
                            style={{
                              width: `${job.progress}%`,
                              background: job.status === "failed" ? "#ef4444" : job.status === "completed" ? "#34d399" : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                              height: "100%",
                              display: "block",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                        <small style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>{job.progress}%</small>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: "rgba(255,255,255,0.06)",
                          fontSize: "11px",
                          color: "#cbd5e1",
                        }}
                      >
                        {LANGUAGE_LABELS[job.languages?.[0] || ""] || "Tiếng Việt"}
                      </span>
                    </td>
                    <td>
                      <small style={{ color: "#94a3b8", fontSize: "11.5px" }}>{job.createdAt}</small>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        {onOpenTimeline && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "3px 8px", fontSize: "11px" }}
                            onClick={() => onOpenTimeline(job.id)}
                          >
                            Dựng
                          </button>
                        )}
                        {job.outputPath && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "3px 8px", fontSize: "11px", color: "#34d399" }}
                            onClick={() => void getRuntime().revealPath(job.outputPath!)}
                          >
                            Mở file
                          </button>
                        )}
                        {(job.status === "failed" || job.status === "cancelled") && onRetryJob && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "3px 8px", fontSize: "11px", color: "#38bdf8" }}
                            onClick={() => onRetryJob(job.id)}
                          >
                            Chạy lại
                          </button>
                        )}
                        {(job.status === "running" || job.status === "queued") && onCancelJob && (
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: "3px 8px", fontSize: "11px", color: "#f87171" }}
                            onClick={() => onCancelJob(job.id)}
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    <LayersFill size={28} style={{ opacity: 0.3, margin: "0 auto 8px", display: "block" }} />
                    Chưa có job nào trong hàng đợi. Chọn nguồn video và bấm <strong>"Chạy Job"</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {processJobs.length > queuePageSize && (
          <div style={{ marginTop: "12px" }}>
            <Pagination
              total={processJobs.length}
              pageSize={queuePageSize}
              page={queuePage}
              onPageChange={setQueuePage}
            />
          </div>
        )}
      </section>

      {/* 5. Modal Cấu hình Preset Hàng Loạt */}
      <Modal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        title="Cấu hình Preset Xử Lý Hàng Loạt"
        eyebrow="BATCH PROCESSING PRESET"
        maxWidth="620px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="field-pair">
            <label className="field-label">
              Engine Thực Thi Render
              <select value={mode} onChange={(e) => setMode(e.target.value as Job["mode"])}>
                <option value="local-gpu">GPU Hardware Acceleration (NVIDIA / Apple)</option>
                <option value="local-cpu">CPU Software Render (Fallback)</option>
                <option value="hybrid">Hybrid (AI Cloud + Render Local)</option>
              </select>
            </label>

            <label className="field-label">
              Tỷ lệ Khung Hình Render
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as Job["aspectRatio"])}
              >
                <option value="9:16">9:16 Dọc (Shorts / TikTok / Reels)</option>
                <option value="16:9">16:9 Ngang (YouTube / TV)</option>
                <option value="1:1">1:1 Vuông (Square Post)</option>
              </select>
            </label>
          </div>

          <div className="field-pair">
            <label className="field-label">
              Giới tính Giọng Đọc AI
              <select
                value={narratorGender}
                onChange={(e) => setNarratorGender(e.target.value as "male" | "female")}
              >
                <option value="female">Nữ (Truyền cảm / Tự nhiên / Review Phim)</option>
                <option value="male">Nam (Trầm ấm / Bản tin / Kịch tính)</option>
              </select>
            </label>

            <label className="field-label">
              Ngôn ngữ Đầu Ra Mặc Định
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

          {/* Preset Toggles */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12.5px", color: "#cbd5e1", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={narratorEnabled}
                onChange={(e) => setNarratorEnabled(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#f59e0b" }}
              />
              <span>Tự động tạo giọng đọc Voice AI theo ngữ cảnh kịch bản</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12.5px", color: "#cbd5e1", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={keepOriginalAudio}
                onChange={(e) => setKeepOriginalAudio(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#f59e0b" }}
              />
              <span>Giữ âm thanh nền gốc của video (Bilingual audio background)</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12.5px", color: "#cbd5e1", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={splitScenes}
                onChange={(e) => setSplitScenes(e.target.checked)}
                style={{ width: "16px", height: "16px", accentColor: "#f59e0b" }}
              />
              <span>Tự động tách các phân cảnh thành từng video clip con độc lập</span>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" className="btn-secondary" onClick={() => setIsPresetModalOpen(false)}>
              Đóng
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={createBatch}
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 14px rgba(245, 158, 11, 0.4)" }}
            >
              Áp dụng & Tạo Job
            </button>
          </div>
        </div>
      </Modal>

      {/* 6. Modal Thêm URL Hàng Loạt */}
      <Modal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        title="Thêm Video Từ URL Hàng Loạt"
        eyebrow="BATCH URL IMPORTER"
        maxWidth="520px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label className="field-label">
            Dán danh sách URL (TikTok, YouTube, MP4, HLS... Mỗi URL một dòng)
            <textarea
              rows={6}
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              placeholder="https://www.tiktok.com/@user/video/123456&#10;https://example.com/video2.mp4"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                lineHeight: "1.5",
                background: "rgba(0, 0, 0, 0.35)",
              }}
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
            <button type="button" className="btn-secondary" onClick={() => setIsUrlModalOpen(false)}>
              Hủy
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={addUrl}
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              Thêm vào danh sách nguồn
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
