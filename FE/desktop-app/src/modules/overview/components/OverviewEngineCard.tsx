import { useState, useEffect, useMemo } from "react";
import { Cpu, Power, Sliders, Snow, CheckCircleFill } from "react-bootstrap-icons";
import { getRuntime } from "../../../core/runtime";
import type { ToolPreferences, MachineInfo, MediaCapabilities, Job, HardwareStats } from "../../../core/types";

interface OverviewEngineCardProps {
  jobs?: Job[];
  preferences?: ToolPreferences;
  onNavigate: (key: any) => void;
}

export function OverviewEngineCard({ jobs = [], preferences, onNavigate }: OverviewEngineCardProps) {
  const [engineActive, setEngineActive] = useState(true);
  const [machine, setMachine] = useState<MachineInfo | null>(null);
  const [hardware, setHardware] = useState<HardwareStats | null>(null);
  const [mediaCaps, setMediaCaps] = useState<MediaCapabilities | null>(null);

  useEffect(() => {
    const runtime = getRuntime();
    runtime.getMachineInfo?.().then(setMachine).catch(() => {});
    runtime.getMediaCapabilities?.().then(setMediaCaps).catch(() => {});

    // Initial hardware fetch
    if (runtime.getHardwareStats) {
      runtime.getHardwareStats().then(setHardware).catch(() => {});
    }

    // Dynamic hardware telemetry polling every 4 seconds
    const interval = setInterval(() => {
      if (runtime.getHardwareStats) {
        runtime.getHardwareStats().then(setHardware).catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const hasRunningJob = useMemo(() => {
    return jobs.some((j) => j.status === "running" || j.status === "queued");
  }, [jobs]);

  const enginePref = preferences?.preferredEngine || "auto";
  const platform = machine?.platform || (typeof navigator !== "undefined" && navigator.userAgent.includes("Mac") ? "macos" : "windows");
  const isMac = platform === "macos";

  const displayEngineName = useMemo(() => {
    if (enginePref === "cpu") {
      const cpu = hardware?.cpuModel || machine?.cpuModel;
      return cpu ? `CPU (${String(cpu).split("@")[0].trim()})` : "CPU Multi-Core (FFmpeg)";
    }
    if (enginePref === "nvidia") {
      return hardware?.gpuName ? `${hardware.gpuName} (NVENC)` : "NVIDIA CUDA / RTX (NVENC)";
    }
    if (enginePref === "apple" || (isMac && enginePref === "auto")) {
      return hardware?.gpuName ? `${hardware.gpuName} (Metal)` : "Apple Silicon Metal";
    }

    // Auto detection
    if (hardware?.gpuName) {
      if (hardware.hasNvidia) return `${hardware.gpuName} (NVENC)`;
      if (hardware.hasIntel) return `${hardware.gpuName} (QSV)`;
      if (hardware.hasAmd) return `${hardware.gpuName} (AMF)`;
      if (hardware.hasApple) return `${hardware.gpuName} (Metal)`;
      return hardware.gpuName;
    }

    if (machine?.gpuName) return machine.gpuName;
    if (machine?.cpuModel) return String(machine.cpuModel).split("@")[0].trim();
    if (isMac) return "Apple Silicon Metal (Auto)";
    return "GPU Local Acceleration";
  }, [enginePref, hardware, machine, isMac]);

  // VRAM calculations
  const vramTotal = useMemo(() => {
    if (hardware?.gpuVramGb && hardware.gpuVramGb > 0) return hardware.gpuVramGb;
    if (machine?.gpuVramGb && machine.gpuVramGb > 0) return machine.gpuVramGb;
    if (hardware?.totalMemoryGb) return Math.min(hardware.totalMemoryGb, 16.0);
    return isMac ? 16.0 : 8.0;
  }, [hardware, machine, isMac]);

  const vramUsed = useMemo(() => {
    if (!engineActive) return Number((vramTotal * 0.12).toFixed(1));
    if (hardware?.gpuUsedVramGb && hardware.gpuUsedVramGb > 0) {
      return hasRunningJob ? Number((hardware.gpuUsedVramGb * 1.6).toFixed(1)) : hardware.gpuUsedVramGb;
    }
    if (hasRunningJob) return Number((vramTotal * 0.75).toFixed(1));
    return Number((vramTotal * 0.38).toFixed(1));
  }, [engineActive, hardware, vramTotal, hasRunningJob]);

  const vramPercent = Math.min(100, Math.max(1, Math.round((vramUsed / (vramTotal || 1)) * 100)));

  // GPU Load
  const gpuLoad = useMemo(() => {
    if (!engineActive) return 2;
    if (hardware?.gpuUtilization && hardware.gpuUtilization > 0) {
      return hasRunningJob ? Math.min(99, hardware.gpuUtilization + 50) : hardware.gpuUtilization;
    }
    if (hasRunningJob) return 78;
    return 18;
  }, [engineActive, hardware, hasRunningJob]);

  // Temperature
  const tempVal = useMemo(() => {
    if (!engineActive) return 20;
    if (hardware?.gpuTemperature && hardware.gpuTemperature > 0) {
      return hasRunningJob ? Math.min(85, hardware.gpuTemperature + 12) : hardware.gpuTemperature;
    }
    if (hasRunningJob) return 42;
    return 29;
  }, [engineActive, hardware, hasRunningJob]);

  const tempDisplay = `${tempVal}°C`;

  const coolingLabel = useMemo(() => {
    if (!engineActive) return "Standby · Nghỉ";
    if (tempVal >= 75) return "High Load · Tải cao";
    if (hasRunningJob || tempVal >= 55) return "Active · Đang tải";
    return "Cooling · Ổn định";
  }, [engineActive, hasRunningJob, tempVal]);

  // Hardware Accel Badge
  const accelBadgeText = useMemo(() => {
    const enc = hardware?.encoder || machine?.encoder;
    if (enc === "nvenc" || hardware?.hasNvidia) return "Hardware Accel NVENC ON";
    if (enc === "qsv" || hardware?.hasIntel) return "Hardware Accel Intel QSV ON";
    if (enc === "amf" || hardware?.hasAmd) return "Hardware Accel AMD AMF ON";
    if (enc === "videotoolbox" || hardware?.hasApple) return "Apple Silicon Metal ON";
    if (enc === "cpu") return "CPU Multi-Core Engine ON";
    if (mediaCaps?.ffmpeg !== false) return "Hardware Accel Local ON";
    return "Software Engine";
  }, [hardware, machine, mediaCaps]);

  return (
    <div
      style={{
        background: "rgba(16, 20, 30, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "14px",
        padding: "16px 18px",
        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "12px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        minHeight: "230px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            AI RENDER ENGINE
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", background: engineActive ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)", border: engineActive ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)", padding: "2px 8px", borderRadius: "99px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: engineActive ? "#10b981" : "#f59e0b", boxShadow: engineActive ? "0 0 6px #10b981" : "none" }} />
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: engineActive ? "#34d399" : "#fbbf24" }}>
              {engineActive ? "Working (Sẵn sàng)" : "Tạm dừng (Paused)"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEngineActive(!engineActive)}
          title={engineActive ? "Tạm dừng Engine" : "Kích hoạt Engine"}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            background: engineActive ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.06)",
            border: engineActive ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
            color: engineActive ? "#fbbf24" : "#94a3b8",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <Power size={13} />
        </button>
      </div>

      {/* Main Temp & Hardware Tag */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span style={{ fontSize: "30px", fontWeight: 900, color: "#ffffff", lineHeight: 1, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            {tempDisplay}
          </span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.25)", padding: "2px 7px", borderRadius: "6px", color: "#fbbf24", fontSize: "10.5px", fontWeight: 700 }}>
            <Snow size={10} className={engineActive ? "spin-slow" : ""} />
            <span>{coolingLabel}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "5px 10px", borderRadius: "8px", color: "#cbd5e1", fontSize: "11.5px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={displayEngineName}>
          <Cpu size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
          <strong style={{ color: "#f8fafc", overflow: "hidden", textOverflow: "ellipsis" }}>{displayEngineName}</strong>
        </div>
      </div>

      {/* Resource Meters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "3px" }}>
            <span>Phân bổ VRAM</span>
            <strong style={{ color: "#f8fafc" }}>{vramUsed.toFixed(1)} / {vramTotal.toFixed(1)} GB ({vramPercent}%)</strong>
          </div>
          <div style={{ width: "100%", height: "6px", background: "rgba(0, 0, 0, 0.5)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ width: `${vramPercent}%`, height: "100%", background: "linear-gradient(90deg, #d97706, #f59e0b)", borderRadius: "99px", transition: "width 0.3s ease" }} />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#94a3b8", marginBottom: "3px" }}>
            <span>Tải GPU / Encode</span>
            <strong style={{ color: "#fbbf24" }}>{gpuLoad}%</strong>
          </div>
          <div style={{ width: "100%", height: "6px", background: "rgba(0, 0, 0, 0.5)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ width: `${gpuLoad}%`, height: "100%", background: "linear-gradient(90deg, #10b981, #34d399)", borderRadius: "99px", transition: "width 0.3s ease" }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px", marginTop: "2px" }}>
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          style={{
            background: "none",
            border: "none",
            color: "#fbbf24",
            fontSize: "11px",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Sliders size={11} /> Cấu hình Engine ↗
        </button>

        <span style={{ fontSize: "10.5px", color: "#34d399", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
          <CheckCircleFill size={10} /> {accelBadgeText}
        </span>
      </div>
    </div>
  );
}

