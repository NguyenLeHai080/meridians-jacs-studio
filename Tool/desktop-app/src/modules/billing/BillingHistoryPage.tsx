import React, { useEffect, useState } from "react";
import { getClientBillingHistory, ClientBillingHistoryResponse } from "../../core/api";
import { getRuntime } from "../../core/runtime";
import { Icon } from "../../shared/Icon";
import { LicenseRenewalModal } from "../renewal/LicenseRenewalModal";

export function BillingHistoryPage() {
  const [licenseKey, setLicenseKey] = useState("");
  const [billingData, setBillingData] = useState<ClientBillingHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);

  useEffect(() => {
    void (async () => {
      const key = await getRuntime().readLicense();
      if (key) {
        setLicenseKey(key);
        fetchHistory(key);
      }
    })();
  }, []);

  const fetchHistory = async (key: string) => {
    setLoading(true);
    try {
      const res = await getClientBillingHistory(key);
      setBillingData(res);
    } catch (err) {
      console.warn("Failed to fetch billing history:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (expStr?: string | null) => {
    if (!expStr) return null;
    const diff = new Date(expStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const daysLeft = calculateDaysRemaining(billingData?.expires_at);

  return (
    <div className="page-stack page-enter">
      {/* Page Header */}
      <div className="page-title">
        <div>
          <p className="eyebrow">BILLING & SUBSCRIPTIONS</p>
          <h2>Lịch Sử Gia Hạn & Bản Quyền</h2>
          <p>
            Theo dõi chi tiết các giao dịch gia hạn cước phí, trạng thái thanh toán VietQR và thời hạn sử dụng phần mềm.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => licenseKey && fetchHistory(licenseKey)}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="refresh" size={14} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Đang tải..." : "Tải Lại"}</span>
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowRenewalModal(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="zap" size={14} />
            <span>⚡ Gia Hạn / Nâng Cấp Gói</span>
          </button>
        </div>
      </div>

      {/* License Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginTop: "6px",
        }}
      >
        <div
          style={{
            background: "rgba(17, 22, 37, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            MÃ BẢN QUYỀN (LICENSE KEY)
          </span>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "16px", fontWeight: 800, color: "#38bdf8", marginTop: "2px" }}>
            {licenseKey || "JACS-DEMO-KEY"}
          </div>
          <span style={{ fontSize: "11.5px", color: "#64748b" }}>Gắn cố định theo Mainboard</span>
        </div>

        <div
          style={{
            background: "rgba(17, 22, 37, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            CHỦ SỞ HỮU BẢN QUYỀN
          </span>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#ffffff", marginTop: "2px" }}>
            {billingData?.customer_name || "Khách Hàng JACS"}
          </div>
          <span style={{ fontSize: "11.5px", color: "#10b981", fontWeight: 700 }}>● Bản quyền chính hãng</span>
        </div>

        <div
          style={{
            background: "rgba(17, 22, 37, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            THỜI HẠN SỬ DỤNG
          </span>
          <div style={{ fontSize: "16px", fontWeight: 900, color: daysLeft !== null && daysLeft <= 7 ? "#f95738" : "#10b981", marginTop: "2px" }}>
            {billingData?.expires_at ? new Date(billingData.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}
          </div>
          <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
            {daysLeft !== null ? (daysLeft <= 0 ? "⚠️ Đã hết hạn" : `Còn lại ${daysLeft} ngày`) : "Không giới hạn"}
          </span>
        </div>
      </div>

      {/* Transactions Table */}
      <div
        style={{
          background: "rgba(17, 22, 37, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          overflow: "hidden",
          marginTop: "16px",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong style={{ fontSize: "14px", color: "#ffffff", display: "block" }}>
              Danh Sách Các Giao Dịch Thanh Toán & Gia Hạn
            </strong>
            <small style={{ color: "#94a3b8", fontSize: "11.5px" }}>
              Tất cả các lần quét VietQR tự động hoặc thanh toán trực tiếp từ Admin
            </small>
          </div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Tổng cộng: {billingData?.transactions?.length || 0} giao dịch
          </span>
        </div>

        <div className="jacs-table-wrapper">
          <table className="jacs-table">
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.25)" }}>
                <th>Thời Gian</th>
                <th>Gói Cước / Nội Dung</th>
                <th>Số Tiền</th>
                <th>Phương Thức</th>
                <th>Mã GD / SePay</th>
                <th style={{ textAlign: "center" }}>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {billingData?.transactions && billingData.transactions.length > 0 ? (
                billingData.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ color: "#cbd5e1" }}>
                      {new Date(tx.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ color: "#ffffff", fontWeight: 700 }}>
                      {tx.plan_name || tx.notes || "Gia hạn bản quyền JACS Studio"}
                    </td>
                    <td style={{ color: "#10b981", fontWeight: 900, fontSize: "13.5px" }}>
                      {(tx.amount || 0).toLocaleString("vi-VN")} đ
                    </td>
                    <td style={{ color: "#94a3b8" }}>
                      {tx.payment_method === "sepay_vietqr" ? "VietQR (SePay Auto)" : "Chuyển khoản"}
                    </td>
                    <td style={{ fontFamily: "'DM Mono', monospace", color: "#38bdf8", fontSize: "11.5px" }}>
                      {tx.reference_code || `#${tx.id.slice(0, 8)}`}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 10px",
                          borderRadius: "99px",
                          background: "rgba(16, 185, 129, 0.12)",
                          color: "#10b981",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }} />
                        Hoàn tất
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    Chưa có lịch sử giao dịch trực tuyến nào được ghi nhận cho License này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LicenseRenewalModal
        isOpen={showRenewalModal}
        onClose={() => setShowRenewalModal(false)}
        currentKey={licenseKey}
        onSuccess={() => licenseKey && fetchHistory(licenseKey)}
      />
    </div>
  );
}
