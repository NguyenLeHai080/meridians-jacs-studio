import React, { useEffect, useState } from "react";
import { getClientBillingHistory, ClientBillingHistoryResponse } from "../../core/api";
import { getRuntime } from "../../core/runtime";
import { LicenseRenewalModal } from "../renewal/LicenseRenewalModal";
import { popup } from "../../shared/popup";
import {
  CreditCard2FrontFill,
  ShieldCheck,
  CalendarCheckFill,
  QrCode,
  ArrowRepeat,
  LightningChargeFill,
  CheckCircleFill,
  ClockHistory,
  PersonCheckFill,
  KeyFill,
  Clipboard,
  ClipboardCheck,
  CashStack,
  Check2,
} from "react-bootstrap-icons";

export function BillingHistoryPage() {
  const [licenseKey, setLicenseKey] = useState("");
  const [billingData, setBillingData] = useState<ClientBillingHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

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

  const copyLicense = async () => {
    if (!licenseKey) return;
    await getRuntime().copyText(licenseKey);
    setCopiedKey(true);
    popup.success("✓ Đã copy mã bản quyền License Key vào bộ nhớ tạm!");
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div
      className="billing-workspace-root animate-fade-in"
      style={{
        padding: "10px 16px 80px 16px",
        width: "100%",
        margin: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        height: "100%",
        flex: "1 1 0%",
        overflowY: "auto",
      }}
    >
      {/* 1. Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px", flexShrink: 0 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              padding: "2px 8px",
              borderRadius: "5px",
              fontSize: "10.5px",
              fontWeight: 800,
              color: "#fbbf24",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "3px",
            }}
          >
            <CreditCard2FrontFill size={10} /> HỆ THỐNG / BẢN QUYỀN · BILLING & SUBSCRIPTIONS
          </div>
          <h1 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <CashStack size={18} color="#fbbf24" />
            Lịch Sử Gia Hạn & Bản Quyền Phần Mềm
          </h1>
          <p style={{ fontSize: "11.5px", color: "#94a3b8", margin: "2px 0 0" }}>
            Theo dõi chi tiết các giao dịch gia hạn cước phí, trạng thái thanh toán VietQR tự động và thời hạn sử dụng phần mềm.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => licenseKey && fetchHistory(licenseKey)}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "#f8fafc", padding: "7px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
          >
            <ArrowRepeat size={13} className={loading ? "animate-spin" : ""} color="#38bdf8" />
            <span>{loading ? "Đang tải..." : "Tải Lại"}</span>
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowRenewalModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "7px",
              fontSize: "12px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #d97706, #f59e0b)",
              border: "none",
              color: "#12151f",
              boxShadow: "0 0 16px rgba(245, 158, 11, 0.4)",
              cursor: "pointer",
            }}
          >
            <LightningChargeFill size={13} />
            <span>⚡ Gia Hạn / Nâng Cấp Gói</span>
          </button>
        </div>
      </div>

      {/* 2. License Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "10px",
          marginBottom: "14px",
          flexShrink: 0,
        }}
      >
        {/* Card 1: License Key */}
        <div
          style={{
            background: "rgba(16, 20, 30, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              MÃ BẢN QUYỀN (LICENSE KEY)
            </span>
            <button
              type="button"
              onClick={copyLicense}
              style={{
                background: "rgba(56, 189, 248, 0.12)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#38bdf8",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {copiedKey ? <ClipboardCheck size={11} color="#34d399" /> : <Clipboard size={11} />}
              {copiedKey ? "Đã copy" : "Copy"}
            </button>
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "15px",
              fontWeight: 800,
              color: "#38bdf8",
              letterSpacing: "0.5px",
            }}
          >
            {licenseKey || "JACS-DEMO-KEY"}
          </div>
          <span style={{ fontSize: "11.5px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
            <ShieldCheck size={12} color="#10b981" /> Gắn cố định theo Mainboard phần cứng
          </span>
        </div>

        {/* Card 2: Customer Name */}
        <div
          style={{
            background: "rgba(16, 20, 30, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            CHỦ SỞ HỮU BẢN QUYỀN
          </span>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
            <PersonCheckFill size={18} color="#f59e0b" />
            {billingData?.customer_name || "Khách Hàng JACS"}
          </div>
          <span style={{ fontSize: "11.5px", color: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
            <CheckCircleFill size={12} /> Bản quyền chính hãng DaVinci Film
          </span>
        </div>

        {/* Card 3: Expiration */}
        <div
          style={{
            background: "rgba(16, 20, 30, 0.9)",
            border: daysLeft !== null && daysLeft <= 7 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            THỜI HẠN SỬ DỤNG
          </span>
          <div
            style={{
              fontSize: "17px",
              fontWeight: 900,
              color: daysLeft !== null && daysLeft <= 7 ? "#f87171" : "#34d399",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <CalendarCheckFill size={16} />
            {billingData?.expires_at ? new Date(billingData.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}
          </div>
          <span style={{ fontSize: "11.5px", color: daysLeft !== null && daysLeft <= 7 ? "#fca5a5" : "#94a3b8" }}>
            {daysLeft !== null ? (daysLeft <= 0 ? "⚠️ Đã hết hạn bản quyền" : `Còn lại ${daysLeft} ngày sử dụng`) : "Không giới hạn thời gian"}
          </span>
        </div>
      </div>

      {/* 3. Transactions Table */}
      <section
        style={{
          background: "rgba(16, 20, 30, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
          padding: "18px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "14px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              LỊCH SỬ GIAO DỊCH
            </span>
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
              Danh Sách Giao Dịch Thanh Toán & Gia Hạn ({billingData?.transactions?.length || 0})
            </h3>
          </div>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Tất cả giao dịch quét VietQR tự động hoặc gia hạn từ Quản trị viên
          </span>
        </div>

        <div className="jacs-table-wrapper" style={{ border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "8px", overflow: "hidden" }}>
          <table className="jacs-table">
            <thead>
              <tr style={{ background: "rgba(0, 0, 0, 0.35)" }}>
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
                    <td style={{ color: "#cbd5e1", fontSize: "12px" }}>
                      {new Date(tx.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td style={{ color: "#ffffff", fontWeight: 700 }}>
                      {tx.plan_name || tx.notes || "Gia hạn bản quyền JACS Studio"}
                    </td>
                    <td style={{ color: "#34d399", fontWeight: 900, fontSize: "13.5px" }}>
                      {(tx.amount || 0).toLocaleString("vi-VN")} đ
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: tx.payment_method === "sepay_vietqr" ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.06)",
                          color: tx.payment_method === "sepay_vietqr" ? "#38bdf8" : "#cbd5e1",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        {tx.payment_method === "sepay_vietqr" ? <QrCode size={11} /> : <CreditCard2FrontFill size={11} />}
                        {tx.payment_method === "sepay_vietqr" ? "VietQR (SePay Auto)" : "Chuyển khoản"}
                      </span>
                    </td>
                    <td style={{ fontFamily: "'DM Mono', monospace", color: "#38bdf8", fontSize: "12px" }}>
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
                          background: "rgba(52, 211, 153, 0.12)",
                          color: "#34d399",
                          border: "1px solid rgba(52, 211, 153, 0.3)",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        <Check2 size={12} />
                        Hoàn tất
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    <ClockHistory size={28} style={{ opacity: 0.3, margin: "0 auto 8px", display: "block" }} />
                    Chưa có lịch sử giao dịch trực tuyến nào được ghi nhận cho License này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <LicenseRenewalModal
        isOpen={showRenewalModal}
        onClose={() => setShowRenewalModal(false)}
        currentKey={licenseKey}
        onSuccess={() => licenseKey && fetchHistory(licenseKey)}
      />
    </div>
  );
}
