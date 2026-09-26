import { useMemo } from "react";
import { ShieldCheck, Image, Film, PlayCircleFill, CheckCircleFill, ArrowUpRight, Stars } from "react-bootstrap-icons";
import type { Job } from "../../../core/types";

interface OverviewJobAnalyticsCardProps {
  jobs: Job[];
  onNavigate: (key: any) => void;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "Vừa xong";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  } catch {
    return "Gần đây";
  }
}

export function OverviewJobAnalyticsCard({ jobs, onNavigate }: OverviewJobAnalyticsCardProps) {
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === "completed").length;
  const runningJobs = jobs.filter((j) => j.status === "running" || j.status === "queued").length;
  const totalScenes = useMemo(() => {
    return jobs.reduce((acc, j) => acc + (j.analysis?.scenes?.length || j.scenes?.length || 0), 0);
  }, [jobs]);

  const recentActivities = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    return [...jobs]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 3)
      .map((job) => {
        const scenesCount = job.analysis?.scenes?.length || job.scenes?.length || 0;
        const tokens = job.tokensUsed ? `${job.tokensUsed.toLocaleString()} tokens` : "0 tokens";
        return {
          id: job.id,
          title: job.name || job.videoTitle || "Dự án video",
          desc: `${scenesCount} phân cảnh · ${tokens}`,
          time: formatRelativeTime(job.createdAt),
          status: job.status,
        };
      });
  }, [jobs]);

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
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            TIẾN TRÌNH SẢN XUẤT STUDIO
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "2px 7px", borderRadius: "99px", color: "#fbbf24", fontSize: "10.5px", fontWeight: 700 }}>
            <ShieldCheck size={11} /> Cục Bộ An Toàn
          </span>
        </div>
        <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", background: "rgba(255, 255, 255, 0.06)", padding: "2px 7px", borderRadius: "4px" }}>
          Live Pipeline
        </span>
      </div>

      {/* Main Counter */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#f8fafc", margin: 0 }}>
            {completedJobs}/{totalJobs} Video Hoàn Tất
          </h3>
        </div>
        <p style={{ fontSize: "11px", color: "#94a3b8", margin: "3px 0 0" }}>
          {totalJobs === 0
            ? "Chưa có dự án nào. Bấm 'Mở Phân Tích Video' để bắt đầu."
            : runningJobs > 0
            ? `⚡ Có ${runningJobs} video đang chờ xử lý trong hàng đợi`
            : `✨ Đã bóc tách tổng cộng ${totalScenes} phân cảnh chất lượng cao`}
        </p>
      </div>

      {/* Recent Activities */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#94a3b8" }}>Hoạt động video gần đây:</span>
          {jobs.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate("analysis")}
              style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "10.5px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "3px", cursor: "pointer", padding: 0 }}
            >
              Xem tất cả <ArrowUpRight size={10} />
            </button>
          )}
        </div>

        {recentActivities.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {recentActivities.map((act) => (
              <div
                key={act.id}
                style={{
                  background: "rgba(0, 0, 0, 0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: act.status === "completed" ? "rgba(16, 185, 129, 0.15)" : act.status === "failed" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)", color: act.status === "completed" ? "#34d399" : act.status === "failed" ? "#f87171" : "#fbbf24", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {act.status === "completed" ? <CheckCircleFill size={10} /> : <PlayCircleFill size={10} />}
                </div>
                <div style={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                  <strong style={{ fontSize: "11px", color: "#f8fafc", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {act.title}
                  </strong>
                  <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {act.desc} · <em style={{ fontStyle: "normal", color: "#64748b" }}>{act.time}</em>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px dashed rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "12px 10px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Chưa có video nào trong dự án.
            </span>
            <button
              type="button"
              onClick={() => onNavigate("analysis")}
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                borderRadius: "6px",
                color: "#fbbf24",
                padding: "3px 10px",
                fontSize: "10.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Nhập Video Bắt Đầu
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px", marginTop: "2px" }}>
        <button
          type="button"
          onClick={() => onNavigate("analysis")}
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
          <Film size={11} /> Mở Phân Tích Video ↗
        </button>

        <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
          Tối ưu hóa đa luồng 100%
        </span>
      </div>
    </div>
  );
}
