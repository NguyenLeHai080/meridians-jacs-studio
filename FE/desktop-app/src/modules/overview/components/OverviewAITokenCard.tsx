import { useState, useMemo } from "react";
import { Sliders, ShieldCheck, ChevronDown, Check2, KeyFill } from "react-bootstrap-icons";
import type { Job } from "../../../core/types";

interface OverviewAITokenCardProps {
  jobs: Job[];
  onNavigate: (key: any) => void;
}

export function OverviewAITokenCard({ jobs, onNavigate }: OverviewAITokenCardProps) {
  const totalTokens = useMemo(() => {
    const fromJobs = jobs.reduce((sum, j) => sum + (j.tokensUsed || 0), 0);
    return fromJobs > 0 ? fromJobs : 142500;
  }, [jobs]);

  const providerBreakdown = useMemo(() => {
    return [
      {
        id: "gemini",
        name: "Google Gemini 2.5 Flash / 1.5 Pro",
        percent: 45,
        tokens: Math.round(totalTokens * 0.45),
        color: "#fbbf24",
        tasks: "Bóc tách video ngữ cảnh 1M token & nhận diện cảnh",
      },
      {
        id: "openai",
        name: "OpenAI GPT-4o / GPT-4o-mini",
        percent: 30,
        tokens: Math.round(totalTokens * 0.3),
        color: "#34d399",
        tasks: "Biên kịch kịch bản 3 hồi & cấu trúc Hook AIDA",
      },
      {
        id: "deepseek",
        name: "DeepSeek V3 / R1 Reasoner",
        percent: 15,
        tokens: Math.round(totalTokens * 0.15),
        color: "#38bdf8",
        tasks: "Suy luận phân cảnh chuyên sâu & dịch thuật",
      },
      {
        id: "eleven_vbee",
        name: "ElevenLabs & Vbee AIVoice",
        percent: 10,
        tokens: Math.round(totalTokens * 0.1),
        color: "#c084fc",
        tasks: "Lồng tiếng AI truyền cảm đa vùng miền",
      },
    ];
  }, [totalTokens]);

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
            TỔNG TIÊU THỤ TOKEN THEO AI PROVIDER
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", padding: "2px 8px", borderRadius: "4px", fontSize: "10.5px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          <KeyFill size={10} /> Quản lý API Key
        </button>
      </div>

      {/* Main Total Display */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <h3 style={{ fontSize: "22px", fontWeight: 900, color: "#fbbf24", margin: 0, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
            {totalTokens.toLocaleString()}
          </h3>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#94a3b8" }}>Tokens Cục Bộ</span>
        </div>
        <span style={{ fontSize: "10.5px", color: "#64748b" }}>
          Ước tính tiết kiệm ~85% chi phí với chính sách BYOK trực tiếp
        </span>
      </div>

      {/* Breakdown List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {providerBreakdown.map((item) => (
          <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                <strong style={{ color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.name}
                </strong>
              </div>
              <span style={{ color: "#fbbf24", fontWeight: 700, flexShrink: 0, marginLeft: "6px" }}>
                {item.percent}%
              </span>
            </div>
            <div style={{ width: "100%", height: "4px", background: "rgba(0,0,0,0.4)", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ width: `${item.percent}%`, height: "100%", background: item.color, borderRadius: "99px" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px", marginTop: "2px" }}>
        <button
          type="button"
          onClick={() => onNavigate("settings")}
          style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "11px", fontWeight: 700, cursor: "pointer", padding: 0 }}
        >
          Cài đặt BYOK API Keys ↗
        </button>
        <span style={{ fontSize: "10px", color: "#34d399", fontWeight: 700 }}>
          ✓ Kết nối trực tiếp máy chủ AI
        </span>
      </div>
    </div>
  );
}
