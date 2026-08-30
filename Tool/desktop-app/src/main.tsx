import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_JOBS, NAV_ITEMS, type Job, type NavKey } from "./core/types";
import { heartbeatLicense, createClientJob, listClientJobs } from "./core/api";
import { getRuntime, readLocalJobs, saveLocalJobs } from "./core/runtime";
import { Icon } from "./shared/Icon";
import { ActivationPage } from "./modules/activation/ActivationPage";
import { VideoAnalysisPage } from "./modules/analysis/VideoAnalysisPage";
import { BatchJobsPage } from "./modules/jobs/BatchJobsPage";
import { EditorWorkspace } from "./modules/editor/EditorWorkspace";
import { RenderPage } from "./modules/render/RenderPage";
import { SettingsPage } from "./modules/settings/SettingsPage";
import "./styles.css";

type PageProps = { jobs: Job[]; navigate: (key: NavKey) => void; addJob: (job: Job) => void; onActivated: (value: boolean) => void };
const pages: Record<NavKey, (props: PageProps) => JSX.Element> = {
  overview: ({ jobs, navigate, addJob }) => <EditorWorkspace jobs={jobs} onNavigate={navigate} onAddJob={addJob} />,
  batch: ({ jobs, addJob }) => <BatchJobsPage jobs={jobs} onAddJob={addJob} />,
  analysis: () => <VideoAnalysisPage />,
  render: () => <RenderPage />,
  activation: ({ onActivated }) => <ActivationPage onActivated={onActivated} />,
  settings: () => <SettingsPage />,
};

function App() {
  const [active, setActive] = useState<NavKey>("activation");
  const [jobs, setJobs] = useState<Job[]>(() => readLocalJobs<Job[]>(DEFAULT_JOBS));
  const [activated, setActivated] = useState<boolean | null>(null);
  useEffect(() => {
    void (async () => {
      const runtime = getRuntime();
      const value = await runtime.readLicense();
      if (!value) { setActivated(false); setActive("activation"); return; }
      try {
        const machine = await runtime.getMachineInfo();
        await heartbeatLicense(value, machine.machineId, machine.appVersion, machine.platform);
        setActivated(true); setActive("overview");
        const remote = await listClientJobs(value, machine.machineId).catch(() => []);
        if (remote.length) setJobs((current) => {
          const merged = remote.map((item) => ({ id: item.client_job_id, name: item.name, source: item.source_name, mode: item.execution_mode as Job["mode"], status: item.status as Job["status"], progress: item.progress, createdAt: "Đã đồng bộ", synced: true }));
          const next = [...merged, ...current.filter((job) => !merged.some((item) => item.id === job.id))];
          saveLocalJobs(next);
          return next;
        });
      } catch { await runtime.clearLicense(); setActivated(false); setActive("activation"); }
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
        catch { await runtime.clearLicense(); setActivated(false); setActive("activation"); }
      };
      await check();
      timer = window.setInterval(() => void check(), 5 * 60 * 1000);
    })();
    return () => { if (timer) window.clearInterval(timer); };
  }, [activated]);
  const current = useMemo(() => NAV_ITEMS.find((item) => item.key === active) ?? NAV_ITEMS[0], [active]);
  const Page = pages[active];
  if (activated === null) return <main className="boot-screen"><span className="brand-mark"><span /></span><p>Đang kiểm tra license...</p></main>;
  const navigate = (key: NavKey) => { if (!activated && !["activation", "settings"].includes(key)) { setActive("activation"); return; } setActive(key); };
  const addJob = (job: Job) => { setJobs((existing) => { const next = [job, ...existing]; saveLocalJobs(next); return next; }); void (async () => { const key = await getRuntime().readLicense(); if (!key) return; const machine = await getRuntime().getMachineInfo(); try { await createClientJob(key, machine.machineId, job); setJobs((existing) => { const next = existing.map((item) => item.id === job.id ? { ...item, synced: true } : item); saveLocalJobs(next); return next; }); } catch { /* keep queued locally for retry */ } })(); };
  return <main className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark"><span /></span><div><strong>JACS</strong><small>STUDIO</small></div></div><div className="workspace-switcher"><span className="workspace-dot" /><div><small>WORKSPACE</small><strong>Meridian Films</strong></div><span className="chevron">⌄</span></div><nav><p className="nav-label">WORKSPACE</p>{NAV_ITEMS.slice(0, 4).map((item) => <button key={item.key} className={`nav-item ${active === item.key ? "active" : ""} ${!activated ? "locked" : ""}`} onClick={() => navigate(item.key)}><Icon name={item.icon as never} size={18} /><span><strong>{item.label}</strong><small>{item.hint}</small></span>{item.key === "batch" && <b className="nav-count">{jobs.filter((job) => job.status === "queued" || job.status === "running").length}</b>}</button>)}<p className="nav-label nav-label-lower">ACCOUNT</p>{NAV_ITEMS.slice(4).map((item) => <button key={item.key} className={`nav-item ${active === item.key ? "active" : ""}`} onClick={() => navigate(item.key)}><Icon name={item.icon as never} size={18} /><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>)}</nav><div className="sidebar-bottom"><div className="system-status"><span className="pulse" /><div><strong>{activated ? "Hệ thống ổn định" : "Cần kích hoạt"}</strong><small>API · GPU · Storage</small></div></div><div className="profile"><span className="avatar">MH</span><div><strong>Minh Hải</strong><small>Pro workspace</small></div><span className="more">•••</span></div></div></aside><section className="main-area"><header className="topbar"><div className="breadcrumbs"><span>JACS Studio</span><Icon name="arrow" size={13} /><strong>{current.label}</strong></div><div className="topbar-actions"><button className="topbar-link"><span className="live-dot" /> API connected</button><button className="topbar-icon" title="Thông báo"><span className="notification-dot" />◌</button><button className="topbar-avatar">MH</button></div></header><div className="page-content"><Page jobs={jobs} navigate={navigate} addJob={addJob} onActivated={(value) => { setActivated(value); setActive(value ? "overview" : "activation"); }} /></div></section></main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
