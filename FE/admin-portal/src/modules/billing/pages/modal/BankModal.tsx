import React, { useState, useEffect } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import type { BankAccount, BankAccountPurpose } from "../../../../core/types";
import { VIETNAMESE_BANKS } from "../../utils/bankConstants";
import { billingService } from "../../services/billingService";
import { Building2, QrCode, Upload, X, Check, RotateCw } from "lucide-react";

interface BankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  initialData?: BankAccount | null;
}

export const BankModal: React.FC<BankModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { t } = useI18n();
  const [bankBin, setBankBin] = useState("970415");
  const [bankName, setBankName] = useState("VietinBank (Công thương Việt Nam)");
  const [bankShort, setBankShort] = useState("CTG");
  const [accountNumber, setAccountNumber] = useState("109873538727");
  const [accountName, setAccountName] = useState("NGUYEN LE HAI");
  const [branch, setBranch] = useState("");
  const [purpose, setPurpose] = useState<BankAccountPurpose>("customer_income");
  const [qrTemplate, setQrTemplate] = useState("compact2");
  const [customQrUrl, setCustomQrUrl] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setBankBin(initialData.bank_bin || "970415");
      setBankName(initialData.bank_name || "VietinBank");
      setBankShort(initialData.bank_short || "CTG");
      setAccountNumber(initialData.account_number || "");
      setAccountName(initialData.account_name || "");
      setBranch(initialData.branch || "");
      setPurpose(initialData.purpose || "customer_income");
      setQrTemplate(initialData.qr_template || "compact2");
      setCustomQrUrl(initialData.custom_qr_url || "");
      setIsDefault(Boolean(initialData.is_default));
      setIsActive(initialData.is_active !== false);
      setNotes(initialData.notes || "");
    } else {
      setBankBin("970415");
      setBankName("VietinBank (Công thương Việt Nam)");
      setBankShort("CTG");
      setAccountNumber("");
      setAccountName("");
      setBranch("");
      setPurpose("customer_income");
      setQrTemplate("compact2");
      setCustomQrUrl("");
      setIsDefault(false);
      setIsActive(true);
      setNotes("");
    }
    setError("");
  }, [initialData, isOpen]);

  const handleBankSelect = (bin: string) => {
    const selected = VIETNAMESE_BANKS.find((b) => b.bin === bin);
    if (selected) {
      setBankBin(selected.bin);
      setBankName(selected.name);
      setBankShort(selected.short);
    }
  };

  const previewQrUrl = customQrUrl || (bankBin && accountNumber
    ? `https://img.vietqr.io/image/${bankBin}-${accountNumber}-${qrTemplate}.png?amount=500000&accountName=${encodeURIComponent(accountName || "CHU TAI KHOAN")}`
    : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim() || !accountName.trim()) {
      setError("Vui lòng điền đầy đủ Số tài khoản và Tên chủ tài khoản");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const payload: Partial<BankAccount> = {
        bank_name: bankName,
        bank_bin: bankBin,
        bank_short: bankShort,
        account_number: accountNumber.trim(),
        account_name: accountName.trim().toUpperCase(),
        branch: branch.trim() || undefined,
        purpose,
        qr_template: qrTemplate,
        custom_qr_url: customQrUrl.trim() || null,
        is_default: isDefault,
        is_active: isActive,
        notes: notes.trim() || undefined,
      };

      if (initialData?.id) {
        await billingService.updateBankAccount(initialData.id, payload);
        onSuccess(`Đã cập nhật tài khoản ngân hàng ${bankShort} - ${accountNumber}`);
      } else {
        await billingService.createBankAccount(payload);
        onSuccess(`Đã thêm mới tài khoản ngân hàng ${bankShort} - ${accountNumber}`);
      }
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi lưu thông tin tài khoản");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Chỉnh Sửa Tài Khoản Ngân Hàng & QR" : "Thêm Tài Khoản Ngân Hàng Mới"}
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div className="error-alert">{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: "1.25rem", alignItems: "start" }}>
          {/* Left Form Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className="form-group-mf">
              <label className="form-label-mf">
                <Building2 size={14} style={{ display: "inline", marginRight: "4px" }} />
                Chọn Ngân Hàng *
              </label>
              <select
                className="form-input-mf"
                value={bankBin}
                onChange={(e) => handleBankSelect(e.target.value)}
                required
              >
                {VIETNAMESE_BANKS.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.name} ({b.short} - {b.bin})
                  </option>
                ))}
              </select>
            </div>

            <div className="mf-form-two-col">
              <div className="form-group-mf">
                <label className="form-label-mf">Số tài khoản *</label>
                <input
                  type="text"
                  className="form-input-mf"
                  required
                  placeholder="VD: 109873538727"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.trim())}
                />
              </div>
              <div className="form-group-mf">
                <label className="form-label-mf">Tên chủ tài khoản *</label>
                <input
                  type="text"
                  className="form-input-mf"
                  required
                  placeholder="VD: NGUYEN VAN A"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="mf-form-two-col">
              <div className="form-group-mf">
                <label className="form-label-mf">Mục đích sử dụng</label>
                <select
                  className="form-input-mf"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as BankAccountPurpose)}
                >
                  <option value="customer_income">Nhận tiền khách hàng (SePay)</option>
                  <option value="api_expense">Thanh toán API & Hạ tầng</option>
                  <option value="supplier">Nạp vốn nhà cung cấp</option>
                  <option value="backup">Tài khoản dự phòng</option>
                  <option value="other">Mục đích khác</option>
                </select>
              </div>
              <div className="form-group-mf">
                <label className="form-label-mf">Chi nhánh ngân hàng</label>
                <input
                  type="text"
                  className="form-input-mf"
                  placeholder="VD: Chi nhánh Ba Đình"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
              </div>
            </div>

            <div className="mf-form-two-col">
              <div className="form-group-mf">
                <label className="form-label-mf">
                  <QrCode size={14} style={{ display: "inline", marginRight: "4px" }} />
                  Kiểu mẫu VietQR
                </label>
                <select
                  className="form-input-mf"
                  value={qrTemplate}
                  onChange={(e) => setQrTemplate(e.target.value)}
                >
                  <option value="compact2">Compact 2 (Đẹp & Nhỏ gọn)</option>
                  <option value="compact">Compact (Tiêu chuẩn)</option>
                  <option value="qr_only">QR Only (Chỉ mã QR)</option>
                  <option value="print">Print (Khổ in thẻ ngân hàng)</option>
                </select>
              </div>

              <div className="form-group-mf">
                <label className="form-label-mf">Ghi chú nội bộ</label>
                <input
                  type="text"
                  className="form-input-mf"
                  placeholder="VD: Tài khoản dùng webhook SePay"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group-mf">
              <label className="form-label-mf">Ảnh QR Tùy chỉnh (URL hoặc tải file)</label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="url"
                  className="form-input-mf"
                  placeholder="https://... hoặc nạp file ảnh"
                  value={customQrUrl}
                  onChange={(e) => setCustomQrUrl(e.target.value.trim())}
                  style={{ flex: 1 }}
                />
                <label
                  className="btn-white-outline"
                  style={{
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.5rem 0.85rem",
                    fontSize: "0.8rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Upload size={14} /> Tải ảnh
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          if (evt.target?.result) {
                            setCustomQrUrl(String(evt.target.result));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {customQrUrl && (
                  <button
                    type="button"
                    className="btn-white-outline"
                    style={{ color: "var(--danger)", padding: "0.5rem" }}
                    onClick={() => setCustomQrUrl("")}
                    title="Xóa ảnh tùy chỉnh, tự sinh VietQR"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Checkbox settings */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", background: "var(--bg-card-alt, #f8fafc)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border, #e2e8f0)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                ★ Đặt làm tài khoản nhận tiền mặc định (Dùng cho tạo QR gia hạn & SePay)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                ● Kích hoạt hoạt động (Sẵn sàng nhận thanh toán)
              </label>
            </div>
          </div>

          {/* Right VietQR Live Preview */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "#ffffff", padding: "0.75rem", borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              XEM TRƯỚC VIETQR
            </span>
            {previewQrUrl ? (
              <img
                src={previewQrUrl}
                alt="VietQR Preview"
                style={{ width: "170px", height: "auto", borderRadius: "6px", border: "1px solid #f1f5f9" }}
              />
            ) : (
              <div style={{ width: "170px", height: "170px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#94a3b8", fontSize: "0.8rem", textAlign: "center", borderRadius: "6px" }}>
                Nhập STK để xem QR
              </div>
            )}
            <div style={{ marginTop: "0.5rem", textAlign: "center", fontSize: "0.75rem", color: "var(--text-main)" }}>
              <div style={{ fontWeight: 800 }}>{accountNumber || "STK"}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{accountName || "CHỦ TÀI KHOẢN"}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
          <button type="button" className="btn-white-outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary-orange" disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            {loading ? <RotateCw size={15} className="animate-spin" /> : <Check size={15} />}
            {initialData ? "Lưu Thay Đổi" : "+ Thêm Tài Khoản"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
