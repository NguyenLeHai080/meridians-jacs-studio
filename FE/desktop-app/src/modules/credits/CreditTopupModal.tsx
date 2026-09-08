import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  getCreditPackages,
  createCreditTopupOrder,
  checkCreditTopupStatus,
  getBankConfig,
  CreditPackagePublic,
  CreditTopupOrderResult,
  BankConfigPublic,
} from "../../core/api";
import { getRuntime } from "../../core/runtime";

interface CreditTopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onSyncAdminGrant?: () => void;
  currentKey?: string;
  currentBalance?: number;
}

const DEFAULT_PACKAGES: CreditPackagePublic[] = [
  {
    id: "pkg-base",
    name: "Base",
    price: 250000,
    base_credits: 153846,
    bonus_percent: 2,
    total_credits: 156923,
    badge: null,
    is_active: true,
  },
  {
    id: "pkg-starter",
    name: "Starter",
    price: 500000,
    base_credits: 307692,
    bonus_percent: 3,
    total_credits: 316923,
    badge: null,
    is_active: true,
  },
  {
    id: "pkg-growth",
    name: "Growth",
    price: 1000000,
    base_credits: 615385,
    bonus_percent: 7,
    total_credits: 658461,
    badge: "ĐỀ XUẤT",
    is_active: true,
  },
  {
    id: "pkg-pro",
    name: "Pro",
    price: 3000000,
    base_credits: 1846154,
    bonus_percent: 12,
    total_credits: 2067692,
    badge: null,
    is_active: true,
  },
];

export function CreditTopupModal({
  isOpen,
  onClose,
  onSuccess,
  onSyncAdminGrant,
  currentKey = "",
  currentBalance = 0,
}: CreditTopupModalProps) {
  const [packages, setPackages] = useState<CreditPackagePublic[]>(DEFAULT_PACKAGES);
  const [selectedPkgId, setSelectedPkgId] = useState<string>("pkg-growth");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState<number>(500000);

  const [bankConfig, setBankConfig] = useState<BankConfigPublic | null>(null);
  const [orderResult, setOrderResult] = useState<CreditTopupOrderResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [grantedAmount, setGrantedAmount] = useState<number>(0);
  const [licenseKey, setLicenseKey] = useState<string>(currentKey);
  const [hwid, setHwid] = useState<string>("");

  // Load key & machine info
  useEffect(() => {
    if (!isOpen) return;
    setIsSuccess(false);
    setGrantedAmount(0);

    const init = async () => {
      try {
        const runtime = getRuntime();
        const [savedKey, machine, bankCfg, pkgs] = await Promise.allSettled([
          runtime.readLicense(),
          runtime.getMachineInfo(),
          getBankConfig(),
          getCreditPackages(),
        ]);

        const key =
          (savedKey.status === "fulfilled" && savedKey.value) || currentKey || "JACS-PRO-KEY";
        setLicenseKey(key);

        if (machine.status === "fulfilled" && machine.value?.machineId) {
          setHwid(machine.value.machineId);
        }

        if (bankCfg.status === "fulfilled" && bankCfg.value) {
          setBankConfig(bankCfg.value);
        }

        if (pkgs.status === "fulfilled" && Array.isArray(pkgs.value) && pkgs.value.length > 0) {
          setPackages(pkgs.value.filter((p) => p.is_active));
        }
      } catch {
        // Fallback initialized
      }
    };

    void init();
  }, [isOpen, currentKey]);

  // Generate QR & Register Order whenever selection changes
  const generateOrder = useCallback(
    async (pkgId: string, customVal: number, useCustom: boolean) => {
      if (!licenseKey) return;
      try {
        setLoading(true);
        let amount = 1000000;
        let pkgName = "Growth";

        if (useCustom) {
          amount = customVal;
          pkgName = `Nạp tùy ý (${customVal.toLocaleString("vi-VN")} đ)`;
        } else {
          const found = packages.find((p) => p.id === pkgId);
          if (found) {
            amount = found.price;
            pkgName = found.name;
          }
        }

        const res = await createCreditTopupOrder({
          license_key: licenseKey,
          hwid: hwid || undefined,
          package_id: useCustom ? "custom" : pkgId,
          package_name: pkgName,
          amount: amount,
        });

        setOrderResult(res);
      } catch {
        // Fallback offline QR construction
        const cleanToken = licenseKey
          .replace(/^(?:JACS[-_ ]*)+/i, "")
          .replace(/-/g, "")
          .slice(0, 8)
          .toUpperCase() || "KEY";
        const fallbackContent = `JACSCR ${cleanToken}`;
        const fallbackAmount = useCustom
          ? customVal
          : packages.find((p) => p.id === pkgId)?.price || 1000000;
        const bBin = bankConfig?.bank_bin || "970415";
        const bAcc = bankConfig?.account_number || "109873538727";
        const bName = bankConfig?.account_name || "NGUYEN LE HAI";
        const qrUrl = `https://img.vietqr.io/image/${bBin}-${bAcc}-compact2.png?amount=${fallbackAmount}&addInfo=${encodeURIComponent(fallbackContent)}&accountName=${encodeURIComponent(bName)}`;

        setOrderResult({
          order_id: `CTP-${Date.now().toString(36).toUpperCase()}`,
          license_key: licenseKey,
          hwid: hwid,
          package_name: useCustom ? "Nạp tùy ý" : pkgId,
          amount: fallbackAmount,
          credits_expected: Math.round(fallbackAmount * (615.385 / 1000)),
          bonus_percent: 0,
          transfer_content: fallbackContent,
          bank_name: bankConfig?.bank_name || "VietinBank (Công thương Việt Nam)",
          bank_bin: bBin,
          account_number: bAcc,
          account_name: bName,
          qr_url: qrUrl,
          status: "PENDING",
        });
      } finally {
        setLoading(false);
      }
    },
    [licenseKey, hwid, packages, bankConfig]
  );

  // Trigger order creation once ready
  useEffect(() => {
    if (isOpen && licenseKey) {
      void generateOrder(selectedPkgId, customAmount, isCustomMode);
    }
  }, [isOpen, licenseKey, selectedPkgId, customAmount, isCustomMode, generateOrder]);

  // Handle select package
  const handleSelectPackage = (pkgId: string) => {
    setIsCustomMode(false);
    setSelectedPkgId(pkgId);
  };

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Real-time automatic SePay payment polling
  useEffect(() => {
    if (!isOpen || isSuccess) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await checkCreditTopupStatus(orderResult?.order_id, licenseKey);
        if (!isMounted) return;

        if (res?.data?.found && (res.data.status === "APPROVED" || res.data.status === "COMPLETED")) {
          setIsSuccess(true);
          const granted = res.data.credits_granted || orderResult?.credits_expected || 0;
          setGrantedAmount(granted);
          if (onSyncAdminGrant) onSyncAdminGrant();
          if (onSuccess) onSuccess();
          setTimeout(() => {
            if (isMounted) onClose();
          }, 2500);
          return;
        }

        // Also check if balance increased on server / localStorage
        if (onSyncAdminGrant) {
          await onSyncAdminGrant();
        }
        const currentBal = Number(localStorage.getItem("jacs_credit_balance") || 0);
        if (currentBal > currentBalance) {
          setIsSuccess(true);
          setGrantedAmount(currentBal - currentBalance);
          if (onSuccess) onSuccess();
          setTimeout(() => {
            if (isMounted) onClose();
          }, 2500);
        }
      } catch {
        // Silent polling
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, isSuccess, orderResult?.order_id, orderResult?.credits_expected, licenseKey, currentBalance, onSyncAdminGrant, onSuccess, onClose]);

  if (!isOpen) return null;

  const currentPkg = packages.find((p) => p.id === selectedPkgId) || packages[0];
  const expectedCredits = isCustomMode
    ? Math.round(customAmount * (615.385 / 1000))
    : currentPkg?.total_credits || 658461;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        backgroundColor: "rgba(3, 7, 18, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          background: "#0c1322",
          border: "1px solid rgba(245, 158, 11, 0.35)",
          borderRadius: "20px",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 30px rgba(245, 158, 11, 0.12)",
          color: "#f8fafc",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "92vh",
        }}
      >
        {/* SUCCESS OVERLAY */}
        {isSuccess ? (
          <div
            style={{
              padding: "60px 30px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "36px",
                boxShadow: "0 0 30px rgba(16, 185, 129, 0.4)",
              }}
            >
              ✓
            </div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#ffffff" }}>
              Nạp Credits Thành Công!
            </div>
            <div style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "420px" }}>
              Tài khoản của bạn đã được cộng thêm{" "}
              <strong style={{ color: "#fbbf24", fontSize: "16px" }}>
                +{grantedAmount.toLocaleString("vi-VN")} Credits
              </strong>
              . Bạn có thể tiếp tục phân tích video AI ngay bây giờ!
            </div>
          </div>
        ) : (
          <>
            {/* 1. MODAL HEADER */}
            <div
              style={{
                padding: "20px 24px 14px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                background: "linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#f59e0b",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}
                >
                  <span>🎁 ƯU TIÊN TIẾT KIỆM</span>
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 900,
                    color: "#ffffff",
                    marginTop: "3px",
                    letterSpacing: "-0.3px",
                  }}
                >
                  Gói Credit Ưu Đãi
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                  Chọn gói để nhận nhiều Credit hơn so với nạp lẻ cùng số tiền.
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#94a3b8",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "15px",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            {/* 2. BODY SCROLLABLE AREA */}
            <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* PACKAGE CARDS GRID */}
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {packages.map((pkg) => {
                    const isSelected = !isCustomMode && selectedPkgId === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => handleSelectPackage(pkg.id)}
                        style={{
                          position: "relative",
                          background: isSelected
                            ? "linear-gradient(180deg, rgba(245, 158, 11, 0.16) 0%, rgba(15, 23, 42, 0.95) 100%)"
                            : "rgba(15, 23, 42, 0.6)",
                          border: isSelected
                            ? "2px solid #f59e0b"
                            : "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "14px",
                          padding: "16px 14px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          boxShadow: isSelected ? "0 0 20px rgba(245, 158, 11, 0.2)" : "none",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        {/* BADGE (ĐỀ XUẤT) */}
                        {pkg.badge && (
                          <div
                            style={{
                              position: "absolute",
                              top: "-10px",
                              right: "12px",
                              background: "linear-gradient(135deg, #f97316, #ea580c)",
                              color: "#ffffff",
                              fontSize: "9.5px",
                              fontWeight: 900,
                              padding: "2px 8px",
                              borderRadius: "20px",
                              letterSpacing: "0.5px",
                              boxShadow: "0 2px 6px rgba(234, 88, 12, 0.4)",
                            }}
                          >
                            {pkg.badge}
                          </div>
                        )}

                        <div>
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: 750,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            GÓI CREDIT
                          </div>
                          <div style={{ fontSize: "16px", fontWeight: 850, color: "#ffffff", marginTop: "2px" }}>
                            {pkg.name}
                          </div>
                          <div style={{ fontSize: "18px", fontWeight: 900, color: "#f8fafc", marginTop: "8px" }}>
                            {pkg.price.toLocaleString("vi-VN")} đ
                          </div>

                          {/* BONUS BADGE */}
                          <div
                            style={{
                              display: "inline-block",
                              background: "rgba(245, 158, 11, 0.15)",
                              color: "#fbbf24",
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "6px",
                              marginTop: "8px",
                              border: "1px solid rgba(245, 158, 11, 0.25)",
                            }}
                          >
                            +{pkg.bonus_percent}% Credit
                          </div>

                          <div style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "10px", fontWeight: 650 }}>
                            Nhận <strong style={{ color: "#fbbf24" }}>{pkg.total_credits.toLocaleString("vi-VN")}</strong> Credit
                          </div>
                        </div>

                        {/* SELECTION STATUS */}
                        <div
                          style={{
                            marginTop: "14px",
                            fontSize: "11px",
                            fontWeight: 750,
                            color: isSelected ? "#10b981" : "#64748b",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {isSelected ? "✓ Đã chọn" : "○ Chọn gói"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* OPTION: NẠP LẺ TÙY Ý */}
                <div
                  style={{
                    marginTop: "12px",
                    background: isCustomMode ? "rgba(245, 158, 11, 0.1)" : "rgba(255, 255, 255, 0.03)",
                    border: isCustomMode ? "1px solid #f59e0b" : "1px dashed rgba(255, 255, 255, 0.12)",
                    borderRadius: "12px",
                    padding: "12px 16px",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="radio"
                      id="custom_deposit_radio"
                      name="topup_mode"
                      checked={isCustomMode}
                      onChange={() => setIsCustomMode(true)}
                      style={{ cursor: "pointer", accentColor: "#f59e0b" }}
                    />
                    <label
                      htmlFor="custom_deposit_radio"
                      style={{ fontSize: "12.5px", fontWeight: 750, color: "#f8fafc", cursor: "pointer" }}
                    >
                      Hoặc Nạp Lẻ Tùy Ý (Nhập số tiền bất kỳ)
                    </label>
                  </div>

                  {isCustomMode && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(Math.max(20000, Number(e.target.value)))}
                          style={{
                            background: "rgba(15, 23, 42, 0.8)",
                            border: "1px solid rgba(245, 158, 11, 0.4)",
                            borderRadius: "8px",
                            padding: "6px 28px 6px 12px",
                            color: "#ffffff",
                            fontSize: "13px",
                            fontWeight: 800,
                            width: "140px",
                          }}
                          step="50000"
                          min="20000"
                        />
                        <span style={{ position: "absolute", right: "8px", top: "7px", fontSize: "11px", color: "#94a3b8" }}>
                          đ
                        </span>
                      </div>
                      <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: 750 }}>
                        ➔ Nhận ~{expectedCredits.toLocaleString("vi-VN")} Credit
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* PAYMENT QR CODE & TRANSFER INFO */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "16px",
                  padding: "18px",
                  display: "grid",
                  gridTemplateColumns: "minmax(180px, 220px) 1fr",
                  gap: "20px",
                }}
              >
                {/* LEFT: QR CODE */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "10px",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  {loading || !orderResult ? (
                    <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "12px" }}>
                      Đang tạo mã VietQR...
                    </div>
                  ) : (
                    <img
                      src={orderResult.qr_url}
                      alt="VietQR nạp credit"
                      style={{ width: "100%", height: "auto", borderRadius: "6px", display: "block" }}
                    />
                  )}
                  <div style={{ fontSize: "11px", fontWeight: 750, color: "#1e293b", marginTop: "6px", textAlign: "center" }}>
                    Quét mã bằng App Ngân Hàng
                  </div>
                </div>

                {/* RIGHT: BANK DETAILS & COPY BUTTONS */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* Bank Name */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <span style={{ color: "#94a3b8" }}>Ngân hàng:</span>
                      <strong style={{ color: "#f8fafc" }}>
                        {orderResult?.bank_name || bankConfig?.bank_name || "VietinBank (Công thương)"}
                      </strong>
                    </div>

                    {/* Account Number */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <span style={{ color: "#94a3b8" }}>Số tài khoản:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ color: "#fbbf24", fontFamily: "monospace", fontSize: "14px" }}>
                          {orderResult?.account_number || bankConfig?.account_number || "109873538727"}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(orderResult?.account_number || "109873538727", "acc_num")}
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            color: copiedField === "acc_num" ? "#10b981" : "#cbd5e1",
                            cursor: "pointer",
                          }}
                        >
                          {copiedField === "acc_num" ? "✓ Đã chép" : "Copy"}
                        </button>
                      </div>
                    </div>

                    {/* Account Name */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <span style={{ color: "#94a3b8" }}>Chủ tài khoản:</span>
                      <strong style={{ color: "#f8fafc" }}>
                        {orderResult?.account_name || bankConfig?.account_name || "NGUYEN LE HAI"}
                      </strong>
                    </div>

                    {/* Amount */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                      <span style={{ color: "#94a3b8" }}>Số tiền thanh toán:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ color: "#ffffff", fontSize: "15px", fontWeight: 900 }}>
                          {(orderResult?.amount || currentPkg?.price || 1000000).toLocaleString("vi-VN")} đ
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(String(orderResult?.amount || currentPkg?.price || 1000000), "amount")}
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            color: copiedField === "amount" ? "#10b981" : "#cbd5e1",
                            cursor: "pointer",
                          }}
                        >
                          {copiedField === "amount" ? "✓ Đã chép" : "Copy"}
                        </button>
                      </div>
                    </div>

                    {/* Transfer Content */}
                    <div
                      style={{
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "1px solid rgba(245, 158, 11, 0.3)",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        marginTop: "4px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700 }}>
                          Nội dung chuyển khoản:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(orderResult?.transfer_content || "JACSCR", "content")}
                          style={{
                            background: "#f59e0b",
                            border: "none",
                            borderRadius: "4px",
                            padding: "2px 8px",
                            fontSize: "10px",
                            fontWeight: 800,
                            color: "#0f172a",
                            cursor: "pointer",
                          }}
                        >
                          {copiedField === "content" ? "✓ Đã copy" : "Copy Nội Dung"}
                        </button>
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 900,
                          color: "#ffffff",
                          fontFamily: "monospace",
                          marginTop: "3px",
                        }}
                      >
                        {orderResult?.transfer_content || "JACSCR"}
                      </div>
                      <div style={{ fontSize: "11px", color: "#38bdf8", marginTop: "4px", lineHeight: "1.35", background: "rgba(56, 189, 248, 0.08)", padding: "5px 8px", borderRadius: "6px", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                        ⚡ <strong>Tự động 100%:</strong> Giữ đúng nội dung chuyển khoản trên. Hệ thống SePay sẽ tự động quét và cộng Credits tức thì vào tool sau khi chuyển khoản thành công.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. MODAL FOOTER */}
            <div
              style={{
                padding: "14px 24px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(10, 15, 28, 0.95)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                Số dư hiện tại: <strong style={{ color: "#fbbf24" }}>{currentBalance.toLocaleString("vi-VN")} Credits</strong>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    color: "#34d399",
                    fontSize: "12px",
                    fontWeight: 750,
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#10b981",
                      boxShadow: "0 0 10px #10b981",
                      display: "inline-block",
                    }}
                  />
                  <span>Tự động quét SePay (Cộng credit ngay khi nhận tiền)</span>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    padding: "8px 18px",
                    color: "#cbd5e1",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
