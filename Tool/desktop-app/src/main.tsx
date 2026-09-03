import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DEFAULT_PREFERENCES,
  NAV_ITEMS,
  type ClientMetrics,
  type Job,
  type NavKey,
  type ToolPreferences,
} from "./core/types";
import {
  ApiRequestError,
  heartbeatLicense,
  createClientJob,
  deleteClientJob,
  getClientMetrics,
  listClientJobs,
  sendClientTelemetry,
  updateClientJob,
} from "./core/api";
import { getRuntime, isNativeRuntime } from "./core/runtime";
import {
  hasUnreviewedSceneMatches,
  highlightRange,
  resolveReadyProvider,
  shouldResumeJob,
  timestampSeconds,
} from "./core/job-utils";
import { buildNarrationText } from "./core/narration";
import { runRenderPreflight } from "./core/render-preflight";
import { Icon } from "./shared/Icon";
import { ActivationGate } from "./modules/activation/ActivationGate";
import { ActivationPage } from "./modules/activation/ActivationPage";
import { VideoAnalysisPage } from "./modules/analysis/VideoAnalysisPage";
import { BatchJobsPage } from "./modules/jobs/BatchJobsPage";
import { EditorWorkspace } from "./modules/editor/EditorWorkspace";
import { OverviewPage } from "./modules/overview/OverviewPage";
import { RenderPage } from "./modules/render/RenderPage";
import { SettingsPage } from "./modules/settings/SettingsPage";
import { StoryPage } from "./modules/story/StoryPage";
import { BrandPage } from "./modules/brand/BrandPage";
import { SourcesPage } from "./modules/sources/SourcesPage";
import { LicenseRenewalModal } from "./modules/renewal/LicenseRenewalModal";
import "./styles.css";

type PageProps = {
  jobs: Job[];
  metrics: ClientMetrics | null;
  navigate: (key: NavKey) => void;
  onOpenTimeline: (jobId?: string) => void;
  timelineSourceId?: string;
  addJob: (job: Job) => void;
  updateJob: (jobId: string, values: Partial<Job>) => void;
  cancelJob: (jobId: string) => void;
  retryJob: (jobId: string) => void;
  deleteJobs: (jobIds: string[]) => void;
  deleteSources: (sourceIds: string[]) => void;
  onActivated: (value: boolean) => void;
  preferences: ToolPreferences;
  onPreferencesChanged: (value: ToolPreferences) => void;
  onAnalyzeSource: (job: Job) => void;
  analysisSource?: Job;
};

function renderQualityChecks(
  job: Job,
  analysis: Job["analysis"],
  clip: { startSeconds?: number; endSeconds?: number },
  narrationText: string | undefined,
  outputPath: string | undefined,
  sourceDuration: number,
  outputProbe?: { durationSeconds?: number; hasAudio?: boolean },
  renderResult?: {
    subtitlesBurned?: boolean;
    narrationGenerated?: boolean;
    narrationDurationSeconds?: number;
    subtitleCueCount?: number;
  }
) {
  const subtitleSegments = subtitleSegmentsForClip(
    job,
    analysis,
    clip,
    narrationText,
    sourceDuration
  );
  const preflight = runRenderPreflight({
    job,
    sourcePath: job.localPath,
    sourceDuration,
    startSeconds: clip.startSeconds,
    endSeconds: clip.endSeconds,
    narrationText,
    subtitleSegments,
    outputPath,
  });
  const expectedDuration =
    (clip.endSeconds || 0) > (clip.startSeconds || 0)
      ? (clip.endSeconds || 0) - (clip.startSeconds || 0)
      : sourceDuration;
  const subtitlesRequested = job.subtitlesEnabled !== false;
  const subtitleContent = Boolean(
    subtitleSegments.length || job.subtitleText?.trim() || narrationText?.trim()
  );
  const checks = [
    ...preflight.checks,
    {
      id: "scene-map",
      passed:
        !job.narratorEnabled ||
        Boolean(analysis?.sceneMatches?.length || analysis?.scenes?.length),
      detail: "Có scene map để kiểm tra",
    },
    {
      id: "output-probe",
      passed:
        Boolean(outputPath) &&
        (!outputProbe || Number(outputProbe.durationSeconds || 0) > 0),
      detail: "Output có thể probe và có thời lượng hợp lệ",
    },
    {
      id: "output-checksum",
      passed:
        !renderResult ||
        Boolean((renderResult as { outputChecksum?: string }).outputChecksum),
      detail: "Output có checksum SHA-256 và manifest",
    },
    {
      id: "output-duration",
      passed:
        !outputProbe ||
        !expectedDuration ||
        Math.abs(Number(outputProbe.durationSeconds || 0) - expectedDuration) <=
          Math.max(1.5, expectedDuration * 0.2),
      detail: "Thời lượng output khớp khoảng dựng",
    },
    {
      id: "output-audio",
      passed:
        !job.narratorEnabled ||
        !outputProbe ||
        outputProbe.hasAudio === true,
      detail: "Output có audio stream cho voice-over",
    },
    {
      id: "output-voice",
      passed:
        !job.narratorEnabled ||
        !renderResult ||
        renderResult.narrationGenerated === true,
      detail: "Đã tạo voice-over theo scene",
    },
    {
      id: "voice-duration",
      passed:
        !job.narratorEnabled ||
        !renderResult ||
        Number(renderResult.narrationDurationSeconds || 0) > 0,
      detail: "Đã đo thời lượng audio voice-over thực tế",
    },
    {
      id: "subtitle-cues",
      passed:
        !subtitlesRequested ||
        !subtitleContent ||
        !renderResult ||
        Number(renderResult.subtitleCueCount || 0) > 0,
      detail: "Đã tạo cue phụ đề theo lời đọc",
    },
    {
      id: "output-subtitles",
      passed:
        !subtitlesRequested ||
        !subtitleContent ||
        !renderResult ||
        renderResult.subtitlesBurned === true,
      detail: subtitlesRequested
        ? "Đã burn phụ đề vào video"
        : "Đã tắt phụ đề",
    },
  ];
  return { passed: checks.every((check) => check.passed), checks };
}

function subtitleSegmentsForClip(
  job: Job,
  analysis: Job["analysis"],
  clip: { startSeconds?: number; endSeconds?: number },
  fallback?: string,
  sourceDuration = 0
) {
  const start = Number(clip.startSeconds || 0);
  const end = Number(clip.endSeconds || 0);
  const total = Math.max(
    sourceDuration,
    Number(job.durationSeconds || 0),
    end,
    start + 1
  );
  const selectedText = String(job.subtitleText || "")
    .replace(/\s+/g, " ")
    .trim();
  if (selectedText && (job.parentJobId || job.sceneId)) {
    return [{ start, end: end || total, text: selectedText }];
  }

  const scenes = analysis?.scenes || [];
  const rawTranscriptSegments = [...(analysis?.transcriptSegments || [])]
    .map((item) => ({
      start: Math.max(0, Number(item.start) || 0),
      end: Number(item.end),
      text: String(item.text || "")
        .replace(/\s+/g, " ")
        .trim(),
    }))
    .filter((item) => item.text)
    .sort((left, right) => left.start - right.start);
  const transcriptSegments = rawTranscriptSegments.map((item, index) => {
    const nextStart = rawTranscriptSegments[index + 1]?.start;
    const explicitEnd =
      Number.isFinite(item.end) && item.end > item.start ? item.end : undefined;
    const inferredEnd = nextStart && nextStart > item.start ? nextStart : total;
    return {
      ...item,
      end: Math.min(total, Math.max(item.start + 0.25, explicitEnd || inferredEnd)),
    };
  });
  const sceneSegments = scenes.map((item, index) => {
    const sceneId = item.id || `scene-${index + 1}`;
    const sceneStart = timestampSeconds(item.start);
    const sceneEnd = Math.max(
      sceneStart + 0.25,
      timestampSeconds(
        item.end,
        timestampSeconds(scenes[index + 1]?.start, total)
      )
    );
    const localizedText = String(item.voiceover || item.translation || "")
      .replace(/\s+/g, " ")
      .trim();
    const timedText = transcriptSegments
      .filter((segment) => segment.end > sceneStart && segment.start < sceneEnd)
      .map((segment) => segment.text)
      .join(" ")
      .trim();
    return {
      sceneId,
      start: sceneStart,
      end: sceneEnd,
      text:
        localizedText ||
        timedText ||
        String(item.detail || "")
          .replace(/\s+/g, " ")
          .trim(),
    };
  });
  const matches = sceneSegments
    .filter(
      (item) =>
        (!job.sceneId || item.sceneId === job.sceneId) &&
        item.text &&
        (!end || item.end > start) &&
        (!end || item.start < end)
    )
    .map((item) => ({
      start: Math.max(0, item.start),
      end: Math.min(total, item.end || (end || start + 1)),
      text: item.text,
    }));
  if (matches.length) return matches;

  const timed = transcriptSegments
    .filter((item) => (!end || item.end > start) && (!end || item.start < end))
    .map((item) => ({
      start: Math.max(0, item.start),
      end: Math.min(total, item.end || (end || start + 1)),
      text: item.text,
    }));
  if (timed.length) return timed;
  const text =
    selectedText ||
    String(fallback || analysis?.voiceScript || analysis?.transcript || "")
      .replace(/\s+/g, " ")
      .trim();
  return text ? [{ start, end: end || total, text }] : [];
}

function sceneSlug(value: string, fallback: string) {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug.slice(0, 64) || fallback;
}

const pages: Record<NavKey, (props: PageProps) => JSX.Element> = {
  overview: ({ jobs, metrics, navigate }) => (
    <OverviewPage jobs={jobs} metrics={metrics} onNavigate={navigate} />
  ),
  sources: ({ jobs, navigate, addJob, updateJob, onAnalyzeSource, deleteSources }) => (
    <SourcesPage
      jobs={jobs}
      onNavigate={navigate}
      onAddJob={addJob}
      onAnalyze={onAnalyzeSource}
      onUpdateJob={updateJob}
      onDeleteSources={deleteSources}
    />
  ),
  batch: ({ jobs, addJob, cancelJob, retryJob, deleteJobs, onOpenTimeline }) => (
    <BatchJobsPage
      jobs={jobs}
      onAddJob={addJob}
      onCancelJob={cancelJob}
      onRetryJob={retryJob}
      onDeleteJobs={deleteJobs}
      onOpenTimeline={onOpenTimeline}
    />
  ),
  analysis: ({ addJob, updateJob, analysisSource }) => (
    <VideoAnalysisPage
      onAddJob={addJob}
      onUpdateJob={updateJob}
      initialSource={analysisSource}
    />
  ),
  story: ({ jobs, navigate, updateJob, addJob }) => (
    <StoryPage
      jobs={jobs}
      onNavigate={navigate}
      onUpdateJob={updateJob}
      onAddJob={addJob}
    />
  ),
  timeline: ({ jobs, navigate, addJob, updateJob, timelineSourceId }) => (
    <EditorWorkspace
      jobs={jobs}
      onNavigate={navigate}
      onAddJob={addJob}
      onUpdateJob={updateJob}
      sourceJobId={timelineSourceId}
    />
  ),
  brand: ({ jobs, navigate, updateJob, addJob }) => (
    <BrandPage
      jobs={jobs}
      onNavigate={navigate}
      onUpdateJob={updateJob}
      onAddJob={addJob}
    />
  ),
  render: ({ jobs }) => <RenderPage jobs={jobs} />,
  activation: ({ onActivated }) => <ActivationPage onActivated={onActivated} />,
  settings: ({ preferences, onPreferencesChanged }) => (
    <SettingsPage
      preferences={preferences}
      onPreferencesChanged={onPreferencesChanged}
    />
  ),
};

function App() {
  const [active, setActive] = useState<NavKey>("overview");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [preferences, setPreferences] = useState<ToolPreferences>(DEFAULT_PREFERENCES);
  const [activated, setActivated] = useState<boolean | null>(null);
  const [analysisSourceId, setAnalysisSourceId] = useState<string | undefined>();
  const [timelineSourceId, setTimelineSourceId] = useState<string | undefined>();
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const processingJob = useRef("");
  const syncingJobs = useRef(new Set<string>());

  const persistJobs = (value: Job[]) => {
    void getRuntime().saveJobs?.(value);
  };

  const replaceJob = (jobId: string, values: Partial<Job>) =>
    setJobs((current) => {
      const next = current.map((job) => (job.id === jobId ? { ...job, ...values } : job));
      persistJobs(next);
      return next;
    });

  const updateJob = (jobId: string, values: Partial<Job>) => {
    replaceJob(jobId, values);
    const syncedFields = [
      "subtitlesEnabled",
      "subtitleStyle",
      "subtitleText",
      "logoPosition",
      "logoOpacity",
      "timelineClips",
      "parentJobId",
      "sceneId",
      "splitScenes",
      "analysisOnly",
      "clipStartSeconds",
      "clipEndSeconds",
      "outputFileName",
    ];
    const shouldSync = syncedFields.some((key) =>
      Object.prototype.hasOwnProperty.call(values, key)
    );
    if (!activated || !shouldSync) return;
    void (async () => {
      const runtime = getRuntime();
      const key = await runtime.readLicense();
      if (!key) return;
      const machine = await runtime.getMachineInfo();
      await updateClientJob(key, machine.machineId, jobId, {
        subtitles_enabled: values.subtitlesEnabled,
        subtitle_style: values.subtitleStyle,
        subtitle_text: values.subtitleText,
        logo_position: values.logoPosition,
        logo_opacity: values.logoOpacity,
        timeline_clips: values.timelineClips,
        parent_job_id: values.parentJobId,
        scene_id: values.sceneId,
        split_scenes: values.splitScenes,
        analysis_only: values.analysisOnly,
        clip_start_seconds: values.clipStartSeconds,
        clip_end_seconds: values.clipEndSeconds,
        output_file_name: values.outputFileName,
      }).catch(() => undefined);
    })();
  };

  // Initial License Validation
  useEffect(() => {
    void (async () => {
      const runtime = getRuntime();
      const prefs = await runtime.getPreferences().catch(() => DEFAULT_PREFERENCES);
      setPreferences(prefs);

      const savedKey = await runtime.readLicense();
      if (!savedKey) {
        setActivated(false);
        return;
      }

      const local = (await runtime.readJobs?.().catch(() => [])) || [];
      const recovered = local.map((job) =>
        job.status === "running"
          ? {
              ...job,
              status: "queued" as const,
              stage:
                job.sourceType === "url" && !job.localPath
                  ? ("downloading" as const)
                  : ("queued" as const),
              progress: 0,
            }
          : job
      );
      setJobs(recovered);
      if (recovered.some((job, index) => job !== local[index])) persistJobs(recovered);

      try {
        const machine = await runtime.getMachineInfo();
        const hbResult = await heartbeatLicense(
          savedKey,
          machine.machineId,
          machine.appVersion,
          machine.platform
        );
        setActivated(true);

        if (hbResult.logo_url) {
          setPreferences((prev) => ({
            ...prev,
            logoPath: hbResult.logo_url || undefined,
            brandKitLogo: hbResult.logo_url || undefined,
          }));
        }

        const remote = await listClientJobs(savedKey, machine.machineId).catch(() => []);
        const remoteMetrics = await getClientMetrics(savedKey, machine.machineId).catch(
          () => null
        );
        setMetrics(remoteMetrics);

        if (remote.length) {
          setJobs((current) => {
            const merged: Job[] = remote.map((item) => {
              const existing = current.find((job) => job.id === item.client_job_id);
              return {
                ...existing,
                id: item.client_job_id,
                name: item.name,
                source: item.source_name,
                sourceType: item.source_type || existing?.sourceType || "file",
                localPath: existing?.localPath,
                sourcePaths: existing?.sourcePaths,
                outputFolder: existing?.outputFolder,
                mode: item.execution_mode as Job["mode"],
                providerId: item.provider_id || existing?.providerId,
                transcriptionProviderId: existing?.transcriptionProviderId,
                ttsProviderId: item.tts_provider_id || existing?.ttsProviderId,
                parentJobId: item.parent_job_id || existing?.parentJobId,
                sceneId: item.scene_id || existing?.sceneId,
                splitScenes: item.split_scenes ?? existing?.splitScenes,
                analysisOnly: item.analysis_only ?? existing?.analysisOnly,
                clipStartSeconds: item.clip_start_seconds ?? existing?.clipStartSeconds,
                clipEndSeconds: item.clip_end_seconds ?? existing?.clipEndSeconds,
                outputFileName: item.output_file_name || existing?.outputFileName,
                timelineClips: item.timeline_clips || existing?.timelineClips,
                status: item.status as Job["status"],
                stage: item.stage as Job["stage"],
                progress: item.progress,
                error: item.error,
                outputPath: item.output_path || existing?.outputPath,
                subtitlesPath: existing?.subtitlesPath,
                passthrough: existing?.passthrough,
                narrationGenerated: existing?.narrationGenerated,
                subtitleCueCount: existing?.subtitleCueCount,
                voiceEngine: existing?.voiceEngine,
                subtitlesBurned: existing?.subtitlesBurned,
                tokensUsed: item.tokens_used,
                creditsUsed: item.credits_used,
                narratorEnabled: item.narrator_enabled ?? existing?.narratorEnabled,
                narratorVoice: item.narrator_voice || existing?.narratorVoice,
                narratorGender: item.narrator_gender || existing?.narratorGender,
                languages: item.languages || existing?.languages,
                keepOriginalAudio: item.keep_original_audio ?? existing?.keepOriginalAudio,
                emphasizeHook: item.emphasize_hook ?? existing?.emphasizeHook,
                highlightOnly: item.highlight_only ?? existing?.highlightOnly,
                highlightMaxSeconds:
                  item.highlight_max_seconds ?? existing?.highlightMaxSeconds,
                backgroundMusic: item.background_music ?? existing?.backgroundMusic,
                backgroundMusicVolume:
                  item.background_music_volume ?? existing?.backgroundMusicVolume,
                subtitlesEnabled: item.subtitles_enabled ?? existing?.subtitlesEnabled,
                subtitleStyle: item.subtitle_style || existing?.subtitleStyle,
                subtitleText: item.subtitle_text ?? existing?.subtitleText,
                logoPath: existing?.logoPath,
                logoPosition: item.logo_position || existing?.logoPosition,
                logoOpacity: item.logo_opacity ?? existing?.logoOpacity,
                createdAt: existing?.createdAt || "Đã đồng bộ",
                synced: true,
              };
            });
            const next = [
              ...merged,
              ...current.filter((job) => !merged.some((item) => item.id === job.id)),
            ];
            persistJobs(next);
            return next;
          });
        }
      } catch (error) {
        if (error instanceof ApiRequestError && [401, 403, 422].includes(error.status)) {
          await runtime.clearLicense();
          setActivated(false);
        } else {
          setActivated(true);
        }
      }
    })();
  }, []);

  // Periodic Heartbeat
  useEffect(() => {
    if (!activated) return;
    let timer: number | undefined;
    void (async () => {
      const runtime = getRuntime();
      const key = await runtime.readLicense();
      if (!key) return;
      const machine = await runtime.getMachineInfo();
      const check = async () => {
        try {
          const res = await heartbeatLicense(
            key,
            machine.machineId,
            machine.appVersion,
            machine.platform
          );
          if (res.logo_url) {
            setPreferences((prev) => ({
              ...prev,
              logoPath: res.logo_url || undefined,
              brandKitLogo: res.logo_url || undefined,
            }));
          }
        } catch (error) {
          if (error instanceof ApiRequestError && [401, 403, 422].includes(error.status)) {
            await runtime.clearLicense();
            setActivated(false);
          }
        }
      };
      await check();
      timer = window.setInterval(() => void check(), 3 * 60 * 1000);
    })();
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [activated]);

  // Periodic Metrics Refresh
  useEffect(() => {
    if (!activated) {
      setMetrics(null);
      return;
    }
    let timer: number | undefined;
    const refresh = async () => {
      const runtime = getRuntime();
      const key = await runtime.readLicense();
      if (!key) return;
      const machine = await runtime.getMachineInfo();
      const value = await getClientMetrics(key, machine.machineId).catch(() => null);
      if (value) setMetrics(value);
    };
    void refresh();
    timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [activated, jobs.length]);

  // Periodic Job Sync
  useEffect(() => {
    if (!activated) return;
    const sync = async () => {
      const runtime = getRuntime();
      const key = await runtime.readLicense();
      if (!key) return;
      const machine = await runtime.getMachineInfo();
      const providers = await runtime.getProviderProfiles().catch(() => []);
      const candidates = jobs.filter(
        (job) => !job.sourceOnly && !job.synced && !syncingJobs.current.has(job.id)
      );
      for (const job of candidates) {
        syncingJobs.current.add(job.id);
        try {
          const needsProvider = ["cloud", "hybrid"].includes(job.mode);
          const providerId = needsProvider
            ? resolveReadyProvider(providers, job.providerId, "analysis")?.id
            : undefined;
          if (needsProvider && !providerId) continue;
          await createClientJob(key, machine.machineId, { ...job, providerId });
          if (job.status !== "queued" || job.progress > 0 || job.stage) {
            await updateClientJob(key, machine.machineId, job.id, {
              status: job.status,
              stage: job.stage,
              progress: job.progress,
              error: job.error,
              output_path: job.outputPath,
              tokens_used: job.tokensUsed || 0,
              credits_used: job.creditsUsed || 0,
            });
          }
          replaceJob(job.id, { synced: true, providerId });
        } catch {
          // Keep local
        } finally {
          syncingJobs.current.delete(job.id);
        }
      }
    };
    void sync();
    const timer = window.setInterval(() => void sync(), 15_000);
    return () => window.clearInterval(timer);
  }, [activated, jobs]);

  // Periodic Update Checks & In-Place OTA Notifications
  const [availableUpdate, setAvailableUpdate] = useState<{
    version: string;
    release_notes?: string;
    force_update?: boolean;
    download_url?: string;
    [key: string]: unknown;
  } | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStage, setUpdateStage] = useState<string>("");

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    if (getRuntime().onUpdateProgress) {
      unlisten = getRuntime().onUpdateProgress?.((p) => {
        setUpdateProgress(p.progress || 0);
        setUpdateStage(p.stage || "downloading");
      });
    }

    const checkUpdates = async () => {
      try {
        const checkFn = getRuntime().checkForUpdate;
        if (checkFn) {
          const res = await checkFn("stable");
          if (res?.update_available && res.release) {
            setAvailableUpdate(res.release as any);
          } else {
            setAvailableUpdate(null);
          }
        }
      } catch {
        /* ignore offline check */
      }
    };

    void checkUpdates();
    const timer = window.setInterval(() => void checkUpdates(), 45_000);
    return () => {
      window.clearInterval(timer);
      unlisten?.();
    };
  }, []);

  const handleApplyUpdate = async () => {
    if (!availableUpdate) return;
    setIsUpdating(true);
    setUpdateProgress(0);
    setUpdateStage("downloading");
    try {
      if (getRuntime().downloadUpdate) {
        await getRuntime().downloadUpdate?.(availableUpdate as any);
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        window.location.reload();
      }
    } catch (err) {
      setIsUpdating(false);
      alert(err instanceof Error ? err.message : "Không thể cập nhật tự động.");
    }
  };

  // Root Gatekeeper Logic
  if (activated === null) {
    return (
      <main className="boot-screen">
        <span className="brand-mark">
          <span />
        </span>
        <p>Đang khởi tạo JACS Studio...</p>
      </main>
    );
  }

  if (!activated) {
    return (
      <ActivationGate
        onActivated={(customLogo) => {
          setActivated(true);
          setActive("overview");
          if (customLogo) {
            setPreferences((prev) => ({
              ...prev,
              logoPath: customLogo,
              brandKitLogo: customLogo,
            }));
          }
          void getRuntime()
            .readJobs?.()
            .then((value) => setJobs(value || []));
        }}
      />
    );
  }

  const current =
    NAV_ITEMS.find((item) => item.key === active) ?? NAV_ITEMS[0];
  const Page = pages[active];

  const navigate = (key: NavKey) => {
    if (key === "analysis" && !analysisSourceId) {
      const candidate = jobs.find(
        (job) =>
          job.sourceOnly &&
          (job.status === "running" ||
            job.stage === "analyzing" ||
            job.analysis)
      );
      if (candidate) setAnalysisSourceId(candidate.id);
    }
    setActive(key);
  };

  const openTimeline = (jobId?: string) => {
    setTimelineSourceId(jobId || undefined);
    setActive("timeline");
  };

  const onAnalyzeSource = (job: Job) => {
    setAnalysisSourceId(job.id);
    setActive("analysis");
  };

  const analysisSource = analysisSourceId
    ? jobs.find((job) => job.id === analysisSourceId)
    : undefined;

  const addJob = (job: Job) => {
    setJobs((existing) => {
      const next = [job, ...existing];
      persistJobs(next);
      return next;
    });
    if (job.sourceOnly) {
      if (job.stage === "analyzing" || job.status === "running")
        setAnalysisSourceId(job.id);
      return;
    }
    void (async () => {
      const key = await getRuntime().readLicense();
      if (!key) return;
      const machine = await getRuntime().getMachineInfo();
      try {
        const providers = await getRuntime().getProviderProfiles();
        const needsProvider = ["cloud", "hybrid"].includes(job.mode);
        const providerId = needsProvider
          ? resolveReadyProvider(providers, job.providerId, "analysis")?.id
          : undefined;
        if (needsProvider && !providerId) {
          replaceJob(job.id, {
            status: "failed",
            stage: "failed",
            error: `Job ${job.mode} cần provider analysis đang bật và có API key. Mở Cài đặt tool để cấu hình trước.`,
          });
          return;
        }
        await createClientJob(key, machine.machineId, { ...job, providerId });
        replaceJob(job.id, { synced: true, providerId });
      } catch {
        /* keep queued locally for retry */
      }
    })();
  };

  const cancelJob = (jobId: string) => {
    const job = jobs.find((item) => item.id === jobId);
    if (!job || ["completed", "failed", "cancelled"].includes(job.status)) return;
    void getRuntime().cancelOperation?.(jobId);
    replaceJob(jobId, {
      status: "cancelled",
      stage: "cancelled",
      progress: 0,
      error: "Đã hủy theo yêu cầu.",
    });
  };

  const retryJob = (jobId: string) => {
    const job = jobs.find((item) => item.id === jobId);
    if (!job || !["failed", "cancelled"].includes(job.status)) return;
    replaceJob(jobId, {
      status: "queued",
      stage:
        job.sourceType === "url" && !job.localPath ? "downloading" : "queued",
      progress: 0,
      error: undefined,
      synced: false,
      providerId: ["cloud", "hybrid"].includes(job.mode)
        ? undefined
        : job.providerId,
      ttsProviderId: job.narratorEnabled ? undefined : job.ttsProviderId,
    });
  };

  const deleteJobs = (jobIds: string[]) => {
    const ids = [...new Set(jobIds)].filter(Boolean);
    if (!ids.length) return;
    const selectedJobs = jobs.filter((job) => ids.includes(job.id));
    selectedJobs
      .filter((job) => !["completed", "failed", "cancelled"].includes(job.status))
      .forEach((job) => {
        void getRuntime().cancelOperation?.(job.id);
      });
    setJobs((current) => {
      const next = current.filter((job) => !ids.includes(job.id));
      persistJobs(next);
      return next;
    });
    void (async () => {
      const runtime = getRuntime();
      const key = await runtime.readLicense();
      if (!key) return;
      const machine = await runtime.getMachineInfo();
      await Promise.allSettled(
        selectedJobs
          .filter((job) => job.synced)
          .map((job) => deleteClientJob(key, machine.machineId, job.id))
      );
    })();
  };

  const deleteSources = (sourceIds: string[]) => {
    const sourceRecords = jobs.filter((job) => sourceIds.includes(job.id));
    if (!sourceRecords.length) return;
    const ids = new Set<string>(sourceRecords.map((job) => job.id));
    let changed = true;
    while (changed) {
      changed = false;
      jobs.forEach((job) => {
        const sameSource = sourceRecords.some(
          (source) =>
            (source.source && job.source === source.source) ||
            (source.localPath && job.localPath === source.localPath)
        );
        if ((job.parentJobId && ids.has(job.parentJobId)) || sameSource) {
          if (!ids.has(job.id)) {
            ids.add(job.id);
            changed = true;
          }
        }
      });
    }
    deleteJobs([...ids]);
  };

  const onActivated = (value: boolean) => {
    setActivated(value);
    setActive(value ? "overview" : "activation");
    if (value) void getRuntime().readJobs?.().then((val) => setJobs(val || []));
  };

  const initials =
    (preferences.operatorName || "JACS")
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "JS";

  const workflowItems = NAV_ITEMS.filter((item) =>
    [
      "overview",
      "sources",
      "analysis",
      "story",
      "timeline",
      "brand",
      "batch",
    ].includes(item.key)
  );
  const outputItems = NAV_ITEMS.filter((item) => ["render"].includes(item.key));
  const systemItems = NAV_ITEMS.filter((item) =>
    ["activation", "settings"].includes(item.key)
  );

  const renderNav = (items: typeof NAV_ITEMS) =>
    items.map((item) => (
      <button
        key={item.key}
        className={`nav-item ${active === item.key ? "active" : ""}`}
        onClick={() => navigate(item.key)}
      >
        <Icon name={item.icon as never} size={18} />
        <span>
          <strong>{item.label}</strong>
          <small>{item.hint}</small>
        </span>
        {item.key === "batch" && (
          <b className="nav-count">
            {
              jobs.filter(
                (job) =>
                  !job.sourceOnly &&
                  (job.status === "queued" || job.status === "running")
              ).length
            }
          </b>
        )}
      </button>
    ));

  const activeCount = jobs.filter(
    (job) =>
      !job.sourceOnly && (job.status === "queued" || job.status === "running")
  ).length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          {preferences.logoPath || preferences.brandKitLogo ? (
            <img
              src={preferences.logoPath || preferences.brandKitLogo}
              alt="Logo"
              className="sidebar-brand-custom-logo"
            />
          ) : (
            <span className="brand-mark">
              <span />
            </span>
          )}
          <div>
            <strong>JACS</strong>
            <small>STUDIO</small>
          </div>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-dot" />
          <div>
            <small>WORKSPACE</small>
            <strong>{preferences.workspaceName}</strong>
          </div>
          <span className="chevron">
            <Icon name="chevron" size={14} />
          </span>
        </div>

        <nav>
          <p className="nav-label">WORKFLOW</p>
          {renderNav(workflowItems)}
          <p className="nav-label nav-label-lower">OUTPUT</p>
          {renderNav(outputItems)}
          <p className="nav-label nav-label-lower">SYSTEM</p>
          {renderNav(systemItems)}
        </nav>

        <div style={{ padding: "0 0.75rem", margin: "0.4rem 0" }}>
          <button
            type="button"
            onClick={() => setShowRenewalModal(true)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.55rem 0.75rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, rgba(249, 115, 22, 0.12) 0%, rgba(234, 88, 12, 0.22) 100%)",
              border: "1px solid rgba(249, 115, 22, 0.35)",
              color: "#fb923c",
              fontWeight: 700,
              fontSize: "0.78rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Icon name="zap" size={14} />
            Gia hạn / Nâng cấp gói
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="pulse" />
            <div>
              <strong>Hệ thống ổn định</strong>
              <small>API · GPU · Storage</small>
            </div>
          </div>
          <div className="profile">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{preferences.operatorName}</strong>
              <small>{preferences.workspaceName}</small>
            </div>
            <span className="more">
              <Icon name="more" size={16} />
            </span>
          </div>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>JACS Studio</span>
            <Icon name="arrow" size={13} />
            <strong>{current.label}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="topbar-renew-btn"
              type="button"
              title="Gia hạn bản quyền & Quét mã VietQR"
              onClick={() => setShowRenewalModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "0.35rem 0.85rem",
                fontSize: "0.82rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(249, 115, 22, 0.35)",
              }}
            >
              <Icon name="zap" size={14} />
              Gia Hạn Bản Quyền
            </button>
            <button
              className="topbar-link"
              type="button"
              onClick={() => navigate("settings")}
            >
              <span className="live-dot" /> API connected
            </button>
            <button
              className="topbar-icon"
              type="button"
              title={
                activeCount
                  ? `${activeCount} job đang xử lý`
                  : "Không có job đang xử lý"
              }
              onClick={() => navigate("batch")}
            >
              <span
                className="notification-dot"
                style={{ opacity: activeCount ? 1 : 0.35 }}
              />
              <Icon name="bell" size={17} />
            </button>
            <button
              className="topbar-avatar"
              type="button"
              title="Mở cài đặt"
              onClick={() => navigate("settings")}
            >
              {initials}
            </button>
          </div>
        </header>

        {/* IN-PLACE OTA UPDATE NOTIFICATION BANNER */}
        {availableUpdate && dismissedVersion !== availableUpdate.version && (
          <div className="ota-update-banner">
            <div className="ota-banner-left">
              <span className="ota-badge">🎉 CẬP NHẬT MỚI</span>
              <div className="ota-info">
                <strong>Đã có phiên bản {availableUpdate.version}</strong>
                <span>
                  {(availableUpdate.release_notes as string) ||
                    "Bản cập nhật tính năng mới & sửa lỗi. Bấm để load bản mới ngay mà không cần cài lại tool."}
                </span>
              </div>
            </div>
            <div className="ota-banner-actions">
              {isUpdating ? (
                <div className="ota-progress-box">
                  <div className="ota-progress-bar">
                    <div
                      className="ota-progress-fill"
                      style={{ width: `${Math.max(5, updateProgress)}%` }}
                    />
                  </div>
                  <span>{updateProgress}%</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    className="ota-btn-apply"
                    onClick={() => void handleApplyUpdate()}
                  >
                    ⚡ Tải & Cập nhật ngay
                  </button>
                  {!availableUpdate.force_update && (
                    <button
                      type="button"
                      className="ota-btn-later"
                      onClick={() => setDismissedVersion(availableUpdate.version)}
                    >
                      Để sau
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="page-content">
          <Page
            jobs={jobs}
            metrics={metrics}
            navigate={navigate}
            onOpenTimeline={openTimeline}
            timelineSourceId={timelineSourceId}
            addJob={addJob}
            updateJob={updateJob}
            cancelJob={cancelJob}
            retryJob={retryJob}
            deleteJobs={deleteJobs}
            deleteSources={deleteSources}
            onActivated={onActivated}
            preferences={preferences}
            onPreferencesChanged={setPreferences}
            onAnalyzeSource={onAnalyzeSource}
            analysisSource={analysisSource}
          />
        </div>

        <LicenseRenewalModal
          isOpen={showRenewalModal}
          onClose={() => setShowRenewalModal(false)}
          onSuccess={() => {
            void (async () => {
              const runtime = getRuntime();
              const key = await runtime.readLicense();
              if (key) {
                const machine = await runtime.getMachineInfo();
                void heartbeatLicense(key, machine.machineId, machine.appVersion, machine.platform);
              }
            })();
          }}
        />
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
