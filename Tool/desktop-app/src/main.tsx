import { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_PREFERENCES, NAV_ITEMS, type ClientMetrics, type Job, type NavKey, type ToolPreferences } from "./core/types";
import { ApiRequestError, heartbeatLicense, createClientJob, getClientMetrics, listClientJobs, sendClientTelemetry, updateClientJob } from "./core/api";
import { getRuntime } from "./core/runtime";
import { Icon } from "./shared/Icon";
import { ActivationPage } from "./modules/activation/ActivationPage";
import { VideoAnalysisPage } from "./modules/analysis/VideoAnalysisPage";
import { BatchJobsPage } from "./modules/jobs/BatchJobsPage";
import { OverviewPage } from "./modules/overview/OverviewPage";
import { RenderPage } from "./modules/render/RenderPage";
import { SettingsPage } from "./modules/settings/SettingsPage";
import "./styles.css";

type PageProps = { jobs: Job[]; metrics: ClientMetrics | null; navigate: (key: NavKey) => void; addJob: (job: Job) => void; cancelJob: (jobId: string) => void; retryJob: (jobId: string) => void; onActivated: (value: boolean) => void; preferences: ToolPreferences; onPreferencesChanged: (value: ToolPreferences) => void };
function timestampSeconds(value: string | undefined, fallback = 0) {
  const parts = String(value || "").split(":").map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return fallback;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}
const pages: Record<NavKey, (props: PageProps) => JSX.Element> = {
  overview: ({ jobs, metrics, navigate }) => <OverviewPage jobs={jobs} metrics={metrics} onNavigate={navigate} />,
  batch: ({ jobs, addJob, cancelJob, retryJob }) => <BatchJobsPage jobs={jobs} onAddJob={addJob} onCancelJob={cancelJob} onRetryJob={retryJob} />,
  analysis: ({ addJob }) => <VideoAnalysisPage onAddJob={addJob} />,
  render: ({ jobs }) => <RenderPage jobs={jobs} />,
  activation: ({ onActivated }) => <ActivationPage onActivated={onActivated} />,
  settings: ({ preferences, onPreferencesChanged }) => <SettingsPage preferences={preferences} onPreferencesChanged={onPreferencesChanged} />,
};

function App() {
  const [active, setActive] = useState<NavKey>("activation");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [preferences, setPreferences] = useState<ToolPreferences>(DEFAULT_PREFERENCES);
  const [activated, setActivated] = useState<boolean | null>(null);
  const processingJob = useRef("");
  const syncingJobs = useRef(new Set<string>());
  const persistJobs = (value: Job[]) => { void getRuntime().saveJobs?.(value); };
  const replaceJob = (jobId: string, values: Partial<Job>) => setJobs((current) => { const next = current.map((job) => job.id === jobId ? { ...job, ...values } : job); persistJobs(next); return next; });
  useEffect(() => {
    void (async () => {
      const runtime = getRuntime();
      setPreferences(await runtime.getPreferences().catch(() => DEFAULT_PREFERENCES));
      const value = await runtime.readLicense();
      if (!value) { setActivated(false); setActive("activation"); return; }
      const local = await runtime.readJobs?.().catch(() => []) || [];
      const recovered = local.map((job) => job.status === "running" ? { ...job, status: "queued" as const, stage: job.sourceType === "url" && !job.localPath ? "downloading" as const : "queued" as const, progress: 0 } : job);
      setJobs(recovered);
      if (recovered.some((job, index) => job !== local[index])) persistJobs(recovered);
      try {
        const machine = await runtime.getMachineInfo();
        await heartbeatLicense(value, machine.machineId, machine.appVersion, machine.platform);
        setActivated(true); setActive("overview");
        const remote = await listClientJobs(value, machine.machineId).catch(() => []);
        const remoteMetrics = await getClientMetrics(value, machine.machineId).catch(() => null);
        setMetrics(remoteMetrics);
        if (remote.length) setJobs((current) => {
          const merged: Job[] = remote.map((item) => {
            const existing = current.find((job) => job.id === item.client_job_id);
            return { ...existing, id: item.client_job_id, name: item.name, source: item.source_name, sourceType: item.source_type || existing?.sourceType || "file", localPath: existing?.localPath, outputFolder: existing?.outputFolder, mode: item.execution_mode as Job["mode"], status: item.status as Job["status"], stage: item.stage as Job["stage"], progress: item.progress, error: item.error, outputPath: item.output_path || existing?.outputPath, passthrough: existing?.passthrough, tokensUsed: item.tokens_used, creditsUsed: item.credits_used, createdAt: existing?.createdAt || "Đã đồng bộ", synced: true };
          });
          const next = [...merged, ...current.filter((job) => !merged.some((item) => item.id === job.id))];
          persistJobs(next);
          return next;
        });
      } catch (error) {
        if (error instanceof ApiRequestError && [401, 403, 422].includes(error.status)) { await runtime.clearLicense(); setActivated(false); setActive("activation"); }
        else { setActivated(true); setActive("overview"); }
      }
    })();
  }, []);
  useEffect(() => {
    if (!activated) return;
    let timer: number | undefined;
    void (async () => {
      const runtime = getRuntime();
      const key = await runtime.readLicense();
      if (!key) return;
      const machine = await runtime.getMachineInfo();
      const check = async () => {
        try { await heartbeatLicense(key, machine.machineId, machine.appVersion, machine.platform); }
        catch (error) { if (error instanceof ApiRequestError && [401, 403, 422].includes(error.status)) { await runtime.clearLicense(); setActivated(false); setActive("activation"); } }
      };
      await check();
      timer = window.setInterval(() => void check(), 5 * 60 * 1000);
    })();
    return () => { if (timer) window.clearInterval(timer); };
  }, [activated]);
  useEffect(() => {
    if (!activated) { setMetrics(null); return; }
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
    return () => { if (timer) window.clearInterval(timer); };
  }, [activated, jobs.length]);
  useEffect(() => {
    if (!activated || processingJob.current) return;
    const job = jobs.find((item) => (item.status === "queued" || item.stage === "downloading") && (item.localPath || item.sourceType === "url"));
    if (!job) return;
    processingJob.current = job.id;
    void (async () => {
      const runtime = getRuntime();
      let unsubscribeDownload: (() => void) | undefined;
      let unsubscribeAnalysis: (() => void) | undefined;
      let unsubscribeRender: (() => void) | undefined;
      try {
        let localPath = job.localPath;
        if (!localPath && job.sourceType === "url") {
          if (!runtime.downloadVideo) throw new Error("Tải URL video cần chạy bản Electron đã cài đặt.");
          unsubscribeDownload = runtime.onDownloadProgress?.((event) => { if (event.operationId && event.operationId !== job.id) return; replaceJob(job.id, { status: "running", stage: event.stage as Job["stage"], progress: event.progress }); });
          replaceJob(job.id, { status: "running", stage: "downloading", progress: 1, error: undefined });
          localPath = await runtime.downloadVideo(job.source, job.id);
          replaceJob(job.id, { localPath, stage: "analyzing", progress: 5 });
        }
        if (!localPath) throw new Error("Không tìm thấy file video để xử lý");
        replaceJob(job.id, { status: "running", stage: "analyzing", progress: 5, error: undefined });
        const probe = await runtime.probeVideo?.(localPath);
        // An empty provider id explicitly requests local scene analysis. This
        // prevents local CPU/GPU jobs from falling back to a customer's cloud
        // provider merely because one is configured in Settings.
        const analysisProviderId = ["cloud", "hybrid"].includes(job.mode) ? job.providerId : "";
        unsubscribeAnalysis = runtime.onAnalysisProgress?.((event) => { if (event.operationId && event.operationId !== job.id) return; replaceJob(job.id, { status: "running", stage: "analyzing", progress: Math.max(5, Math.min(35, Math.round(5 + event.progress * 0.3))) }); });
        const analysis = job.analysis || await runtime.analyzeVideo?.(localPath, analysisProviderId, job.id);
        const tokensUsed = job.analysis ? job.tokensUsed || 0 : analysis?.tokensUsed || 0;
        const creditsUsed = job.analysis ? job.creditsUsed || 0 : analysis?.creditsUsed || 0;
        if (job.splitScenes && analysis?.scenes.length) {
          const duration = probe?.durationSeconds || job.durationSeconds || 0;
          const children: Job[] = analysis.scenes.map((scene, index) => {
            const start = timestampSeconds(scene.start);
            const nextStart = index + 1 < analysis.scenes.length ? timestampSeconds(analysis.scenes[index + 1].start, duration) : duration;
            const end = Math.max(start + 0.25, Math.min(duration || nextStart, timestampSeconds(scene.end, nextStart)));
            return { id: `${job.id}-scene-${index + 1}`, parentJobId: job.id, name: `${job.name} · ${scene.title}`, source: job.source, sourceType: job.sourceType, localPath, outputFolder: job.outputFolder, mode: job.mode, providerId: job.providerId, clipStartSeconds: start, clipEndSeconds: end, aspectRatio: job.aspectRatio, analysis, status: "queued", stage: "queued", progress: 0, tokensUsed: 0, creditsUsed: 0, createdAt: new Date().toLocaleString("vi-VN") };
          });
          setJobs((current) => {
            const completedParent = current.map((item) => item.id === job.id ? { ...item, status: "completed" as const, stage: "completed" as const, progress: 100, durationSeconds: duration, tokensUsed, creditsUsed, analysis } : item);
            const next = [...children, ...completedParent];
            persistJobs(next);
            return next;
          });
          const key = await runtime.readLicense(); const machine = await runtime.getMachineInfo();
          if (key) {
            const parentSynced = await updateClientJob(key, machine.machineId, job.id, { status: "completed", stage: "completed", progress: 100, tokens_used: tokensUsed, credits_used: creditsUsed }).then(() => true).catch(() => false);
            if (parentSynced) replaceJob(job.id, { synced: true });
            await Promise.all(children.map(async (child) => {
              try {
                await createClientJob(key, machine.machineId, child);
                setJobs((current) => { const next = current.map((item) => item.id === child.id ? { ...item, synced: true } : item); persistJobs(next); return next; });
              } catch { /* Keep the child local and retry on the next run. */ }
            }));
          }
          return;
        }
        const preferences = await runtime.getPreferences();
        replaceJob(job.id, { stage: "rendering", progress: 35, durationSeconds: probe?.durationSeconds, tokensUsed, creditsUsed, analysis });
        unsubscribeRender = runtime.onRenderProgress?.((event) => { if (event.operationId && event.operationId !== job.id) return; replaceJob(job.id, { status: event.stage === "completed" ? "completed" : "running", stage: event.stage as Job["stage"], progress: Math.max(35, Math.min(100, Math.round(35 + event.progress * 0.65))), outputPath: event.outputPath }); });
        const rendered = await runtime.renderVideo?.(localPath, job.outputFolder || preferences.outputPath, { mode: job.mode, preferredEngine: preferences.preferredEngine, startSeconds: job.clipStartSeconds, endSeconds: job.clipEndSeconds, aspectRatio: job.aspectRatio }, job.id);
        const completed = { status: "completed" as const, stage: "completed" as const, progress: 100, outputPath: rendered?.outputPath, passthrough: rendered?.passthrough, durationSeconds: rendered?.durationSeconds || probe?.durationSeconds, tokensUsed, creditsUsed, analysis };
        replaceJob(job.id, completed);
        const key = await runtime.readLicense(); const machine = await runtime.getMachineInfo();
        if (key) {
          const synced = await updateClientJob(key, machine.machineId, job.id, { status: "completed", stage: "completed", progress: 100, output_path: completed.outputPath, tokens_used: completed.tokensUsed, credits_used: completed.creditsUsed }).then(() => true).catch(() => false);
          if (synced) replaceJob(job.id, { synced: true });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể xử lý video";
        const cancelled = error instanceof Error && (error as Error & { code?: string }).code === "JACS_OPERATION_CANCELLED";
        replaceJob(job.id, cancelled ? { status: "cancelled", stage: "cancelled", progress: 0, error: "Đã hủy theo yêu cầu." } : { status: "failed", stage: "failed", error: message });
        const key = await runtime.readLicense(); const machine = await runtime.getMachineInfo();
        if (key) {
          const synced = await updateClientJob(key, machine.machineId, job.id, { status: cancelled ? "cancelled" : "failed", stage: cancelled ? "cancelled" : "failed", error: cancelled ? "Đã hủy theo yêu cầu." : message }).then(() => true).catch(() => false);
          if (synced) replaceJob(job.id, { synced: true });
        }
        if (!cancelled) await reportClientTelemetry(job, message, "error");
      } finally {
        unsubscribeDownload?.();
        unsubscribeAnalysis?.();
        unsubscribeRender?.();
        processingJob.current = "";
        // Wake the queue after a job finishes so the next queued video starts
        // without requiring the user to revisit the Batch screen.
        setJobs((current) => [...current]);
      }
    })();
  }, [activated, jobs]);
  useEffect(() => {
    if (!activated) return;
    const sync = async () => {
      const runtime = getRuntime();
      const key = await runtime.readLicense();
      if (!key) return;
      const machine = await runtime.getMachineInfo();
      const providers = await runtime.getProviderProfiles().catch(() => []);
      const candidates = jobs.filter((job) => !job.synced && !syncingJobs.current.has(job.id));
      for (const job of candidates) {
        syncingJobs.current.add(job.id);
        try {
          const needsProvider = ["cloud", "hybrid"].includes(job.mode);
          const providerId = needsProvider
            ? (job.providerId || providers.find((provider) => provider.enabled && provider.capabilities.includes("analysis"))?.id)
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
          // Keep the job local; the next activation or refresh retries sync.
        } finally {
          syncingJobs.current.delete(job.id);
        }
      }
    };
    void sync();
    const timer = window.setInterval(() => void sync(), 15_000);
    return () => window.clearInterval(timer);
  }, [activated, jobs]);
  const current = useMemo(() => NAV_ITEMS.find((item) => item.key === active) ?? NAV_ITEMS[0], [active]);
  const Page = pages[active];
  if (activated === null) return <main className="boot-screen"><span className="brand-mark"><span /></span><p>Đang kiểm tra license...</p></main>;
  const navigate = (key: NavKey) => { if (!activated && !["activation", "settings"].includes(key)) { setActive("activation"); return; } setActive(key); };
  const addJob = (job: Job) => { setJobs((existing) => { const next = [job, ...existing]; persistJobs(next); return next; }); void (async () => { const key = await getRuntime().readLicense(); if (!key) return; const machine = await getRuntime().getMachineInfo(); try { const providers = await getRuntime().getProviderProfiles(); const required = "analysis"; const needsProvider = ["cloud", "hybrid"].includes(job.mode); const providerId = needsProvider ? (job.providerId || providers.find((provider) => provider.enabled && provider.capabilities.includes(required))?.id) : undefined; if (needsProvider && !providerId) { replaceJob(job.id, { status: "failed", stage: "failed", error: `Job ${job.mode} cần provider AI có capability ${required} trong Cài đặt tool.` }); return; } await createClientJob(key, machine.machineId, { ...job, providerId }); replaceJob(job.id, { synced: true, providerId }); } catch { /* keep queued locally for retry */ } })(); };
  const cancelJob = (jobId: string) => { const job = jobs.find((item) => item.id === jobId); if (!job || ["completed", "failed", "cancelled"].includes(job.status)) return; void getRuntime().cancelOperation?.(jobId); replaceJob(jobId, { status: "cancelled", stage: "cancelled", progress: 0, error: "Đã hủy theo yêu cầu." }); };
  const retryJob = (jobId: string) => { const job = jobs.find((item) => item.id === jobId); if (!job || !["failed", "cancelled"].includes(job.status)) return; replaceJob(jobId, { status: "queued", stage: job.sourceType === "url" && !job.localPath ? "downloading" : "queued", progress: 0, error: undefined, synced: false }); };
  const onActivated = (value: boolean) => { setActivated(value); setActive(value ? "overview" : "activation"); if (value) void getRuntime().readJobs?.().then((value) => setJobs(value || [])); };
  const initials = (preferences.operatorName || "JACS").trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "JS";
  return <main className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark"><span /></span><div><strong>JACS</strong><small>STUDIO</small></div></div><div className="workspace-switcher"><span className="workspace-dot" /><div><small>WORKSPACE</small><strong>{preferences.workspaceName}</strong></div><span className="chevron">⌄</span></div><nav><p className="nav-label">WORKSPACE</p>{NAV_ITEMS.slice(0, 4).map((item) => <button key={item.key} className={`nav-item ${active === item.key ? "active" : ""} ${!activated ? "locked" : ""}`} onClick={() => navigate(item.key)}><Icon name={item.icon as never} size={18} /><span><strong>{item.label}</strong><small>{item.hint}</small></span>{item.key === "batch" && <b className="nav-count">{jobs.filter((job) => job.status === "queued" || job.status === "running").length}</b>}</button>)}<p className="nav-label nav-label-lower">ACCOUNT</p>{NAV_ITEMS.slice(4).map((item) => <button key={item.key} className={`nav-item ${active === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}><Icon name={item.icon as never} size={18} /><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>)}</nav><div className="sidebar-bottom"><div className="system-status"><span className="pulse" /><div><strong>{activated ? "Hệ thống ổn định" : "Cần kích hoạt"}</strong><small>API · GPU · Storage</small></div></div><div className="profile"><span className="avatar">{initials}</span><div><strong>{preferences.operatorName}</strong><small>{preferences.workspaceName}</small></div><span className="more">•••</span></div></div></aside><section className="main-area"><header className="topbar"><div className="breadcrumbs"><span>JACS Studio</span><Icon name="arrow" size={13} /><strong>{current.label}</strong></div><div className="topbar-actions"><button className="topbar-link"><span className="live-dot" /> API connected</button><button className="topbar-icon" title="Thông báo"><span className="notification-dot" />◌</button><button className="topbar-avatar">{initials}</button></div></header><div className="page-content"><Page jobs={jobs} metrics={metrics} navigate={navigate} addJob={addJob} cancelJob={cancelJob} retryJob={retryJob} onActivated={onActivated} preferences={preferences} onPreferencesChanged={setPreferences} /></div></section></main>;
}

async function reportClientTelemetry(job: Job, message: string, severity: "warning" | "error" | "fatal") {
  try {
    const runtime = getRuntime();
    const preferences = await runtime.getPreferences();
    if (!preferences.telemetryEnabled) return;
    const key = await runtime.readLicense();
    if (!key) return;
    const machine = await runtime.getMachineInfo();
    const redacted = message.replace(/(?:[A-Za-z]:)?[\\/][^\s]+/g, "[path]").slice(0, 1800);
    await sendClientTelemetry(key, machine.machineId, { event_name: "desktop.job.failed", severity, app_version: machine.appVersion, fingerprint: `job:${job.id}:${severity}`, message: `${job.name}: ${redacted}` });
  } catch {
    // Telemetry must never prevent the local queue from completing its error path.
  }
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
