import { useMemo } from "react";
import { LightningChargeFill, CollectionPlayFill, MicFill, Film, ArrowRight } from "react-bootstrap-icons";
import type { Job } from "../../../core/types";

interface OverviewModuleCardProps {
  jobs: Job[];
  onNavigate: (key: any) => void;
}

export function OverviewModuleCard({ jobs, onNavigate }: OverviewModuleCardProps) {
  const moduleWorkload = useMemo(() => {
    return [
      {
        id: "analysis",
        title: "1. Bóc Tách & Phân Tích Video AI",
        desc: "Bóc tách 3 hồi, trích xuất âm thanh, bóc transcript đa ngôn ngữ",
        stageKey: "analysis",
        color: "#fbbf24",
        badge: "Khuyên dùng",
      },
      {
        id: "story",
        title: "2. Biên Tập Kịch Bản & Voice Studio",
        desc: "Phòng thu giọng đọc AI ElevenLabs, Vbee đa vùng miền, chỉnh tốc độ",
        stageKey: "story",
        color: "#34d399",
        badge: "Đa vùng miền",
      },
      {
        id: "timeline",
        title: "3. Bàn Dựng Timeline Đa Tầng",
        desc: "Ghép clip, đồng bộ âm nhạc, phụ đề tự động & hiệu ứng chuyển cảnh",
        stageKey: "timeline",
        color: "#38bdf8",
        badge: "Trực quan",
      },
      {
        id: "render",
        title: "4. Xuất Bản & Render Hàng Loạt",
        desc: "Tăng tốc phần cứng GPU NVIDIA / Apple Metal 1080p/4K 60fps",
        stageKey: "render",
        color: "#c084fc",
        badge: "Hardware NVENC",
      },
    ];
  }, []);

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
        <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          QUY TRÌNH SẢN XUẤT 4 BƯỚC KHÉP KÍN
        </span>
        <span style={{ fontSize: "10.5px", color: "#fbbf24", fontWeight: 700 }}>
          Full Studio Suite
        </span>
      </div>

      {/* Module Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {moduleWorkload.map((m) => (
          <div
            key={m.id}
            onClick={() => onNavigate(m.stageKey)}
            style={{
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "8px",
              padding: "8px 10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(245, 158, 11, 0.15)";
              e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.35)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
            }}
          >
            <div style={{ minWidth: 0, flex: 1, paddingRight: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                <strong style={{ fontSize: "11.5px", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.title}
                </strong>
                <span style={{ fontSize: "9px", background: "rgba(255, 255, 255, 0.08)", color: m.color, padding: "1px 5px", borderRadius: "3px", fontWeight: 700, flexShrink: 0 }}>
                  {m.badge}
                </span>
              </div>
              <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {m.desc}
              </span>
            </div>

            <ArrowRight size={12} color="#fbbf24" style={{ flexShrink: 0 }} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px", marginTop: "2px" }}>
        <button
          type="button"
          onClick={() => onNavigate("analysis")}
          style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "11px", fontWeight: 700, cursor: "pointer", padding: 0 }}
        >
          Khởi động quy trình sản xuất ↗
        </button>
        <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
          Tối ưu cho Shorts / Reels / TikTok
        </span>
      </div>
    </div>
  );
}
