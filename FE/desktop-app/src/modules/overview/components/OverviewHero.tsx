import { useState } from "react";
import { useWeatherAndTime, CITIES } from "../hooks/useWeatherAndTime";
import {
  BrightnessHigh,
  CloudMoon,
  CloudRain,
  CloudSun,
  CloudLightningRain,
  LightningChargeFill,
  CollectionPlayFill,
  MicFill,
  Film,
  ChevronDown,
  ShieldCheck,
  DropletFill,
  Wind,
  ClockFill,
  ArrowRepeat,
  Check2,
  GeoAltFill,
} from "react-bootstrap-icons";

export type PresetMode = "auto" | "batch" | "night" | "script";

interface OverviewHeroProps {
  activeMode?: PresetMode;
  onModeChange?: (mode: PresetMode) => void;
  onNavigate: (key: any) => void;
}

export function OverviewHero({ onNavigate }: OverviewHeroProps) {
  const { timeStr, secondsStr, dateStr, weather, selectedCity, changeCity, refreshWeather, loadingWeather } = useWeatherAndTime();
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Dynamic atmospheric background styling based on time and weather
  const getAtmosphericStyle = () => {
    if (weather.iconType === "thunder") {
      return {
        background: "radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.25), transparent 50%), radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.18), transparent 60%), linear-gradient(135deg, #0c101d 0%, #16152b 50%, #0d111a 100%)",
        borderColor: "rgba(99, 102, 241, 0.4)",
        glowColor: "#818cf8",
      };
    }
    if (weather.iconType === "rain") {
      return {
        background: "radial-gradient(circle at 15% 25%, rgba(14, 165, 233, 0.22), transparent 50%), radial-gradient(circle at 85% 75%, rgba(245, 158, 11, 0.15), transparent 55%), linear-gradient(135deg, #0b1326 0%, #0f1c33 50%, #0a0e1a 100%)",
        borderColor: "rgba(56, 189, 248, 0.35)",
        glowColor: "#38bdf8",
      };
    }
    if (!weather.isDay) {
      return {
        background: "radial-gradient(circle at 12% 20%, rgba(245, 158, 11, 0.18), transparent 50%), radial-gradient(circle at 85% 85%, rgba(124, 58, 237, 0.2), transparent 60%), linear-gradient(135deg, #090c14 0%, #101426 50%, #0c0f1d 100%)",
        borderColor: "rgba(245, 158, 11, 0.35)",
        glowColor: "#fbbf24",
      };
    }
    // Daylight clear / sun / cloud
    return {
      background: "radial-gradient(circle at 10% 15%, rgba(245, 158, 11, 0.25), transparent 55%), radial-gradient(circle at 90% 85%, rgba(16, 185, 129, 0.15), transparent 50%), linear-gradient(135deg, #161927 0%, #1c2237 50%, #101422 100%)",
      borderColor: "rgba(245, 158, 11, 0.45)",
      glowColor: "#f59e0b",
    };
  };

  const currentAtmo = getAtmosphericStyle();

  const renderWeatherIcon = () => {
    switch (weather.iconType) {
      case "rain":
        return <CloudRain size={36} color="#38bdf8" style={{ filter: "drop-shadow(0 0 12px rgba(56, 189, 248, 0.6))" }} />;
      case "thunder":
        return <CloudLightningRain size={36} color="#fbbf24" style={{ filter: "drop-shadow(0 0 14px rgba(245, 158, 11, 0.7))" }} />;
      case "sun":
        return <BrightnessHigh size={36} color="#fbbf24" style={{ filter: "drop-shadow(0 0 16px rgba(245, 158, 11, 0.8))" }} />;
      case "night":
        return <CloudMoon size={36} color="#cbd5e1" style={{ filter: "drop-shadow(0 0 12px rgba(203, 213, 225, 0.5))" }} />;
      default:
        return weather.isDay ? (
          <CloudSun size={36} color="#fbbf24" style={{ filter: "drop-shadow(0 0 14px rgba(245, 158, 11, 0.7))" }} />
        ) : (
          <CloudMoon size={36} color="#94a3b8" style={{ filter: "drop-shadow(0 0 12px rgba(148, 163, 184, 0.5))" }} />
        );
    }
  };

  return (
    <div
      style={{
        width: "100%",
        borderRadius: "16px",
        padding: "16px 22px",
        border: `1.5px solid ${currentAtmo.borderColor}`,
        background: currentAtmo.background,
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.12)",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      {/* Ambient Top Row: Clock & Weather + Studio Identity Badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", minWidth: 0 }}>
        
        {/* Left: Weather Console & Digital Clock Combo */}
        <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap", minWidth: 0 }}>
          
          {/* Master Clock */}
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "32px", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.03em", lineHeight: 1, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
                {timeStr || "10:31"}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#fbbf24", opacity: 0.9, fontFamily: "monospace" }}>
                :{secondsStr || "00"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
              <ClockFill size={10} color="#fbbf24" />
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#cbd5e1" }}>
                {dateStr || "Hôm nay"}
              </span>
            </div>
          </div>

          <div style={{ width: "1px", height: "46px", background: "rgba(255, 255, 255, 0.12)", flexShrink: 0 }} />

          {/* Weather Console */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "12px", background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.1)", flexShrink: 0 }}>
              {renderWeatherIcon()}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>
                  {weather.temp}°C
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#fbbf24", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {weather.condition}
                </span>
              </div>

              {/* Weather Sub-metrics & City Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "10.5px", color: "#94a3b8", flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                  <DropletFill size={9} color="#38bdf8" /> {weather.humidity}%
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                  <Wind size={9} color="#cbd5e1" /> {weather.windSpeed} km/h
                </span>

                {/* City Picker Dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setShowCityDropdown(!showCityDropdown)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "99px",
                      padding: "2px 8px",
                      color: "#fbbf24",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <GeoAltFill size={9} />
                    <span>{selectedCity.name}</span>
                    <ChevronDown size={8} />
                  </button>

                  {showCityDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: "4px",
                        background: "#101422",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        borderRadius: "8px",
                        padding: "4px",
                        boxShadow: "0 15px 35px rgba(0,0,0,0.8)",
                        zIndex: 99999,
                        minWidth: "150px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      {CITIES.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            changeCity(c.name);
                            setShowCityDropdown(false);
                          }}
                          style={{
                            background: c.name === selectedCity.name ? "rgba(245, 158, 11, 0.2)" : "transparent",
                            color: c.name === selectedCity.name ? "#fbbf24" : "#e2e8f0",
                            border: "none",
                            padding: "5px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: c.name === selectedCity.name ? 800 : 500,
                            textAlign: "left",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>{c.name}</span>
                          {c.name === selectedCity.name && <Check2 size={11} color="#fbbf24" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={refreshWeather}
                  title="Cập nhật thời tiết"
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "0 2px" }}
                >
                  <ArrowRepeat size={11} className={loadingWeather ? "spin-slow" : ""} />
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* Right: Studio Privacy & System Health Badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.35)", padding: "4px 10px", borderRadius: "99px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", display: "inline-block" }} />
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#34d399", letterSpacing: "0.2px" }}>
              JACS Studio V0.8.18 · Cục Bộ Sẵn Sàng
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10.5px", color: "#94a3b8" }}>
            <ShieldCheck size={12} color="#fbbf24" />
            <span>BYOK Bảo Mật · Video & API Key Lưu Trực Tiếp Trên Máy</span>
          </div>
        </div>

      </div>

      {/* Bottom Row: 4 Primary Workflow Pipeline Launchers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", width: "100%", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px", boxSizing: "border-box" }}>
        
        {/* Step 1: Video Analysis */}
        <button
          type="button"
          onClick={() => onNavigate("analysis")}
          style={{
            background: "rgba(22, 27, 40, 0.7)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "10px",
            padding: "10px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            transition: "all 0.18s ease",
            textAlign: "left",
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(217, 119, 6, 0.22)";
            e.currentTarget.style.borderColor = "#f59e0b";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(22, 27, 40, 0.7)";
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.25)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#12151f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0, boxShadow: "0 0 10px rgba(245, 158, 11, 0.35)" }}>
            <LightningChargeFill />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: "12px", color: "#f8fafc", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              1. Phân Tích AI
            </strong>
            <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Bóc tách cảnh, phụ đề & kịch bản
            </span>
          </div>
        </button>

        {/* Step 2: Story & Voice Studio */}
        <button
          type="button"
          onClick={() => onNavigate("story")}
          style={{
            background: "rgba(22, 27, 40, 0.7)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "10px",
            padding: "10px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            transition: "all 0.18s ease",
            textAlign: "left",
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(217, 119, 6, 0.22)";
            e.currentTarget.style.borderColor = "#f59e0b";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(22, 27, 40, 0.7)";
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.25)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <MicFill />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: "12px", color: "#f8fafc", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              2. Kịch Bản & Voice AI
            </strong>
            <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Phòng thu giọng đọc đa vùng miền
            </span>
          </div>
        </button>

        {/* Step 3: Timeline Studio */}
        <button
          type="button"
          onClick={() => onNavigate("timeline")}
          style={{
            background: "rgba(22, 27, 40, 0.7)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "10px",
            padding: "10px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            transition: "all 0.18s ease",
            textAlign: "left",
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(217, 119, 6, 0.22)";
            e.currentTarget.style.borderColor = "#f59e0b";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(22, 27, 40, 0.7)";
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.25)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <CollectionPlayFill />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: "12px", color: "#f8fafc", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              3. Bàn Dựng Timeline
            </strong>
            <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Ghép clip, âm nhạc & hiệu ứng
            </span>
          </div>
        </button>

        {/* Step 4: Batch & Render */}
        <button
          type="button"
          onClick={() => onNavigate("render")}
          style={{
            background: "rgba(22, 27, 40, 0.7)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "10px",
            padding: "10px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            transition: "all 0.18s ease",
            textAlign: "left",
            boxSizing: "border-box",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(217, 119, 6, 0.22)";
            e.currentTarget.style.borderColor = "#f59e0b";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(22, 27, 40, 0.7)";
            e.currentTarget.style.borderColor = "rgba(245, 158, 11, 0.25)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0 }}>
            <Film />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: "12px", color: "#f8fafc", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              4. Xuất Bản & Render
            </strong>
            <span style={{ fontSize: "10.5px", color: "#94a3b8", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Export video 1080p/4K 60fps
            </span>
          </div>
        </button>

      </div>

    </div>
  );
}
