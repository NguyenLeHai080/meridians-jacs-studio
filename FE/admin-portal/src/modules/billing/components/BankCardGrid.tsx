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
  onSetDefault,
  onToggleStatus,
  onViewQr,
  onAddNew,
  onNotify,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = async (account: BankAccount) => {
    try {
      await navigator.clipboard.writeText(account.account_number);
      setCopiedId(account.id);
      if (onNotify) onNotify(`Đã sao chép STK ${account.account_number}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

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
    <div className="bank-cards-grid-mf">
      {bankAccounts.map((account) => {
        const purposeInfo = getPurposeLabel(account.purpose);
        const encodedContent = encodeURIComponent("JACS AUTO");
        const encodedName = encodeURIComponent(account.account_name);
        const qrImgSrc =
          account.custom_qr_url ||
          (account.bank_bin && account.account_number
            ? `https://img.vietqr.io/image/${account.bank_bin}-${account.account_number}-${account.qr_template || "compact2"}.png?amount=500000&addInfo=${encodedContent}&accountName=${encodedName}`
            : "");

        return (
          <div
            key={account.id}
            className="bank-card-mf"
            style={{
              borderColor: account.is_default ? "var(--primary)" : "var(--border)",
              boxShadow: account.is_default ? "0 4px 16px rgba(255, 107, 0, 0.12)" : "none",
              position: "relative",
            }}
          >
            {/* Badges / Tags Row */}
            <div className="bank-card-tags-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                <span className={`tag-pill-purpose ${purposeInfo.class}`}>
                  {purposeInfo.text}
                </span>
                {account.is_default && (
                  <span
                    style={{
                      background: "linear-gradient(135deg, #ff6b00, #ff8c38)",
                      color: "#ffffff",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <Star size={11} fill="#ffffff" /> Mặc Định Nhận Tiền
                  </span>
                )}
              </div>

              <span className={account.is_active ? "tag-status-active" : "tag-status-blocked"}>
                {account.is_active ? "● Đang hoạt động" : "○ Tạm dừng"}
              </span>
            </div>

            {/* Split Body: VietQR Box & Details */}
            <div className="bank-card-body-split">
              <div
                className="vietqr-preview-box"
                style={{ cursor: "pointer" }}
                onClick={() => onViewQr(account)}
                title="Nhấn để xem mã VietQR lớn & test quét"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    marginBottom: "0.3rem",
                    padding: "0 2px",
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: "0.65rem", color: "#003b7a" }}>napas247</span>
                  <span style={{ fontWeight: 800, fontSize: "0.65rem", color: "#005baa" }}>
                    {account.bank_short || account.bank_name.split("(")[0].trim()}
                  </span>
                </div>

                {qrImgSrc ? (
                  <img
                    className="vietqr-code-img"
                    src={qrImgSrc}
                    alt={`VietQR ${account.bank_name}`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${account.bank_bin}-${account.account_number}`;
                    }}
                  />
                ) : (
                  <div style={{ height: "130px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "#94a3b8" }}>
                    Không có QR
                  </div>
                )}

                <div className="vietqr-bottom-footer">
                  <div className="account-text">{account.account_number}</div>
                  <div style={{ textTransform: "uppercase" }}>{account.account_name}</div>
                </div>
              </div>

              {/* Details Column */}
              <div className="bank-details-column">
                <div className="bank-header-group">
                  <Building2 size={20} className="bank-building-icon" />
                  <div>
                    <span className="bank-name-text">
                      {account.bank_name.split("(")[0]?.trim()}
                    </span>
                    {account.bank_short && (
                      <span className="bank-short-code"> / {account.bank_short}</span>
                    )}
                  </div>
                </div>

                <div className="bank-field-list">
                  <div className="bank-field-row">
                    <span className="field-label">Số tài khoản:</span>
                    <span
                      className="field-value"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700 }}
                    >
                      {account.account_number}
                      <button
                        type="button"
                        onClick={() => handleCopy(account)}
                        style={{ border: "none", background: "transparent", cursor: "pointer", padding: "1px", color: "var(--text-muted)" }}
                        title="Sao chép số tài khoản"
                      >
                        {copiedId === account.id ? (
                          <Check size={13} style={{ color: "var(--success)" }} />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </span>
                  </div>

                  <div className="bank-field-row">
                    <span className="field-label">Chủ tài khoản:</span>
                    <span className="field-value" style={{ textTransform: "uppercase" }}>
                      {account.account_name}
                    </span>
                  </div>

                  {account.branch && (
                    <div className="bank-field-row">
                      <span className="field-label">Chi nhánh:</span>
                      <span className="field-value">{account.branch}</span>
                    </div>
                  )}

                  {account.notes && (
                    <div className="bank-field-row">
                      <span className="field-label">Ghi chú:</span>
                      <span className="field-value" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {account.notes}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions Grid */}
                <div className="bank-actions-row" style={{ marginTop: "auto", flexWrap: "wrap", gap: "0.4rem" }}>
                  <button
                    type="button"
                    className="btn-card-action action-edit"
                    onClick={() => onViewQr(account)}
                    title="Xem mã VietQR và test quét"
                  >
                    <QrCode size={13} /> Xem QR
                  </button>

                  {!account.is_default && (
                    <button
                      type="button"
                      className="btn-card-action"
                      style={{ color: "var(--primary)" }}
                      onClick={() => onSetDefault(account)}
                      title="Đặt làm tài khoản mặc định"
                    >
                      <Star size={13} /> Đặt mặc định
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => onToggleStatus(account)}
                    title={account.is_active ? "Tạm dừng nhận tiền" : "Kích hoạt nhận tiền"}
                  >
                    <Power size={13} style={{ color: account.is_active ? "var(--warning)" : "var(--success)" }} />
                    {account.is_active ? "Tắt" : "Bật"}
                  </button>

                  <button
                    type="button"
                    className="btn-card-action action-edit"
                    onClick={() => onEdit(account)}
                  >
                    <Pencil size={13} /> Sửa
                  </button>

                  <button
                    type="button"
                    className="btn-card-action action-delete"
                    onClick={() => onDelete(account)}
                  >
                    <Trash2 size={13} /> Xóa
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
