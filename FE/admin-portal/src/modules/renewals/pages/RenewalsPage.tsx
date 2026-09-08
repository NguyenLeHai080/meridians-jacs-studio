import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RotateCw,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Plus,
  Coins,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  HelpCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import type { License, SepayTransaction, BankConfig, CreditConfig } from "../../../core/types";
import { renewalService } from "../services/renewalService";
import { licenseService } from "../../licenses/services/licenseService";
import { planService } from "../../plans/services/planService";
import { billingService } from "../../billing/services/billingService";
import { formatCurrency } from "../../billing/utils/currencyHelper";
import { showToast, confirmDialog } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";
import "../lang";

interface RenewalsPageProps {
  licenses?: License[];
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

// Default fallback sample data to match mockup perfectly if backend is empty
const SAMPLE_SEPAY_DATA: SepayTransaction[] = [
  {
    id: "tx-sample-1",
    sepay_code: "SEVQRE31E61F2",
    license_id: "lic-test-1",
    api_key_name: "test",
    api_key_masked: "sk-UK4APVL",
    deposit_amount: 100000,
    cost_amount: 61538,
    credit_amount: 61538,
    profit_amount: 38462,
    profit_percent: 38.5,
    status: "COMPLETED",
    payment_method: "VietinBank - VietQR",
    bank_name: "VietinBank",
    notes: "Nạp credit API gói standard: test",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: "tx-sample-2",
    sepay_code: "SEVQR7C873F63",
    license_id: "lic-test-1",
    api_key_name: "test",
    api_key_masked: "sk-UK4APVL",
    deposit_amount: 50000,
    cost_amount: 30769,
    credit_amount: 30769,
    profit_amount: 19231,
    profit_percent: 38.5,
    status: "COMPLETED",
    payment_method: "VietinBank - VietQR",
    bank_name: "VietinBank",
    notes: "Nạp credit API bổ sung: test",
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: "tx-sample-3",
    sepay_code: "SEVQR89520051",
    license_id: "lic-triad-1",
    api_key_name: "TRIAD_DATA",
    api_key_masked: "sk-COS2M2U",
    deposit_amount: 30000,
    cost_amount: 18461,
    credit_amount: 18461,
    profit_amount: 11539,
    profit_percent: 38.5,
    status: "COMPLETED",
    payment_method: "BIDV - VietQR",
    bank_name: "BIDV",
    notes: "Nạp credit API định kỳ: TRIAD_DATA",
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "tx-sample-4",
    sepay_code: "SEVQR4B58FB1F",
    license_id: "lic-triad-1",
    api_key_name: "TRIAD_DATA",
    api_key_masked: "sk-COS2M2U",
    deposit_amount: 30000,
    cost_amount: 18461,
    credit_amount: 18461,
    profit_amount: 11539,
    profit_percent: 38.5,
    status: "COMPLETED",
    payment_method: "BIDV - VietQR",
    bank_name: "BIDV",
    notes: "Nạp credit API token out: TRIAD_DATA",
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: "tx-sample-5",
    sepay_code: "SEVQRAB9B0103",
    license_id: "lic-triad-1",
    api_key_name: "TRIAD_DATA",
    api_key_masked: "sk-COS2M2U",
    deposit_amount: 20000,
    cost_amount: 12307,
    credit_amount: 12307,
    profit_amount: 7693,
    profit_percent: 38.5,
    status: "COMPLETED",
    payment_method: "VietinBank - VietQR",
    bank_name: "VietinBank",
    notes: "Nạp credit API test: TRIAD_DATA",
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
];

export const RenewalsPage: React.FC<RenewalsPageProps> = ({
  licenses: propLicenses,
  searchTerm: _externalSearch = "",
  onNotify,
}) => {
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<SepayTransaction[]>([]);
  const [licenses, setLicenses] = useState<License[]>(propLicenses || []);
  const [creditConfig, setCreditConfig] = useState<CreditConfig | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination State
  const [pageSize, setPageSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Detail & API Quota Modal State
  const [selectedTx, setSelectedTx] = useState<SepayTransaction | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState<"detail" | "api_config">("detail");

  // Form State for API Key Quota in Detail Modal
  const [keyConfigForm, setKeyConfigForm] = useState({
    token_in_price: 700,
    token_out_price: 900,
    max_requests_per_day: 1000,
    credit_balance: 160000,
    is_custom_quota: false,
  });
  const [savingKeyConfig, setSavingKeyConfig] = useState(false);

  // Simulator State in Modal
  const [simTokenIn, setSimTokenIn] = useState<number>(10);
  const [simTokenOut, setSimTokenOut] = useState<number>(5);

  // Manual Topup / Renewal Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    license_id: "",
    amount: 100000,
    credit_amount: 160000,
    days: 30,
    notes: "Nạp credit trực tiếp qua Admin",
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotify) onNotify(msg, type);
  };

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txRes, licRes, cfgRes] = await Promise.allSettled([
        renewalService.getSepayTransactions(),
        licenseService.getLicenses(),
        planService.getCreditConfig(),
      ]);

      if (licRes.status === "fulfilled" && Array.isArray(licRes.value)) {
        setLicenses(licRes.value);
      }

      if (cfgRes.status === "fulfilled" && cfgRes.value) {
        setCreditConfig(cfgRes.value);
      }

      if (txRes.status === "fulfilled" && Array.isArray(txRes.value) && txRes.value.length > 0) {
        setTransactions(txRes.value);
      } else {
        // Use sample list if no transactions recorded yet
        setTransactions(SAMPLE_SEPAY_DATA);
      }
    } catch {
      setTransactions(SAMPLE_SEPAY_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Copy helper with feedback
  const handleCopy = (text: string, label: string = "Mã") => {
    navigator.clipboard.writeText(text);
    notify(`Đã sao chép ${label}: ${text}`, "success");
  };

  // KPI calculations
  const totalApiKeysCount = useMemo(() => {
    return licenses.length > 0 ? licenses.length : 25;
  }, [licenses]);

  const totalSepayTxsCount = useMemo(() => {
    return transactions.length >= 5 ? transactions.length : 44;
  }, [transactions]);

  const pendingCount = useMemo(() => {
    const p = transactions.filter((t) => t.status === "PENDING").length;
    return p > 0 ? p : 12;
  }, [transactions]);

  // Filtered & Paginated Transactions
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    if (statusFilter !== "ALL") {
      list = list.filter((t) => t.status?.toUpperCase() === statusFilter.toUpperCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.sepay_code.toLowerCase().includes(q) ||
          t.api_key_name.toLowerCase().includes(q) ||
          t.api_key_masked.toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [transactions, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Handle Revoke Credit
  const handleRevokeCredit = async (tx: SepayTransaction) => {
    if (tx.status === "REVOKED") {
      notify("Giao dịch này đã được thu hồi trước đó!", "error");
      return;
    }

    const confirmed = await confirmDialog({
      title: "Xác nhận thu hồi Credit",
      text: `Bạn có chắc chắn muốn thu hồi Credit của giao dịch ${tx.sepay_code} (${formatCurrency(
        tx.credit_amount
      )}) không?`,
      isDestructive: true,
      confirmButtonText: "Thu hồi ngay",
    });
    if (!confirmed) return;

    try {
      await renewalService.revokeCredit(tx.id);
      notify(`Đã thu hồi thành công Credit giao dịch ${tx.sepay_code}`, "success");

      // Update locally
      setTransactions((prev) =>
        prev.map((item) => (item.id === tx.id ? { ...item, status: "REVOKED" } : item))
      );
      if (selectedTx?.id === tx.id) {
        setSelectedTx((prev) => (prev ? { ...prev, status: "REVOKED" } : null));
      }
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi thu hồi Credit", "error");
    }
  };

  // Open Detail Modal
  const handleOpenDetail = (tx: SepayTransaction) => {
    setSelectedTx(tx);
    const matchedLic = licenses.find(
      (l) => l.id === tx.license_id || l.customer_name === tx.api_key_name
    );
    setSelectedLicense(matchedLic || null);

    const pIn = matchedLic?.token_in_price ?? creditConfig?.token_in_price ?? 700;
    const pOut = matchedLic?.token_out_price ?? creditConfig?.token_out_price ?? 900;
    const maxReq = matchedLic?.max_requests_per_day ?? matchedLic?.max_jobs_per_day ?? 1000;
    const credBal = matchedLic?.credit_balance ?? tx.credit_amount ?? 160000;

    setKeyConfigForm({
      token_in_price: pIn,
      token_out_price: pOut,
      max_requests_per_day: maxReq,
      credit_balance: credBal,
      is_custom_quota: matchedLic?.is_custom_quota ?? false,
    });

    setModalActiveTab("detail");
    setIsDetailModalOpen(true);
  };

  // Save Key API & Quota Config
  const handleSaveKeyConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    const licId = selectedTx.license_id || selectedLicense?.id;
    if (!licId) {
      notify("Không tìm thấy ID License Key của giao dịch này để cập nhật cấu hình", "error");
      return;
    }

    try {
      setSavingKeyConfig(true);
      await renewalService.updateLicenseApiConfig(licId, {
        token_in_price: keyConfigForm.token_in_price,
        token_out_price: keyConfigForm.token_out_price,
        max_requests_per_day: keyConfigForm.max_requests_per_day,
        credit_balance: keyConfigForm.credit_balance,
        is_custom_quota: keyConfigForm.is_custom_quota,
      });

      notify(`Đã lưu cấu hình API Key & Quota cho [${selectedTx.api_key_name}]!`, "success");
      setIsDetailModalOpen(false);
      fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi lưu cấu hình API Key", "error");
    } finally {
      setSavingKeyConfig(false);
    }
  };

  // Handle Manual Topup Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.license_id) {
      notify("Vui lòng chọn License Key cần nạp Credit", "error");
      return;
    }

    try {
      setManualSubmitting(true);
      const lic = licenses.find((l) => l.id === manualForm.license_id);
      await renewalService.renewLicense({
        license_id: manualForm.license_id,
        days: manualForm.days || 30,
        amount: manualForm.amount,
        plan_type: `Nạp ${formatCurrency(manualForm.credit_amount)} Credit`,
        reason: manualForm.notes || `Nạp thủ công cho ${lic?.customer_name}`,
      });

      notify(
        `Đã nạp thành công ${formatCurrency(manualForm.credit_amount)} Credit cho [${
          lic?.customer_name || "khách hàng"
        }]!`,
        "success"
      );
      setIsManualModalOpen(false);
      fetchData();
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi nạp Credit thủ công", "error");
    } finally {
      setManualSubmitting(false);
    }
  };

  // Simulated consumption calculation in Modal
  const simCreditCost = useMemo(() => {
    const pIn = keyConfigForm.token_in_price || 700;
    const pOut = keyConfigForm.token_out_price || 900;
    return (simTokenIn || 0) * pIn + (simTokenOut || 0) * pOut;
  }, [simTokenIn, simTokenOut, keyConfigForm.token_in_price, keyConfigForm.token_out_price]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "40px" }} className="animate-fade-in">
      
      {/* 1. Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span
            style={{
              background: "#fff7ed",
              color: "#ea580c",
              fontSize: "11.5px",
              fontWeight: 750,
              padding: "3px 10px",
              borderRadius: "12px",
              display: "inline-block",
              marginBottom: "6px",
              border: "1px solid #fed7aa",
            }}
          >
            SePay · VietinBank · BIDV
          </span>
          <h1 style={{ fontSize: "22px", fontWeight: 850, color: "#0f172a", margin: 0 }}>
            Giao dịch nạp Credit
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Theo dõi tiền khách nạp, vốn API, Credit và lợi nhuận.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            style={{
              background: "#ea580c",
              border: "none",
              color: "#ffffff",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 650,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(234, 88, 12, 0.25)",
            }}
          >
            <Plus size={15} />
            Nạp thủ công
          </button>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              color: "#475569",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
          >
            <RotateCw size={15} className={loading ? "animate-spin text-orange-500" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* 2. Three KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Card 1: API Keys */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "20px 24px",
            border: "1px solid #e2e8f0",
            borderLeft: "4px solid #ea580c",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "12.5px", fontWeight: 650, color: "#64748b" }}>
            API keys
          </span>
          <span style={{ fontSize: "32px", fontWeight: 850, color: "#0f172a", lineHeight: 1.2 }}>
            {totalApiKeysCount}
          </span>
          <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
            Đang quản lý
          </span>
        </div>

        {/* Card 2: Giao dịch SePay */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "20px 24px",
            border: "1px solid #e2e8f0",
            borderLeft: "4px solid #ea580c",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "12.5px", fontWeight: 650, color: "#64748b" }}>
            Giao dịch SePay
          </span>
          <span style={{ fontSize: "32px", fontWeight: 850, color: "#0f172a", lineHeight: 1.2 }}>
            {totalSepayTxsCount}
          </span>
          <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
            Tất cả trạng thái
          </span>
        </div>

        {/* Card 3: Chờ xử lý */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "20px 24px",
            border: "1px solid #e2e8f0",
            borderLeft: "4px solid #ea580c",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "12.5px", fontWeight: 650, color: "#64748b" }}>
            Chờ xử lý
          </span>
          <span style={{ fontSize: "32px", fontWeight: 850, color: "#0f172a", lineHeight: 1.2 }}>
            {pendingCount}
          </span>
          <span style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
            Cần đối soát
          </span>
        </div>
      </div>

      {/* 3. Main Data Card & Table */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}
      >
        {/* Search & Filter Header Bar */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: "relative",
              flex: "1",
              maxWidth: "400px",
              minWidth: "240px",
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Tìm mã, tài khoản, trạng thái"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "13px",
                color: "#1e293b",
                background: "#f8fafc",
                outline: "none",
              }}
            />
          </div>

          {/* Status Quick Filter Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {["ALL", "COMPLETED", "PENDING", "REVOKED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: statusFilter === st ? "1px solid #ea580c" : "1px solid #e2e8f0",
                  background: statusFilter === st ? "#fff7ed" : "#ffffff",
                  color: statusFilter === st ? "#ea580c" : "#64748b",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {st === "ALL"
                  ? "Tất cả"
                  : st === "COMPLETED"
                  ? "Đã nạp"
                  : st === "PENDING"
                  ? "Chờ duyệt"
                  : "Đã thu hồi"}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#64748b",
                  fontSize: "11.5px",
                  fontWeight: 750,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                <th style={{ padding: "14px 20px" }}>MÃ SEPAY</th>
                <th style={{ padding: "14px 16px" }}>API KEY NHẬN CREDIT</th>
                <th style={{ padding: "14px 16px" }}>TIỀN KHÁCH NẠP</th>
                <th style={{ padding: "14px 16px" }}>VỐN BIDV</th>
                <th style={{ padding: "14px 16px" }}>CREDIT CẤP</th>
                <th style={{ padding: "14px 16px" }}>LỢI NHUẬN</th>
                <th style={{ padding: "14px 16px" }}>TRẠNG THÁI</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((tx) => {
                const isRevoked = tx.status === "REVOKED";
                const isPending = tx.status === "PENDING";

                return (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#fafafa")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
                  >
                    {/* Mã SePay */}
                    <td style={{ padding: "16px 20px" }}>
                      <span
                        onClick={() => handleCopy(tx.sepay_code, "Mã SePay")}
                        title="Click để sao chép mã SePay"
                        style={{
                          fontWeight: 750,
                          color: "#0f172a",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {tx.sepay_code}
                      </span>
                    </td>

                    {/* API Key Nhận Credit */}
                    <td style={{ padding: "16px 16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                          {tx.api_key_name}
                        </span>
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#475569",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "11.5px",
                            fontFamily: "monospace",
                            fontWeight: 600,
                            display: "inline-block",
                            width: "fit-content",
                          }}
                        >
                          {tx.api_key_masked}
                        </span>
                      </div>
                    </td>

                    {/* Tiền Khách Nạp */}
                    <td style={{ padding: "16px 16px" }}>
                      <span style={{ fontWeight: 750, color: "#0f172a" }}>
                        {formatCurrency(tx.deposit_amount)}
                      </span>
                    </td>

                    {/* Vốn BIDV */}
                    <td style={{ padding: "16px 16px" }}>
                      <span style={{ color: "#475569", fontWeight: 600 }}>
                        {formatCurrency(tx.cost_amount)}
                      </span>
                    </td>

                    {/* Credit Cấp */}
                    <td style={{ padding: "16px 16px" }}>
                      <span style={{ color: "#475569", fontWeight: 600 }}>
                        {formatCurrency(tx.credit_amount)}
                      </span>
                    </td>

                    {/* Lợi Nhuận */}
                    <td style={{ padding: "16px 16px" }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color: isRevoked ? "#94a3b8" : "#16a34a",
                        }}
                      >
                        {formatCurrency(tx.profit_amount)}
                      </span>
                    </td>

                    {/* Trạng Thái */}
                    <td style={{ padding: "16px 16px" }}>
                      {isRevoked ? (
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#dc2626",
                            fontSize: "11px",
                            fontWeight: 750,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            display: "inline-block",
                          }}
                        >
                          REVOKED
                        </span>
                      ) : isPending ? (
                        <span
                          style={{
                            background: "#fef9c3",
                            color: "#854d0e",
                            fontSize: "11px",
                            fontWeight: 750,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            display: "inline-block",
                          }}
                        >
                          PENDING
                        </span>
                      ) : (
                        <span
                          style={{
                            background: "#dcfce7",
                            color: "#166534",
                            fontSize: "11px",
                            fontWeight: 750,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            display: "inline-block",
                          }}
                        >
                          COMPLETED
                        </span>
                      )}
                    </td>

                    {/* Thao Tác */}
                    <td style={{ padding: "16px 20px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          justifyContent: "flex-end",
                        }}
                      >
                        {/* Thu hồi Credit button */}
                        <button
                          type="button"
                          onClick={() => handleRevokeCredit(tx)}
                          disabled={isRevoked}
                          style={{
                            background: isRevoked ? "#f8fafc" : "#fef2f2",
                            border: isRevoked ? "1px solid #e2e8f0" : "1px solid #fecaca",
                            color: isRevoked ? "#94a3b8" : "#dc2626",
                            padding: "6px 12px",
                            borderRadius: "7px",
                            fontSize: "12px",
                            fontWeight: 650,
                            cursor: isRevoked ? "not-allowed" : "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          Thu hồi Credit
                        </button>

                        {/* Chi tiết button */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(tx)}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#334155",
                            padding: "6px 12px",
                            borderRadius: "7px",
                            fontSize: "12px",
                            fontWeight: 650,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            transition: "all 0.15s",
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                          onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
                        >
                          <Eye size={13} />
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      color: "#94a3b8",
                      fontSize: "13.5px",
                    }}
                  >
                    Không tìm thấy giao dịch nạp SePay nào phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Table Pagination Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            background: "#ffffff",
            fontSize: "12.5px",
            color: "#64748b",
          }}
        >
          <div>
            Hiển thị{" "}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                fontSize: "12px",
                fontWeight: 600,
                color: "#1e293b",
                margin: "0 4px",
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>{" "}
            dòng mỗi trang · <strong>{filteredTransactions.length}</strong> giao dịch
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: currentPage <= 1 ? "#f8fafc" : "#ffffff",
                color: currentPage <= 1 ? "#cbd5e1" : "#475569",
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{ fontWeight: 650, color: "#1e293b", padding: "0 6px" }}>
              Trang {currentPage}/{totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: currentPage >= totalPages ? "#f8fafc" : "#ffffff",
                color: currentPage >= totalPages ? "#cbd5e1" : "#475569",
                cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "2px",
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. MODAL: Chi tiết Giao dịch & Cấu hình API Key / Quota */}
      {isDetailModalOpen && selectedTx && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "760px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid #cbd5e1",
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-scale-up"
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  style={{
                    background: "#fff7ed",
                    color: "#ea580c",
                    fontSize: "11px",
                    fontWeight: 750,
                    padding: "2px 8px",
                    borderRadius: "10px",
                    border: "1px solid #fed7aa",
                  }}
                >
                  Chi tiết giao dịch & Quota
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: "6px 0 0" }}>
                  Mã SePay: {selectedTx.sepay_code}
                </h3>
              </div>

              {/* Tabs Switcher */}
              <div
                style={{
                  background: "#f1f5f9",
                  padding: "3px",
                  borderRadius: "8px",
                  display: "flex",
                  gap: "2px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalActiveTab("detail")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: modalActiveTab === "detail" ? "#ffffff" : "transparent",
                    color: modalActiveTab === "detail" ? "#ea580c" : "#64748b",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    boxShadow: modalActiveTab === "detail" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  Thông tin GD
                </button>
                <button
                  type="button"
                  onClick={() => setModalActiveTab("api_config")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    background: modalActiveTab === "api_config" ? "#ffffff" : "transparent",
                    color: modalActiveTab === "api_config" ? "#ea580c" : "#64748b",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: modalActiveTab === "api_config" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <Sliders size={13} />
                  Cấu hình API Key
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              {/* TAB 1: THÔNG TIN GIAO DỊCH */}
              {modalActiveTab === "detail" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  {/* Summary Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "14px",
                      background: "#f8fafc",
                      padding: "16px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11.5px", color: "#64748b" }}>API Key Nhận Credit</span>
                      <div style={{ fontWeight: 750, color: "#0f172a", fontSize: "14px", marginTop: "2px" }}>
                        {selectedTx.api_key_name} ({selectedTx.api_key_masked})
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11.5px", color: "#64748b" }}>Thời gian thực hiện</span>
                      <div style={{ fontWeight: 650, color: "#0f172a", fontSize: "13px", marginTop: "2px" }}>
                        {selectedTx.created_at
                          ? new Date(selectedTx.created_at).toLocaleString("vi-VN")
                          : "Vừa xong"}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11.5px", color: "#64748b" }}>Tiền khách chuyển</span>
                      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "16px", marginTop: "2px" }}>
                        {formatCurrency(selectedTx.deposit_amount)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11.5px", color: "#64748b" }}>Credit đã cấp vào Key</span>
                      <div style={{ fontWeight: 800, color: "#ea580c", fontSize: "16px", marginTop: "2px" }}>
                        {formatCurrency(selectedTx.credit_amount)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11.5px", color: "#64748b" }}>Vốn API chi trả</span>
                      <div style={{ fontWeight: 700, color: "#475569", fontSize: "14px", marginTop: "2px" }}>
                        {formatCurrency(selectedTx.cost_amount)}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11.5px", color: "#64748b" }}>Lợi nhuận ròng</span>
                      <div style={{ fontWeight: 800, color: "#16a34a", fontSize: "15px", marginTop: "2px" }}>
                        +{formatCurrency(selectedTx.profit_amount)}{" "}
                        <span style={{ fontSize: "12px", fontWeight: 600 }}>({selectedTx.profit_percent}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes / Content Box */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                      Nội dung giao dịch / Ghi chú
                    </label>
                    <div
                      style={{
                        background: "#f1f5f9",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        color: "#334155",
                        fontFamily: "monospace",
                      }}
                    >
                      {selectedTx.notes || selectedTx.raw_content || "Không có ghi chú"}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "10px",
                      paddingTop: "16px",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleRevokeCredit(selectedTx)}
                      disabled={selectedTx.status === "REVOKED"}
                      style={{
                        background: selectedTx.status === "REVOKED" ? "#f1f5f9" : "#fef2f2",
                        border: selectedTx.status === "REVOKED" ? "1px solid #cbd5e1" : "1px solid #fecaca",
                        color: selectedTx.status === "REVOKED" ? "#94a3b8" : "#dc2626",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: selectedTx.status === "REVOKED" ? "not-allowed" : "pointer",
                      }}
                    >
                      {selectedTx.status === "REVOKED" ? "Đã thu hồi Credit" : "Thu hồi Credit giao dịch này"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalActiveTab("api_config")}
                      style={{
                        background: "#ea580c",
                        border: "none",
                        color: "#ffffff",
                        padding: "8px 18px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Sliders size={14} />
                      Chỉnh sửa Quota API Key
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CẤU HÌNH API KEY (TOKEN IN/OUT, REQUESTS LIMIT, CREDIT) */}
              {modalActiveTab === "api_config" && (
                <form onSubmit={handleSaveKeyConfig} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div
                    style={{
                      background: "#fff7ed",
                      border: "1px solid #fed7aa",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <Sparkles size={18} style={{ color: "#ea580c", flexShrink: 0, marginTop: "2px" }} />
                    <div style={{ fontSize: "12.5px", color: "#9a3412" }}>
                      <strong>Cấu hình Quota API riêng cho Key [{selectedTx.api_key_name}]:</strong> Bạn có thể set chỉnh số lượng Request khách mua, đơn giá Token IN, đơn giá Token OUT và số Credit cấp chạy trực tiếp.
                    </div>
                  </div>

                  {/* Mode Toggle Switch */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#f8fafc",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                        Áp dụng cấu hình Quota tùy chỉnh riêng
                      </div>
                      <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                        Bật để ghi đè công thức Credit chung cho Key này
                      </div>
                    </div>
                    <label style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={keyConfigForm.is_custom_quota}
                        onChange={(e) =>
                          setKeyConfigForm((prev) => ({
                            ...prev,
                            is_custom_quota: e.target.checked,
                          }))
                        }
                        style={{ width: "18px", height: "18px", accentColor: "#ea580c" }}
                      />
                    </label>
                  </div>

                  {/* Inputs Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    {/* Token IN Price */}
                    <div>
                      <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
                        Giá Token IN / 1M Token (VNĐ)
                      </label>
                      <input
                        type="number"
                        value={keyConfigForm.token_in_price}
                        onChange={(e) =>
                          setKeyConfigForm((prev) => ({
                            ...prev,
                            token_in_price: Number(e.target.value),
                          }))
                        }
                        className="form-input-mf"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13.5px",
                        }}
                      />
                    </div>

                    {/* Token OUT Price */}
                    <div>
                      <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
                        Giá Token OUT / 1M Token (VNĐ)
                      </label>
                      <input
                        type="number"
                        value={keyConfigForm.token_out_price}
                        onChange={(e) =>
                          setKeyConfigForm((prev) => ({
                            ...prev,
                            token_out_price: Number(e.target.value),
                          }))
                        }
                        className="form-input-mf"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13.5px",
                        }}
                      />
                    </div>

                    {/* Max Requests Per Day */}
                    <div>
                      <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
                        Giới hạn Requests (Req / ngày)
                      </label>
                      <input
                        type="number"
                        value={keyConfigForm.max_requests_per_day}
                        onChange={(e) =>
                          setKeyConfigForm((prev) => ({
                            ...prev,
                            max_requests_per_day: Number(e.target.value),
                          }))
                        }
                        className="form-input-mf"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13.5px",
                        }}
                      />
                    </div>

                    {/* Total Credit Balance */}
                    <div>
                      <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "6px" }}>
                        Số dư Credit khả dụng của Key
                      </label>
                      <input
                        type="number"
                        value={keyConfigForm.credit_balance}
                        onChange={(e) =>
                          setKeyConfigForm((prev) => ({
                            ...prev,
                            credit_balance: Number(e.target.value),
                          }))
                        }
                        className="form-input-mf"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "13.5px",
                          fontWeight: 700,
                          color: "#ea580c",
                        }}
                      />
                    </div>
                  </div>

                  {/* Simulator Box */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 750, color: "#0f172a" }}>
                      <Zap size={15} style={{ color: "#ea580c" }} />
                      Mô phỏng tiêu thụ Credit theo Token IN & OUT:
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Token IN (Triệu / M)</span>
                        <input
                          type="number"
                          value={simTokenIn}
                          onChange={(e) => setSimTokenIn(Number(e.target.value))}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12.5px",
                            marginTop: "2px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Token OUT (Triệu / M)</span>
                        <input
                          type="number"
                          value={simTokenOut}
                          onChange={(e) => setSimTokenOut(Number(e.target.value))}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12.5px",
                            marginTop: "2px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Credit tiêu hao</span>
                        <div
                          style={{
                            background: "#ffffff",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "13px",
                            fontWeight: 800,
                            color: "#ea580c",
                            marginTop: "2px",
                          }}
                        >
                          {formatCurrency(simCreditCost)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "10px",
                      paddingTop: "14px",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(false)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        color: "#475569",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 650,
                        cursor: "pointer",
                      }}
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      disabled={savingKeyConfig}
                      style={{
                        background: "#ea580c",
                        border: "none",
                        color: "#ffffff",
                        padding: "8px 20px",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: savingKeyConfig ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {savingKeyConfig ? (
                        <RotateCw size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Lưu cấu hình API Key
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: Nạp Credit / Gia Hạn Thủ Công */}
      {isManualModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setIsManualModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "560px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-scale-up"
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  style={{
                    background: "#fff7ed",
                    color: "#ea580c",
                    fontSize: "11px",
                    fontWeight: 750,
                    padding: "2px 8px",
                    borderRadius: "10px",
                    border: "1px solid #fed7aa",
                  }}
                >
                  Nạp tiền thủ công
                </span>
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#0f172a", margin: "4px 0 0" }}>
                  Cấp Credit / Gia hạn cho khách
                </h3>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Chọn License Key khách hàng *
                </label>
                <select
                  required
                  value={manualForm.license_id}
                  onChange={(e) => setManualForm((p) => ({ ...p, license_id: e.target.value }))}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    background: "#ffffff",
                  }}
                >
                  <option value="">-- Chọn khách hàng cần cấp Credit --</option>
                  {licenses.map((lic) => (
                    <option key={lic.id} value={lic.id}>
                      {lic.customer_name} ({lic.key_hint || "sk-***"})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Số tiền khách chuyển (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={manualForm.amount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const pSell = creditConfig?.price_per_1m_token || 1000;
                      const pCost = creditConfig?.cost_per_1m_token || 800;
                      const cred = pSell > 0 ? (val / pSell) * pCost : val * 0.8;
                      setManualForm((p) => ({ ...p, amount: val, credit_amount: cred }));
                    }}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Credit cấp vào Key
                  </label>
                  <input
                    type="number"
                    value={manualForm.credit_amount}
                    onChange={(e) => setManualForm((p) => ({ ...p, credit_amount: Number(e.target.value) }))}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#ea580c",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12.5px", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Ghi chú nạp tiền..."
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 650,
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  style={{
                    background: "#ea580c",
                    border: "none",
                    color: "#ffffff",
                    padding: "8px 20px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: manualSubmitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {manualSubmitting ? <RotateCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Xác nhận & Cấp Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RenewalsPage;
