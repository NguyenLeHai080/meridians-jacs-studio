import { HouseDoor, Film, Cpu, Stars, FileEarmarkText } from "react-bootstrap-icons";

export type OverviewTabKey = "home" | "jobs" | "ai" | "hardware" | "logs";

interface OverviewBottomDockProps {
  activeTab: OverviewTabKey;
  onTabChange: (tab: OverviewTabKey) => void;
  onNavigate: (key: any) => void;
}

export function OverviewBottomDock({ activeTab, onTabChange, onNavigate }: OverviewBottomDockProps) {
  const tabs = [
    { key: "home" as const, label: "Tổng quan", icon: HouseDoor, targetNav: "overview" },
    { key: "jobs" as const, label: "Tiến trình Job", icon: Film, targetNav: "batch" },
    { key: "ai" as const, label: "AI & Token", icon: Stars, targetNav: "analysis" },
    { key: "hardware" as const, label: "Tài nguyên GPU", icon: Cpu, targetNav: "settings" },
    { key: "logs" as const, label: "Nhật ký Hệ thống", icon: FileEarmarkText, targetNav: "logs" },
  ];

  return (
    <div className="bottom-dock-container">
      <div className="bottom-dock-glass">
        {tabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={`dock-tab-btn ${isActive ? "dock-active" : ""}`}
              onClick={() => {
                onTabChange(tab.key);
                if (tab.key !== "home") {
                  // User can also choose to navigate directly or switch view
                }
              }}
            >
              <IconComp size={15} />
              <span>{tab.label}</span>
              {isActive && <div className="dock-active-pill" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
