import React from "react";
import { Building2, Pencil, Trash2 } from "lucide-react";
import type { BankConfig } from "../../../core/types";

interface BankCardGridProps {
  bankConfig: BankConfig;
  onEditBank: () => void;
  onDeleteBank: () => void;
}

export const BankCardGrid: React.FC<BankCardGridProps> = ({
  bankConfig,
  onEditBank,
  onDeleteBank,
}) => {
  return (
    <div className="bank-cards-grid-mf">
      {/* Card 1: VietinBank / Nhận tiền khách hàng */}
      <div className="bank-card-mf">
        <div className="bank-card-tags-row">
          <span className="tag-pill-purpose purpose-customer">Nhận tiền khách hàng</span>
          <span className="tag-status-active">● Đang hoạt động</span>
        </div>

        <div className="bank-card-body-split">
          <div className="vietqr-preview-box">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "0.4rem", padding: "0 4px" }}>
              <span style={{ fontWeight: 800, fontSize: "0.68rem", color: "#003b7a" }}>napas247</span>
              <span style={{ fontWeight: 800, fontSize: "0.68rem", color: "#005baa" }}>VietinBank</span>
            </div>
            <img
              className="vietqr-code-img"
              src={
                bankConfig.custom_qr_url ||
                (bankConfig.bank_bin && bankConfig.account_number
                  ? `https://img.vietqr.io/image/${bankConfig.bank_bin}-${bankConfig.account_number}-${bankConfig.qr_template || "compact2"}.png?amount=${bankConfig.plans_pricing?.["1_month"] || 500000}&accountName=${encodeURIComponent(bankConfig.account_name || "NGUYEN LE HAI")}`
                  : "https://img.vietqr.io/image/970415-109873538727-compact2.png?amount=500000&accountName=NGUYEN%20LE%20HAI")
              }
              alt="VietQR VietinBank"
            />
            <div className="vietqr-bottom-footer">
              <div className="account-text">{bankConfig.account_number || "109873538727"}</div>
              <div>{bankConfig.account_name || "NGUYEN LE HAI"}</div>
            </div>
          </div>

          <div className="bank-details-column">
            <div className="bank-header-group">
              <Building2 size={20} className="bank-building-icon" />
              <div>
                <span className="bank-name-text">{bankConfig.bank_name?.split("(")[0]?.trim() || "VietinBank"}</span>
                <span className="bank-short-code"> / ICB</span>
              </div>
            </div>

            <div className="bank-field-list">
              <div className="bank-field-row">
                <span className="field-label">Số tài khoản:</span>
                <span className="field-value">{bankConfig.account_number || "109873538727"}</span>
              </div>
              <div className="bank-field-row">
                <span className="field-label">Chủ tài khoản:</span>
                <span className="field-value">{bankConfig.account_name || "NGUYEN LE HAI"}</span>
              </div>
              <div className="bank-field-row">
                <span className="field-label">Vai trò:</span>
                <span className="field-value">SePay theo dõi tiền vào</span>
              </div>
            </div>

            <div className="bank-actions-row">
              <button
                type="button"
                className="btn-card-action action-edit"
                onClick={onEditBank}
              >
                <Pencil size={13} /> Sửa
              </button>
              <button
                type="button"
                className="btn-card-action action-delete"
                onClick={onDeleteBank}
              >
                <Trash2 size={13} /> Xóa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: BIDV / Thanh toán API */}
      <div className="bank-card-mf">
        <div className="bank-card-tags-row">
          <span className="tag-pill-purpose purpose-supplier">Thanh toán API</span>
          <span className="tag-status-active">● Đang hoạt động</span>
        </div>

        <div className="bank-card-body-split">
          <div className="vietqr-preview-box">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: "0.4rem", padding: "0 4px" }}>
              <span style={{ fontWeight: 800, fontSize: "0.68rem", color: "#003b7a" }}>napas247</span>
              <span style={{ fontWeight: 800, fontSize: "0.68rem", color: "#00558f" }}>BIDV</span>
            </div>
            <img
              className="vietqr-code-img"
              src="https://img.vietqr.io/image/970418-SEPAY_TOKENX-compact2.png?amount=100000&accountName=TOKENX"
              alt="VietQR BIDV"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=BIDV-SEPAY_TOKENX`;
              }}
            />
            <div className="vietqr-bottom-footer">
              <div className="account-text">SEPAY_TOKENX</div>
              <div>TOKENX - willownelson</div>
            </div>
          </div>

          <div className="bank-details-column">
            <div className="bank-header-group">
              <Building2 size={20} className="bank-building-icon" />
              <div>
                <span className="bank-name-text">BIDV</span>
                <span className="bank-short-code"> / BIDV</span>
              </div>
            </div>

            <div className="bank-field-list">
              <div className="bank-field-row">
                <span className="field-label">Số tài khoản:</span>
                <span className="field-value">SEPAY_TOKENX</span>
              </div>
              <div className="bank-field-row">
                <span className="field-label">Chủ tài khoản:</span>
                <span className="field-value">TOKENX - willownelson</span>
              </div>
              <div className="bank-field-row">
                <span className="field-label">Vai trò:</span>
                <span className="field-value">Nạp vốn nhà cung cấp</span>
              </div>
            </div>

            <div className="bank-actions-row">
              <button
                type="button"
                className="btn-card-action action-edit"
                onClick={onEditBank}
              >
                <Pencil size={13} /> Sửa
              </button>
              <button
                type="button"
                className="btn-card-action action-delete"
                onClick={onDeleteBank}
              >
                <Trash2 size={13} /> Xóa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
