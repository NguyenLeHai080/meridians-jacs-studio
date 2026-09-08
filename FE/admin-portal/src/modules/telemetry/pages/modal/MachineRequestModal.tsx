import React from "react";
import { Zap, X, Clock, Layers, Sparkles } from "lucide-react";

export interface MachineRequestRecord {
  request_id: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  status: string;
  timestamp: string;
  credit_used?: number;
}

interface MachineRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  apiKeyMasked: string;
  requests: MachineRequestRecord[];
}

export const MachineRequestModal: React.FC<MachineRequestModalProps> = ({
  isOpen,
  onClose,
  accountName,
  apiKeyMasked,
  requests = [],
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "800px", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Nhật Ký Lượt Gọi API Request - {accountName}
              </h3>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                Key Máy Client: <code style={{ color: "#0284c7", fontWeight: 700 }}>{apiKeyMasked}</code>
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Content Table */}
        <div style={{ padding: "0", flex: 1, overflowY: "auto" }}>
          {requests.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              <Layers size={40} style={{ margin: "0 auto 10px", color: "#94a3b8", opacity: 0.4 }} />
              <div>Chưa có dữ liệu request nào được ghi nhận gần đây.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "11.5px", fontWeight: 700 }}>
                  <th style={{ padding: "12px 18px" }}>REQ ID & MODEL</th>
                  <th style={{ padding: "12px 14px" }}>TOKENS (IN / OUT)</th>
                  <th style={{ padding: "12px 14px", color: "#d97706" }}>CREDIT TIÊU THỤ</th>
                  <th style={{ padding: "12px 14px" }}>ĐỘ TRỄ (LATENCY)</th>
                  <th style={{ padding: "12px 14px" }}>TRẠNG THÁI</th>
                  <th style={{ padding: "12px 18px", textAlign: "right" }}>THỜI GIAN</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r, idx) => {
                  const isError = r.status.includes("4") || r.status.includes("5");
                  const credAmount = r.credit_used !== undefined ? Number(r.credit_used) : Number((r.tokens_in * 0.0005 + r.tokens_out * 0.0009).toFixed(2));
                  return (
                    <tr
                      key={r.request_id || idx}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 18px" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                          <code>{r.request_id}</code>
                        </div>
                        <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600, marginTop: "2px" }}>
                          {r.model}
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: "12.5px", color: "#0f172a", fontWeight: 700 }}>
                          {(r.tokens_in + r.tokens_out).toLocaleString()} tokens
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          In: {r.tokens_in.toLocaleString()} • Out: {r.tokens_out.toLocaleString()}
                        </div>
                      </td>

                      {/* Credit Column */}
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            background: "rgba(245, 158, 11, 0.12)",
                            color: "#d97706",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            padding: "3px 8px",
                            borderRadius: "5px",
                            fontSize: "12px",
                            fontWeight: 800,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ⚡ {credAmount > 0 ? credAmount.toFixed(2) : "0.00"} Cr
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px", color: "#475569", fontWeight: 650 }}>
                          <Clock size={13} color="#94a3b8" />
                          <span>{r.latency_ms} ms</span>
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            background: isError ? "#fee2e2" : "#ecfdf5",
                            color: isError ? "#dc2626" : "#059669",
                            border: isError ? "1px solid #fecaca" : "1px solid #a7f3d0",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "11px",
                            fontWeight: 750,
                          }}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td style={{ padding: "12px 18px", textAlign: "right", fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" }}>
                        {r.timestamp}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 22px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Tổng cộng: <strong>{requests.length}</strong> requests hiển thị
          </span>
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

export default MachineRequestModal;
