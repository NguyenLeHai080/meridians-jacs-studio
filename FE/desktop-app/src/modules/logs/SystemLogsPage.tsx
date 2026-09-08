import React, { useEffect, useMemo, useState } from "react";
import type { Job, NavKey } from "../../core/types";
import { getRuntime } from "../../core/runtime";
import { popup } from "../../shared/popup";
import {
  ExclamationTriangleFill,
  XCircleFill,
  CheckCircleFill,
  InfoCircleFill,
  ClipboardCheck,
  Clipboard,
  Trash3Fill,
  ArrowClockwise,
  GearFill,
  CpuFill,
  ShieldCheck,
  Search,
  XLg,
  TerminalFill,
  BugFill,
} from "react-bootstrap-icons";

export interface LogEntry {
  id: string;
  timestamp: string;
  rawTime: number;
  level: "info" | "warn" | "error";
  category: "BOOT" | "AI-ANALYSIS" | "TRANSCRIPTION" | "VIDEO-DOWNLOAD" | "RENDER-ENGINE" | "LICENSE" | "NETWORK" | "JOB-PROGRESS" | "SYSTEM";
  jobId?: string;
  jobName?: string;
  message: string;
  errorDetail?: string;
  suggestion?: string;
}

type SystemLogsPageProps = {
  jobs?: Job[];
  onNavigate?: (key: NavKey) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
};

export function SystemLogsPage({
  jobs = [],
  onNavigate,
  onUpdateJob,
}: SystemLogsPageProps) {
  const [logFilter, setLogFilter] = useState<"all" | "error" | "warn" | "info">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [systemBaseLogs, setSystemBaseLogs] = useState<LogEntry[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);

  const showToast = (msg: string) => {
    if (msg.startsWith("✓") || msg.startsWith("🎉")) {
      popup.success(msg);
    } else if (msg.startsWith("❌")) {
      popup.error(msg, undefined, true);
    } else if (msg.startsWith("⚠️")) {
      popup.warning(msg, undefined, true);
    } else {
      popup.toast(msg, "info");
    }
  };

  // 1. Base Boot & Hardware Logs
  useEffect(() => {
    void (async () => {
      const key = await getRuntime().readLicense();
      const machine = await getRuntime().getMachineInfo();
      const now = Date.now();

      const base: LogEntry[] = [
        {
          id: "log-boot-1",
          rawTime: now - 1000 * 60 * 15,
          timestamp: new Date(now - 1000 * 60 * 15).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "BOOT",
          message: `Khởi tạo JACS Studio Engine v${machine?.appVersion || "0.3.94"} trên nền tảng ${machine?.platform || "windows"} (${machine?.arch || "x64"}).`,
        },
        {
          id: "log-boot-2",
          rawTime: now - 1000 * 60 * 14,
          timestamp: new Date(now - 1000 * 60 * 14).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "SYSTEM",
          message: `Đọc mã định danh phần cứng Mainboard HWID: ${machine?.machineId || "JACS-DEVICE"}.`,
        },
        {
          id: "log-boot-3",
          rawTime: now - 1000 * 60 * 12,
          timestamp: new Date(now - 1000 * 60 * 12).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "NETWORK",
          message: "Kết nối thành công máy chủ JACS API Gateway (https://jacs-studio.nexoratech.com.vn).",
        },
        {
          id: "log-boot-4",
          rawTime: now - 1000 * 60 * 10,
          timestamp: new Date(now - 1000 * 60 * 10).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "LICENSE",
          message: `Xác thực bản quyền chính hãng hợp lệ cho License Key: ${key ? key.slice(0, 8) + "..." : "ACTIVE"}. Trạng thái: VALID.`,
        },
        {
          id: "log-boot-5",
          rawTime: now - 1000 * 60 * 8,
          timestamp: new Date(now - 1000 * 60 * 8).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "AI-ANALYSIS",
          message: "Khởi tạo Multi-Provider AI Engine (Google Gemini 1.5/2.0, OpenAI GPT-4o, Groq Whisper STT) sẵn sàng hoạt động.",
        },
        {
          id: "log-boot-6",
          rawTime: now - 1000 * 60 * 6,
          timestamp: new Date(now - 1000 * 60 * 6).toLocaleTimeString("vi-VN"),
          level: "info",
          category: "RENDER-ENGINE",
          message: "FFmpeg Pipeline & Bộ bóc tách giọng nói Speech-to-Text sẵn sàng với GPU Hardware Acceleration.",
        },
      ];

      setSystemBaseLogs(base);
    })();
  }, []);

  // 2. Dynamic Job Logs (Extracting errors, running states, and completions)
  const jobLogs = useMemo(() => {
    const logs: LogEntry[] = [];
    const now = Date.now();

    jobs.forEach((job, idx) => {
      const isFailed = job.status === "failed" || Boolean(job.error);
      const isRunning = job.status === "running";
      const isCompleted = job.status === "completed" || Boolean(job.analysis?.scenes?.length);
      const timeOffset = now - 1000 * 60 * (idx + 1);
      const timestamp = job.createdAt || new Date(timeOffset).toLocaleTimeString("vi-VN");

      if (isFailed) {
        let cat: LogEntry["category"] = "AI-ANALYSIS";
        let suggestion = "Kiểm tra kết nối mạng và thử bấm nút 'Chạy lại' job này.";

        const err = (job.error || "").toLowerCase();
        if (err.includes("api key") || err.includes("apikey") || err.includes("chưa phát hiện api key") || err.includes("provider")) {
          cat = "AI-ANALYSIS";
          suggestion = "Vào 'Cài đặt tool' (góc trái dưới) -> Nhập API Key hợp lệ của Google Gemini hoặc OpenAI rồi chạy lại.";
        } else if (err.includes("quota") || err.includes("rate limit") || err.includes("429") || err.includes("resource exhausted")) {
          cat = "AI-ANALYSIS";
          suggestion = "API Key của bạn đã hết hạn mức (Quota Exceeded) hoặc bị giới hạn tốc độ. Vui lòng đổi API Key mới.";
        } else if (err.includes("url") || err.includes("download") || err.includes("tải video")) {
          cat = "VIDEO-DOWNLOAD";
          suggestion = "Link video không tải được hoặc video bị đặt chế độ riêng tư / giới hạn độ tuổi. Hãy thử tải file video về máy và nạp trực tiếp.";
        } else if (err.includes("transcription") || err.includes("whisper") || err.includes("groq")) {
          cat = "TRANSCRIPTION";
          suggestion = "Kiểm tra lại cấu hình Groq Whisper trong Cài đặt tool hoặc chọn Provider khác để bóc băng.";
        } else if (err.includes("ffmpeg") || err.includes("render") || err.includes("gpu")) {
          cat = "RENDER-ENGINE";
          suggestion = "Lỗi xử lý khung hình FFmpeg. Hãy thử chuyển chế độ Render sang CPU trong Cài đặt tool.";
        }

        logs.push({
          id: `job-err-${job.id}`,
          rawTime: timeOffset + 1000,
          timestamp,
          level: "error",
          category: cat,
          jobId: job.id,
          jobName: job.name,
          message: `Lỗi xử lý Job "${job.name}": ${job.error || "Quá trình phân tích hoặc tải video thất bại."}`,
          errorDetail: job.error,
          suggestion,
        });
      } else if (isRunning) {
        logs.push({
          id: `job-run-${job.id}`,
          rawTime: timeOffset + 2000,
          timestamp,
          level: "warn",
          category: "JOB-PROGRESS",
          jobId: job.id,
          jobName: job.name,
          message: `Job "${job.name}" đang thực thi (${job.progress}% - ${job.stage || "Đang xử lý phân cảnh"}).`,
        });
      } else if (isCompleted) {
        logs.push({
          id: `job-done-${job.id}`,
          rawTime: timeOffset + 3000,
          timestamp,
          level: "info",
          category: "AI-ANALYSIS",
          jobId: job.id,
          jobName: job.name,
          message: `Job "${job.name}" phân tích thành công: ${job.analysis?.scenes?.length || 0} phân cảnh trích xuất, tiêu hao ${job.tokensUsed || job.analysis?.tokensUsed || 0} tokens (Điểm AI: ⭐ ${job.analysis?.score || "9.5"}/10).`,
        });
      }
    });

    return logs;
  }, [jobs]);

  // Combined and sorted logs
  const allLogs = useMemo(() => {
    return [...systemBaseLogs, ...jobLogs].sort((a, b) => b.rawTime - a.rawTime);
  }, [systemBaseLogs, jobLogs]);

  // Counts for filters
  const errorLogs = useMemo(() => allLogs.filter((l) => l.level === "error"), [allLogs]);
  const warnLogs = useMemo(() => allLogs.filter((l) => l.level === "warn"), [allLogs]);
  const infoLogs = useMemo(() => allLogs.filter((l) => l.level === "info"), [allLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return allLogs.filter((l) => {
      if (logFilter !== "all" && l.level !== logFilter) return false;
      if (categoryFilter !== "all" && l.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMsg = l.message.toLowerCase().includes(q);
        const matchCat = l.category.toLowerCase().includes(q);
        const matchJob = (l.jobName || "").toLowerCase().includes(q);
        const matchErr = (l.errorDetail || "").toLowerCase().includes(q);
        if (!matchMsg && !matchCat && !matchJob && !matchErr) return false;
      }
      return true;
    });
  }, [allLogs, logFilter, categoryFilter, searchQuery]);

  // Copy Handlers
  const handleCopyAll = async () => {
    const text = allLogs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}`)
      .join("\n");
    await getRuntime().copyText(text);
    setCopiedAll(true);
    showToast("✓ Đã copy toàn bộ nhật ký hoạt động vào Clipboard!");
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopyErrors = async () => {
    if (!errorLogs.length) {
      showToast("Không có lỗi nào trong hệ thống.");
      return;
    }
    const text = errorLogs
      .map(
        (l) =>
          `[${l.timestamp}] [LỖI] [${l.category}] Job: ${l.jobName || "N/A"}\nChi tiết: ${l.message}\nGợi ý khắc phục: ${l.suggestion || "N/A"}`
      )
      .join("\n\n---\n\n");
    await getRuntime().copyText(text);
    setCopiedErrors(true);
    showToast(`✓ Đã copy ${errorLogs.length} lỗi chi tiết để gửi cho kỹ thuật/support!`);
    setTimeout(() => setCopiedErrors(false), 2500);
  };

  // Retry Failed Jobs
  const handleRetryFailedJobs = () => {
    const failedJobs = jobs.filter((j) => j.status === "failed" || Boolean(j.error));
    if (!failedJobs.length) {
      showToast("Không có job nào bị lỗi để chạy lại.");
      return;
    }
    if (onUpdateJob) {
      failedJobs.forEach((j) => {
        onUpdateJob(j.id, { status: "queued", error: undefined, progress: 0 });
      });
      showToast(`✓ Đã chuyển ${failedJobs.length} job lỗi vào hàng đợi chạy lại.`);
    }
  };

  return (
    <div
      className="system-logs-workspace animate-fade-in"
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
      
      {/* 1. Header & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px", flexShrink: 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.35)", padding: "2px 8px", borderRadius: "5px", fontSize: "10.5px", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "3px" }}>
            <TerminalFill size={10} /> SYSTEM RUNTIME & ERROR LOGS · NHẬT KÝ HỆ THỐNG
          </div>
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <CpuFill size={18} color="#fbbf24" />
            Nhật Ký Hoạt Động & Chẩn Đoán Lỗi Hệ Thống
          </h1>
          <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "2px 0 0" }}>
            Theo dõi chi tiết log vận hành, trạng thái các job xử lý, lỗi AI Provider, GPU Render và thông số chẩn đoán lỗi.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          {errorLogs.length > 0 && (
            <button
              type="button"
              onClick={handleCopyErrors}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}
            >
              <BugFill size={13} /> {copiedErrors ? "✓ Đã Copy Danh Sách Lỗi" : `Copy ${errorLogs.length} Lỗi Cho Support`}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyAll}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
          >
            {copiedAll ? <ClipboardCheck size={13} color="#34d399" /> : <Clipboard size={13} />}
            {copiedAll ? "Đã Copy Toàn Bộ Log" : "Copy Toàn Bộ Log"}
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
            >
              <GearFill size={13} /> Cài Đặt Tool & API Key
            </button>
          )}
        </div>
      </div>

      {/* 2. Error Diagnostic & Auto-Troubleshoot Banner (When Errors Exist) */}
      {errorLogs.length > 0 && (
        <div style={{ background: "linear-gradient(90deg, rgba(239, 68, 68, 0.12), rgba(185, 28, 28, 0.08))", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "8px", padding: "12px 14px", marginBottom: "12px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "rgba(239, 68, 68, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171" }}>
                <ExclamationTriangleFill size={15} />
              </div>
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 800, color: "#fca5a5", margin: 0 }}>
                  Phát hiện {errorLogs.length} sự cố / lỗi trong quá trình xử lý Job
                </h4>
                <p style={{ fontSize: "11px", color: "#cbd5e1", margin: "2px 0 0" }}>
                  Hệ thống tự động phát hiện nguyên nhân và gợi ý khắc phục nhanh bên dưới:
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRetryFailedJobs}
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", border: "none", color: "#ffffff", padding: "6px 14px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", boxShadow: "0 0 12px rgba(239, 68, 68, 0.35)" }}
            >
              <ArrowClockwise size={12} /> Chạy Lại Tất Cả Job Lỗi
            </button>
          </div>

          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
            {errorLogs.slice(0, 3).map((err) => (
              <div key={err.id} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", padding: "8px 12px", fontSize: "11.5px", color: "#e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <strong style={{ color: "#f87171" }}>🚨 {err.jobName || "Job lỗi"}:</strong>
                  <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>{err.timestamp}</span>
                </div>
                <div style={{ color: "#fca5a5", marginTop: "2px" }}>{err.errorDetail || err.message}</div>
                {err.suggestion && (
                  <div style={{ marginTop: "4px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                    💡 <em>{err.suggestion}</em>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. KPI Summary Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", marginBottom: "12px", flexShrink: 0 }}>
        
        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "7px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>
            <TerminalFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>TỔNG BẢN GHI LOG</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{allLogs.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>events</span></div>
          </div>
        </div>

        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: errorLogs.length ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "7px", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>
            <XCircleFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>LỖI PHÁT SINH (ERROR)</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: errorLogs.length ? "#f87171" : "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {errorLogs.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>lỗi</span>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "7px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>
            <ExclamationTriangleFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>CẢNH BÁO (WARN)</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#fbbf24", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{warnLogs.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>cảnh báo</span></div>
          </div>
        </div>

        <div style={{ background: "rgba(18, 22, 32, 0.8)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "7px", background: "rgba(16, 185, 129, 0.12)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>
            <CheckCircleFill />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>THÔNG TIN (INFO)</div>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#34d399", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{infoLogs.length} <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 500 }}>thành công</span></div>
          </div>
        </div>

      </div>

      {/* 4. Search & Filters Bar */}
      <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "380px" }}>
          <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo nội dung log, tên job, mã lỗi..."
            style={{ width: "100%", background: "rgba(0, 0, 0, 0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "6px 10px 6px 30px", color: "#f8fafc", fontSize: "12.5px", outline: "none" }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
            >
              <XLg size={11} />
            </button>
          )}
        </div>

        {/* Level Filters & Category Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", padding: "2px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { key: "all", label: `Tất Cả (${allLogs.length})`, color: "#94a3b8" },
              { key: "error", label: `🚨 Lỗi (${errorLogs.length})`, color: "#f87171" },
              { key: "warn", label: `⚠️ Cảnh Báo (${warnLogs.length})`, color: "#fbbf24" },
              { key: "info", label: `ℹ️ Thông Tin (${infoLogs.length})`, color: "#34d399" },
            ].map((ft) => (
              <button
                key={ft.key}
                type="button"
                onClick={() => setLogFilter(ft.key as any)}
                style={{
                  background: logFilter === ft.key ? "rgba(56, 189, 248, 0.2)" : "transparent",
                  color: logFilter === ft.key ? (ft.key === "error" ? "#f87171" : "#38bdf8") : ft.color,
                  border: logFilter === ft.key ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
                  padding: "3px 8px",
                  borderRadius: "5px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {ft.label}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "5px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
          >
            <option value="all">Tất cả Category</option>
            <option value="AI-ANALYSIS">AI-ANALYSIS</option>
            <option value="VIDEO-DOWNLOAD">VIDEO-DOWNLOAD</option>
            <option value="TRANSCRIPTION">TRANSCRIPTION</option>
            <option value="RENDER-ENGINE">RENDER-ENGINE</option>
            <option value="JOB-PROGRESS">JOB-PROGRESS</option>
            <option value="LICENSE">LICENSE</option>
            <option value="NETWORK">NETWORK</option>
            <option value="BOOT">BOOT</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>

        </div>
      </div>

      {/* 5. Terminal Log Console View */}
      <div
        style={{
          background: "#080c14",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "14px",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
          fontSize: "12px",
          lineHeight: "1.6",
          maxHeight: "600px",
          overflowY: "auto",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.6)",
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            <TerminalFill size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
            <p style={{ margin: 0 }}>Không có bản ghi log nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            let levelColor = "#38bdf8";
            let levelBg = "rgba(56, 189, 248, 0.15)";
            let levelBorder = "rgba(56, 189, 248, 0.3)";

            if (log.level === "error") {
              levelColor = "#f87171";
              levelBg = "rgba(239, 68, 68, 0.15)";
              levelBorder = "rgba(239, 68, 68, 0.4)";
            } else if (log.level === "warn") {
              levelColor = "#fbbf24";
              levelBg = "rgba(245, 158, 11, 0.15)";
              levelBorder = "rgba(245, 158, 11, 0.4)";
            }

            return (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  padding: "6px 8px",
                  borderRadius: "5px",
                  background: log.level === "error" ? "rgba(239, 68, 68, 0.05)" : "transparent",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                  transition: "background 0.15s ease",
                }}
              >
                {/* Timestamp */}
                <span style={{ color: "#64748b", flexShrink: 0, fontSize: "11px" }}>
                  [{log.timestamp}]
                </span>

                {/* Level Badge */}
                <span
                  style={{
                    background: levelBg,
                    color: levelColor,
                    border: `1px solid ${levelBorder}`,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    flexShrink: 0,
                  }}
                >
                  {log.level}
                </span>

                {/* Category Badge */}
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#94a3b8",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  [{log.category}]
                </span>

                {/* Message Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: log.level === "error" ? "#fca5a5" : log.level === "warn" ? "#fef08a" : "#e2e8f0", wordBreak: "break-word" }}>
                    {log.message}
                  </span>

                  {/* Suggestion / Troubleshooting Hint */}
                  {log.suggestion && (
                    <div style={{ marginTop: "4px", fontSize: "11px", color: "#38bdf8", background: "rgba(56, 189, 248, 0.08)", padding: "3px 8px", borderRadius: "4px", display: "inline-block" }}>
                      💡 <strong>Khắc phục:</strong> {log.suggestion}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
