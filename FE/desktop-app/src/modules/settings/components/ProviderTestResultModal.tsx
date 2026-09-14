import React from "react";
import { Modal } from "../../../shared/Modal";
import type { TestResultData } from "../hooks/useSettingsManagement";

export interface ProviderTestResultModalProps {
  testResult: TestResultData | null;
  onClose: () => void;
}

export function ProviderTestResultModal({
  testResult,
  onClose,
}: ProviderTestResultModalProps) {
  if (!testResult) return null;

  return (
    <Modal
      isOpen={Boolean(testResult)}
      onClose={onClose}
      title="Kết Quả Kiểm Tra AI Provider"
      eyebrow="LIVE DIAGNOSTIC REPORT"
      maxWidth="500px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Status Hero Card */}
        <div
          style={{
            background:
              testResult.status === "reachable"
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 78, 59, 0.3))"
                : testResult.status === "invalid_credentials"
                ? "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(127, 29, 29, 0.3))"
                : "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(120, 53, 15, 0.3))",
            border:
              testResult.status === "reachable"
                ? "1px solid rgba(16, 185, 129, 0.4)"
                : testResult.status === "invalid_credentials"
                ? "1px solid rgba(239, 68, 68, 0.4)"
                : "1px solid rgba(245, 158, 11, 0.4)",
            borderRadius: "14px",
            padding: "16px",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "32px", display: "block", marginBottom: "6px" }}>
            {testResult.status === "reachable"
              ? "🟢"
              : testResult.status === "invalid_credentials"
              ? "🔴"
              : "⚠️"}
          </span>
          <strong style={{ fontSize: "16px", color: "#ffffff", display: "block" }}>
            {testResult.status === "reachable"
              ? "HOẠT ĐỘNG HOÀN HẢO · SẴN SÀNG SỬ DỤNG"
              : testResult.status === "invalid_credentials"
              ? "LỖI XÁC THỰC API KEY / TÀI KHOẢN"
              : "KHÔNG THỂ KẾT NỐI MÁY CHỦ AI"}
          </strong>
          <p style={{ margin: "6px 0 0 0", color: "#cbd5e1", fontSize: "12.5px" }}>
            {testResult.detail}
          </p>
        </div>

        {/* Diagnostic Details Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          <div>
            <small
              style={{
                color: "#64748b",
                fontSize: "10.5px",
                textTransform: "uppercase",
              }}
            >
              Provider & Model
            </small>
            <div style={{ color: "#f8fafc", fontSize: "12.5px", fontWeight: 600 }}>
              {testResult.providerName}
            </div>
            <small style={{ color: "#f95738", fontSize: "11px" }}>{testResult.model}</small>
          </div>

          <div>
            <small
              style={{
                color: "#64748b",
                fontSize: "10.5px",
                textTransform: "uppercase",
              }}
            >
              Tốc Độ Phản Hồi
            </small>
            <div style={{ color: "#10b981", fontSize: "14px", fontWeight: 700 }}>
              ⚡ {testResult.latencyMs} ms
            </div>
            <small style={{ color: "#94a3b8", fontSize: "10.5px" }}>
              {testResult.latencyMs < 300
                ? "Tốc độ phản xạ cực nhanh"
                : "Đạt chuẩn xử lý video"}
            </small>
          </div>
        </div>

        {/* Capabilities Summary */}
        <div>
          <strong
            style={{
              fontSize: "11.5px",
              color: "#94a3b8",
              display: "block",
              marginBottom: "6px",
              textTransform: "uppercase",
            }}
          >
            Chức Năng Sẵn Sàng Vận Hành
          </strong>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {testResult.capabilities.map((c) => (
              <span
                key={c}
                style={{
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#6ee7b7",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                ✓ {c.toUpperCase()}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ width: "100%" }}
          >
            Đã Hiểu & Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
}
