import { useState, useEffect, useRef } from "react";
import type { AnalysisResult, AnalysisScene, DurationMappingRule, Job, NavKey, ProviderPoolItem, TimelineClip } from "../../core/types";
import { getRuntime } from "../../core/runtime";
import { popup } from "../../shared/popup";
import { Film, PlusLg } from "react-bootstrap-icons";
import { toSeconds, stripSceneMetadata } from "../editor/utils/editorTime";
import { logAiUsage } from "../../core/api";

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
  allowedModels?: string[] | null;
  onSyncAdminGrant?: () => void;
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
  allowedModels = null,
  onSyncAdminGrant,
}: AnalysisPageProps) {
  const state = useAnalysisState(jobs, initialSource, allowedModels);
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
  const opToJobIdMap = useRef<Map<string, string>>(new Map());

  // Listen to live analysis progress events from backend/Electron
  useEffect(() => {
    const unsubscribe = getRuntime().onAnalysisProgress?.((value) => {
      if (!value.operationId) return;
      const mappedId = opToJobIdMap.current.get(value.operationId);
      const strippedId = value.operationId.startsWith("analysis-")
        ? value.operationId.replace(/^analysis-/, "").replace(/-\d+$/, "")
        : value.operationId;
      const targetId = mappedId || strippedId;

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
    overrideProviderPool?: ProviderPoolItem[],
    overrideModel?: string
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
    opToJobIdMap.current.set(opId, job.id);
    const targetMins =
      state.targetDuration === "full"
        ? job.durationSeconds && job.durationSeconds > 10
          ? (state.narratorEnabled ? Math.min(15, Math.ceil(job.durationSeconds / 60)) : Math.ceil(job.durationSeconds / 60))
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
        model: overrideModel || state.selectedModel,
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
        scriptStylePreset: state.selectedPresetId,
      });

      const newName = (analysis as any).videoTitle || job.name;
      const scenes = (analysis as any).scenes || [];

      let cursor = 0;
      const cuts = scenes.map((s: any, idx: number) => {
        const srcStart = s.sourceTimeStart ?? toSeconds(s.sourceStart || s.start || 0);
        const sceneDur = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start) || (s.duration ? toSeconds(s.duration) : 5));
        const srcEnd = s.sourceTimeEnd ?? (srcStart + sceneDur);
        const tStart = cursor;
        const tEnd = cursor + sceneDur;
        cursor = tEnd;
        const text = stripSceneMetadata(s.voiceover || s.translation || s.subtitle || s.detail || "").trim();
        return {
          sceneId: s.id || `scene-${idx + 1}`,
          order: idx,
          sourceSceneId: s.id || `scene-${idx + 1}`,
          sourceStart: srcStart,
          sourceEnd: srcEnd,
          sourceTimeStart: srcStart,
          sourceTimeEnd: srcEnd,
          start: tStart,
          end: tEnd,
          duration: sceneDur,
          text,
          title: s.title || `Cảnh ${idx + 1}`,
          subtitle: text,
          subtitleText: text,
        };
      });

      const subSegments = cuts.map((c: any) => ({
        start: c.start,
        end: c.end,
        text: c.text,
      })).filter((s: any) => s.text);

      const fullNarrationText =
        (analysis as any).voiceScript ||
        scenes
          .map((s: any) => s.voiceover || s.translation || s.subtitle || s.detail)
          .filter(Boolean)
          .join(" ");

      const isAutoRender = Boolean(state.autoQueueRender);

      if (onUpdateJob) {
        onUpdateJob(job.id, {
          name: newName,
          videoTitle: (analysis as any).videoTitle,
          suggestedTitles: (analysis as any).suggestedTitles,
          status: "completed",
          stage: "completed",
          progress: 100,
          sourceOnly: true,
          requiresScriptApproval: false,
          timelineClips: cuts as any,
          cutClips: cuts,
          subtitleSegments: subSegments,
          durationSeconds: cursor || job.durationSeconds || 60,
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
          subtitleText: fullNarrationText,
          narrationText: fullNarrationText,
        });
      }

      state.setExpandedJobIds((prev) => new Set(prev).add(job.id));
      state.showToast(`🎉 Phân tích AI thành công: ${newName} (${scenes.length} phân cảnh)`);

      // Record audit log and deduct credits for this tool key
      try {
        const runtime = getRuntime();
        const key = await runtime.readLicense();
        const machine = await runtime.getMachineInfo();
        if (key && machine?.machineId) {
          const inTok = (analysis as any)?.inputTokens || Math.round((analysis.tokensUsed || 3500) * 0.7);
          const outTok = (analysis as any)?.outputTokens || Math.round((analysis.tokensUsed || 3500) * 0.3);
          const cacheTok = (analysis as any)?.cacheTokens || 0;
          void logAiUsage({
            task_type: "video_analysis",
            task_title: `Phân tích video: ${newName || job.name}`,
            model_used: pId || "gemini-2.0-flash",
            input_tokens: inTok,
            output_tokens: outTok,
            cache_read_tokens: cacheTok,
            job_id: job.id,
          }, key, machine.machineId);
        }
      } catch {
        // non-blocking
      }
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

  async function handleStartBatchAnalysis(pId: string, prompt: string, lang: string, voice?: string) {
    setShowBatchModal(false);
    const targetVoice = voice || state.defaultVoiceId;
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
        const poolItem = pool && pool.length > 0 ? pool[currentIdx % pool.length] : null;
        const assignedProviderId = poolItem ? poolItem.providerId : pId;
        const assignedModel = poolItem ? poolItem.model : state.selectedModel;

        await runAnalysisForJob(job, assignedProviderId, prompt, targetVoice, lang, rules, pool, assignedModel);
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

  function handleQueueSingleToRender(job: Job) {
    if (!job.analysis?.scenes?.length && !job.analysis?.voiceScript) {
      state.showToast("⚠️ Video chưa được phân tích AI. Vui lòng phân tích trước khi render.");
      return;
    }
    const scenes = job.analysis?.scenes || [];
    let cursor = 0;
    const cuts = (job as any).cutClips && (job as any).cutClips.length > 0
      ? (job as any).cutClips
      : scenes.map((s: any, idx: number) => {
          const srcStart = s.sourceTimeStart ?? toSeconds(s.sourceStart || s.start || 0);
          const sceneDur = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start) || (s.duration ? toSeconds(s.duration) : 5));
          const srcEnd = s.sourceTimeEnd ?? (srcStart + sceneDur);
          const tStart = cursor;
          const tEnd = cursor + sceneDur;
          cursor = tEnd;
          const text = stripSceneMetadata(s.voiceover || s.translation || s.subtitle || s.detail || "").trim();
          return {
            sceneId: s.id || `scene-${idx + 1}`,
            order: idx,
            sourceSceneId: s.id || `scene-${idx + 1}`,
            sourceStart: srcStart,
            sourceEnd: srcEnd,
            sourceTimeStart: srcStart,
            sourceTimeEnd: srcEnd,
            start: tStart,
            end: tEnd,
            duration: sceneDur,
            text,
            title: s.title || `Cảnh ${idx + 1}`,
            subtitle: text,
            subtitleText: text,
          };
        });

    const subSegments = cuts.map((c: any) => ({
      start: c.start ?? 0,
      end: c.end ?? (c.duration || 5),
      text: c.text,
    })).filter((s: any) => s.text);

    const fullNarrationText =
      job.analysis?.voiceScript ||
      scenes
        .map((s: any) => s.voiceover || s.translation || s.subtitle || s.detail)
        .filter(Boolean)
        .join(" ");

    if (onUpdateJob) {
      onUpdateJob(job.id, {
        timelineClips: cuts as any,
        cutClips: cuts,
        subtitleSegments: subSegments,
        durationSeconds: cursor || job.durationSeconds || 60,
        narrationText: job.narrationText || fullNarrationText,
        subtitleText: job.subtitleText || fullNarrationText,
      });
    }

    if (onAddJob) {
      const renderJobId = `render-${Date.now()}-${job.id}`;
      onAddJob({
        id: renderJobId,
        parentJobId: job.id,
        name: `[Xuất] ${job.videoTitle || job.name}`,
        source: job.source,
        sourceType: job.sourceType,
        localPath: job.localPath,
        sourceOnly: false,
        mode: "local-gpu",
        durationSeconds: cursor || job.durationSeconds || 60,
        aspectRatio: job.aspectRatio || "9:16",
        narratorEnabled: job.narratorEnabled ?? true,
        narratorVoice: job.narratorVoice,
        languages: job.languages || ["vi"],
        cutClips: cuts,
        timelineClips: cuts as any,
        subtitleSegments: subSegments,
        scenes: scenes as any,
        analysis: job.analysis,
        audioLayers: job.audioLayers,
        subtitleStyle: job.subtitleStyle || "gold",
        subtitleText: fullNarrationText,
        narrationText: fullNarrationText,
        status: "queued",
        stage: "queued",
        progress: 0,
        createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      });
    }
    state.showToast(`🚀 Đã đưa "${job.name}" vào Hàng Đợi Render!`);
  }

  function handleBatchQueueToRender(targetJobIds?: string[]) {
    const ids = targetJobIds || (state.selectedJobIds.size > 0 ? Array.from(state.selectedJobIds) : state.sourceCandidates.map((j) => j.id));
    const targetJobs = state.sourceCandidates.filter(
      (j) => ids.includes(j.id) && (j.analysis?.scenes?.length || j.analysis?.voiceScript)
    );

    if (targetJobs.length === 0) {
      state.showToast("⚠️ Chưa có video nào được phân tích AI hoàn tất để đưa vào Render.");
      return;
    }

    targetJobs.forEach((j, idx) => {
      const scenes = j.analysis?.scenes || [];
      let cursor = 0;
      const cuts = (j as any).cutClips && (j as any).cutClips.length > 0
        ? (j as any).cutClips
        : scenes.map((s: any, sIdx: number) => {
            const srcStart = s.sourceTimeStart ?? toSeconds(s.sourceStart || s.start || 0);
            const sceneDur = Math.max(0.5, toSeconds(s.end) - toSeconds(s.start) || (s.duration ? toSeconds(s.duration) : 5));
            const srcEnd = s.sourceTimeEnd ?? (srcStart + sceneDur);
            const tStart = cursor;
            const tEnd = cursor + sceneDur;
            cursor = tEnd;
            const text = stripSceneMetadata(s.voiceover || s.translation || s.subtitle || s.detail || "").trim();
            return {
              sceneId: s.id || `scene-${sIdx + 1}`,
              order: sIdx,
              sourceSceneId: s.id || `scene-${sIdx + 1}`,
              sourceStart: srcStart,
              sourceEnd: srcEnd,
              sourceTimeStart: srcStart,
              sourceTimeEnd: srcEnd,
              start: tStart,
              end: tEnd,
              duration: sceneDur,
              text,
              title: s.title || `Cảnh ${sIdx + 1}`,
              subtitle: text,
              subtitleText: text,
            };
          });

      const subSegments = cuts.map((c: any) => ({
        start: c.start ?? 0,
        end: c.end ?? (c.duration || 5),
        text: c.text,
      })).filter((s: any) => s.text);

      const fullNarrationText =
        j.analysis?.voiceScript ||
        scenes
          .map((s: any) => s.voiceover || s.translation || s.subtitle || s.detail)
          .filter(Boolean)
          .join(" ");

      if (onUpdateJob) {
        onUpdateJob(j.id, {
          timelineClips: cuts as any,
          cutClips: cuts,
          subtitleSegments: subSegments,
          durationSeconds: cursor || j.durationSeconds || 60,
          narrationText: j.narrationText || fullNarrationText,
          subtitleText: j.subtitleText || fullNarrationText,
        });
      }

      if (onAddJob) {
        const renderJobId = `render-${Date.now()}-${idx}-${j.id}`;
        onAddJob({
          id: renderJobId,
          parentJobId: j.id,
          name: `[Xuất] ${j.videoTitle || j.name}`,
          source: j.source,
          sourceType: j.sourceType,
          localPath: j.localPath,
          sourceOnly: false,
          mode: "local-gpu",
          durationSeconds: cursor || j.durationSeconds || 60,
          aspectRatio: j.aspectRatio || "9:16",
          narratorEnabled: j.narratorEnabled ?? true,
          narratorVoice: j.narratorVoice,
          languages: j.languages || ["vi"],
          cutClips: cuts,
          timelineClips: cuts as any,
          subtitleSegments: subSegments,
          scenes: scenes as any,
          analysis: j.analysis,
          audioLayers: j.audioLayers,
          subtitleStyle: j.subtitleStyle || "gold",
          subtitleText: fullNarrationText,
          narrationText: fullNarrationText,
          status: "queued",
          stage: "queued",
          progress: 0,
          createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        });
      }
    });

    state.setSelectedJobIds(new Set());
    state.showToast(`🚀 Đã đưa ${targetJobs.length} video vào Hàng Đợi Render! Đang chuyển trang...`);
    if (onNavigate) {
      onNavigate("render");
    }
  }

  function handleBatchExportToTimeline(targetJobIds?: string[]) {
    const ids = targetJobIds || (state.selectedJobIds.size > 0 ? Array.from(state.selectedJobIds) : []);
    const targetJobs = state.sourceCandidates.filter(
      (j) => ids.includes(j.id) && (j.analysis?.scenes?.length || j.analysis?.voiceScript)
    );

    if (targetJobs.length === 0) {
      state.showToast("⚠️ Hãy chọn ít nhất 1 video đã phân tích để mở trên bàn dựng Timeline.");
      return;
    }

    handleExportToTimeline(targetJobs[0]);
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
        onBatchQueueToRender={handleBatchQueueToRender}
        onBatchExportToTimeline={handleBatchExportToTimeline}
        defaultVoiceId={state.defaultVoiceId}
        setDefaultVoiceId={state.setDefaultVoiceId}
      />

      {/* 2. Main Master-Detail Table */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          background: "linear-gradient(180deg, rgba(18, 24, 38, 0.85) 0%, rgba(11, 15, 26, 0.95) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 12px 36px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "40px 36px 1fr 160px 145px 105px 330px",
            padding: "12px 16px",
            background: "linear-gradient(90deg, rgba(28, 36, 56, 0.95) 0%, rgba(18, 24, 38, 0.95) 100%)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            fontSize: "11px",
            fontWeight: 800,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            alignItems: "center",
            gap: "8px",
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
              style={{
                cursor: "pointer",
                width: "15px",
                height: "15px",
                accentColor: "#f59e0b",
              }}
            />
          </div>
          <div></div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📹</span> Video Nguồn & Thông Tin
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📊</span> Trạng Thái AI
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>⚡</span> Tiêu Hao Token
          </div>
          <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
            <span>⭐</span> Điểm AI
          </div>
          <div style={{ textAlign: "right", paddingRight: "8px" }}>THAO TÁC</div>
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
                  onQueueToRender={handleQueueSingleToRender}
                />
              );
            })
          )}

          {state.paginatedVideos.length > 0 && state.paginatedVideos.length < 3 && (
            <div
              onClick={() => setShowAddModal(true)}
              style={{
                margin: "12px 14px",
                padding: "20px 24px",
                border: "1px dashed rgba(245, 158, 11, 0.3)",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.03) 0%, rgba(15, 23, 42, 0.4) 100%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                color: "#94a3b8",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#fbbf24",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PlusLg size={15} />
                </div>
                <span style={{ fontSize: "12.5px", fontWeight: 700, color: "#f8fafc" }}>
                  Nạp thêm video nguồn vào thư viện
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Bấm vào đây để nạp thêm video từ máy tính hoặc dán link video để phân tích & kết xuất hàng loạt
              </span>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {state.filteredVideos.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 18px",
              background: "linear-gradient(90deg, rgba(22, 28, 44, 0.95) 0%, rgba(15, 20, 32, 0.95) 100%)",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              flexWrap: "wrap",
              gap: "10px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                Hiển thị{" "}
                <strong style={{ color: "#f8fafc" }}>
                  {(state.parentPage - 1) * state.parentPageSize + 1} -{" "}
                  {Math.min(state.parentPage * state.parentPageSize, state.filteredVideos.length)}
                </strong>{" "}
                trên tổng số <strong style={{ color: "#fbbf24" }}>{state.filteredVideos.length}</strong> video
              </span>
              <select
                value={state.parentPageSize}
                onChange={(e) => {
                  state.setParentPageSize(Number(e.target.value));
                  state.setParentPage(1);
                }}
                style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  color: "#f8fafc",
                  fontSize: "11px",
                  fontWeight: 600,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value={5}>5 video / trang</option>
                <option value={10}>10 video / trang</option>
                <option value={20}>20 video / trang</option>
                <option value={50}>50 video / trang</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => state.setParentPage(1)}
                disabled={state.parentPage <= 1}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: state.parentPage <= 1 ? "#475569" : "#cbd5e1",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: state.parentPage <= 1 ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                « Đầu
              </button>
              <button
                type="button"
                onClick={() => state.setParentPage((p) => Math.max(1, p - 1))}
                disabled={state.parentPage <= 1}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: state.parentPage <= 1 ? "#475569" : "#cbd5e1",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: state.parentPage <= 1 ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                ‹ Trước
              </button>

              <div
                style={{
                  fontSize: "11.5px",
                  fontWeight: 800,
                  color: "#fbbf24",
                  padding: "3px 10px",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  borderRadius: "6px",
                }}
              >
                Trang {state.parentPage} / {state.totalParentPages}
              </div>

              <button
                type="button"
                onClick={() => state.setParentPage((p) => Math.min(state.totalParentPages, p + 1))}
                disabled={state.parentPage >= state.totalParentPages}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: state.parentPage >= state.totalParentPages ? "#475569" : "#cbd5e1",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: state.parentPage >= state.totalParentPages ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Sau ›
              </button>
              <button
                type="button"
                onClick={() => state.setParentPage(state.totalParentPages)}
                disabled={state.parentPage >= state.totalParentPages}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: state.parentPage >= state.totalParentPages ? "#475569" : "#cbd5e1",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: state.parentPage >= state.totalParentPages ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
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
        defaultVoiceId={state.defaultVoiceId}
        setDefaultVoiceId={state.setDefaultVoiceId}
        onPlayPreviewVoice={audio.handlePlaySceneVoice}
        autoQueueRender={state.autoQueueRender}
        updateAutoQueueRender={state.updateAutoQueueRender}
        onSubmitBatch={(pId, prompt, lang, voice) => {
          if (analysisTargetJob) {
            setShowBatchModal(false);
            runAnalysisForJob(
              analysisTargetJob,
              pId,
              prompt,
              voice || state.defaultVoiceId,
              lang,
              state.durationMode === "rules" ? state.durationRules : undefined,
              state.useProviderPool ? state.activeProviderPool : undefined,
              state.selectedModel
            );
            setAnalysisTargetJob(null);
          } else {
            handleStartBatchAnalysis(pId, prompt, lang, voice);
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
