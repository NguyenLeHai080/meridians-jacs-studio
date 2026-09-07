import React from "react";
import { Coins, X, TrendingUp, Wallet, ArrowDownLeft, Building2, CheckCircle2 } from "lucide-react";

export interface MachineFinanceData {
  deposited_amount: number;
  api_cost: number;
  credit_granted: number;
  credit_used: number;
  remaining_credit: number;
  profit_amount: number;
  profit_margin_pct: number;
  is_profitable: boolean;
}

interface MachineFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  apiKeyMasked: string;
  finance?: MachineFinanceData;
}

export const MachineFinanceModal: React.FC<MachineFinanceModalProps> = ({
  isOpen,
  onClose,
  accountName,
  apiKeyMasked,
  finance,
}) => {
  if (!isOpen) return null;

  const data: MachineFinanceData = finance || {
    deposited_amount: 2500000,
    api_cost: 965000,
    credit_granted: 2500000,
    credit_used: 1150000,
    remaining_credit: 1350000,
    profit_amount: 1535000,
    profit_margin_pct: 61.4,
    is_profitable: true,
  };

  const isPositive = data.profit_amount >= 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: "20px" }}>
      <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "680px", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "#fff7ed", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Coins size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Báo Cáo Tài Chính & Lời Lãi API - {accountName}
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

        {/* Content Body */}
        <div style={{ padding: "22px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* Main Profit / Loss Banner Card */}
          <div
            style={{
              background: isPositive ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)" : "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)",
              border: isPositive ? "1.5px solid #86efac" : "1.5px solid #fecdd3",
              borderRadius: "12px",
              padding: "18px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", fontWeight: 800, color: isPositive ? "#065f46" : "#9f1239", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {isPositive ? "📈 LỢI NHUẬN RÒNG (LỜI)" : "📉 THÂM HỤT (LỖ)"}
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: isPositive ? "#047857" : "#be123c", lineHeight: 1.2, margin: "4px 0" }}>
                {isPositive ? "+" : ""}{data.profit_amount.toLocaleString("vi-VN")} ₫
              </div>
              <div style={{ fontSize: "12.5px", color: isPositive ? "#047857" : "#9f1239", fontWeight: 650 }}>
                Tỷ suất lợi nhuận biên: <strong>{data.profit_margin_pct}%</strong>
              </div>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "10px",
                padding: "8px 16px",
                border: isPositive ? "1px solid #bbf7d0" : "1px solid #fecaca",
                textAlign: "right",
              }}
            >
              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Trạng thái tài chính</span>
              <span style={{ fontSize: "13px", fontWeight: 800, color: isPositive ? "#059669" : "#e11d48", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <CheckCircle2 size={14} /> {isPositive ? "Siêu lợi nhuận" : "Cần điều chỉnh giá"}
              </span>
            </div>
          </div>

          {/* 4 Financial Grid Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            
            {/* Card 1: Khách Nạp */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0284c7", fontSize: "12px", fontWeight: 700 }}>
                <ArrowDownLeft size={16} />
                <span>Tiền khách đã nạp (SePay / CK)</span>
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: "6px 0 2px" }}>
                {data.deposited_amount.toLocaleString("vi-VN")} ₫
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Quy đổi cấp: {data.credit_granted.toLocaleString()} Credit
              </div>
            </div>

            {/* Card 2: Vốn API */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e11d48", fontSize: "12px", fontWeight: 700 }}>
                <Building2 size={16} />
                <span>Chi phí vốn API (Nhà cung cấp)</span>
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#e11d48", margin: "6px 0 2px" }}>
                {data.api_cost.toLocaleString("vi-VN")} ₫
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Chi trả Anthropic, OpenAI theo token
              </div>
            </div>

            {/* Card 3: Credit Đã Dùng */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#d97706", fontSize: "12px", fontWeight: 700 }}>
                <TrendingUp size={16} />
                <span>Số Credit khách đã tiêu thụ</span>
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", margin: "6px 0 2px" }}>
                {data.credit_used.toLocaleString()} Credit
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Khấu trừ theo token vào/ra thực tế
              </div>
            </div>

            {/* Card 4: Credit Còn Lại */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#059669", fontSize: "12px", fontWeight: 700 }}>
                <Wallet size={16} />
                <span>Số dư Credit còn lại trong ví</span>
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#059669", margin: "6px 0 2px" }}>
                {data.remaining_credit.toLocaleString()} Credit
              </div>
              <div style={{ fontSize: "11px", color: "#64748b" }}>
                Khách tiếp tục sử dụng bình thường
              </div>
            </div>

          </div>

          {/* Formula explanation note */}
          <div style={{ background: "#f1f5f9", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
            💡 <strong>Công thức tính lời lãi:</strong> <code>Lợi nhuận ròng = Tiền nạp thực tế (₫) - Chi phí vốn API thực tế (₫)</code>.
            Tỷ suất lợi nhuận đạt <strong>{data.profit_margin_pct}%</strong> đảm bảo doanh thu bền vững cho hệ thống quản trị.
          </div>

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

export default MachineFinanceModal;
