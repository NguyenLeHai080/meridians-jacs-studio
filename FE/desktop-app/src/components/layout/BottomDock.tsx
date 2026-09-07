import React from "react";
import { Icon, type IconName } from "../../shared/Icon";
import { NAV_ITEMS, type NavKey, type Job } from "../../core/types";
import type { ToolConfig } from "./Sidebar";

export interface BottomDockProps {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  jobs?: Job[];
  toolConfig?: ToolConfig;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  active,
  onNavigate,
  jobs = [],
  toolConfig,
}) => {
  const runningCount = jobs.filter((j) => j.status === "running").length;
  const queuedCount = jobs.filter((j) => j.status === "queued").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;

  // Selected primary dock items: 9 items covering all core workflow & system pages
  const dockKeys: Array<{ key: NavKey; shortLabel: string; fullLabel: string; icon: IconName; isWorkflow?: boolean }> = [
    { key: "overview", shortLabel: "Tổng quan", fullLabel: "Bảng điều khiển trung tâm", icon: "grid" },
    { key: "analysis", shortLabel: "1. Phân tích", fullLabel: "1. Phân tích ngữ cảnh & bóc cảnh AI", icon: "scan", isWorkflow: true },
    { key: "story", shortLabel: "2. Kịch bản", fullLabel: "2. Kịch bản Storyboard & Voice", icon: "mic", isWorkflow: true },
    { key: "timeline", shortLabel: "3. Timeline", fullLabel: "3. Dựng & Timeline đa track", icon: "timeline", isWorkflow: true },
    { key: "brand", shortLabel: "4. Phụ đề", fullLabel: "4. Phụ đề tự động & Brand", icon: "captions", isWorkflow: true },
    { key: "render", shortLabel: "5. Render", fullLabel: "5. Render xuất bản video", icon: "play", isWorkflow: true },
    { key: "batch", shortLabel: "6. Hàng loạt", fullLabel: "6. Xử lý hàng loạt Shorts/Reels", icon: "layers", isWorkflow: true },
    { key: "usage", shortLabel: "Credits", fullLabel: "Mức dùng & Credits AI", icon: "coins" },
    { key: "settings", shortLabel: "Cài đặt", fullLabel: "Cài đặt Model AI & Engine", icon: "sliders" },
    { key: "logs", shortLabel: "Nhật ký", fullLabel: "Nhật ký hệ thống & AI Logs", icon: "file-text" },
  ];

  return (
    <div className="global-bottom-dock-container">
      <nav className="global-bottom-dock-glass" aria-label="Điều hướng chính">
        {dockKeys.map((item) => {
          const isActive = active === item.key;
          const isLocked = Boolean(toolConfig?.menu_locks?.[item.key]?.locked);

          let badgeContent: React.ReactNode = null;
          if (isLocked) {
            badgeContent = <span className="dock-badge-lock">🔒</span>;
          } else if (item.key === "render" && (runningCount > 0 || queuedCount > 0)) {
            badgeContent = (
              <span className="dock-badge-count badge-pulse-green">
                {runningCount > 0 ? `⚡${runningCount}` : queuedCount}
              </span>
            );
          } else if (item.key === "logs" && failedCount > 0) {
            badgeContent = <span className="dock-badge-count badge-error">{failedCount}</span>;
          }

          return (
            <button
              key={item.key}
              type="button"
              className={`global-dock-btn ${isActive ? "active" : ""} ${isLocked ? "locked" : ""}`}
              onClick={() => onNavigate(item.key)}
              title={item.fullLabel}
            >
              <span className="dock-icon-box">
                <Icon name={item.icon} size={15} />
                {badgeContent}
              </span>
              <span className="dock-label-text">{item.shortLabel}</span>
              {isActive && <div className="dock-active-indicator" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
