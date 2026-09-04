import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PREFERENCES,
  NAV_ITEMS,
  type ClientMetrics,
  type Job,
  type NavKey,
  type ToolPreferences,
  type MachineInfo,
  type UpdateRelease,
} from "./core/types";
import {
  ApiRequestError,
  heartbeatLicense,
  getBankConfig,
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
import {
  subtitleSegmentsForClip,
  renderQualityChecks,
  sceneSlug,
} from "./core/job-engine";

// Layout & Common Components
import { Sidebar, Navbar, LicenseWarningBanner, AdminConfigSyncBanner, OtaUpdateBanner } from "./components/layout";
import { Toast, Modal } from "./components/common";

// Modules & Pages
import { ActivationGate, ActivationPage } from "./modules/activation";
import { VideoAnalysisPage } from "./modules/analysis";
import { BatchJobsPage } from "./modules/jobs";
import { EditorWorkspace } from "./modules/editor";
import { OverviewPage } from "./modules/overview";
import { RenderPage } from "./modules/render";
import { SettingsPage } from "./modules/settings";
import { StoryPage } from "./modules/story";
import { BrandPage } from "./modules/brand";
import { SourcesPage } from "./modules/sources";
import { BillingHistoryPage } from "./modules/billing";
import { SystemLogsPage } from "./modules/logs";
import { LicenseRenewalModal } from "./modules/renewal";
import { LegalTermsModal } from "./modules/legal";

export type PageProps = {
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
  analysis: ({ jobs, addJob, updateJob, analysisSource, navigate, onOpenTimeline, deleteJobs, deleteSources }) => (
    <VideoAnalysisPage
      jobs={jobs}
      onAddJob={addJob}
      onUpdateJob={updateJob}
      onDeleteJobs={deleteJobs}
      onDeleteSources={deleteSources}
      onOpenTimeline={onOpenTimeline}
      initialSource={analysisSource}
      onNavigate={navigate}
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
  render: ({ jobs, navigate }) => (
    <RenderPage jobs={jobs} onNavigate={navigate} />
  ),
  billing: () => <BillingHistoryPage />,
  logs: ({ jobs, navigate, updateJob }) => (
    <SystemLogsPage
      jobs={jobs}
      onNavigate={navigate}
      onUpdateJob={updateJob}
    />
  ),
  activation: ({ onActivated }) => <ActivationPage onActivated={onActivated} />,
  settings: ({ preferences, onPreferencesChanged }) => (
    <SettingsPage
      preferences={preferences}
      onPreferencesChanged={onPreferencesChanged}
    />
  ),
};

export function App() {
  const [active, setActive] = useState<NavKey>("overview");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [preferences, setPreferences] = useState<ToolPreferences>(DEFAULT_PREFERENCES);
  const [activated, setActivated] = useState<boolean | null>(null);
  const [analysisSourceId, setAnalysisSourceId] = useState<string | undefined>();
  const [timelineSourceId, setTimelineSourceId] = useState<string | undefined>();
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [machineInfo, setMachineInfo] = useState<MachineInfo | null>(null);
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  const [toolConfig, setToolConfig] = useState<{
    studio_brand_name?: string;
    tool_slogan?: string;
    custom_logo_url?: string;
    support_contact?: string;
    menu_locks?: Record<string, { locked?: boolean; title?: string; message?: string }>;
  }>({});
  const [lockedNoticeKey, setLockedNoticeKey] = useState<NavKey | null>(null);

  // OTA and sync states
  const [availableUpdate, setAvailableUpdate] = useState<UpdateRelease | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [hasAdminConfigUpdate, setHasAdminConfigUpdate] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const processingJob = useRef("");
  const syncingJobs = useRef(new Set<string>());

  // Fetch remote tool branding & menu lock configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("https://jacs-studio.nexoratech.com.vn/api/v1/client/config");
        if (res.ok) {
          const body = await res.json();
          if (body?.data) {
            setToolConfig(body.data);
          }
        }
      } catch {
        // ignore
      }
    };
    fetchConfig();
    const interval = setInterval(fetchConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch machine info and initial heartbeat
  useEffect(() => {
    const initRuntimeInfo = async () => {
      try {
        const runtime = getRuntime();
        const machine = await runtime.getMachineInfo();
        setMachineInfo(machine);

        const key = await runtime.readLicense();
        if (key) {
          const beat = await heartbeatLicense(key, machine.machineId, machine.appVersion, machine.platform);
          if (beat?.status === "active" || beat?.status === "expiring") {
            setActivated(true);
            if (beat.expires_at) {
              setLicenseExpiresAt(beat.expires_at);
              const remaining = Math.ceil(
                (new Date(beat.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              setDaysRemaining(remaining);
            }
          }
        }
      } catch {
        // ignore
      }
    };
    initRuntimeInfo();
  }, []);

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

  // Listen to live render progress events
  useEffect(() => {
    const unlisten = getRuntime().onRenderProgress?.((data) => {
      if (!data.operationId) return;
      replaceJob(data.operationId, {
        progress: data.progress,
        stage: data.stage as Job["stage"],
        outputPath: data.outputPath,
      });
    });
    return () => unlisten?.();
  }, []);

  // Background Render Queue Worker
  useEffect(() => {
    if (processingJob.current) return;
    const nextJob = jobs.find(
      (j) => !j.sourceOnly && (j.status === "queued" || (j.status === "running" && j.progress === 0 && !j.stage))
    );
    if (!nextJob) return;

    processingJob.current = nextJob.id;
    void (async () => {
      try {
        replaceJob(nextJob.id, { status: "running", stage: "rendering", progress: 2, error: undefined });
        const runtime = getRuntime();

        let videoFilePath = nextJob.localPath || nextJob.source;
        if (!videoFilePath && nextJob.sourcePaths?.length) {
          videoFilePath = nextJob.sourcePaths[0];
        }

        if (!videoFilePath) {
          throw new Error("Không tìm thấy đường dẫn video để render.");
        }

        if (/^https?:\/\//i.test(videoFilePath) && !nextJob.localPath) {
          replaceJob(nextJob.id, { stage: "downloading", progress: 5 });
          const downloaded = await runtime.downloadVideo?.(videoFilePath, nextJob.id);
          if (downloaded) {
            videoFilePath = downloaded;
            replaceJob(nextJob.id, { localPath: downloaded });
          }
        }

        replaceJob(nextJob.id, { stage: "rendering", progress: 8 });
        const narrationText = nextJob.narratorEnabled
          ? (nextJob.subtitleText || nextJob.analysis?.voiceScript || nextJob.analysis?.scenes?.map((s) => s.voiceover || s.translation).filter(Boolean).join(" "))
          : undefined;

        const subtitleSegments = subtitleSegmentsForClip(
          nextJob,
          nextJob.analysis,
          { startSeconds: nextJob.clipStartSeconds, endSeconds: nextJob.clipEndSeconds },
          nextJob.subtitleText || nextJob.analysis?.voiceScript,
          nextJob.durationSeconds || 0
        );

        const result = await runtime.renderVideo?.(
          videoFilePath,
          nextJob.outputFolder || preferences.outputPath,
          {
            mode: nextJob.mode,
            startSeconds: nextJob.clipStartSeconds,
            endSeconds: nextJob.clipEndSeconds,
            outputFileName: nextJob.outputFileName,
            aspectRatio: nextJob.aspectRatio,
            preferredEngine: preferences.preferredEngine,
            keepOriginalAudio: nextJob.keepOriginalAudio,
            backgroundMusic: nextJob.backgroundMusic,
            backgroundMusicVolume: nextJob.backgroundMusicVolume,
            backgroundMusicPath: nextJob.backgroundMusicPath,
            narratorEnabled: nextJob.narratorEnabled,
            narratorVoice: nextJob.narratorVoice,
            narratorGender: nextJob.narratorGender,
            language: nextJob.languages?.[0],
            narrationText,
            subtitlesEnabled: nextJob.subtitlesEnabled,
            subtitleStyle: nextJob.subtitleStyle,
            subtitleText: nextJob.subtitleText,
            subtitleSegments,
            logoPath: nextJob.logoPath || preferences.brandKitLogo,
            logoPosition: nextJob.logoPosition,
            logoOpacity: nextJob.logoOpacity,
            providerId: nextJob.providerId,
            ttsProviderId: nextJob.ttsProviderId,
          },
          nextJob.id
        );

        const outputPath = result?.outputPath;
        let outputProbe = undefined;
        if (outputPath && runtime.probeVideo) {
          try {
            outputProbe = await runtime.probeVideo(outputPath);
          } catch {
            // probe error handled
          }
        }

        const qa = renderQualityChecks(
          nextJob,
          nextJob.analysis,
          { startSeconds: nextJob.clipStartSeconds, endSeconds: nextJob.clipEndSeconds },
          narrationText,
          outputPath,
          nextJob.durationSeconds || 0,
          outputProbe,
          result
        );

        replaceJob(nextJob.id, {
          status: qa.passed ? "completed" : "failed",
          stage: qa.passed ? "completed" : "failed",
          progress: qa.passed ? 100 : 90,
          outputPath: outputPath || nextJob.outputPath,
          error: qa.passed ? undefined : "Không vượt qua bước kiểm tra chất lượng render QA.",
          qa,
          durationSeconds: outputProbe?.durationSeconds || result?.durationSeconds || nextJob.durationSeconds,
          subtitlesBurned: result?.subtitlesBurned,
          subtitlesPath: result?.subtitlesPath,
          outputChecksum: result?.outputChecksum,
          manifestPath: result?.manifestPath,
          narrationGenerated: result?.narrationGenerated,
          narrationDurationSeconds: result?.narrationDurationSeconds,
          subtitleCueCount: result?.subtitleCueCount,
          voiceEngine: result?.voiceEngine,
        });
      } catch (err: any) {
        replaceJob(nextJob.id, {
          status: "failed",
          stage: "failed",
          progress: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        processingJob.current = "";
      }
    })();
  }, [jobs, preferences]);

  // Load initial preferences and jobs from runtime
  useEffect(() => {
    const runtime = getRuntime();
    runtime.getPreferences?.().then((p) => {
      if (p) setPreferences(p);
    });
    runtime.readJobs?.().then((loaded) => {
      if (Array.isArray(loaded)) setJobs(loaded);
    });
  }, []);

  const navigate = (key: NavKey) => {
    if (toolConfig?.menu_locks?.[key]?.locked) {
      setLockedNoticeKey(key);
      return;
    }
    setActive(key);
  };

  const addJob = (job: Job) => {
    setJobs((prev) => {
      const next = [job, ...prev];
      persistJobs(next);
      return next;
    });
  };

  const cancelJob = (jobId: string) => {
    getRuntime().cancelOperation?.(jobId);
    replaceJob(jobId, { status: "cancelled", stage: "cancelled", error: "Người dùng đã hủy tác vụ." });
  };

  const retryJob = (jobId: string) => {
    replaceJob(jobId, { status: "queued", stage: "queued", progress: 0, error: undefined });
  };

  const deleteJobs = (jobIds: string[]) => {
    setJobs((prev) => {
      const next = prev.filter((j) => !jobIds.includes(j.id));
      persistJobs(next);
      return next;
    });
  };

  const deleteSources = (sourceIds: string[]) => {
    setJobs((prev) => {
      const next = prev.filter((j) => !sourceIds.includes(j.id));
      persistJobs(next);
      return next;
    });
  };

  const onActivated = (val: boolean) => {
    setActivated(val);
    if (val) setActive("overview");
  };

  const onAnalyzeSource = (source: Job) => {
    setAnalysisSourceId(source.id);
    setActive("analysis");
  };

  const openTimeline = (sourceId?: string) => {
    if (sourceId) setTimelineSourceId(sourceId);
    setActive("timeline");
  };

  const analysisSource = useMemo(() => {
    return analysisSourceId ? jobs.find((j) => j.id === analysisSourceId) : undefined;
  }, [analysisSourceId, jobs]);

  const handleApplyUpdate = async () => {
    if (!availableUpdate) return;
    setIsUpdating(true);
    setUpdateProgress(10);
    try {
      const runtime = getRuntime();
      if (runtime.downloadUpdate) {
        await runtime.downloadUpdate(availableUpdate);
      }
    } catch {
      setIsUpdating(false);
    }
  };

  const handleSyncAdminConfig = async () => {
    try {
      await getBankConfig();
      setHasAdminConfigUpdate(false);
      setSyncToast("Đã đồng bộ cấu hình mới nhất từ máy chủ quản trị!");
      setTimeout(() => setSyncToast(null), 3500);
    } catch {
      // ignore
    }
  };

  const Page = pages[active] || pages.overview;

  return (
    <ActivationGate onActivated={onActivated}>
      <div className="app-shell">
        {/* Main Sidebar */}
        <Sidebar
          active={active}
          onNavigate={navigate}
          jobs={jobs}
          toolConfig={toolConfig}
          licenseExpiresAt={licenseExpiresAt}
          onOpenRenewal={() => setShowRenewalModal(true)}
          onOpenTerms={() => setShowTermsModal(true)}
        />

        {/* Content Viewport */}
        <div className="app-main-viewport">
          {/* Top Navbar */}
          <Navbar
            active={active}
            onNavigate={navigate}
            machineInfo={machineInfo}
            onRefresh={() => {
              getRuntime().readJobs?.().then((j) => j && setJobs(j));
            }}
            onOpenRenewal={() => setShowRenewalModal(true)}
            onOpenSettings={() => setActive("settings")}
          />

          {/* License Expiry Warning Marquee */}
          {daysRemaining !== null && daysRemaining <= 7 && licenseExpiresAt && (
            <LicenseWarningBanner
              daysRemaining={daysRemaining}
              licenseExpiresAt={licenseExpiresAt}
              onOpenRenewal={() => setShowRenewalModal(true)}
            />
          )}

          {/* Admin Config Sync Notification */}
          {hasAdminConfigUpdate && (
            <AdminConfigSyncBanner onSync={handleSyncAdminConfig} />
          )}

          {/* Sync Toast */}
          {syncToast && (
            <Toast
              message={syncToast}
              type="success"
              onClose={() => setSyncToast(null)}
            />
          )}

          {/* In-Place OTA Update Notification Banner */}
          {availableUpdate && dismissedVersion !== availableUpdate.version && (
            <OtaUpdateBanner
              update={availableUpdate}
              isUpdating={isUpdating}
              updateProgress={updateProgress}
              onApplyUpdate={() => void handleApplyUpdate()}
              onDismiss={() => setDismissedVersion(availableUpdate.version)}
            />
          )}

          {/* Active Module Page Body */}
          <main className="app-content-body">
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
          </main>
        </div>

        {/* Global Modals */}
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

        <LegalTermsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />

        {/* Locked Feature / Maintenance Notice Modal */}
        {lockedNoticeKey && (
          <Modal
            isOpen={Boolean(lockedNoticeKey)}
            title={`🚧 ${NAV_ITEMS.find((i) => i.key === lockedNoticeKey)?.label || "Tính Năng"} · Đang Phát Triển`}
            onClose={() => setLockedNoticeKey(null)}
          >
            <div style={{ textAlign: "center", padding: "20px 10px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "2px solid rgba(245, 158, 11, 0.4)",
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  margin: "0 auto 16px",
                }}
              >
                🚧
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "10px" }}>
                TÍNH NĂNG ĐANG TRONG QUÁ TRÌNH PHÁT TRIỂN
              </h3>
              <p style={{ fontSize: "13.5px", color: "#cbd5e1", lineHeight: 1.6, maxWidth: "440px", margin: "0 auto 24px" }}>
                {toolConfig?.menu_locks?.[lockedNoticeKey]?.message ||
                  "Tính năng này đang được đội ngũ kỹ thuật nâng cấp và hoàn thiện. Quý khách vui lòng quay lại trong các bản cập nhật tiếp theo!"}
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setLockedNoticeKey(null)}
                >
                  Đã Hiểu
                </button>
                {toolConfig?.support_contact && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => window.open(toolConfig.support_contact, "_blank")}
                  >
                    💬 Liên Hệ Kỹ Thuật
                  </button>
                )}
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ActivationGate>
  );
}

export default App;
