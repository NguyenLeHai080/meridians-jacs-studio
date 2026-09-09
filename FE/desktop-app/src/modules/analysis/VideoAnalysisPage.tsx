import { useState, useEffect } from "react";
import type { AnalysisResult, AnalysisScene, DurationMappingRule, Job, NavKey, ProviderPoolItem, TimelineClip } from "../../core/types";
import { getRuntime } from "../../core/runtime";
import { popup } from "../../shared/popup";
import { Film, PlusLg } from "react-bootstrap-icons";

// Subcomponents
import { AnalysisToolbar } from "./components/AnalysisToolbar";
import { AnalysisVideoRow } from "./components/AnalysisVideoRow";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { PresetPromptModal } from "./components/PresetPromptModal";
import { AddVideoModal } from "./components/AddVideoModal";
import { SceneEditorModal } from "./components/SceneEditorModal";
import { VideoPreviewModal } from "./components/VideoPreviewModal";
import { BatchConfigModal } from "./components/BatchConfigModal";

// Hooks
import { useAnalysisState } from "./hooks/useAnalysisState";
import { useAnalysisAudio } from "./hooks/useAnalysisAudio";

// Utils & Constants (re-export for backward compatibility)
import { getEffectivePromptWithDuration, getProviderBrandType, formatProviderLabel } from "./utils/analysisHelpers";
import { PROVIDER_MODEL_PRESETS, DEFAULT_DURATION_RULES } from "./constants/modelPresets";

export { PROVIDER_MODEL_PRESETS, DEFAULT_DURATION_RULES, getProviderBrandType, formatProviderLabel };

export type AnalysisPageProps = {
  jobs?: Job[];
  onAddJob?: (job: Job) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  onDeleteJobs?: (jobIds: string[]) => void;
  onDeleteSources?: (jobIds: string[]) => void;
  onOpenTimeline?: (jobId?: string) => void;
  initialSource?: Job;
  onNavigate?: (key: NavKey) => void;
};

export function VideoAnalysisPage({
  jobs = [],
  onAddJob,
  onUpdateJob,
  onDeleteJobs,
  onDeleteSources,
  onOpenTimeline,
  initialSource,
  onNavigate,
}: AnalysisPageProps) {
  const state = useAnalysisState(jobs, initialSource);
  const audio = useAnalysisAudio(state.defaultLanguage, state.defaultVoiceId, state.showToast);

  // Local UI modals state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [analysisTargetJob, setAnalysisTargetJob] = useState<Job | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [editingSceneInfo, setEditingSceneInfo] = useState<{
    jobId: string;
    sceneIdx: number;
    scene: AnalysisScene;
  } | null>(null);
  const [previewPlayerInfo, setPreviewPlayerInfo] = useState<{
    job: Job;
    initialTimeSeconds?: number;
  } | null>(null);

  // URL Input in Add Modal
  const [inputUrl, setInputUrl] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  // Running jobs & progress
  const [runningJobIds, setRunningJobIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<Record<string, { progress: number; stage: string }>>({});

  // Listen to live analysis progress events from backend/Electron
  useEffect(() => {
    const unsubscribe = getRuntime().onAnalysisProgress?.((value) => {
      if (!value.operationId) return;
      const match = value.operationId.match(/^analysis-(job-[^-\s]+|\d+)/);
      const targetId = match ? match[1] : value.operationId;
      setBatchProgress((prev) => ({
        ...prev,
        [targetId]: { progress: value.progress, stage: value.stage },
      }));
    });
    return () => unsubscribe?.();
  }, []);

  const openAnalysisConfigForJob = (job: Job) => {
    setAnalysisTargetJob(job);
    if (job.providerId) state.setDefaultProviderId(job.providerId);
    if (job.customPrompt) state.setDefaultPrompt(job.customPrompt);
    if (job.languages?.[0]) state.setDefaultLanguage(job.languages[0]);
    setShowBatchModal(true);
  };

  const openBatchAnalysisModal = () => {
    setAnalysisTargetJob(null);
    setShowBatchModal(true);
  };

  async function runAnalysisForJob(
    job: Job,
    overrideProviderId?: string,
    overridePrompt?: string,
    overrideVoice?: string,
    overrideLang?: string,
    overrideDurationRules?: DurationMappingRule[],
    overrideProviderPool?: ProviderPoolItem[]
  ) {
    const analyzeVideo = getRuntime().analyzeVideo;
    if (!analyzeVideo) {
      state.showToast("⚠️ Hãy chọn video trong bản Electron Desktop đã cài đặt.");
      return;
    }

    const pId = overrideProviderId || state.defaultProviderId || job.providerId;
    const voice =
      overrideVoice ||
      state.defaultVoiceId ||
      (job.narratorVoice && !job.narratorVoice.startsWith("en-") ? job.narratorVoice : "vi-adam-review");
    const lang = overrideLang || state.defaultLanguage || "vi";
    const prompt = overridePrompt || job.customPrompt || state.defaultPrompt;

    setRunningJobIds((prev) => new Set(prev).add(job.id));
    if (onUpdateJob) {
      onUpdateJob(job.id, {
        status: "running",
        stage: "analyzing",
        progress: 15,
        providerId: pId,
        narratorVoice: voice,
        languages: [lang],
        customPrompt: prompt,
      });
    }

    let targetFile = job.localPath;

    if (!targetFile && job.source && /^https?:\/\//i.test(job.source)) {
      try {
        const dlOpId = `download-${Date.now()}`;
        targetFile = await getRuntime().downloadVideo?.(job.source, dlOpId);
        if (targetFile && onUpdateJob) {
          onUpdateJob(job.id, { localPath: targetFile });
        }
      } catch (err: any) {
        setRunningJobIds((prev) => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
        if (onUpdateJob) {
          onUpdateJob(job.id, { status: "failed", error: err?.message || "Lỗi tải video URL" });
        }
        return;
      }
    }

    if (!targetFile) {
      setRunningJobIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      if (onUpdateJob) {
        onUpdateJob(job.id, { status: "failed", error: "Không tìm thấy file video nguồn" });
      }
      return;
    }

    const opId = `analysis-${job.id}-${Date.now()}`;
    const targetMins =
      state.targetDuration === "full"
        ? job.durationSeconds && job.durationSeconds > 10
          ? Math.ceil(job.durationSeconds / 60)
          : 10
        : state.targetDuration === "60s"
        ? 1
        : state.targetDuration === "3m"
        ? 3
        : state.targetDuration === "5m"
        ? 5
        : state.targetDuration === "10m"
        ? 10
        : state.targetDuration === "15m"
        ? 15
        : state.customDurationMinutes || 5;

    const effectivePrompt = getEffectivePromptWithDuration(
      prompt,
      state.durationMode,
      state.targetDuration,
      state.customDurationMinutes,
      { emphasizeHook: state.emphasizeHook, narratorEnabled: state.narratorEnabled }
    );
    const rules = overrideDurationRules ?? (state.durationMode === "rules" ? state.durationRules : undefined);
    const pool = overrideProviderPool ?? (state.useProviderPool ? state.activeProviderPool : undefined);

    try {
      const analysis = await analyzeVideo(targetFile, pId || "", opId, {
        languages: [lang],
        narratorEnabled: state.narratorEnabled,
        narratorGender: "male",
        narratorVoice: voice,
        keepOriginalAudio: !state.narratorEnabled ? true : state.interweaveAudio,
        interweaveAudio: state.narratorEnabled && state.interweaveAudio,
        originalAudioVolume: !state.narratorEnabled ? 100 : state.interweaveAudio ? 20 : 0,
        autoDucking: state.autoDucking,
        emphasizeHook: state.emphasizeHook,
        removeOriginalBgm: state.removeOriginalBgm,
        isolateVocals: state.removeOriginalBgm,
        customPrompt: effectivePrompt.trim() || undefined,
        targetDurationMinutes: targetMins,
        durationMode: state.durationMode,
        durationRules: rules,
        providerPool: pool,
        analysisMode: state.narratorEnabled ? "story_recap" : "highlight_clips",
      });

      const newName = (analysis as any).videoTitle || job.name;
      if (onUpdateJob) {
        onUpdateJob(job.id, {
          name: newName,
          videoTitle: (analysis as any).videoTitle,
          suggestedTitles: (analysis as any).suggestedTitles,
          status: "completed",
          stage: "completed",
          progress: 100,
          analysis,
          narratorEnabled: state.narratorEnabled,
          narratorVoice: voice,
          languages: [lang],
          keepOriginalAudio: !state.narratorEnabled ? true : state.interweaveAudio,
          interweaveAudio: state.narratorEnabled && state.interweaveAudio,
          originalAudioVolume: !state.narratorEnabled ? 100 : state.interweaveAudio ? 20 : 0,
          autoDucking: state.autoDucking,
          emphasizeHook: state.emphasizeHook,
          removeOriginalBgm: state.removeOriginalBgm,
          isolateVocals: state.removeOriginalBgm,
          customPrompt: prompt,
        });
      }
      state.setExpandedJobIds((prev) => new Set(prev).add(job.id));
      state.showToast(`🎉 Phân tích AI thành công: ${newName} (${analysis.scenes?.length || 0} phân cảnh)`);
    } catch (err: any) {
      if (onUpdateJob) {
        onUpdateJob(job.id, {
          status: "failed",
          stage: "failed",
          error: err?.message || "Lỗi phân tích AI",
        });
      }
      state.showToast(`❌ Lỗi phân tích: ${job.name} - ${err?.message || ""}`);
    } finally {
      setRunningJobIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  }

  async function handleStartBatchAnalysis(pId: string, prompt: string, lang: string) {
    setShowBatchModal(false);
    const targetIds =
      state.selectedJobIds.size > 0 ? Array.from(state.selectedJobIds) : state.sourceCandidates.map((j) => j.id);
    const targetJobs = state.sourceCandidates.filter((j) => targetIds.includes(j.id));

    if (!targetJobs.length) {
      state.showToast("⚠️ Không có video nào được chọn để phân tích.");
      return;
    }

    const concurrency = state.useProviderPool ? Math.max(1, Math.min(5, state.batchConcurrency)) : 1;
    const poolInfo =
      state.useProviderPool && state.activeProviderPool.length > 0
        ? ` [${state.activeProviderPool.length} AI Models Pool]`
        : "";
    state.showToast(
      `🚀 Bắt đầu phân tích AI cho ${targetJobs.length} video (${concurrency} luồng song song${poolInfo})...`
    );

    const pool = state.useProviderPool ? state.activeProviderPool : undefined;
    const rules = state.durationMode === "rules" ? state.durationRules : undefined;
    let nextJobIndex = 0;

    const runWorker = async () => {
      while (nextJobIndex < targetJobs.length) {
        const currentIdx = nextJobIndex++;
        const job = targetJobs[currentIdx];
        const assignedProviderId =
          pool && pool.length > 0 ? pool[currentIdx % pool.length].providerId : pId;

        await runAnalysisForJob(job, assignedProviderId, prompt, undefined, lang, rules, pool);
      }
    };

    const workerPromises = Array.from({ length: Math.min(concurrency, targetJobs.length) }, () => runWorker());
    await Promise.all(workerPromises);

    state.showToast(`🎉 Hoàn tất phân tích AI toàn bộ ${targetJobs.length} video!`);
  }

  function handleExportToTimeline(job: Job) {
    const scenes = job.analysis?.scenes || [];
    if (!scenes.length) {
      state.showToast("⚠️ Video chưa có phân cảnh nào để xuất vào Timeline. Hãy chạy phân tích AI trước.");
      return;
    }

    const clips: TimelineClip[] = scenes.map((s, idx) => ({
      sceneId: s.id || `scene-${idx + 1}`,
      order: idx,
      sourceSceneId: s.id || `scene-${idx + 1}`,
      trimIn: 0,
      trimOut: 0,
    }));

    if (onUpdateJob) {
      onUpdateJob(job.id, {
        timelineClips: clips,
        narratorEnabled: job.narratorEnabled ?? state.narratorEnabled,
        keepOriginalAudio: job.keepOriginalAudio ?? (!state.narratorEnabled ? true : state.interweaveAudio),
        interweaveAudio: job.interweaveAudio ?? (state.narratorEnabled && state.interweaveAudio),
        originalAudioVolume: job.originalAudioVolume ?? (!state.narratorEnabled ? 100 : state.interweaveAudio ? 20 : 0),
        autoDucking: job.autoDucking ?? state.autoDucking,
        emphasizeHook: job.emphasizeHook ?? state.emphasizeHook,
        removeOriginalBgm: job.removeOriginalBgm ?? state.removeOriginalBgm,
        isolateVocals: job.isolateVocals ?? state.removeOriginalBgm,
      });
    }

    if (onOpenTimeline) {
      onOpenTimeline(job.id);
    } else if (onNavigate) {
      onNavigate("timeline");
    }
    state.showToast(`🎬 Đã chuyển ${scenes.length} phân cảnh của ${job.name} sang bàn dựng Timeline!`);
  }

  function handleExportSingleSceneToTimeline(job: Job, scene: AnalysisScene, sceneIdx: number) {
    const sceneId = scene.id || `scene-${sceneIdx + 1}`;
    const newClip: TimelineClip = {
      sceneId,
      order: 0,
      sourceSceneId: sceneId,
    };

    if (onUpdateJob) {
      const currentClips = job.timelineClips || [];
      onUpdateJob(job.id, { timelineClips: [newClip, ...currentClips] });
    }

    if (onOpenTimeline) {
      onOpenTimeline(job.id);
    } else if (onNavigate) {
      onNavigate("timeline");
    }
  }

  function handleExportToStory(job: Job) {
    if (!job.analysis?.scenes?.length && !job.analysis?.voiceScript) {
      state.showToast("⚠️ Video chưa có kịch bản AI. Hãy phân tích video trước.");
      return;
    }
    if (onUpdateJob) {
      onUpdateJob(job.id, { requiresScriptApproval: true });
    }
    if (onNavigate) {
      onNavigate("story");
    }
    state.showToast(`📝 Đã mở kịch bản thuyết minh của ${job.name}!`);
  }

  async function handlePickFiles() {
    try {
      const pickVideos = getRuntime().pickVideos;
      const pickVideo = getRuntime().pickVideo;
      let paths: string[] = [];

      if (pickVideos) {
        paths = (await pickVideos()) || [];
      } else if (pickVideo) {
        const single = await pickVideo();
        if (single) paths = [single];
      }

      if (!paths.length) return;

      for (const p of paths) {
        const fileName = (p ? String(p).split(/[\\/]/).pop() : "") || "Video";
        const id = `job-source-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        if (onAddJob) {
          onAddJob({
            id,
            name: fileName.replace(/\.[^.]+$/, ""),
            source: p,
            sourceType: "file",
            localPath: p,
            sourceOnly: true,
            mode: "local-gpu",
            status: "queued",
            progress: 0,
            createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
            synced: true,
          });
        }
      }
      state.showToast(`✓ Đã nạp thành công ${paths.length} video mới vào không gian làm việc!`);
      setShowAddModal(false);
    } catch (err: any) {
      state.showToast(`❌ Lỗi nạp video: ${err?.message || ""}`);
    }
  }

  async function handleAddUrlSubmit() {
    if (!inputUrl.trim()) return;
    setIsAddingUrl(true);
    try {
      const id = `job-url-${Date.now()}`;
      if (onAddJob) {
        onAddJob({
          id,
          name: `URL Video (${new URL(inputUrl).hostname})`,
          source: inputUrl.trim(),
          sourceType: "url",
          sourceOnly: true,
          mode: "local-gpu",
          status: "queued",
          progress: 0,
          createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          synced: true,
        });
      }
      setInputUrl("");
      setShowAddModal(false);
      state.showToast("✓ Đã thêm link video URL vào danh sách chờ phân tích!");
    } catch (err: any) {
      state.showToast(`❌ Lỗi link URL: ${err?.message || ""}`);
    } finally {
      setIsAddingUrl(false);
    }
  }

  async function handleDeleteSelected() {
    if (!state.selectedJobIds.size) return;
    const ids = Array.from(state.selectedJobIds);
    const confirmed = await popup.confirmDelete(
      "Xác Nhận Xóa Video",
      `Bạn có chắc chắn muốn xóa ${ids.length} video đã chọn khỏi danh sách không?`
    );
    if (confirmed) {
      if (onDeleteSources) onDeleteSources(ids);
      else if (onDeleteJobs) onDeleteJobs(ids);
      state.setSelectedJobIds(new Set());
      popup.success(`Đã xóa ${ids.length} video thành công!`);
    }
  }

  function handleSaveEditedScene(updatedScene: AnalysisScene) {
    if (!editingSceneInfo) return;
    const { jobId, sceneIdx } = editingSceneInfo;
    const job = state.sourceCandidates.find((j) => j.id === jobId);
    if (!job || !job.analysis) return;

    const cleanVoice = String(updatedScene.voiceover || updatedScene.translation || updatedScene.detail || "").trim();
    const syncedScene: AnalysisScene = {
      ...updatedScene,
      voiceover: cleanVoice,
      translation: cleanVoice,
      ...(updatedScene as any),
    };

    const nextScenes = [...(job.analysis.scenes || [])];
    nextScenes[sceneIdx] = syncedScene;

    const fullScript = nextScenes.map((s) => s.voiceover || s.translation || "").filter(Boolean).join(" ");
    const nextAnalysis: AnalysisResult = {
      ...job.analysis,
      scenes: nextScenes,
      voiceScript: fullScript,
    };

    if (onUpdateJob) {
      onUpdateJob(job.id, {
        analysis: nextAnalysis,
        narrationText: fullScript,
        subtitleText: fullScript,
      });
    }

    setEditingSceneInfo(null);
    state.showToast(`✓ Đã cập nhật phân cảnh Cảnh #${sceneIdx + 1} thành công!`);
  }

  async function handleDeleteScene(jobId: string, sceneIdx: number) {
    const job = state.sourceCandidates.find((j) => j.id === jobId);
    if (!job || !job.analysis) return;

    const confirmed = await popup.confirmDelete(
      "Xóa Phân Cảnh",
      `Bạn có chắc muốn xóa phân cảnh Cảnh #${sceneIdx + 1} này không?`
    );
    if (confirmed) {
      const nextScenes = (job.analysis.scenes || []).filter((_, idx) => idx !== sceneIdx);
      const nextAnalysis: AnalysisResult = {
        ...job.analysis,
        scenes: nextScenes,
      };
      if (onUpdateJob) {
        onUpdateJob(job.id, { analysis: nextAnalysis });
      }
      popup.success("Đã xóa phân cảnh");
    }
  }

  return (
    <div
      className="analysis-workspace-root animate-fade-in"
      style={{
        padding: "8px 14px 78px 14px",
        width: "100%",
        margin: 0,
        height: "100%",
        flex: "1 1 0%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* 1. Unified Control Toolbar */}
      <AnalysisToolbar
        defaultProviderId={state.defaultProviderId}
        handleSelectProvider={state.handleSelectProvider}
        configuredProviders={state.configuredProviders}
        selectedModel={state.selectedModel}
        selectedProvider={state.selectedProvider}
        handleSelectModel={state.handleSelectModel}
        availableModels={state.availableModels}
        onOpenApiKeyModal={() => {
          state.setApiKeyInput("");
          state.setShowApiKeyModal(true);
        }}
        handleQuickSync={state.handleQuickSync}
        syncingQuick={state.syncingQuick}
        onNavigate={onNavigate}
        defaultPrompt={state.defaultPrompt}
        setDefaultPrompt={state.setDefaultPrompt}
        onOpenPromptModal={() => setShowPromptModal(true)}
        onOpenAddModal={() => setShowAddModal(true)}
        onOpenBatchAnalysisModal={openBatchAnalysisModal}
        selectedJobIds={state.selectedJobIds}
        setSelectedJobIds={state.setSelectedJobIds}
        sourceCandidates={state.sourceCandidates}
        searchQuery={state.searchQuery}
        setSearchQuery={state.setSearchQuery}
        filterStatus={state.filterStatus}
        setFilterStatus={state.setFilterStatus}
        filterCategory={state.filterCategory}
        setFilterCategory={state.setFilterCategory}
        sortBy={state.sortBy}
        setSortBy={state.setSortBy}
        completedCount={state.completedCount}
        runningCount={state.runningCount}
        onDeleteSelected={handleDeleteSelected}
        showToast={state.showToast}
      />

      {/* 2. Main Master-Detail Table */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          background: "rgba(18, 21, 31, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "36px 36px minmax(240px, 1.8fr) 150px 140px 90px 220px",
            padding: "10px 14px",
            background: "rgba(26, 30, 43, 0.8)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "11px",
            fontWeight: 800,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <input
              type="checkbox"
              checked={
                state.filteredVideos.length > 0 &&
                state.selectedJobIds.size === state.filteredVideos.length
              }
              onChange={state.handleSelectAll}
              style={{ cursor: "pointer" }}
            />
          </div>
          <div></div>
          <div>VIDEO NGUỒN & THÔNG TIN</div>
          <div>TRẠNG THÁI PHÂN TÍCH</div>
          <div>TIÊU HAO TOKEN/CREDIT</div>
          <div style={{ textAlign: "center" }}>ĐIỂM AI</div>
          <div style={{ textAlign: "right" }}>THAO TÁC</div>
        </div>

        {/* Table Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            minHeight: 0,
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(245, 158, 11, 0.3) transparent",
          }}
        >
          {state.filteredVideos.length === 0 ? (
            <div style={{ padding: "50px 20px", textAlign: "center", color: "#64748b" }}>
              <Film size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
                Không tìm thấy video nào
              </h3>
              <p style={{ fontSize: "12.5px", maxWidth: "400px", margin: "0 auto 14px" }}>
                {state.sourceCandidates.length === 0
                  ? "Chưa có video nguồn nào trong thư viện. Hãy bấm 'Thêm Video Nguồn' để nạp video từ máy tính hoặc link URL."
                  : "Không có video nào khớp với bộ lọc hoặc từ khóa tìm kiếm hiện tại."}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddModal(true)}
                style={{
                  background: "linear-gradient(135deg, #d97706, #f59e0b)",
                  border: "none",
                  color: "#12151f",
                  padding: "7px 16px",
                  borderRadius: "7px",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <PlusLg size={13} /> Thêm Video Nguồn Ngay
              </button>
            </div>
          ) : (
            state.paginatedVideos.map((job) => {
              const isExpanded = state.expandedJobIds.has(job.id);
              const isSelected = state.selectedJobIds.has(job.id);
              const isRunning = job.status === "running" || runningJobIds.has(job.id);
              const prog = batchProgress[job.id] || { progress: job.progress || 0, stage: job.stage || "" };
              const currentScenePage = state.scenePages[job.id] || 1;

              return (
                <AnalysisVideoRow
                  key={job.id}
                  job={job}
                  isExpanded={isExpanded}
                  isSelected={isSelected}
                  isRunning={isRunning}
                  prog={prog}
                  currentScenePage={currentScenePage}
                  scenesPerPage={state.SCENES_PER_PAGE}
                  onToggleSelect={state.toggleSelect}
                  onToggleExpand={state.toggleExpand}
                  onOpenPreviewPlayer={(j) => setPreviewPlayerInfo({ job: j })}
                  onOpenAnalysisConfigForJob={openAnalysisConfigForJob}
                  onExportToTimeline={handleExportToTimeline}
                  onExportToStory={handleExportToStory}
                  onDeleteJob={async (jobId, name) => {
                    const confirmed = await popup.confirmDelete(
                      "Xác Nhận Xóa Video",
                      `Bạn có chắc muốn xóa video "${name}" khỏi danh sách?`
                    );
                    if (confirmed) {
                      if (onDeleteSources) onDeleteSources([jobId]);
                      else if (onDeleteJobs) onDeleteJobs([jobId]);
                      popup.success(`Đã xóa video ${name}`);
                    }
                  }}
                  onSetScenePage={(jobId, page) =>
                    state.setScenePages((prev) => ({ ...prev, [jobId]: page }))
                  }
                  onUpdateJob={onUpdateJob}
                  playingVoiceKey={audio.playingVoiceKey}
                  loadingVoiceKey={audio.loadingVoiceKey}
                  onPlaySceneVoice={audio.handlePlaySceneVoice}
                  onEditScene={(scene, idx) => setEditingSceneInfo({ jobId: job.id, sceneIdx: idx, scene })}
                  onExportSingleSceneToTimeline={handleExportSingleSceneToTimeline}
                  onDeleteScene={handleDeleteScene}
                  showToast={state.showToast}
                />
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {state.filteredVideos.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 14px",
              background: "rgba(26, 30, 43, 0.85)",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              flexWrap: "wrap",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                Hiển thị{" "}
                <strong>
                  {(state.parentPage - 1) * state.parentPageSize + 1} -{" "}
                  {Math.min(state.parentPage * state.parentPageSize, state.filteredVideos.length)}
                </strong>{" "}
                trên tổng số <strong>{state.filteredVideos.length}</strong> video
              </span>
              <select
                value={state.parentPageSize}
                onChange={(e) => {
                  state.setParentPageSize(Number(e.target.value));
                  state.setParentPage(1);
                }}
                style={{
                  background: "#10131c",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "5px",
                  padding: "3px 6px",
                  color: "#f8fafc",
                  fontSize: "11px",
                  outline: "none",
                }}
              >
                <option value={5}>5 video / trang</option>
                <option value={10}>10 video / trang</option>
                <option value={20}>20 video / trang</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => state.setParentPage(1)}
                disabled={state.parentPage <= 1}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: state.parentPage <= 1 ? "#64748b" : "#f8fafc",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  cursor: state.parentPage <= 1 ? "not-allowed" : "pointer",
                }}
              >
                « Đầu
              </button>
              <button
                type="button"
                onClick={() => state.setParentPage((p) => Math.max(1, p - 1))}
                disabled={state.parentPage <= 1}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: state.parentPage <= 1 ? "#64748b" : "#f8fafc",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  cursor: state.parentPage <= 1 ? "not-allowed" : "pointer",
                }}
              >
                ‹ Trước
              </button>

              <span style={{ fontSize: "11.5px", fontWeight: 800, color: "#fbbf24", padding: "0 4px" }}>
                Trang {state.parentPage} / {state.totalParentPages}
              </span>

              <button
                type="button"
                onClick={() => state.setParentPage((p) => Math.min(state.totalParentPages, p + 1))}
                disabled={state.parentPage >= state.totalParentPages}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: state.parentPage >= state.totalParentPages ? "#64748b" : "#f8fafc",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  cursor: state.parentPage >= state.totalParentPages ? "not-allowed" : "pointer",
                }}
              >
                Sau ›
              </button>
              <button
                type="button"
                onClick={() => state.setParentPage(state.totalParentPages)}
                disabled={state.parentPage >= state.totalParentPages}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: state.parentPage >= state.totalParentPages ? "#64748b" : "#f8fafc",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  cursor: state.parentPage >= state.totalParentPages ? "not-allowed" : "pointer",
                }}
              >
                Cuối »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Action Modals */}
      <BatchConfigModal
        isOpen={showBatchModal}
        onClose={() => {
          setShowBatchModal(false);
          setAnalysisTargetJob(null);
        }}
        analysisTargetJob={analysisTargetJob}
        selectedJobIds={state.selectedJobIds}
        sourceCandidates={state.sourceCandidates}
        useProviderPool={state.useProviderPool}
        updateUseProviderPool={state.updateUseProviderPool}
        batchConcurrency={state.batchConcurrency}
        updateBatchConcurrency={state.updateBatchConcurrency}
        activeProviderPool={state.activeProviderPool}
        allAvailablePoolItems={state.allAvailablePoolItems}
        selectedPoolKeys={state.selectedPoolKeys}
        togglePoolKey={state.togglePoolKey}
        selectAllPoolKeys={state.selectAllPoolKeys}
        clearAllPoolKeys={state.clearAllPoolKeys}
        handleQuickSync={state.handleQuickSync}
        syncingQuick={state.syncingQuick}
        configuredProviders={state.configuredProviders}
        defaultProviderId={state.defaultProviderId}
        handleSelectProvider={state.handleSelectProvider}
        isCustomModel={state.isCustomModel}
        selectedModel={state.selectedModel}
        selectedProvider={state.selectedProvider}
        handleSelectModel={state.handleSelectModel}
        availableModels={state.availableModels}
        durationMode={state.durationMode}
        updateDurationMode={state.updateDurationMode}
        durationRules={state.durationRules}
        handleUpdateDurationRule={state.handleUpdateDurationRule}
        handleDeleteDurationRule={state.handleDeleteDurationRule}
        handleAddDurationRule={state.handleAddDurationRule}
        handleResetDurationRules={state.handleResetDurationRules}
        targetDuration={state.targetDuration}
        setTargetDuration={state.setTargetDuration}
        customDurationMinutes={state.customDurationMinutes}
        setCustomDurationMinutes={state.setCustomDurationMinutes}
        selectedPresetId={state.selectedPresetId}
        defaultPrompt={state.defaultPrompt}
        handleSelectPreset={state.handleSelectPreset}
        onOpenPromptModal={() => {
          setShowBatchModal(false);
          setShowPromptModal(true);
        }}
        narratorEnabled={state.narratorEnabled}
        updateNarratorEnabled={state.updateNarratorEnabled}
        removeOriginalBgm={state.removeOriginalBgm}
        updateRemoveOriginalBgm={state.updateRemoveOriginalBgm}
        interweaveAudio={state.interweaveAudio}
        updateInterweaveAudio={state.updateInterweaveAudio}
        emphasizeHook={state.emphasizeHook}
        updateEmphasizeHook={state.updateEmphasizeHook}
        autoDucking={state.autoDucking}
        updateAutoDucking={state.updateAutoDucking}
        defaultLanguage={state.defaultLanguage}
        setDefaultLanguage={state.setDefaultLanguage}
        onSubmitBatch={(pId, prompt, lang) => {
          if (analysisTargetJob) {
            setShowBatchModal(false);
            runAnalysisForJob(
              analysisTargetJob,
              pId,
              prompt,
              undefined,
              lang,
              state.durationMode === "rules" ? state.durationRules : undefined,
              state.useProviderPool ? state.activeProviderPool : undefined
            );
            setAnalysisTargetJob(null);
          } else {
            handleStartBatchAnalysis(pId, prompt, lang);
          }
        }}
      />

      <SceneEditorModal
        editingSceneInfo={editingSceneInfo}
        onClose={() => setEditingSceneInfo(null)}
        setEditingSceneInfo={setEditingSceneInfo}
        onSave={handleSaveEditedScene}
        onPlaySceneVoice={audio.handlePlaySceneVoice}
      />

      <VideoPreviewModal
        previewPlayerInfo={previewPlayerInfo}
        onClose={() => setPreviewPlayerInfo(null)}
        jobs={jobs}
        runningJobIds={runningJobIds}
        batchProgress={batchProgress}
        providers={state.providers}
        defaultProviderId={state.defaultProviderId}
        selectedProvider={state.selectedProvider}
        activePlayingSceneIdx={audio.activePlayingSceneIdx}
        setActivePlayingSceneIdx={audio.setActivePlayingSceneIdx}
        playingVoiceKey={audio.playingVoiceKey}
        loadingVoiceKey={audio.loadingVoiceKey}
        onPlaySceneVoice={audio.handlePlaySceneVoice}
        onExportToTimeline={handleExportToTimeline}
        onExportToStory={handleExportToStory}
        onOpenAnalysisConfigForJob={openAnalysisConfigForJob}
        onNavigate={onNavigate}
      />

      <AddVideoModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        inputUrl={inputUrl}
        setInputUrl={setInputUrl}
        isAddingUrl={isAddingUrl}
        onPickFiles={handlePickFiles}
        onAddUrlSubmit={handleAddUrlSubmit}
      />

      <ApiKeyModal
        isOpen={state.showApiKeyModal}
        onClose={() => state.setShowApiKeyModal(false)}
        selectedProvider={state.selectedProvider}
        apiKeyInput={state.apiKeyInput}
        setApiKeyInput={state.setApiKeyInput}
        onSave={state.handleSaveApiKey}
      />

      <PresetPromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        selectedPresetId={state.selectedPresetId}
        defaultPrompt={state.defaultPrompt}
        setDefaultPrompt={state.setDefaultPrompt}
        setSelectedPresetId={state.setSelectedPresetId}
        handleSelectPreset={state.handleSelectPreset}
        onSaveToast={state.showToast}
      />
    </div>
  );
}
