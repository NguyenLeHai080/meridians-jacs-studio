import React from "react";
import { Building2, Pencil, Trash2, QrCode, Star, Power, Copy, Check } from "lucide-react";
import type { BankAccount } from "../../../core/types";

interface BankCardGridProps {
  bankAccounts: BankAccount[];
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
  onSetDefault: (account: BankAccount) => void;
  onToggleStatus: (account: BankAccount) => void;
  onViewQr: (account: BankAccount) => void;
  onAddNew?: () => void;
  onNotify?: (msg: string) => void;
}

const getPurposeLabel = (purpose: string) => {
  switch (purpose) {
    case "customer_income":
      return { text: "Nhận tiền khách hàng (SePay)", class: "purpose-customer" };
    case "api_expense":
      return { text: "Thanh toán API & Hạ tầng", class: "purpose-supplier" };
    case "supplier":
      return { text: "Nạp vốn nhà cung cấp", class: "purpose-supplier" };
    case "backup":
      return { text: "Tài khoản dự phòng", class: "purpose-customer" };
    default:
      return { text: "Chuyển khoản & Nhận tiền", class: "purpose-customer" };
  }
};

export const BankCardGrid: React.FC<BankCardGridProps> = ({
  bankAccounts,
  onEdit,
  onDelete,
  onSetDefault: _onSetDefault,
  onToggleStatus: _onToggleStatus,
  onViewQr,
  onAddNew,
  onNotify: _onNotify,
}) => {
  if (!bankAccounts || bankAccounts.length === 0) {
    return (
      <div
        className="mf-card-panel"
        style={{ textAlign: "center", padding: "3rem 1.5rem", background: "var(--bg-card)" }}
      >
        <Building2 size={40} style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }} />
        <h4 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Chưa có tài khoản ngân hàng nào
        </h4>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 1.25rem" }}>
          Hãy thêm tài khoản ngân hàng thụ hưởng đầu tiên để tạo mã VietQR và tích hợp cổng thanh toán SePay.
        </p>
        {onAddNew && (
          <button type="button" className="btn-primary-orange" onClick={onAddNew}>
            + Thêm Tài Khoản Mới
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {bankAccounts.map((account) => {
        const encodedContent = encodeURIComponent("JACS AUTO");
        const encodedName = encodeURIComponent(account.account_name);
        const qrImgSrc =
          account.custom_qr_url ||
          (account.bank_bin && account.account_number
            ? `https://img.vietqr.io/image/${account.bank_bin}-${account.account_number}-${account.qr_template || "compact2"}.png?amount=0&addInfo=${encodedContent}&accountName=${encodedName}`
            : "");

        const bankDisplayName = account.bank_name.split("(")[0]?.trim() || "VietinBank";
        const bankCode = account.bank_short || "ICB";

        return (
          <div
            key={account.id}
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "row",
              overflow: "hidden",
              flexWrap: "wrap",
            }}
          >
            {/* Left Column: VietQR Code Box */}
            <div
              style={{
                width: "280px",
                minWidth: "260px",
                background: "#f8fafc",
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRight: "1px solid #f1f5f9",
                cursor: "pointer",
              }}
              onClick={() => onViewQr(account)}
              title="Nhấn để phóng to mã QR"
            >
              <div
                style={{
                  background: "#ffffff",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                  maxWidth: "200px",
                }}
              >
                {/* VietQR Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
                  <span style={{ color: "#dc2626", fontWeight: 900, fontSize: "15px", letterSpacing: "-0.5px" }}>VIET</span>
                  <span style={{ color: "#003b7a", fontWeight: 900, fontSize: "15px", letterSpacing: "-0.5px" }}>QR</span>
                </div>

                {/* QR Image */}
                {qrImgSrc ? (
                  <img
                    src={qrImgSrc}
                    alt={`VietQR ${account.bank_name}`}
                    style={{ width: "160px", height: "160px", objectFit: "contain", borderRadius: "4px" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${account.bank_bin}-${account.account_number}`;
                    }}
                  />
                ) : (
                  <div style={{ width: "160px", height: "160px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                    Không có QR
                  </div>
                )}

                {/* QR Footer details */}
                <div style={{ marginTop: "8px", textAlign: "center", width: "100%" }}>
                  <div style={{ fontSize: "10px", fontWeight: 800, color: "#003b7a", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "4px" }}>
                    <span>napas 247</span>
                    <span style={{ color: "#005baa" }}>{bankDisplayName}</span>
                  </div>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "#475569", marginTop: "3px", textTransform: "uppercase" }}>
                    {account.account_name}
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    {account.account_number}
                  </div>
                  <div style={{ fontSize: "8.5px", color: "#94a3b8" }}>
                    Số tiền: 0đ
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Account Details & Actions */}
            <div
              style={{
                flex: 1,
                minWidth: "320px",
                padding: "24px 28px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                {/* Top Row: Purpose Tag & Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                  <span
                    style={{
                      background: "#e0f2fe",
                      color: "#0284c7",
                      padding: "4px 14px",
                      borderRadius: "9999px",
                      fontSize: "12.5px",
                      fontWeight: 750,
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Nhận tiền khách hàng
                  </span>

                  <span style={{ fontSize: "13px", fontWeight: 750, color: "#0f172a" }}>
                    {account.is_active ? "Đang hoạt động" : "Tạm dừng"}
                  </span>
                </div>

                {/* Bank Identity */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#475569",
                    }}
                  >
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "20px", fontWeight: 800, color: "#1e293b", margin: 0, lineHeight: 1.2 }}>
                      {bankDisplayName}
                    </h3>
                    <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                      {bankCode}
                    </span>
                  </div>
                </div>

                {/* Info Fields Rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <span style={{ fontSize: "13.5px", color: "#64748b", fontWeight: 500 }}>
                      Số tài khoản
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", fontFamily: "inherit" }}>
                      {account.account_number}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <span style={{ fontSize: "13.5px", color: "#64748b", fontWeight: 500 }}>
                      Chủ tài khoản
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", textTransform: "uppercase" }}>
                      {account.account_name}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center" }}>
                    <span style={{ fontSize: "13.5px", color: "#64748b", fontWeight: 500 }}>
                      Vai trò
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                      SePay theo dõi tiền vào
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions Row */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => onEdit(account)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "7px 18px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#334155",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
                >
                  <Pencil size={14} /> Sửa
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(account)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "7px 18px",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ef4444",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#fef2f2";
                    e.currentTarget.style.borderColor = "#f87171";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                    e.currentTarget.style.borderColor = "#fecaca";
                  }}
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

