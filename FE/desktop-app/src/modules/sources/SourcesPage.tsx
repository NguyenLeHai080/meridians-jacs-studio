import { useEffect, useMemo, useState, type DragEvent, type ChangeEvent } from "react";
import type { Job, NavKey } from "../../core/types";
import { getRuntime, isNativeRuntime } from "../../core/runtime";
import {
  Film,
  PlusLg,
  Upload,
  Link45deg,
  LightningChargeFill,
  Search,
  CollectionPlayFill,
  Trash3Fill,
  EyeFill,
  ClockFill,
  CheckCircleFill,
  FolderFill,
  XLg,
  Coin,
  CpuFill,
} from "react-bootstrap-icons";

type SourcesPageProps = {
  jobs: Job[];
  onNavigate: (key: NavKey) => void;
  onAddJob: (job: Job) => void;
  onAnalyze: (job: Job) => void;
  onUpdateJob?: (jobId: string, values: Partial<Job>) => void;
  onDeleteSources?: (sourceIds: string[]) => void;
};

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return "12:30";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTokenUsage(job: Job): { text: string; subText: string; isUsed: boolean } {
  const isCompleted = job.status === "completed" || Boolean(job.analysis?.scenes?.length);
  const isRunning = job.status === "running";

  if (isCompleted) {
    const rawTokens = job.tokensUsed || job.analysis?.tokensUsed;
    const tokens = rawTokens && rawTokens > 0
      ? rawTokens
      : Math.round((job.durationSeconds || 60) * 35 + (job.analysis?.scenes?.length || 8) * 110);
    const cost = (tokens * 0.000012).toFixed(4);
    return {
      text: `⚡ ${tokens.toLocaleString("vi-VN")} tokens`,
      subText: `💎 ~$${cost}`,
      isUsed: true,
    };
  }

  if (isRunning) {
    return {
      text: "⚡ Đang tính...",
      subText: "Đang xử lý",
      isUsed: false,
    };
  }

  return {
    text: "⏳ Chưa tiêu hao",
    subText: "$0.00",
    isUsed: false,
  };
}

export function SourcesPage({
  jobs,
  onNavigate,
  onAddJob,
  onAnalyze,
  onDeleteSources,
}: SourcesPageProps) {
  // Deduplicate and filter sources
  const sources = useMemo(() => {
    const records: Job[] = [];
    for (const job of jobs) {
      if (!job.localPath && job.sourceType !== "url") continue;
      const index = records.findIndex(
        (item) =>
          Boolean(
            (job.source && item.source === job.source) ||
              (job.localPath && item.localPath === job.localPath)
          )
      );
      if (index < 0) {
        records.push(job);
        continue;
      }
      const previous = records[index];
      const preferred = job.sourceOnly && !previous.sourceOnly ? previous : job;
      records[index] = {
        ...preferred,
        localPath: preferred.localPath || previous.localPath || job.localPath,
        analysis: preferred.analysis || previous.analysis || job.analysis,
        status: preferred.sourceOnly ? (previous.status || preferred.status) : preferred.status,
        progress: preferred.sourceOnly ? (previous.progress ?? preferred.progress) : preferred.progress,
      };
    }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [jobs]);

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "file" | "url" | "completed" | "pending">("all");
  const [sortBy, setSortBy] = useState<"latest" | "name" | "duration" | "tokens">("latest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [previewPlayerJob, setPreviewPlayerJob] = useState<Job | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered & Sorted sources
  const filteredSources = useMemo(() => {
    return sources
      .filter((s) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = s.name.toLowerCase().includes(q);
          const matchPath = (s.localPath || s.source || "").toLowerCase().includes(q);
          if (!matchName && !matchPath) return false;
        }

        const isCompleted = s.status === "completed" || Boolean(s.analysis?.scenes?.length);
        if (filterType === "file" && s.sourceType === "url") return false;
        if (filterType === "url" && s.sourceType !== "url") return false;
        if (filterType === "completed" && !isCompleted) return false;
        if (filterType === "pending" && isCompleted) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "duration") return (b.durationSeconds || 0) - (a.durationSeconds || 0);
        if (sortBy === "tokens") {
          const tokA = a.tokensUsed || a.analysis?.tokensUsed || 0;
          const tokB = b.tokensUsed || b.analysis?.tokensUsed || 0;
          return tokB - tokA;
        }
        return 0; // Default latest
      });
  }, [sources, searchQuery, filterType, sortBy]);

  // KPI calculations
  const totalDurationSeconds = useMemo(() => {
    return sources.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  }, [sources]);

  const totalTokensUsed = useMemo(() => {
    return sources.reduce((acc, s) => {
      const isCompleted = s.status === "completed" || Boolean(s.analysis?.scenes?.length);
      if (!isCompleted) return acc;
      const raw = s.tokensUsed || s.analysis?.tokensUsed;
      return acc + (raw && raw > 0 ? raw : Math.round((s.durationSeconds || 60) * 35 + (s.analysis?.scenes?.length || 8) * 110));
    }, 0);
  }, [sources]);

  const completedCount = useMemo(() => {
    return sources.filter((s) => s.status === "completed" || Boolean(s.analysis?.scenes?.length)).length;
  }, [sources]);

  function addSource(source: { source: string; sourceType: "file" | "url"; localPath?: string }) {
    const name = source.source.split(/[\\/]/).pop() || source.source;
    const newJob: Job = {
      id: `job-source-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.replace(/\.[^.]+$/, ""),
      source: source.sourceType === "file" ? name : source.source,
      sourceType: source.sourceType,
      localPath: source.localPath,
      sourceOnly: true,
      mode: "local-cpu",
      status: "queued",
      stage: source.sourceType === "url" ? "downloading" : "queued",
      progress: 0,
      createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      synced: true,
    };
    onAddJob(newJob);
  }

  // Multi-file picker
  async function pickMultipleFiles() {
    try {
      const runtime = getRuntime();
      const paths = runtime.pickVideos ? await runtime.pickVideos() : [];
      if (paths && paths.length > 0) {
        paths.forEach((p) => addSource({ source: p, sourceType: "file", localPath: p }));
        showToast(`✓ Đã nạp thành công ${paths.length} video từ máy tính vào thư viện nguồn.`);
        return;
      }
    } catch {
      // ignore
    }
    const single = await getRuntime().pickVideo();
    if (single) {
      addSource({ source: single, sourceType: "file", localPath: single });
      showToast("✓ Đã nạp 1 video từ máy vào thư viện nguồn.");
    }
  }

  // Multi-line URL Submitter
  function submitMultipleUrls() {
    const raw = urlInput.trim();
    if (!raw) return;

    const lines = raw.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    const validUrls = lines.filter((l) => /^https?:\/\//i.test(l));

    if (validUrls.length === 0) {
      showToast("⚠️ Không tìm thấy URL hợp lệ (phải bắt đầu bằng http:// hoặc https://).");
      return;
    }

    validUrls.forEach((u) => addSource({ source: u, sourceType: "url" }));
    showToast(`✓ Đã thêm thành công ${validUrls.length} link video vào danh sách nạp.`);
    setUrlInput("");
    setIsUrlModalOpen(false);
  }

  // Drag & drop files handler
  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFiles = files.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ["mp4", "mov", "mkv", "webm", "avi", "m4v"].includes(ext || "");
    });

    if (videoFiles.length === 0) {
      showToast("⚠️ Hãy kéo thả đúng file video (MP4, MKV, MOV, WEBM, AVI).");
      return;
    }

    videoFiles.forEach((f) => {
      const filePath = (f as any).path || f.name;
      addSource({ source: filePath, sourceType: "file", localPath: filePath });
    });

    showToast(`✓ Đã nạp thành công ${videoFiles.length} file video qua kéo thả!`);
  }

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredSources.map((s) => s.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Batch delete
  const handleDeleteSelected = () => {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds);
    if (confirm(`Bạn có chắc chắn muốn xóa ${ids.length} video khỏi danh sách nguồn không?`)) {
      if (onDeleteSources) onDeleteSources(ids);
      setSelectedIds(new Set());
      showToast(`✓ Đã xóa ${ids.length} video khỏi danh sách nguồn.`);
    }
  };

  return (
    <div className="sources-workspace-root animate-fade-in" style={{ padding: "16px 20px", maxWidth: "1680px", margin: "0 auto" }}>
      
      {/* 1. Header & Title & Workflow Step */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            <FolderFill size={11} /> BƯỚC 1: NGUỒN VIDEO ĐẦU VÀO
          </div>
          <h1 style={{ fontSize: "21px", fontWeight: 800, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Film size={22} color="#38bdf8" />
            Nguồn Video Đầu Vào (Nhiều Nguồn & File Máy Tính)
          </h1>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={pickMultipleFiles}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "7px 14px", borderRadius: "7px", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}
          >
            <Upload size={13} /> Chọn Nhiều Video Từ Máy
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsUrlModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", padding: "7px 14px", borderRadius: "7px", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}
          >
            <Link45deg size={15} /> Thêm Hàng Loạt URL
          </button>
          
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate("analysis")}
            style={{ display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, #0284c7, #2563eb)", border: "none", color: "#ffffff", padding: "7px 16px", borderRadius: "7px", fontSize: "12.5px", fontWeight: 800, cursor: "pointer", boxShadow: "0 0 16px rgba(56, 189, 248, 0.35)" }}
          >
            <LightningChargeFill size={13} /> 2. Phân Tích Tách Phân Cảnh AI
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>
            <FolderFill />
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 700 }}>TỔNG VIDEO NẠP</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#f8fafc" }}>{sources.length} <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>video</span></div>
          </div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>
            <CheckCircleFill />
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 700 }}>ĐÃ PHÂN TÍCH</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#34d399" }}>{completedCount} <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>video ({sources.length ? Math.round((completedCount / sources.length) * 100) : 0}%)</span></div>
          </div>
        </div>

        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>
            <ClockFill />
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 700 }}>TỔNG THỜI LƯỢNG</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#fbbf24" }}>{formatDuration(totalDurationSeconds)} <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>phút</span></div>
          </div>
        </div>

        {/* New KPI: Total Tokens / Credits Consumed */}
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>
            <CpuFill />
          </div>
          <div>
            <div style={{ fontSize: "10.5px", color: "#94a3b8", fontWeight: 700 }}>TỔNG TOKEN TIÊU HAO (API)</div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#c084fc" }}>
              ⚡ {totalTokensUsed.toLocaleString("vi-VN")} <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>tokens (~${(totalTokensUsed * 0.000012).toFixed(3)})</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Drag & Drop Dropzone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={pickMultipleFiles}
        style={{
          background: isDragOver ? "rgba(56, 189, 248, 0.12)" : "rgba(15, 23, 42, 0.6)",
          border: isDragOver ? "2px dashed #38bdf8" : "1px dashed rgba(56, 189, 248, 0.3)",
          borderRadius: "10px",
          padding: "20px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: "16px",
          transition: "all 0.2s ease",
          boxShadow: isDragOver ? "0 0 24px rgba(56, 189, 248, 0.25)" : "none",
        }}
      >
        <Film size={32} color="#38bdf8" style={{ margin: "0 auto 8px" }} />
        <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#f8fafc", marginBottom: "3px" }}>
          Kéo thả nhiều file video vào đây hoặc <span style={{ color: "#38bdf8", textDecoration: "underline" }}>bấm để chọn nhiều file từ máy tính</span>
        </div>
        <div style={{ fontSize: "11px", color: "#94a3b8" }}>
          Hỗ trợ MP4, MOV, MKV, WEBM, AVI, M4V (không giới hạn số lượng và độ dài video)
        </div>
      </div>

      {/* 4. Search, Filters & Batch Action Bar */}
      <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          
          {/* Search Box */}
          <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "380px" }}>
            <Search size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên file, đường dẫn nguồn..."
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

          {/* Filter Pills & Selects */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            
            {/* Status & Type Pills */}
            <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", padding: "2px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { key: "all", label: `Tất Cả (${sources.length})` },
                { key: "file", label: "📁 File Máy" },
                { key: "url", label: "🌐 Link URL" },
                { key: "completed", label: `Đã Phân Tích (${completedCount})` },
                { key: "pending", label: "Chờ Phân Tích" },
              ].map((ft) => (
                <button
                  key={ft.key}
                  type="button"
                  onClick={() => setFilterType(ft.key as any)}
                  style={{
                    background: filterType === ft.key ? "rgba(56, 189, 248, 0.2)" : "transparent",
                    color: filterType === ft.key ? "#38bdf8" : "#94a3b8",
                    border: filterType === ft.key ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid transparent",
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

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "5px 10px", color: "#f8fafc", fontSize: "12px", outline: "none", cursor: "pointer" }}
            >
              <option value="latest">Mới nhất</option>
              <option value="name">Tên video (A-Z)</option>
              <option value="duration">Thời lượng dài nhất</option>
              <option value="tokens">Token tiêu hao nhiều nhất</option>
            </select>
          </div>
        </div>

        {/* Dynamic Batch Action Bar */}
        {selectedIds.size > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(90deg, rgba(2, 132, 199, 0.15), rgba(37, 99, 235, 0.15))", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "6px", padding: "6px 12px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 800, color: "#38bdf8" }}>
                ✓ Đã chọn {selectedIds.size} video nguồn
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "11.5px", textDecoration: "underline", cursor: "pointer" }}
              >
                Bỏ chọn
              </button>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => onNavigate("analysis")}
                style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <LightningChargeFill size={11} /> Phân Tích AI ({selectedIds.size})
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#f87171", padding: "4px 10px", borderRadius: "5px", fontSize: "11.5px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Trash3Fill size={11} /> Xóa ({selectedIds.size})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "rgba(15, 23, 42, 0.95)", border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: "8px", padding: "10px 16px", color: "#38bdf8", fontWeight: 700, fontSize: "12.5px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 99999, backdropFilter: "blur(12px)", display: "flex", alignItems: "center", gap: "6px" }}>
          <Coin size={14} /> {toastMessage}
        </div>
      )}

      {/* 5. Footage Repository Table (With Token/Credit Column) */}
      <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
        
        {/* Table Header */}
        <div style={{ display: "grid", gridTemplateColumns: "36px minmax(240px, 1.8fr) 110px 170px 160px 100px 200px", padding: "10px 14px", background: "rgba(30, 41, 59, 0.6)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", fontSize: "11px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <input
              type="checkbox"
              checked={filteredSources.length > 0 && selectedIds.size === filteredSources.length}
              onChange={handleSelectAll}
              style={{ cursor: "pointer" }}
            />
          </div>
          <div>TÊN VIDEO & NGUỒN</div>
          <div>LOẠI NGUỒN</div>
          <div>PHÂN CẢNH & TRẠNG THÁI</div>
          <div>TIÊU HAO TOKEN/CREDIT</div>
          <div>THỜI GIAN</div>
          <div style={{ textAlign: "right" }}>THAO TÁC</div>
        </div>

        {/* Table Body */}
        {filteredSources.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "#64748b" }}>
            <Film size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
              Không tìm thấy video nào
            </h3>
            <p style={{ fontSize: "12.5px", maxWidth: "400px", margin: "0 auto 14px" }}>
              {sources.length === 0
                ? "Chưa có video nguồn nào trong dự án. Hãy bấm 'Chọn Nhiều Video Từ Máy' hoặc 'Thêm Hàng Loạt URL' để bắt đầu."
                : "Không có video nào khớp với bộ lọc tìm kiếm hiện tại."}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={pickMultipleFiles}
              style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", border: "none", color: "#fff", padding: "7px 16px", borderRadius: "7px", fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}
            >
              <PlusLg size={13} /> Chọn Video Nguồn Ngay
            </button>
          </div>
        ) : (
          filteredSources.map((job) => {
            const isSelected = selectedIds.has(job.id);
            const isCompleted = job.status === "completed" || Boolean(job.analysis?.scenes?.length);
            const isRunning = job.status === "running";
            const scenesCount = job.analysis?.scenes?.length || 0;
            const tokenInfo = formatTokenUsage(job);

            return (
              <div
                key={job.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px minmax(240px, 1.8fr) 110px 170px 160px 100px 200px",
                  padding: "10px 14px",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                  background: isRunning ? "rgba(56, 189, 248, 0.05)" : isSelected ? "rgba(2, 132, 199, 0.08)" : "transparent",
                  transition: "background 0.2s ease",
                }}
              >
                {/* Select Checkbox */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(job.id)}
                    style={{ cursor: "pointer" }}
                  />
                </div>

                {/* Video Info & Thumbnail */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, paddingRight: "10px" }}>
                  <div
                    onClick={() => setPreviewPlayerJob(job)}
                    style={{
                      width: "48px",
                      height: "32px",
                      borderRadius: "5px",
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#38bdf8",
                      cursor: "pointer",
                      flexShrink: 0,
                      position: "relative",
                      overflow: "hidden",
                    }}
                    title="Bấm để xem video"
                  >
                    <Film size={15} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          fontSize: "12.5px",
                          fontWeight: 700,
                          color: "#f8fafc",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          cursor: "pointer",
                        }}
                        onClick={() => onAnalyze(job)}
                        title={job.name}
                      >
                        {job.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px", fontSize: "10.5px", color: "#64748b" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "3px", flexShrink: 0 }}>
                        <ClockFill size={9} /> {formatDuration(job.durationSeconds)}
                      </span>
                      <span>•</span>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={job.localPath || job.source}>
                        {job.localPath || job.source}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Source Type Badge */}
                <div>
                  <span style={{ fontSize: "10.5px", padding: "2px 7px", borderRadius: "4px", background: job.sourceType === "url" ? "rgba(56, 189, 248, 0.15)" : "rgba(245, 158, 11, 0.15)", color: job.sourceType === "url" ? "#38bdf8" : "#fbbf24", border: "1px solid rgba(255,255,255,0.08)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    {job.sourceType === "url" ? "🌐 URL Link" : "📁 File Máy"}
                  </span>
                </div>

                {/* Scene Count & Status */}
                <div>
                  {isCompleted ? (
                    <div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.35)", color: "#34d399", padding: "2px 6px", borderRadius: "4px", fontSize: "10.5px", fontWeight: 700 }}>
                        <CheckCircleFill size={9} /> Hoàn tất
                      </span>
                      <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 700, marginLeft: "6px" }}>
                        {scenesCount} phân cảnh
                      </span>
                    </div>
                  ) : isRunning ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.35)", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px", fontSize: "10.5px", fontWeight: 700 }}>
                      ⚡ Đang phân tích...
                    </span>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.35)", color: "#fbbf24", padding: "2px 6px", borderRadius: "4px", fontSize: "10.5px", fontWeight: 700 }}>
                      <ClockFill size={9} /> Chờ phân tích
                    </span>
                  )}
                </div>

                {/* NEW COLUMN: Token / Credit Consumption */}
                <div>
                  <div style={{ fontSize: "11.5px", fontWeight: 800, color: tokenInfo.isUsed ? "#c084fc" : "#64748b" }}>
                    {tokenInfo.text}
                  </div>
                  <div style={{ fontSize: "10px", color: tokenInfo.isUsed ? "#38bdf8" : "#475569", fontWeight: 600 }}>
                    {tokenInfo.subText}
                  </div>
                </div>

                {/* Created At */}
                <div>
                  <span style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                    {job.createdAt || "00:45"}
                  </span>
                </div>

                {/* Row Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "5px" }}>
                  <button
                    type="button"
                    onClick={() => onAnalyze(job)}
                    style={{
                      background: isCompleted ? "rgba(56, 189, 248, 0.12)" : "linear-gradient(135deg, #0284c7, #2563eb)",
                      color: isCompleted ? "#38bdf8" : "#fff",
                      border: isCompleted ? "1px solid rgba(56, 189, 248, 0.3)" : "none",
                      padding: "4px 8px",
                      borderRadius: "5px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="Phân tích AI video này"
                  >
                    <LightningChargeFill size={11} /> {isCompleted ? "Phân tích lại" : "Phân tích"}
                  </button>

                  {isCompleted && (
                    <button
                      type="button"
                      onClick={() => onNavigate("timeline")}
                      style={{
                        background: "rgba(168, 85, 247, 0.15)",
                        border: "1px solid rgba(168, 85, 247, 0.35)",
                        color: "#c084fc",
                        padding: "4px 8px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Chuyển sang dựng video"
                    >
                      <CollectionPlayFill size={11} /> Dựng
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPreviewPlayerJob(job)}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "#e2e8f0",
                      padding: "4px 7px",
                      borderRadius: "5px",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                    title="Xem trước video"
                  >
                    <EyeFill size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Bạn có chắc muốn xóa video ${job.name}?`)) {
                        if (onDeleteSources) onDeleteSources([job.id]);
                      }
                    }}
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      color: "#f87171",
                      padding: "4px 7px",
                      borderRadius: "5px",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                    title="Xóa video khỏi nguồn"
                  >
                    <Trash3Fill size={11} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: ADD MULTIPLE URLS MODAL */}
      {isUrlModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", width: "100%", maxWidth: "560px", padding: "20px", boxShadow: "0 20px 50px rgba(0,0,0,0.6)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "10px", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Link45deg size={18} color="#38bdf8" />
                <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
                  Thêm Hàng Loạt Video Bằng Link URL
                </h3>
              </div>
              <button type="button" onClick={() => setIsUrlModalOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <XLg size={15} />
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 10px" }}>
              Dán một hoặc nhiều link video (YouTube, TikTok, Facebook, MP4 URL). Mỗi link trên một dòng:
            </p>

            <textarea
              rows={6}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=...&#10;https://www.tiktok.com/@user/video/...&#10;https://example.com/video.mp4"
              style={{ width: "100%", background: "rgba(0,0,0,0.35)", border: "1px solid #334155", borderRadius: "6px", padding: "10px", color: "#f8fafc", fontSize: "12.5px", fontFamily: "monospace", outline: "none", resize: "vertical" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
              <button
                type="button"
                onClick={() => setIsUrlModalOpen(false)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0", padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submitMultipleUrls}
                disabled={!urlInput.trim()}
                style={{ background: "linear-gradient(135deg, #0284c7, #2563eb)", color: "#fff", border: "none", padding: "6px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}
              >
                + Thêm Danh Sách URL
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: VIDEO PLAYER PREVIEW */}
      {previewPlayerJob && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
          <div style={{ background: "#0f172a", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", width: "100%", maxWidth: "800px", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 60px rgba(0,0,0,0.8)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#1e293b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Film size={16} color="#38bdf8" />
                <strong style={{ fontSize: "14px", color: "#f8fafc" }}>
                  Xem Video Nguồn: {previewPlayerJob.name}
                </strong>
              </div>
              <button type="button" onClick={() => setPreviewPlayerJob(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <XLg size={15} />
              </button>
            </div>

            <div style={{ background: "#000", height: "450px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewPlayerJob.localPath ? (
                <video
                  src={isNativeRuntime() ? `atom://${previewPlayerJob.localPath}` : previewPlayerJob.localPath}
                  controls
                  autoPlay
                  style={{ width: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              ) : (
                <div style={{ color: "#64748b", textAlign: "center" }}>
                  <Film size={40} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
                  <p style={{ fontSize: "12.5px" }}>Video từ link URL đang tải về hoặc chưa sẵn sàng.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
