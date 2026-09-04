import React from "react";
import { Key, Laptop, DollarSign, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";

export interface DashboardMetricsProps {
  totalLicenses: number;
  activeLicenses: number;
  expiringSoon: number;
  totalDevices: number;
  onlineDevices: number;
  totalRevenue: number;
  currency?: string;
  language?: string;
}

export const MetricCardsGrid: React.FC<DashboardMetricsProps> = ({
  totalLicenses,
  activeLicenses,
  expiringSoon,
  totalDevices,
  onlineDevices,
  totalRevenue,
  currency = "VNĐ",
  language = "vi",
}) => {
  const cards = [
    {
      title: language === "vi" ? "Tổng Bản Quyền" : "Total Licenses",
      value: totalLicenses,
      subtext: `${activeLicenses} ${language === "vi" ? "đang hoạt động" : "active"}`,
      icon: <Key size={22} color="#f97316" />,
      bg: "rgba(249, 115, 22, 0.08)",
      border: "#fed7aa",
    },
    {
      title: language === "vi" ? "Thiết Bị Kích Hoạt" : "Active Devices",
      value: totalDevices,
      subtext: `${onlineDevices} ${language === "vi" ? "trực tuyến 24h" : "online in 24h"}`,
      icon: <Laptop size={22} color="#0284c7" />,
      bg: "rgba(2, 132, 199, 0.08)",
      border: "#bae6fd",
    },
    {
      title: language === "vi" ? "Bản Quyền Sắp Hết Hạn" : "Expiring Soon (<= 7d)",
      value: expiringSoon,
      subtext: expiringSoon > 0 ? (language === "vi" ? "Cần liên hệ gia hạn" : "Needs renewal") : (language === "vi" ? "Tất cả ổn định" : "All healthy"),
      icon: expiringSoon > 0 ? <AlertTriangle size={22} color="#e11d48" /> : <ShieldCheck size={22} color="#10b981" />,
      bg: expiringSoon > 0 ? "rgba(225, 29, 72, 0.08)" : "rgba(16, 185, 129, 0.08)",
      border: expiringSoon > 0 ? "#fecdd3" : "#a7f3d0",
    },
    {
      title: language === "vi" ? "Doanh Thu Ước Tính" : "Estimated Revenue",
      value: `${totalRevenue.toLocaleString("vi-VN")} ${currency}`,
      subtext: language === "vi" ? "Tự động cộng dồn VietQR" : "Auto-aggregated VietQR",
      icon: <DollarSign size={22} color="#059669" />,
      bg: "rgba(5, 150, 105, 0.08)",
      border: "#a7f3d0",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
      {cards.map((c, idx) => (
        <div
          key={idx}
          className="mf-card-panel animate-fade-in"
          style={{
            background: "#ffffff",
            border: `1px solid ${c.border}`,
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "4px" }}>
              {c.title}
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
              {c.value}
            </div>
            <div style={{ fontSize: "0.775rem", color: "#475569", marginTop: "4px", fontWeight: 500 }}>
              {c.subtext}
            </div>
          </div>
          <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {c.icon}
          </div>
        </div>
      ))}
    </div>
  );
};
