import React from "react";
import { Activity, Server, Database, CheckCircle2, AlertCircle } from "lucide-react";

export interface ServerMonitorProps {
  serverStatus: "healthy" | "degraded" | "down";
  dbStatus: "connected" | "disconnected";
  uptimeSeconds?: number;
  environment?: string;
  language?: string;
}

export const ServerMonitor: React.FC<ServerMonitorProps> = ({
  serverStatus = "healthy",
  dbStatus = "connected",
  environment = "Production",
  language = "vi",
}) => {
  const isHealthy = serverStatus === "healthy" && dbStatus === "connected";

  return (
    <div
      className="mf-card-panel animate-fade-in"
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "0.85rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.25rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: isHealthy ? "#10b981" : "#ef4444", boxShadow: isHealthy ? "0 0 8px #10b981" : "0 0 8px #ef4444" }} />
        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
          {language === "vi" ? "Máy Chủ JACS Cloud:" : "JACS Cloud Server:"}
        </span>
        <span style={{ fontSize: "0.8rem", padding: "2px 8px", borderRadius: "4px", background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>
          {environment}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#475569" }}>
          <Server size={14} color="#0284c7" />
          <span>API Gateway: <strong style={{ color: serverStatus === "healthy" ? "#059669" : "#e11d48" }}>{serverStatus.toUpperCase()}</strong></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#475569" }}>
          <Database size={14} color="#7c3aed" />
          <span>PostgreSQL Store: <strong style={{ color: dbStatus === "connected" ? "#059669" : "#e11d48" }}>{dbStatus.toUpperCase()}</strong></span>
        </div>
      </div>
    </div>
  );
};
