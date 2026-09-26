import { useState, useEffect, useMemo } from "react";
import { KeyFill, CheckCircleFill, ExclamationCircleFill } from "react-bootstrap-icons";
import { getRuntime } from "../../../core/runtime";
import type { Job, ProviderProfile } from "../../../core/types";

interface OverviewAITokenCardProps {
  jobs: Job[];
  onNavigate: (key: any) => void;
}

export function OverviewAITokenCard({ jobs, onNavigate }: OverviewAITokenCardProps) {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);

  useEffect(() => {
    getRuntime()
      .getProviderProfiles?.()
      .then((list) => {
        if (Array.isArray(list)) setProviders(list);
      })
      .catch(() => {});
  }, []);

  const totalTokens = useMemo(() => {
    return jobs.reduce((sum, j) => sum + (j.tokensUsed || 0), 0);
  }, [jobs]);

  const providerBreakdown = useMemo(() => {
    if (providers.length === 0 && totalTokens === 0) {
      return [];
    }

    const colors = ["#fbbf24", "#34d399", "#38bdf8", "#c084fc", "#f43f5e", "#a855f7"];

    // Compute tokens per provider from jobs
    const tokenByProvider: Record<string, number> = {};
    for (const j of jobs) {
      const t = j.tokensUsed || 0;
      if (t > 0) {
        const pId = j.providerId || j.ttsProviderId || "default";
        tokenByProvider[pId] = (tokenByProvider[pId] || 0) + t;
      }
    }

    if (providers.length > 0) {
      return providers.map((p, idx) => {
        const tokens = tokenByProvider[p.id] || 0;
        const percent = totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0;
        return {
          id: p.id,
          name: p.name || p.model || "AI Provider",
          model: p.model || p.providerType,
          hasApiKey: p.hasApiKey,
          tokens,
          percent,
          color: colors[idx % colors.length],
        };
      });
    }

    return Object.entries(tokenByProvider).map(([pId, tokens], idx) => {
      const percent = totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0;
      return {
        id: pId,
        name: pId === "default" ? "AI Tác vụ chung" : `Provider: ${pId}`,
        model: pId,
        hasApiKey: true,
        tokens,
        percent,
        color: colors[idx % colors.length],
      };
    });
  }, [jobs, providers, totalTokens]);

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
          {totalTokens === 0
            ? "Chưa phát sinh token. Token sẽ tự động cộng dồn khi bạn chạy bóc tách video & biên kịch."
            : "Dữ liệu đo lường thực tế từ các video đã phân tích trong dự án."}
        </span>
      </div>

      {/* Breakdown List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {providerBreakdown.length > 0 ? (
          providerBreakdown.map((item) => (
            <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                  <strong style={{ color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.name}
                  </strong>
                  {item.hasApiKey ? (
                    <span style={{ fontSize: "9px", color: "#34d399", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                      <CheckCircleFill size={8} /> Key sẵn sàng
                    </span>
                  ) : (
                    <span style={{ fontSize: "9px", color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                      <ExclamationCircleFill size={8} /> Chưa cấu hình key
                    </span>
                  )}
                </div>
                <span style={{ color: item.tokens > 0 ? "#fbbf24" : "#94a3b8", fontWeight: 700, flexShrink: 0, marginLeft: "6px" }}>
                  {item.tokens > 0 ? `${item.tokens.toLocaleString()} (${item.percent}%)` : "0 tokens"}
                </span>
              </div>
              <div style={{ width: "100%", height: "4px", background: "rgba(0,0,0,0.4)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(item.percent, item.tokens > 0 ? 3 : 0)}%`, height: "100%", background: item.color, borderRadius: "99px" }} />
              </div>
            </div>
          ))
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
              Chưa có AI Provider nào được cấu hình trong máy.
            </span>
            <button
              type="button"
              onClick={() => onNavigate("settings")}
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
              + Cấu Hình API Key (BYOK)
            </button>
          </div>
        )}
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
