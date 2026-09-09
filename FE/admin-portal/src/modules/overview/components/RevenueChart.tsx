import React, { useState, useMemo } from "react";
import type { BillingTransaction, ClientSession } from "../../../core/types";
import { useI18n } from "../../../core/i18n";
import { formatCurrencyVND } from "../utils/overviewHelper";

interface RevenueChartProps {
  transactions?: BillingTransaction[];
  sessions?: ClientSession[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  transactions = [],
  sessions = [],
}) => {
  const { t } = useI18n();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute 7-day real metrics
  const { dailyData, maxRevenue, maxReqCount, yTicks } = useMemo(() => {
    const days = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const dayOfWeek = d.getDay(); // 0 = Sun, 1 = Mon ...
      
      const dayNamesVN = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];
      const dayLabel = i === 0 ? "Hôm nay" : dayNamesVN[dayOfWeek];
      const shortDate = `${d.getDate()}/${d.getMonth() + 1}`;

      // Sum transactions for this date
      const dayTxs = transactions.filter((tx) => {
        if (!tx.created_at) return false;
        try {
          return new Date(tx.created_at).toISOString().split("T")[0] === dateStr;
        } catch {
          return false;
        }
      });

      const dayRevenue = dayTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
      const dayTxCount = dayTxs.length;

      // Estimate activity / sessions
      const daySessionsCount = sessions.filter((s) => {
        if (!s.last_seen_at) return false;
        try {
          return new Date(s.last_seen_at).toISOString().split("T")[0] === dateStr;
        } catch {
          return false;
        }
      }).length;

      days.push({
        dateStr,
        dayLabel,
        shortDate,
        revenue: dayRevenue,
        txCount: dayTxCount,
        reqCount: daySessionsCount > 0 ? daySessionsCount : dayTxCount,
      });
    }

    const highestRev = Math.max(...days.map((d) => d.revenue), 0);
    // Determine dynamic max scale (minimum 500,000 VND for clean look)
    let dynamicMax = 500000;
    if (highestRev > 10000000) dynamicMax = Math.ceil(highestRev / 5000000) * 5000000;
    else if (highestRev > 2000000) dynamicMax = Math.ceil(highestRev / 1000000) * 1000000;
    else if (highestRev > 500000) dynamicMax = Math.ceil(highestRev / 500000) * 500000;
    else if (highestRev > 0) dynamicMax = Math.max(500000, Math.ceil(highestRev / 100000) * 100000);

    const highestReq = Math.max(...days.map((d) => d.reqCount), 10);
    const dynamicMaxReq = Math.ceil(highestReq / 5) * 5;

    // Y ticks (4 levels)
    const ticks = [
      { val: dynamicMax, label: dynamicMax >= 1000000 ? `${(dynamicMax / 1000000).toFixed(1)}M` : `${Math.round(dynamicMax / 1000)}k` },
      { val: (dynamicMax * 2) / 3, label: ((dynamicMax * 2) / 3000000) >= 1 ? `${((dynamicMax * 2) / 3000000).toFixed(1)}M` : `${Math.round((dynamicMax * 2) / 3000)}k` },
      { val: dynamicMax / 3, label: (dynamicMax / 3000000) >= 1 ? `${(dynamicMax / 3000000).toFixed(1)}M` : `${Math.round(dynamicMax / 3000)}k` },
      { val: 0, label: "0" },
    ];

    return { dailyData: days, maxRevenue: dynamicMax, maxReqCount: dynamicMaxReq, yTicks: ticks };
  }, [transactions, sessions]);

  // Compute SVG Points
  const chartPoints = useMemo(() => {
    const startX = 55;
    const chartWidth = 515;
    const stepX = chartWidth / 6;
    const bottomY = 165;
    const topY = 30;
    const height = bottomY - topY;

    return dailyData.map((d, i) => {
      const x = startX + i * stepX;
      const revRatio = maxRevenue > 0 ? Math.min(1, Math.max(0, d.revenue / maxRevenue)) : 0;
      const yRev = bottomY - revRatio * height;

      const reqRatio = maxReqCount > 0 ? Math.min(1, Math.max(0, d.reqCount / maxReqCount)) : 0;
      const yReq = bottomY - reqRatio * height * 0.7; // scaled slightly lower

      return {
        ...d,
        x,
        yRev,
        yReq,
      };
    });
  }, [dailyData, maxRevenue, maxReqCount]);

  // Create smooth Bézier curves
  const generateSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const revenueLinePath = useMemo(() => {
    return generateSmoothPath(chartPoints.map((p) => ({ x: p.x, y: p.yRev })));
  }, [chartPoints]);

  const revenueAreaPath = useMemo(() => {
    if (chartPoints.length === 0) return "";
    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    return `${revenueLinePath} L ${lastX} 165 L ${firstX} 165 Z`;
  }, [revenueLinePath, chartPoints]);

  const requestLinePath = useMemo(() => {
    return generateSmoothPath(chartPoints.map((p) => ({ x: p.x, y: p.yReq })));
  }, [chartPoints]);

  const total7DayRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="mf-card-panel bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="mf-card-header flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="mf-card-title-group">
          <h3 className="text-base font-bold text-slate-800 m-0">{t("chartApiUsageTitle")}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("chartApiUsageSubtitle")} · Tổng 7 ngày: <span className="font-semibold text-emerald-600">{formatCurrencyVND(total7DayRevenue)}</span>
          </p>
        </div>

        <div className="mf-chart-legend flex items-center gap-4 text-xs font-medium text-slate-600">
          <div className="legend-item flex items-center gap-1.5">
            <span className="legend-color-dot w-2.5 h-2.5 rounded-full" style={{ background: "#f95738" }} />
            <span>Doanh thu (VND)</span>
          </div>
          <div className="legend-item flex items-center gap-1.5">
            <span className="legend-color-dot w-2.5 h-2.5 rounded-full" style={{ background: "#3b82f6" }} />
            <span>Tần suất hoạt động</span>
          </div>
        </div>
      </div>

      <div className="mf-chart-container relative w-full overflow-hidden">
        <svg viewBox="0 0 600 205" className="mf-trend-svg w-full h-auto">
          {/* Background Grid Horizontal Lines */}
          <line x1="45" y1="30" x2="585" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="45" y1="75" x2="585" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="45" y1="120" x2="585" y2="120" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="45" y1="165" x2="585" y2="165" stroke="#e2e8f0" strokeWidth="1.2" />

          {/* Y Axis Labels */}
          {yTicks.map((tick, idx) => {
            const yPositions = [34, 79, 124, 169];
            return (
              <text key={idx} x="38" y={yPositions[idx]} fontSize="10" fill="#94a3b8" textAnchor="end" fontWeight="500">
                {tick.label}
              </text>
            );
          })}

          {/* Revenue Area (Gradient Fill) */}
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f95738" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#f95738" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={revenueAreaPath} fill="url(#revenueGradient)" />

          {/* Request Activity Line (Blue) */}
          <path
            d={requestLinePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />

          {/* Revenue Line (Orange Primary) */}
          <path
            d={revenueLinePath}
            fill="none"
            stroke="#f95738"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Data Points (Interactive Hover) */}
          {chartPoints.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Vertical guide line on hover */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={25}
                    x2={pt.x}
                    y2={165}
                    stroke="#f95738"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.6"
                  />
                )}

                {/* Outer halo on hover */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.yRev}
                    r="8"
                    fill="rgba(249, 87, 56, 0.2)"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={pt.x}
                  cy={pt.yRev}
                  r={isHovered ? "5.5" : "4"}
                  fill="#f95738"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Tooltip on hover */}
                {isHovered && (
                  <g transform={`translate(${Math.min(500, Math.max(70, pt.x))}, ${Math.max(20, pt.yRev - 25)})`}>
                    <rect
                      x="-55"
                      y="-22"
                      width="110"
                      height="24"
                      rx="6"
                      fill="#0f172a"
                      opacity="0.9"
                    />
                    <text
                      x="0"
                      y="-6"
                      fontSize="10"
                      fill="#ffffff"
                      textAnchor="middle"
                      fontWeight="600"
                    >
                      {formatCurrencyVND(pt.revenue)}
                    </text>
                  </g>
                )}

                {/* X Axis Day Label */}
                <text
                  x={pt.x}
                  y="185"
                  fontSize="10"
                  fill={isHovered ? "#f95738" : "#64748b"}
                  textAnchor="middle"
                  fontWeight={isHovered ? "700" : "600"}
                >
                  {pt.dayLabel}
                </text>
                <text
                  x={pt.x}
                  y="198"
                  fontSize="9"
                  fill="#94a3b8"
                  textAnchor="middle"
                >
                  {pt.shortDate}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
