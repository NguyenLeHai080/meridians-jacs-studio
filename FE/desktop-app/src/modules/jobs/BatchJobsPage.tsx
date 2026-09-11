import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Job, NavKey, ProviderProfile } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import { normalizePastedUrl, providerIsReady, sourceNameFromUrl } from "../../core/job-utils";
import { defaultVoice, voicesForLanguage } from "../../core/voice-packs";
import { StatusPill } from "../../shared/StatusPill";
import { Pagination } from "../../shared/Pagination";
import { Modal } from "../../shared/Modal";
import { popup } from "../../shared/popup";
import { fileUrl, toSeconds, formatSeconds, stripSceneMetadata } from "../editor/utils/editorTime";
import { stopGlobalAudio } from "../../core/audio-player";
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
  ShieldCheck,
  Eye,
} from "react-bootstrap-icons";

type Source = {
  id: string;
  name: string;
  source: string;
  sourceType: "file" | "url";
  localPath?: string;
  job?: Job;
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
  onUpdateJob,
  onCancelJob,
  onRetryJob,
  onDeleteJobs,
  onOpenTimeline,
  onNavigate,
}: {
  jobs: Job[];
  onAddJob: (job: Job) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  onCancelJob?: (jobId: string) => void;
  onRetryJob?: (jobId: string) => void;
  onDeleteJobs?: (jobIds: string[]) => void;
  onOpenTimeline?: (jobId: string) => void;
  onNavigate?: (key: NavKey) => void;
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [urlText, setUrlText] = useState("");
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const [reviewTime, setReviewTime] = useState(0);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);

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

  // Render Queue Table: only dedicated render tasks or active queue jobs
  const processJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.id.startsWith("render-") ||
          job.id.startsWith("export-") ||
          Boolean(job.parentJobId) ||
          job.name.startsWith("[Xuất]") ||
          (job.status === "queued" && job.stage === "queued") ||
          (job.status === "running" && Boolean(job.stage))
      ),
    [jobs]
  );

  // Helper to determine live render status of a source
  const getSourceRenderState = useCallback(
    (source: Source) => {
      // Look for any dedicated render job in the queue/history associated with this source
      const renderJob = jobs.find((j) => {
        if (j.id.startsWith("render-") || j.id.startsWith("export-") || Boolean(j.parentJobId) || j.name.startsWith("[Xuất]")) {
          if (j.parentJobId && j.parentJobId === source.id) return true;
          if (j.id.endsWith(source.id)) return true;
          if (source.localPath && j.localPath === source.localPath) return true;
          if (source.source && j.source === source.source) return true;
        }
        return false;
      });

      if (!renderJob) {
        return { status: "pending" as const, job: null, progress: 0, outputPath: undefined };
      }

      return {
        status: renderJob.status as "queued" | "running" | "completed" | "failed" | "cancelled",
        job: renderJob,
        progress: renderJob.progress || 0,
        outputPath: renderJob.outputPath,
      };
    },
    [jobs]
  );

  // Tab filter: "pending" (Chưa xuất - default) | "rendered" (Đã/Đang xuất) | "all" (Tất cả)
  const [sourceFilter, setSourceFilter] = useState<"pending" | "rendered" | "all">("pending");

  const pendingSources = useMemo(() => {
    return sources.filter((s) => {
      const state = getSourceRenderState(s);
      return state.status === "pending" || state.status === "failed";
    });
  }, [sources, getSourceRenderState]);

  const renderedSources = useMemo(() => {
    return sources.filter((s) => {
      const state = getSourceRenderState(s);
      return ["queued", "running", "completed"].includes(state.status);
    });
  }, [sources, getSourceRenderState]);

  const displayedSources = useMemo(() => {
    if (sourceFilter === "pending") return pendingSources;
    if (sourceFilter === "rendered") return renderedSources;
    return sources;
  }, [sourceFilter, pendingSources, renderedSources, sources]);

  const pagedSources = useMemo(
    () => displayedSources.slice((sourcePage - 1) * sourcePageSize, sourcePage * sourcePageSize),
    [displayedSources, sourcePage, sourcePageSize]
  );

  const pagedJobs = useMemo(
    () => processJobs.slice((queuePage - 1) * queuePageSize, queuePage * queuePageSize),
    [processJobs, queuePage, queuePageSize]
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
    return () => {
      stopGlobalAudio();
    };
  }, []);

  useEffect(() => {
    const timelineJobs = jobs.filter(
      (job) =>
        !job.id.startsWith("render-") && // Crucial: Render output jobs must not be counted as timeline sources!
        !job.id.startsWith("export-") &&
        !Boolean(job.parentJobId) &&
        Boolean(job.analysis) &&
        job.timelineReady === true // Only load videos explicitly transferred from Timeline!
    );

    const persisted: Source[] = timelineJobs.map((job) => ({
      id: job.id,
      name: job.name,
      source: job.source || job.localPath || job.name,
      sourceType: (job.sourceType || "file") as "file" | "url",
      localPath: job.localPath,
      job,
    }));

    setSources(persisted);
  }, [jobs]);

  // Keep selectedSources strictly valid for current displayedSources
  useEffect(() => {
    setSelectedSources((current) => {
      const validIds = new Set(displayedSources.map((s) => s.id));
      return current.filter((id) => validIds.has(id));
    });
  }, [displayedSources]);

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
      current.length === displayedSources.length && displayedSources.length > 0
        ? []
        : displayedSources.map((s) => s.id)
    );
  }

  function clearCompletedJobs() {
    const completed = processJobs.filter((j) => j.status === "completed");
    if (!completed.length) {
      popup.info("Không có job", "Không có job nào đã hoàn tất để dọn dẹp.");
      return;
    }

    const toDelete: string[] = [];
    completed.forEach((j) => {
      if (j.id.startsWith("render-") || j.id.startsWith("export-") || Boolean(j.parentJobId)) {
        toDelete.push(j.id);
      } else {
        // Source project: reset its render queue state safely without deleting the project!
        onUpdateJob?.(j.id, {
          sourceOnly: true,
          status: "completed",
          stage: undefined,
          progress: 0,
          outputPath: undefined,
        });
      }
    });

    if (toDelete.length > 0 && onDeleteJobs) {
      onDeleteJobs(toDelete);
    }
    popup.success(`Đã dọn dẹp ${completed.length} job render đã xong (Video nguồn & phân tích trên các trang khác vẫn được bảo toàn nguyên vẹn).`);
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
    if (!selectedJobIds.length) return;
    const confirmed = await popup.confirmDelete(
      "Xác Nhận Xóa Job",
      `Bạn có chắc chắn muốn xóa ${selectedJobIds.length} job khỏi hàng đợi render? (Video gốc và dữ liệu phân tích trên các trang khác vẫn sẽ được giữ nguyên an toàn).`
    );
    if (!confirmed) return;

    const toDelete: string[] = [];
    selectedJobIds.forEach((id) => {
      const j = jobs.find((item) => item.id === id);
      if (j && (j.id.startsWith("render-") || j.id.startsWith("export-") || Boolean(j.parentJobId))) {
        toDelete.push(id);
      } else if (j) {
        // Source project: reset render queue state safely without deleting the video
        onUpdateJob?.(j.id, {
          sourceOnly: true,
          status: j.analysis?.scenes?.length ? "completed" : "queued",
          stage: undefined,
          progress: 0,
          outputPath: undefined,
        });
      }
    });

    if (toDelete.length > 0 && onDeleteJobs) {
      onDeleteJobs(toDelete);
    }
    setSelectedJobIds([]);
    popup.success(`Đã xóa ${selectedJobIds.length} job khỏi hàng đợi render.`);
  }

  function createBatch() {
    const chosen = displayedSources.filter((source) => selectedSources.includes(source.id));
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
    setSelectedSources([]);
    setIsPresetModalOpen(false);
    popup.success(`⚡ Đã tạo thành công ${count} job và đưa vào hàng đợi render.`);
  }

  function handleExportSingle(source: Source) {
    const job = source.job || jobs.find((j) => j.id === source.id || (source.localPath && j.localPath === source.localPath));
    const renderJobId = `render-${Date.now()}-${source.id}`;
    const scenes = job?.scenes || (job?.analysis?.scenes as any) || [];
    const fullNarration = (job?.narrationText || job?.subtitleText || job?.analysis?.voiceScript || scenes.map((s: any) => s.voiceover || s.translation || s.subtitle || s.detail).filter(Boolean).join(" ")).trim();

    let cursor = 0;
    const cuts = (job as any)?.cutClips || (job?.timelineClips && job.timelineClips.length > 0 ? job.timelineClips : scenes.map((s: any, idx: number) => {
      const srcStart = s.sourceTimeStart ?? toSeconds(s.sourceStart || s.start || 0);
      const sceneDur = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start) || (s.duration ? toSeconds(s.duration) : 5));
      const srcEnd = s.sourceTimeEnd ?? (srcStart + sceneDur);
      const text = stripSceneMetadata(s.voiceover || s.translation || s.subtitle || s.detail || "").trim();
      return {
        sceneId: s.id || `scene-${idx + 1}`,
        sourceStart: srcStart,
        sourceEnd: srcEnd,
        sourceTimeStart: srcStart,
        sourceTimeEnd: srcEnd,
        duration: sceneDur,
        text,
        title: s.title || `Cảnh ${idx + 1}`,
        subtitle: text,
        subtitleText: text,
      };
    }));

    const subSegments = (job as any)?.subtitleSegments || scenes.map((s: any) => {
      const sceneDur = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start) || 5);
      const tStart = cursor;
      const tEnd = cursor + sceneDur;
      cursor = tEnd;
      const text = stripSceneMetadata(s.voiceover || s.translation || s.subtitle || s.detail || "").trim();
      return { start: tStart, end: tEnd, text };
    }).filter((s: any) => s.text);

    const totalDur = cursor || job?.durationSeconds || 60;
    const renderJob: Job = {
      id: renderJobId,
      parentJobId: source.id,
      name: `[Xuất] ${source.name.replace(/\.[^.]+$/, "")}`,
      source: source.source,
      sourceType: source.sourceType,
      localPath: source.localPath || job?.localPath,
      sourceOnly: false,
      mode: "local-gpu",
      durationSeconds: totalDur,
      aspectRatio: job?.aspectRatio || "9:16",
      narratorEnabled: job?.narratorEnabled ?? true,
      narratorVoice: job?.narratorVoice,
      languages: job?.languages || ["vi"],
      cutClips: cuts,
      timelineClips: cuts as any,
      subtitleSegments: subSegments,
      scenes,
      analysis: job?.analysis,
      audioLayers: job?.audioLayers,
      subtitleStyle: job?.subtitleStyle || "gold",
      subtitleText: fullNarration,
      narrationText: fullNarration,
      status: "queued",
      stage: "queued",
      progress: 0,
      createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };
    onAddJob(renderJob);
    setSelectedSources((prev) => prev.filter((id) => id !== source.id));
    popup.success(`⚡ Đã đưa video "${source.name}" vào hàng đợi render tuần tự.`);
  }

  function handleBatchExport() {
    const chosen = displayedSources.filter((source) => selectedSources.includes(source.id));
    const targets = chosen.length > 0 ? chosen : displayedSources;
    if (!targets.length) {
      popup.warning("Chưa có video", "Không có video nào trong danh sách cần xuất.");
      return;
    }
    const stamp = Date.now();
    targets.forEach((source, idx) => {
      const job = source.job || jobs.find((j) => j.id === source.id || (source.localPath && j.localPath === source.localPath));
      const scenes = job?.scenes || (job?.analysis?.scenes as any) || [];
      const fullNarration = (job?.narrationText || job?.subtitleText || job?.analysis?.voiceScript || scenes.map((s: any) => s.voiceover || s.translation || s.subtitle || s.detail).filter(Boolean).join(" ")).trim();

      let cursor = 0;
      const cuts = (job as any)?.cutClips || (job?.timelineClips && job.timelineClips.length > 0 ? job.timelineClips : scenes.map((s: any, sIdx: number) => {
        const srcStart = s.sourceTimeStart ?? toSeconds(s.sourceStart || s.start || 0);
        const sceneDur = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start) || (s.duration ? toSeconds(s.duration) : 5));
        const srcEnd = s.sourceTimeEnd ?? (srcStart + sceneDur);
        const text = stripSceneMetadata(s.voiceover || s.translation || s.subtitle || s.detail || "").trim();
        return {
          sceneId: s.id || `scene-${sIdx + 1}`,
          sourceStart: srcStart,
          sourceEnd: srcEnd,
          sourceTimeStart: srcStart,
          sourceTimeEnd: srcEnd,
          duration: sceneDur,
          text,
          title: s.title || `Cảnh ${sIdx + 1}`,
          subtitle: text,
          subtitleText: text,
        };
      }));

      const subSegments = (job as any)?.subtitleSegments || scenes.map((s: any) => {
        const sceneDur = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start) || 5);
        const tStart = cursor;
        const tEnd = cursor + sceneDur;
        cursor = tEnd;
        const text = stripSceneMetadata(s.voiceover || s.translation || s.subtitle || s.detail || "").trim();
        return { start: tStart, end: tEnd, text };
      }).filter((s: any) => s.text);

      const totalDur = cursor || job?.durationSeconds || 60;
      const renderJob: Job = {
        id: `render-${stamp}-${idx}-${source.id}`,
        parentJobId: source.id,
        name: `[Xuất] ${source.name.replace(/\.[^.]+$/, "")}`,
        source: source.source,
        sourceType: source.sourceType,
        localPath: source.localPath || job?.localPath,
        sourceOnly: false,
        mode: "local-gpu",
        durationSeconds: totalDur,
        aspectRatio: job?.aspectRatio || "9:16",
        narratorEnabled: job?.narratorEnabled ?? true,
        narratorVoice: job?.narratorVoice,
        languages: job?.languages || ["vi"],
        cutClips: cuts,
        timelineClips: cuts as any,
        subtitleSegments: subSegments,
        scenes,
        analysis: job?.analysis,
        audioLayers: job?.audioLayers,
        subtitleStyle: job?.subtitleStyle || "gold",
        subtitleText: fullNarration,
        narrationText: fullNarration,
        status: "queued",
        stage: "queued",
        progress: 0,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      onAddJob(renderJob);
    });
    setSelectedSources([]);
    popup.success(`🚀 Đã đưa ${targets.length} video vào hàng đợi render tuần tự (Bảo vệ RAM tối đa)!`);
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
      {/* 1. Header Action Toolbar / Studio Branding */}
      <div className="batch-header-glass">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              boxShadow: "0 0 16px rgba(16, 185, 129, 0.4)",
              flexShrink: 0,
            }}
          >
            <LightningChargeFill />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", margin: 0, letterSpacing: "-0.01em" }}>
                Studio Render & Xuất Hàng Loạt
              </h2>
              <span style={{ fontSize: "10px", fontWeight: 800, textTransform: "uppercase", padding: "2px 7px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                Sequential RAM Protection
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Render tuần tự tối ưu RAM, tự động ngắt đệm FFmpeg & hỗ trợ tăng tốc phần cứng GPU đa luồng.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          {onNavigate && (
            <button
              type="button"
              className="batch-btn-secondary"
              onClick={() => onNavigate("analysis")}
              title="Thêm video mới vào Bước 1 (Phân tích AI)"
            >
              <Upload size={13} color="#38bdf8" /> + Nạp video mới (Bước 1)
            </button>
          )}
          {onNavigate && (
            <button
              type="button"
              className="batch-btn-secondary"
              onClick={() => onNavigate("timeline")}
              title="Mở Bàn dựng Timeline"
            >
              <Film size={13} color="#fbbf24" /> ➔ Mở Bàn dựng Timeline
            </button>
          )}
          <button
            type="button"
            className="batch-btn-secondary"
            onClick={() => setIsPresetModalOpen(true)}
            title="Cấu hình Preset xuất video hàng loạt"
          >
            <Sliders size={13} color="#fbbf24" /> Cấu hình Preset
          </button>
          <button
            type="button"
            className="batch-btn-primary"
            onClick={handleBatchExport}
            disabled={!displayedSources.length}
            title="Xuất tất cả video đã chọn tuần tự theo thứ tự để bảo vệ RAM"
          >
            <LightningChargeFill size={13} /> 🚀 Xuất hàng loạt ({selectedSources.length > 0 ? selectedSources.length : displayedSources.length} video)
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Summary Grid */}
      <div className="batch-metric-grid">
        <div className="batch-metric-card" style={{ borderColor: "rgba(56, 189, 248, 0.25)" }}>
          <div className="batch-metric-icon" style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8" }}>
            <Film />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              CHƯA XUẤT (SẴN SÀNG)
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {pendingSources.length} <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 600 }}>video chờ xuất</span>
            </div>
          </div>
        </div>

        <div className="batch-metric-card" style={{ borderColor: "rgba(245, 158, 11, 0.25)" }}>
          <div className="batch-metric-icon" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#fbbf24" }}>
            <LayersFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              HÀNG ĐỢI RENDER
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#fbbf24", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {processJobs.length} <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>job tuần tự</span>
            </div>
          </div>
        </div>

        <div className="batch-metric-card" style={{ borderColor: runningJobsCount ? "rgba(245, 158, 11, 0.4)" : "rgba(255, 255, 255, 0.08)" }}>
          <div className="batch-metric-icon" style={{ background: runningJobsCount ? "rgba(245, 158, 11, 0.18)" : "rgba(255, 255, 255, 0.06)", color: runningJobsCount ? "#fbbf24" : "#94a3b8" }}>
            <ClockHistory className={runningJobsCount ? "animate-spin" : ""} />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ĐANG XỬ LÝ / CHỜ
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: runningJobsCount ? "#fbbf24" : "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {runningJobsCount} <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>tiến trình</span>
            </div>
          </div>
        </div>

        <div className="batch-metric-card" style={{ borderColor: "rgba(16, 185, 129, 0.25)" }}>
          <div className="batch-metric-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#34d399" }}>
            <CheckCircleFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ĐÃ HOÀN TẤT
            </div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#34d399", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {completedJobsCount} <span style={{ fontSize: "11px", color: "#6ee7b7", fontWeight: 600 }}>thành công</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section 1: Nguồn Video Đầu Vào (Table) */}
      <section className="batch-section-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              DANH SÁCH VIDEO ĐÃ DỰNG TIMELINE
            </span>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
              Nguồn Video Từ Timeline ({displayedSources.length}) · Đã chọn {selectedSources.length} nguồn
            </h3>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Filter Pills */}
            <div className="batch-filter-pills">
              <button
                type="button"
                className={`batch-filter-pill ${sourceFilter === "pending" ? "is-active-emerald" : ""}`}
                onClick={() => {
                  setSourceFilter("pending");
                  setSourcePage(1);
                }}
                title="Chỉ hiển thị các video chưa đưa vào hàng đợi render"
              >
                ⏳ Chưa xuất <span className="batch-pill-badge">{pendingSources.length}</span>
              </button>
              <button
                type="button"
                className={`batch-filter-pill ${sourceFilter === "rendered" ? "is-active" : ""}`}
                onClick={() => {
                  setSourceFilter("rendered");
                  setSourcePage(1);
                }}
                title="Hiển thị các video đang render hoặc đã xuất xong"
              >
                ⚡ Đang & Đã xuất <span className="batch-pill-badge">{renderedSources.length}</span>
              </button>
              <button
                type="button"
                className={`batch-filter-pill ${sourceFilter === "all" ? "is-active" : ""}`}
                onClick={() => {
                  setSourceFilter("all");
                  setSourcePage(1);
                }}
                title="Hiển thị tất cả video nguồn từ Timeline"
              >
                📁 Tất cả <span className="batch-pill-badge">{sources.length}</span>
              </button>
            </div>

            <button
              type="button"
              className="batch-btn-secondary"
              onClick={toggleAllSources}
              disabled={!displayedSources.length}
            >
              {selectedSources.length === displayedSources.length && displayedSources.length > 0 ? "Bỏ chọn tất cả" : "Chọn tất cả nguồn"}
            </button>

            <button
              type="button"
              className="batch-btn-primary"
              onClick={handleBatchExport}
              disabled={!displayedSources.length}
              title="Xuất tất cả video đã chọn tuần tự theo thứ tự để bảo vệ RAM"
            >
              <LightningChargeFill size={13} /> 🚀 Xuất hàng loạt ({selectedSources.length > 0 ? selectedSources.length : displayedSources.length} video)
            </button>
          </div>
        </div>

        {/* RAM Protection Banner */}
        <div className="batch-shield-box">
          <ShieldCheck size={18} color="#34d399" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: "#a7f3d0" }}>Cơ chế bảo vệ RAM & Chống treo hệ thống (Sequential Render Engine):</strong>
            <span style={{ color: "#cbd5e1", marginLeft: "6px" }}>
              Khi xuất hàng loạt, hệ thống tự động render tuần tự từng video một theo thứ tự xếp hàng (không chạy song song). Bộ nhớ đệm FFmpeg được giải phóng triệt để giữa các lượt xuất, tránh tăng RAM đột biến và ngăn ngừa 100% tình trạng đơ/treo máy.
            </span>
          </div>
        </div>

        <div className="jacs-table-wrapper" style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", overflow: "hidden" }}>
          <table className="jacs-table">
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.45)" }}>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={displayedSources.length > 0 && selectedSources.length === displayedSources.length}
                    onChange={toggleAllSources}
                    style={{ accentColor: "#10b981", cursor: "pointer", width: "15px", height: "15px" }}
                  />
                </th>
                <th>Tên Video / Tiêu Đề</th>
                <th>Phân Cảnh & Timeline</th>
                <th>Âm Thanh & Thoại</th>
                <th>Trạng thái Render</th>
                <th style={{ textAlign: "right" }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedSources.length > 0 ? (
                pagedSources.map((source) => {
                  const isSelected = selectedSources.includes(source.id);
                  const job = source.job || jobs.find((j) => j.id === source.id || (source.localPath && j.localPath === source.localPath));
                  const sceneCount = job?.scenes?.length || job?.timelineClips?.length || job?.analysis?.scenes?.length || 0;
                  const hasTimeline = sceneCount > 0 || !!job?.analysis;
                  const voiceName = job?.audioLayers?.voice?.voiceId || job?.narratorVoice || (job?.narratorEnabled ? "Voice AI" : "Gốc");
                  const hasBgm = !!job?.audioLayers?.bgm?.track;
                  const renderState = getSourceRenderState(source);

                  return (
                    <tr
                      key={source.id}
                      className={isSelected ? "is-selected" : ""}
                      onClick={() => toggleSelectSource(source.id)}
                      style={{ cursor: "pointer", background: isSelected ? "rgba(16, 185, 129, 0.08)" : undefined }}
                    >
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSource(source.id)}
                          style={{ accentColor: "#10b981", cursor: "pointer", width: "15px", height: "15px" }}
                        />
                      </td>
                      <td>
                        <strong style={{ color: "#ffffff", display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px" }}>
                          <Film size={13} color="#38bdf8" />
                          {source.name}
                        </strong>
                        <small style={{ color: "#64748b", fontSize: "11px", display: "block", marginTop: "2px", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {source.source}
                        </small>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            background: hasTimeline ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.06)",
                            color: hasTimeline ? "#38bdf8" : "#94a3b8",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          🎬 {sceneCount > 0 ? `${sceneCount} phân cảnh` : "Chưa chia cảnh"}
                        </span>
                        {job?.aspectRatio && (
                          <span
                            style={{
                              marginLeft: "6px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "rgba(255, 255, 255, 0.08)",
                              fontSize: "10.5px",
                              color: "#e2e8f0",
                              fontWeight: 600,
                            }}
                          >
                            {job.aspectRatio}
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: "11.5px", color: "#cbd5e1" }}>
                          <span style={{ color: "#94a3b8" }}>Giọng:</span> <strong>{voiceName}</strong>
                          <span style={{ margin: "0 6px", color: "#475569" }}>•</span>
                          <span style={{ color: hasBgm ? "#fbbf24" : "#64748b" }}>{hasBgm ? "🎵 BGM" : "Không BGM"}</span>
                        </div>
                      </td>
                      <td>
                        {renderState.status === "completed" ? (
                          <span style={{ color: "#34d399", fontWeight: 700, fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                            <CheckCircleFill size={12} color="#34d399" /> Đã xuất xong (100%)
                          </span>
                        ) : renderState.status === "running" ? (
                          <span style={{ color: "#38bdf8", fontWeight: 700, fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.35)" }}>
                            <ClockHistory className="animate-spin" size={12} color="#38bdf8" /> {renderState.job?.stage && renderState.job.stage !== "rendering" ? `${renderState.job.stage} (${renderState.progress}%)` : `Đang render (${renderState.progress}%)`}
                          </span>
                        ) : renderState.status === "queued" ? (
                          <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.35)" }}>
                            <LayersFill size={12} color="#fbbf24" /> Trong hàng đợi
                          </span>
                        ) : renderState.status === "failed" ? (
                          <span style={{ color: "#f87171", fontWeight: 700, fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)" }}>
                            <XCircleFill size={12} color="#f87171" /> Lỗi render
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontWeight: 600, fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 9px", borderRadius: "20px", background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.12)" }}>
                            <Check2 size={12} color="#34d399" /> Chưa xuất (Sẵn sàng)
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          {renderState.status === "completed" && renderState.outputPath && (
                            <button
                              type="button"
                              className="batch-btn-secondary"
                              onClick={() => void getRuntime().revealPath(renderState.outputPath!)}
                              style={{ padding: "4px 9px", fontSize: "11px", color: "#34d399", borderColor: "rgba(52, 211, 153, 0.4)" }}
                              title="Mở thư mục chứa file video đã xuất"
                            >
                              <FolderFill size={11} color="#34d399" /> Mở file
                            </button>
                          )}

                          {renderState.status === "completed" && (
                            <button
                              type="button"
                              className="batch-btn-secondary"
                              onClick={() => handleExportSingle(source)}
                              style={{ padding: "4px 9px", fontSize: "11px", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)" }}
                              title="Xuất lại video này"
                            >
                              <ArrowRepeat size={11} color="#38bdf8" /> Xuất lại
                            </button>
                          )}

                          {renderState.status === "pending" && (
                            <button
                              type="button"
                              className="batch-btn-primary"
                              onClick={() => handleExportSingle(source)}
                              style={{ padding: "4px 10px", fontSize: "11px" }}
                              title="Xuất video này (đưa vào hàng đợi tuần tự)"
                            >
                              <LightningChargeFill size={11} /> Xuất video
                            </button>
                          )}

                          {renderState.status === "failed" && (
                            <button
                              type="button"
                              className="batch-btn-primary"
                              onClick={() => handleExportSingle(source)}
                              style={{ padding: "4px 10px", fontSize: "11px", background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                              title="Thử xuất lại video này"
                            >
                              <ArrowRepeat size={11} /> Thử lại
                            </button>
                          )}

                          {(renderState.status === "queued" || renderState.status === "running") && (
                            <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic", padding: "4px 6px" }}>
                              Đang xử lý...
                            </span>
                          )}

                          <button
                            type="button"
                            className="batch-btn-cyan"
                            onClick={() => {
                              setReviewJob(job || {
                                id: source.id,
                                name: source.name,
                                source: source.source,
                                sourceType: source.sourceType,
                                localPath: source.localPath,
                                status: "idle" as any,
                                createdAt: "",
                              } as Job);
                              setReviewTime(0);
                            }}
                            title="Xem chi tiết Timeline & phụ đề"
                          >
                            <Eye size={12} /> Chi tiết
                          </button>

                          {onOpenTimeline && (
                            <button
                              type="button"
                              className="batch-btn-secondary"
                              onClick={() => {
                                stopGlobalAudio();
                                onOpenTimeline(job?.id || source.id);
                              }}
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              title="Mở Bàn Dựng Timeline Studio để chỉnh sửa"
                            >
                              Dựng
                            </button>
                          )}

                          {onUpdateJob && (
                            <button
                              type="button"
                              className="batch-btn-secondary"
                              onClick={() => {
                                onUpdateJob(source.id, { timelineReady: false });
                                popup.success(`Đã gỡ "${source.name}" khỏi danh sách xuất.`);
                              }}
                              style={{ padding: "4px 7px", fontSize: "11px", color: "#94a3b8", borderColor: "rgba(255, 255, 255, 0.15)" }}
                              title="Gỡ khỏi danh sách xuất (kịch bản timeline và video nguồn vẫn còn nguyên)"
                            >
                              <XLg size={10} /> Gỡ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
                    {sourceFilter === "pending" ? (
                      <div>
                        <CheckCircleFill size={36} style={{ opacity: 0.8, margin: "0 auto 12px", display: "block", color: "#34d399" }} />
                        <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: "15px", marginBottom: "6px" }}>
                          Tất cả video từ Timeline đã được xếp hàng hoặc đã render xong!
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "12px", maxWidth: "520px", margin: "0 auto 16px", lineHeight: 1.55 }}>
                          Không còn video nào ở trạng thái chờ xuất. Bạn có thể theo dõi tiến trình trong bảng hàng đợi bên dưới hoặc chuyển sang tab <strong>"Đang & Đã xuất"</strong> để xem kết quả.
                        </div>
                        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                          <button
                            type="button"
                            className="batch-btn-secondary"
                            onClick={() => setSourceFilter("rendered")}
                            style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)" }}
                          >
                            ⚡ Xem danh sách Đã / Đang xuất ({renderedSources.length})
                          </button>
                          {onNavigate && (
                            <button
                              type="button"
                              className="batch-btn-primary"
                              onClick={() => onNavigate("timeline")}
                            >
                              <Film size={13} /> ➔ Sang Bàn Dựng Timeline
                            </button>
                          )}
                        </div>
                      </div>
                    ) : sourceFilter === "rendered" ? (
                      <div>
                        <ClockHistory size={36} style={{ opacity: 0.5, margin: "0 auto 12px", display: "block", color: "#fbbf24" }} />
                        <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: "15px", marginBottom: "6px" }}>
                          Chưa có video nào được đưa vào hàng đợi xuất
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "12px", maxWidth: "520px", margin: "0 auto 16px", lineHeight: 1.55 }}>
                          Chuyển sang tab <strong>"Chưa xuất"</strong> để chọn video và bấm <strong>"Xuất video"</strong> hoặc <strong>"Xuất hàng loạt"</strong>.
                        </div>
                        <button
                          type="button"
                          className="batch-btn-secondary"
                          onClick={() => setSourceFilter("pending")}
                          style={{ color: "#34d399", borderColor: "rgba(52, 211, 153, 0.4)" }}
                        >
                          ⏳ Quay lại tab Chưa xuất ({pendingSources.length})
                        </button>
                      </div>
                    ) : (
                      <div>
                        <CollectionPlayFill size={36} style={{ opacity: 0.4, margin: "0 auto 12px", display: "block", color: "#f59e0b" }} />
                        <div style={{ color: "#f8fafc", fontWeight: 700, fontSize: "15px", marginBottom: "6px" }}>
                          Chưa có video nào hoàn tất dựng trên Bàn dựng Timeline
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "12px", maxWidth: "520px", margin: "0 auto 16px", lineHeight: 1.55 }}>
                          Bảng này chỉ nạp các video đã hoàn thành phân tích AI, duyệt kịch bản và hoàn tất cấu hình trên Bàn dựng Timeline.
                          Quy trình: <strong>1. Phân tích AI</strong> ➔ <strong>2. Kịch bản & Voice</strong> ➔ <strong>3. Bàn Dựng Timeline</strong> ➔ <strong>4. Xuất hàng loạt</strong>.
                        </div>
                        {onNavigate && (
                          <button
                            type="button"
                            className="batch-btn-primary"
                            onClick={() => onNavigate("timeline")}
                            style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
                          >
                            <Film size={13} /> ➔ Sang 3. Bàn Dựng Timeline
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {displayedSources.length > sourcePageSize && (
          <div style={{ marginTop: "14px" }}>
            <Pagination
              total={displayedSources.length}
              pageSize={sourcePageSize}
              page={sourcePage}
              onPageChange={setSourcePage}
            />
          </div>
        )}
      </section>

      {/* 4. Section 2: Hàng đợi Render Hàng Loạt (Queue Table) */}
      <section className="batch-section-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              HÀNG ĐỢI RENDER TỰ ĐỘNG BẢO VỆ RAM
            </span>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
              Tiến Trình & Trạng Thái Xử Lý ({processJobs.length})
            </h3>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {/* Clean Completed Jobs Button */}
            {processJobs.some((j) => j.status === "completed") && (
              <button
                type="button"
                className="batch-btn-secondary"
                onClick={clearCompletedJobs}
                style={{ fontSize: "11px", color: "#34d399", borderColor: "rgba(52, 211, 153, 0.3)" }}
                title="Dọn dẹp các job đã render thành công khỏi hàng đợi"
              >
                🧹 Dọn dẹp job đã xong ({completedJobsCount})
              </button>
            )}

            {/* Bulk Queue Action Controls */}
            {selectedJobIds.length > 0 && (
              <>
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
              </>
            )}
          </div>
        </div>

        <div className="jacs-table-wrapper" style={{ border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", overflow: "hidden" }}>
          <table className="jacs-table">
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.45)" }}>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={processJobs.length > 0 && selectedJobIds.length === processJobs.length}
                    onChange={toggleAllJobs}
                    style={{ accentColor: "#f59e0b", cursor: "pointer", width: "15px", height: "15px" }}
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
                        style={{ accentColor: "#f59e0b", cursor: "pointer", width: "15px", height: "15px" }}
                      />
                    </td>
                    <td>
                      <strong style={{ color: "#ffffff", display: "block", fontSize: "12.5px" }}>{job.name}</strong>
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
                            className="batch-btn-secondary"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => onOpenTimeline(job.id)}
                          >
                            Dựng
                          </button>
                        )}
                        {job.outputPath && (
                          <button
                            type="button"
                            className="batch-btn-secondary"
                            style={{ padding: "4px 9px", fontSize: "11px", color: "#34d399", borderColor: "rgba(52, 211, 153, 0.4)" }}
                            onClick={() => void getRuntime().revealPath(job.outputPath!)}
                          >
                            <FolderFill size={11} color="#34d399" /> Mở file
                          </button>
                        )}
                        {(job.status === "failed" || job.status === "cancelled") && onRetryJob && (
                          <button
                            type="button"
                            className="batch-btn-secondary"
                            style={{ padding: "4px 9px", fontSize: "11px", color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.4)" }}
                            onClick={() => onRetryJob(job.id)}
                          >
                            <ArrowRepeat size={11} /> Chạy lại
                          </button>
                        )}
                        {(job.status === "running" || job.status === "queued") && onCancelJob && (
                          <button
                            type="button"
                            className="batch-btn-secondary"
                            style={{ padding: "4px 9px", fontSize: "11px", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.4)" }}
                            onClick={() => onCancelJob(job.id)}
                          >
                            Hủy
                          </button>
                        )}
                        <button
                          type="button"
                          className="batch-btn-secondary"
                          style={{ padding: "4px 8px", fontSize: "11px", color: "#fca5a5", borderColor: "rgba(239, 68, 68, 0.35)" }}
                          title="Xóa job này khỏi hàng đợi render (bảo toàn video gốc)"
                          onClick={() => {
                            if (job.id.startsWith("render-") || job.id.startsWith("export-") || Boolean(job.parentJobId)) {
                              onDeleteJobs?.([job.id]);
                            } else {
                              onUpdateJob?.(job.id, {
                                sourceOnly: true,
                                status: job.analysis?.scenes?.length ? "completed" : "queued",
                                stage: undefined,
                                progress: 0,
                                outputPath: undefined,
                              });
                            }
                            popup.success(`Đã xóa job "${job.name}" khỏi hàng đợi render.`);
                          }}
                        >
                          <Trash3Fill size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                    <LayersFill size={28} style={{ opacity: 0.3, margin: "0 auto 8px", display: "block" }} />
                    Chưa có job nào trong hàng đợi. Chọn nguồn video và bấm <strong>"Xuất video"</strong>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {processJobs.length > queuePageSize && (
          <div style={{ marginTop: "14px" }}>
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

      {/* 7. Modal Review Timeline Chi Tiết */}
      {reviewJob && (
        <Modal
          isOpen={!!reviewJob}
          onClose={() => {
            stopGlobalAudio();
            setReviewJob(null);
          }}
          title={`Chi Tiết Timeline: ${reviewJob.name}`}
          eyebrow="TIMELINE & SCENE PREVIEW MODAL"
          maxWidth="920px"
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Khung hình: <strong style={{ color: "#ffffff" }}>{reviewJob.aspectRatio || "9:16"}</strong> · Phụ đề: <strong style={{ color: "#fbbf24" }}>{reviewJob.subtitleStyle || "gold"}</strong>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    stopGlobalAudio();
                    setReviewJob(null);
                  }}
                >
                  Đóng
                </button>
                {onOpenTimeline && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      const id = reviewJob.id;
                      stopGlobalAudio();
                      setReviewJob(null);
                      onOpenTimeline(id);
                    }}
                    style={{
                      background: "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      color: "#38bdf8",
                      fontWeight: 700,
                    }}
                  >
                    ✏️ Mở Bàn Dựng Timeline
                  </button>
                )}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    const src: Source = {
                      id: reviewJob.id,
                      name: reviewJob.name,
                      source: reviewJob.source || reviewJob.localPath || reviewJob.name,
                      sourceType: reviewJob.sourceType || "file",
                      localPath: reviewJob.localPath,
                      job: reviewJob,
                    };
                    handleExportSingle(src);
                    stopGlobalAudio();
                    setReviewJob(null);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    fontWeight: 800,
                    boxShadow: "0 0 14px rgba(16, 185, 129, 0.4)",
                  }}
                >
                  ⚡ Xuất Video Này
                </button>
              </div>
            </div>
          }
        >
          {(() => {
            const scenes = (reviewJob.scenes && reviewJob.scenes.length > 0)
              ? reviewJob.scenes
              : (reviewJob.timelineClips && reviewJob.timelineClips.length > 0)
                ? reviewJob.timelineClips.map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    start: c.sourceStart || formatSeconds(c.inPoint || 0),
                    end: c.sourceEnd || formatSeconds((c.inPoint || 0) + (c.outPoint || 0)),
                    subtitle: c.subtitleText || c.subtitle || "",
                  }))
                : (reviewJob.analysis?.scenes && reviewJob.analysis.scenes.length > 0)
                  ? reviewJob.analysis.scenes.map((s: any, idx: number) => ({
                      id: s.id || `scene-${idx}`,
                      title: s.title || `Cảnh ${idx + 1}`,
                      start: s.start || formatSeconds(s.startSeconds || 0),
                      end: s.end || formatSeconds(s.endSeconds || 0),
                      subtitle: s.voiceover || s.translation || s.subtitle || s.text || "",
                    }))
                  : [];

            const activeScene = scenes.find((sc: any) => {
              const s = toSeconds(sc.start);
              const e = toSeconds(sc.end);
              return reviewTime >= s && reviewTime <= e;
            });
            const subStyle = reviewJob.subtitleStyle || "gold";
            const videoUrl = reviewJob.localPath ? fileUrl(reviewJob.localPath) : undefined;

            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxHeight: "65vh", overflow: "hidden" }}>
                {/* Left Column: Player & Subtitle Preview */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div
                    style={{
                      position: "relative",
                      background: "#000000",
                      borderRadius: "8px",
                      overflow: "hidden",
                      boxShadow: "0 4px 18px rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "260px",
                    }}
                  >
                    {videoUrl ? (
                      <video
                        ref={reviewVideoRef}
                        src={videoUrl}
                        controls
                        style={{ width: "100%", maxHeight: "300px", objectFit: "contain" }}
                        onTimeUpdate={(e) => setReviewTime((e.target as HTMLVideoElement).currentTime)}
                      />
                    ) : (
                      <div style={{ textAlign: "center", color: "#64748b", padding: "20px" }}>
                        <Film size={36} style={{ opacity: 0.3, marginBottom: "8px" }} />
                        <p style={{ margin: 0, fontSize: "12px" }}>Video từ URL chưa tải về máy hoặc không có file local.</p>
                      </div>
                    )}

                    {/* Subtitle Overlay */}
                    {activeScene?.subtitle && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "45px",
                          left: "10px",
                          right: "10px",
                          textAlign: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: 800,
                            lineHeight: 1.4,
                            background: subStyle === "box" ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.65)",
                            color: subStyle === "gold" ? "#fbbf24" : subStyle === "neon" ? "#22d3ee" : "#ffffff",
                            textShadow: subStyle === "gold" ? "0 0 8px rgba(245,158,11,0.6)" : "0 2px 4px rgba(0,0,0,0.8)",
                          }}
                        >
                          {activeScene.subtitle}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Audio & Specs Breakdown */}
                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.25)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "11.5px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <span style={{ color: "#94a3b8" }}>Giọng đọc:</span>{" "}
                      <strong style={{ color: "#f8fafc" }}>
                        {reviewJob.audioLayers?.voice?.voiceId || reviewJob.narratorVoice || (reviewJob.narratorEnabled ? "Bật" : "Tắt")}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8" }}>Nhạc nền:</span>{" "}
                      <strong style={{ color: reviewJob.audioLayers?.bgm?.track ? "#fbbf24" : "#94a3b8" }}>
                        {reviewJob.audioLayers?.bgm?.track || "Không"}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8" }}>Khung hình:</span>{" "}
                      <strong style={{ color: "#38bdf8" }}>{reviewJob.aspectRatio || "9:16"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8" }}>Tách vocal gốc:</span>{" "}
                      <strong style={{ color: reviewJob.audioLayers?.original?.removeBgm ? "#34d399" : "#94a3b8" }}>
                        {reviewJob.audioLayers?.original?.removeBgm ? "Đã lọc BGM gốc" : "Giữ nguyên"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Right Column: Scenes & Subtitles List */}
                <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <strong style={{ fontSize: "12.5px", color: "#f8fafc" }}>
                      Danh Sách Phân Cảnh ({scenes.length})
                    </strong>
                    <small style={{ color: "#94a3b8", fontSize: "11px" }}>
                      Bấm vào cảnh để xem trước video
                    </small>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      paddingRight: "4px",
                    }}
                  >
                    {scenes.length > 0 ? (
                      scenes.map((sc: any, idx: number) => {
                        const isCurrent = activeScene?.id === sc.id;
                        return (
                          <div
                            key={sc.id || idx}
                            onClick={() => {
                              if (reviewVideoRef.current) {
                                reviewVideoRef.current.currentTime = toSeconds(sc.start);
                                reviewVideoRef.current.play().catch(() => {});
                              }
                            }}
                            style={{
                              background: isCurrent ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.03)",
                              border: isCurrent ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
                              borderRadius: "6px",
                              padding: "8px 10px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                              <strong style={{ fontSize: "11.5px", color: isCurrent ? "#38bdf8" : "#f1f5f9" }}>
                                #{idx + 1} {sc.title || `Cảnh ${idx + 1}`}
                              </strong>
                              <span
                                style={{
                                  fontSize: "10.5px",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: "rgba(0, 0, 0, 0.3)",
                                  color: "#94a3b8",
                                  fontFamily: "'DM Mono', monospace",
                                }}
                              >
                                {sc.start} - {sc.end}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: "11px", color: isCurrent ? "#e2e8f0" : "#94a3b8", lineHeight: 1.4 }}>
                              {sc.subtitle || "(Chưa có lời thoại)"}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: "center", color: "#64748b", padding: "30px" }}>
                        <LayersFill size={24} style={{ opacity: 0.3, marginBottom: "6px" }} />
                        <p style={{ margin: 0, fontSize: "12px" }}>Chưa có phân cảnh nào trong dự án này.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
