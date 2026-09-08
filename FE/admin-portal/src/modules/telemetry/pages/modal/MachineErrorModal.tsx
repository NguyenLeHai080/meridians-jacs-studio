import React from "react";
import { AlertTriangle, X, CheckCircle2, ShieldAlert, Cpu } from "lucide-react";

export interface MachineErrorRecord {
  id: string;
  status_code: number;
  error_code: string;
  model: string;
  timestamp: string;
  reason: string;
  endpoint: string;
  payload_hint?: string;
}

interface MachineErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  apiKeyMasked: string;
  hwid?: string;
  errors: MachineErrorRecord[];
}

export const MachineErrorModal: React.FC<MachineErrorModalProps> = ({
  isOpen,
  onClose,
  accountName,
  apiKeyMasked,
  hwid,
  errors = [],
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "750px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fee2e2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Chi Tiết Lỗi Xử Lý API - {accountName}
              </h3>
              <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                <span>Key Máy: <code style={{ color: "#0284c7", fontWeight: 700 }}>{apiKeyMasked}</code></span>
                {hwid && <span>• HWID Thiết Bị: <code>{hwid.slice(0, 18)}...</code></span>}
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 22px", flex: 1, overflowY: "auto" }}>
          {errors.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              <CheckCircle2 size={44} style={{ margin: "0 auto 12px", color: "#10b981" }} />
              <h4 style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
                Không có lỗi nào phát sinh
              </h4>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0, maxWidth: "420px", marginInline: "auto" }}>
                Tất cả các lượt gọi API từ tài khoản này trong 7 ngày gần nhất đều được xử lý thành công 100%.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#e11d48", display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldAlert size={16} />
                Phát hiện {errors.length} sự cố lỗi trong 7 ngày gần nhất:
              </div>

              {errors.map((err, idx) => (
                <div
                  key={err.id || idx}
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ background: "#ef4444", color: "#ffffff", padding: "2px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 800 }}>
                        HTTP {err.status_code}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: "13px", color: "#991b1b" }}>
                        {err.error_code}
                      </span>
                    </div>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                      ⏰ {err.timestamp}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#334155" }}>
                    <Cpu size={14} color="#64748b" />
                    <span>Model: <strong>{err.model}</strong></span>
                    <span>•</span>
                    <span>Endpoint: <code>{err.endpoint}</code></span>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: "6px", padding: "8px 12px", fontSize: "12.5px", color: "#475569", lineHeight: 1.5 }}>
                    <strong>Nguyên nhân:</strong> {err.reason}
                  </div>

                  {err.payload_hint && (
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                      Payload: {err.payload_hint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", background: "#f8fafc" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "7px 18px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default MachineErrorModal;
