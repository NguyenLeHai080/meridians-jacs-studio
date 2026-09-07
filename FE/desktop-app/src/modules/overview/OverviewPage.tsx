import type { Job, ToolPreferences, NavKey } from "../../core/types";
import { OverviewHero } from "./components/OverviewHero";
import { OverviewEngineCard } from "./components/OverviewEngineCard";
import { OverviewJobAnalyticsCard } from "./components/OverviewJobAnalyticsCard";
import { OverviewAITokenCard } from "./components/OverviewAITokenCard";
import { OverviewModuleCard } from "./components/OverviewModuleCard";

export interface OverviewPageProps {
  jobs: Job[];
  metrics?: any;
  onNavigate?: (key: NavKey) => void;
  navigate?: (key: NavKey) => void;
  preferences?: ToolPreferences;
  [key: string]: any;
}

export function OverviewPage({ jobs, onNavigate, navigate, preferences }: OverviewPageProps) {
  const handleNav = (key: any) => {
    if (onNavigate) {
      onNavigate(key);
    } else if (navigate) {
      navigate(key);
    }
  };

  return (
    <div
      className="overview-dashboard-root animate-fade-in"
      style={{
        padding: "10px 16px 80px 16px",
        width: "100%",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxSizing: "border-box",
        height: "100%",
        flex: "1 1 0%",
        overflowY: "auto",
        position: "relative",
      }}
    >
      {/* 1. FLAGSHIP TOP HERO: LIVE ATMOSPHERIC WEATHER & STUDIO DIGITAL AMBIENT CARD */}
      <OverviewHero onNavigate={handleNav} />

      {/* 2. MAIN 4-CARD LOCAL STUDIO DASHBOARD GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
          gap: "12px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* Card 1: AI Render Engine & Local Hardware Status */}
        <OverviewEngineCard jobs={jobs} preferences={preferences} onNavigate={handleNav} />

        {/* Card 2: Workspace Jobs & Pipeline Video Analytics */}
        <OverviewJobAnalyticsCard jobs={jobs} onNavigate={handleNav} />

        {/* Card 3: BYOK AI Models & Local Token Usage */}
        <OverviewAITokenCard jobs={jobs} onNavigate={handleNav} />

        {/* Card 4: 4-Step Production Pipeline Suite */}
        <OverviewModuleCard jobs={jobs} onNavigate={handleNav} />
      </div>
    </div>
  );
}
