import React, { useState } from "react";
import { Modal } from "../../../../components/common/Modal";
import type { BankAccount } from "../../../../core/types";
import { Copy, Download, QrCode, Check, RefreshCw } from "lucide-react";

interface BankQrViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccount: BankAccount | null;
  onNotify?: (msg: string) => void;
}

export const BankQrViewModal: React.FC<BankQrViewModalProps> = ({
  isOpen,
  onClose,
  bankAccount,
  onNotify,
}) => {
  const [testAmount, setTestAmount] = useState("500000");
  const [testRemark, setTestRemark] = useState("JACS TEST01");
  const [copied, setCopied] = useState(false);

  if (!bankAccount) return null;

  const encodedContent = encodeURIComponent(testRemark.trim());
  const encodedName = encodeURIComponent(bankAccount.account_name);
  const qrUrl = bankAccount.custom_qr_url || (
    `https://img.vietqr.io/image/${bankAccount.bank_bin}-${bankAccount.account_number}-${bankAccount.qr_template || "compact2"}.png?amount=${parseInt(testAmount, 10) || 0}&addInfo=${encodedContent}&accountName=${encodedName}`
  );

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (onNotify) onNotify(`Đã sao chép ${label}`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const copyFullDetails = () => {
    const text = `Ngân hàng: ${bankAccount.bank_name}\nSố tài khoản: ${bankAccount.account_number}\nChủ tài khoản: ${bankAccount.account_name}\nSố tiền: ${parseInt(testAmount, 10).toLocaleString()} VNĐ\nNội dung: ${testRemark}`;
    copyToClipboard(text, "thông tin chuyển khoản đầy đủ");
  };

  const downloadQr = () => {
    const link = document.createElement("a");
    link.href = qrUrl;
    link.target = "_blank";
    link.download = `VietQR_${bankAccount.bank_short || "BANK"}_${bankAccount.account_number}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onNotify) onNotify("Đang tải ảnh mã VietQR...");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mã VietQR - ${bankAccount.bank_short || bankAccount.bank_name}`}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", alignItems: "center" }}>
        {/* VietQR Full-Size Display */}
        <div
          style={{
            background: "#ffffff",
            padding: "1rem",
            borderRadius: "12px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: "320px",
            width: "100%",
          }}
        >
          <img
            src={qrUrl}
            alt={`VietQR ${bankAccount.bank_name}`}
            style={{ width: "100%", height: "auto", borderRadius: "8px" }}
          />
          <div style={{ marginTop: "0.75rem", textAlign: "center", width: "100%", borderTop: "1px dashed #e2e8f0", paddingTop: "0.6rem" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
              {bankAccount.account_number}
            </div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0369a1" }}>
              {bankAccount.account_name}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              {bankAccount.bank_name}
            </div>
          </div>
        </div>

        {/* Live Simulator Form */}
        <div
          style={{
            width: "100%",
            background: "var(--bg-card-alt, #f8fafc)",
            padding: "1rem",
            borderRadius: "10px",
            border: "1px solid var(--border, #e2e8f0)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
            <RefreshCw size={15} style={{ color: "var(--primary)" }} />
            Giả lập quét thử VietQR (Real-time Scanner Test)
          </div>

          <div className="mf-form-two-col">
            <div className="form-group-mf">
              <label className="form-label-mf">Số tiền thử nghiệm (VNĐ)</label>
              <input
                type="number"
                className="form-input-mf"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                placeholder="500000"
              />
            </div>

            <div className="form-group-mf">
              <label className="form-label-mf">Nội dung chuyển khoản</label>
              <input
                type="text"
                className="form-input-mf"
                value={testRemark}
                onChange={(e) => setTestRemark(e.target.value)}
                placeholder="JACS TEST01"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", width: "100%", justifyContent: "center" }}>
          <button
            type="button"
            className="btn-white-outline"
            onClick={copyFullDetails}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.6rem 1rem" }}
          >
            {copied ? <Check size={15} style={{ color: "var(--success)" }} /> : <Copy size={15} />}
            Sao chép thông tin
          </button>

          <button
            type="button"
            className="btn-white-outline"
            onClick={() => copyToClipboard(qrUrl, "đường dẫn hình ảnh QR")}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.6rem 1rem" }}
          >
            <QrCode size={15} />
            Sao chép Link QR
          </button>

          <button
            type="button"
            className="btn-primary-orange"
            onClick={downloadQr}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.6rem 1.2rem" }}
          >
            <Download size={15} />
            Tải ảnh VietQR (PNG)
          </button>
        </div>
      </div>
    </Modal>
  );
};
