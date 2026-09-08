import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  RotateCw,
  Save,
  Calculator,
  Sparkles,
  Info,
  CheckCircle2,
  TrendingUp,
  Coins,
  ArrowRight,
  ShieldCheck,
  Zap,
  Package,
  Wallet,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  Sliders,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Laptop,
  Copy,
  Layers,
} from "lucide-react";
import type { CreditConfig } from "../../../core/types";
import { planService, CreditPackage, CreditTopupTransaction } from "../services/planService";
import { showToast, confirmDialog } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";
import "../lang";

interface PlansPageProps {
  searchTerm?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({ searchTerm: propSearch = "", onNotify }) => {
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  // Credit Packages State
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null);

  // Package Form Modal State
  const [pkgForm, setPkgForm] = useState({
    name: "",
    price: 500000,
    base_credits: 307692,
    bonus_percent: 3,
    total_credits: 316923,
    badge: "",
    description: "",
    sort_order: 1,
    is_active: true,
  });

  // Global Credit & Custom Deposit Config
  const [creditConfig, setCreditConfig] = useState<CreditConfig>({
    price_per_1m_token: 1000,
    cost_per_1m_token: 650,
    token_in_price: 500,
    token_out_price: 900,
    min_deposit_amount: 100000,
    is_active: true,
  });

  // Top-up Transactions Table State
  const [transactions, setTransactions] = useState<CreditTopupTransaction[]>([]);
  const [searchFilter, setSearchFilter] = useState(propSearch);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Simulator Test Amount
  const [simAmount, setSimAmount] = useState<number>(500000);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    showToast(msg, type);
    if (onNotify) onNotify(msg, type);
  };

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cfg, pkgs, txs] = await Promise.allSettled([
        planService.getCreditConfig(),
        planService.getCreditPackages(),
        planService.getCreditTopupTransactions(),
      ]);

      if (cfg.status === "fulfilled" && cfg.value) {
        setCreditConfig({
          price_per_1m_token: cfg.value.price_per_1m_token ?? 1000,
          cost_per_1m_token: cfg.value.cost_per_1m_token ?? 650,
          token_in_price: cfg.value.token_in_price ?? 500,
          token_out_price: cfg.value.token_out_price ?? 900,
          min_deposit_amount: cfg.value.min_deposit_amount ?? 100000,
          is_active: cfg.value.is_active ?? true,
        });
      }

      if (pkgs.status === "fulfilled" && Array.isArray(pkgs.value)) {
        setPackages(pkgs.value);
      }

      if (txs.status === "fulfilled" && Array.isArray(txs.value)) {
        setTransactions(txs.value);
      }
    } catch {
      notify("Không thể tải dữ liệu cấu hình gói credit", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle saving Global Credit Config
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaveLoading(true);
      await planService.saveCreditConfig(creditConfig);
      notify("Đã lưu cấu hình tỷ lệ nạp lẻ & Credits thành công!", "success");
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi lưu cấu hình", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Open Add Package Modal
  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    const nextOrder = packages.length + 1;
    const defaultPrice = 500000;
    const base = Math.round(defaultPrice * (615.385 / 1000));
    const bonus = 3;
    const total = Math.round(base * (1 + bonus / 100));

    setPkgForm({
      name: "",
      price: defaultPrice,
      base_credits: base,
      bonus_percent: bonus,
      total_credits: total,
      badge: "",
      description: "",
      sort_order: nextOrder,
      is_active: true,
    });
    setShowPackageModal(true);
  };

  // Open Edit Package Modal
  const handleOpenEditPackage = (pkg: CreditPackage) => {
    setEditingPackage(pkg);
    setPkgForm({
      name: pkg.name,
      price: pkg.price,
      base_credits: pkg.base_credits,
      bonus_percent: pkg.bonus_percent,
      total_credits: pkg.total_credits,
      badge: pkg.badge || "",
      description: pkg.description || "",
      sort_order: pkg.sort_order || 1,
      is_active: pkg.is_active,
    });
    setShowPackageModal(true);
  };

  // Auto-calculate credits when price or bonus changes in form
  const handlePriceChange = (priceVal: number, bonusVal: number) => {
    const base = Math.round(priceVal * (615.385 / 1000));
    const total = Math.round(base * (1 + (bonusVal || 0) / 100));
    setPkgForm((prev) => ({
      ...prev,
      price: priceVal,
      bonus_percent: bonusVal,
      base_credits: base,
      total_credits: total,
    }));
  };

  // Submit Add / Edit Package
  const handleSavePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgForm.name.trim()) {
      notify("Vui lòng nhập tên gói Credit", "error");
      return;
    }

    try {
      setSaveLoading(true);
      if (editingPackage) {
        const updated = await planService.updateCreditPackage(editingPackage.id, pkgForm);
        setPackages((prev) => prev.map((p) => (p.id === editingPackage.id ? updated : p)));
        notify(`Đã cập nhật gói Credit ${pkgForm.name} thành công!`, "success");
      } else {
        const created = await planService.createCreditPackage(pkgForm);
        setPackages((prev) => [...prev, created]);
        notify(`Đã tạo mới gói Credit ${pkgForm.name} thành công!`, "success");
      }
      setShowPackageModal(false);
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi lưu gói Credit", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete Package
  const handleDeletePackage = async (pkg: CreditPackage) => {
    const confirmed = await confirmDialog({
      title: `Xác nhận xóa gói ${pkg.name}?`,
      html: `<p>Bạn có chắc chắn muốn xóa gói credit <b>${pkg.name}</b> (${pkg.price.toLocaleString("vi-VN")} đ)? Khách hàng trên tool sẽ không thấy gói này nữa.</p>`,
      icon: "warning",
      confirmButtonText: "Xóa Gói",
      cancelButtonText: "Hủy",
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await planService.deleteCreditPackage(pkg.id);
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      notify(`Đã xóa gói ${pkg.name} thành công!`, "success");
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi xóa gói", "error");
    }
  };

  // Toggle Package Active Status
  const handleTogglePackageActive = async (pkg: CreditPackage) => {
    try {
      const updated = await planService.updateCreditPackage(pkg.id, { is_active: !pkg.is_active });
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? updated : p)));
      notify(`Đã ${updated.is_active ? "kích hoạt" : "tạm ẩn"} gói ${pkg.name}`, "success");
    } catch {
      notify("Không thể thay đổi trạng thái gói", "error");
    }
  };

  // Approve Top-up Transaction (Auto grant credit)
  const handleApproveTransaction = async (tx: CreditTopupTransaction) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận duyệt & cấp Credits?",
      html: `
        <div style="text-align: left; font-size: 13.5px; line-height: 1.6; color: #475569;">
          <p>Mã đơn: <b>${tx.order_code || tx.id}</b></p>
          <p>Khách hàng: <b>${tx.customer_name}</b> (${tx.hwid || tx.license_key || "Desktop"})</p>
          <p>Số tiền: <b style="color: #059669;">${tx.amount.toLocaleString("vi-VN")} đ</b></p>
          <p>Credits cấp tự động: <b style="color: #d97706;">+${tx.credits_granted.toLocaleString("vi-VN")} Credits</b></p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px; margin-top: 10px; color: #166534; font-size: 12.5px;">
            ✓ Hệ thống sẽ <b>tự động tăng số dư Credits</b> cho thiết bị/máy của khách hàng ngay lập tức!
          </div>
        </div>
      `,
      icon: "question",
      confirmButtonText: "Duyệt & Cấp Credits Ngay",
      cancelButtonText: "Đóng",
    });
    if (!confirmed) return;

    try {
      setApprovingId(tx.id);
      const res = await planService.approveCreditTopup(tx.id);
      notify(res.message || "Đã duyệt và cấp Credits thành công!", "success");
      // Refresh transactions
      const updatedTxs = await planService.getCreditTopupTransactions();
      setTransactions(updatedTxs);
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi duyệt đơn nạp", "error");
    } finally {
      setApprovingId(null);
    }
  };

  // Reject Top-up Transaction
  const handleRejectTransaction = async (tx: CreditTopupTransaction) => {
    const confirmed = await confirmDialog({
      title: "Xác nhận từ chối đơn nạp?",
      html: `<p>Bạn có chắc chắn muốn hủy đơn nạp <b>${tx.order_code || tx.id}</b> của khách hàng <b>${tx.customer_name}</b>?</p>`,
      icon: "warning",
      confirmButtonText: "Hủy Đơn",
      cancelButtonText: "Quay lại",
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await planService.rejectCreditTopup(tx.id);
      notify("Đã từ chối đơn nạp thành công", "success");
      const updatedTxs = await planService.getCreditTopupTransactions();
      setTransactions(updatedTxs);
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi khi từ chối đơn", "error");
    }
  };

  // Refresh Top-up Transactions List
  const handleRefreshTransactions = async () => {
    try {
      setTxLoading(true);
      const txs = await planService.getCreditTopupTransactions();
      setTransactions(txs);
      notify("Đã làm mới danh sách đơn nạp từ Desktop Tool!", "success");
    } catch {
      notify("Không thể làm mới danh sách đơn nạp", "error");
    } finally {
      setTxLoading(false);
    }
  };

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        !searchFilter ||
        (tx.order_code && tx.order_code.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (tx.customer_name && tx.customer_name.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (tx.license_key && tx.license_key.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (tx.hwid && tx.hwid.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (tx.transfer_content && tx.transfer_content.toLowerCase().includes(searchFilter.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && tx.status === "PENDING") ||
        (statusFilter === "approved" && (tx.status === "APPROVED" || tx.status === "COMPLETED")) ||
        (statusFilter === "rejected" && (tx.status === "REJECTED" || tx.status === "REVOKED"));

      return matchSearch && matchStatus;
    });
  }, [transactions, searchFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalOrders = transactions.length;
    const pendingOrders = transactions.filter((t) => t.status === "PENDING").length;
    const approvedOrders = transactions.filter((t) => t.status === "APPROVED" || t.status === "COMPLETED").length;
    const totalRevenue = transactions
      .filter((t) => t.status === "APPROVED" || t.status === "COMPLETED")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const activePkgs = packages.filter((p) => p.is_active).length;

    return { totalOrders, pendingOrders, approvedOrders, totalRevenue, activePkgs };
  }, [transactions, packages]);

  return (
    <div className="plans-page-container p-6 space-y-6 max-w-[1680px] mx-auto">
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Dịch vụ & Mô hình AI</span>
            <span>/</span>
            <span className="text-amber-600 font-bold">Cấu hình gói credit</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Coins className="text-amber-500" size={26} />
            Quản Lý Gói Credit & Đơn Nạp Desktop Realtime
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cấu hình các gói nạp ưu đãi, tỷ lệ nạp lẻ tùy ý và đối soát / duyệt tự động các yêu cầu nạp tiền từ phần mềm JACS Studio Desktop.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleRefreshTransactions}
            disabled={txLoading || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-300"
          >
            <RotateCw size={14} className={txLoading ? "animate-spin" : ""} />
            Làm Mới Realtime
          </button>

          <button
            type="button"
            onClick={handleOpenAddPackage}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg shadow-sm transition"
          >
            <Plus size={16} />
            Thêm Gói Credit Mới
          </button>
        </div>
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Package size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Gói Credit Đang Mở</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.activePkgs} / {packages.length} <span className="text-xs font-normal text-slate-400">gói</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Doanh Thu Nạp Credit</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">{stats.totalRevenue.toLocaleString("vi-VN")} <span className="text-xs font-normal text-slate-400">đ</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Đơn Nạp Đã Cấp Credits</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{stats.approvedOrders} <span className="text-xs font-normal text-slate-400">đơn</span></div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Đơn Nạp Chờ Xử Lý</div>
            <div className="text-2xl font-black text-orange-600 mt-0.5">{stats.pendingOrders} <span className="text-xs font-normal text-slate-400">yêu cầu</span></div>
          </div>
        </div>
      </div>

      {/* 3. SECTION 1: DANH SÁCH GÓI CREDIT ƯU ĐÃI */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-500" size={18} />
              <h2 className="text-base font-black text-slate-900">Danh Sách Gói Credit Ưu Đãi (Hiển thị trên Tool)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Khách hàng khi quét mã nạp trên Desktop App sẽ nhìn thấy các gói này để chọn lựa nhận thêm % bonus.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddPackage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition"
          >
            <Plus size={14} />
            Thêm Gói Mới
          </button>
        </div>

        {/* Package Grid Cards */}
        <div className="p-5">
          {packages.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Chưa có gói credit nào. Bấm <b>"Thêm Gói Credit Mới"</b> để bắt đầu cấu hình.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative bg-slate-50 hover:bg-white rounded-xl border p-4 transition duration-200 flex flex-col justify-between ${
                    pkg.badge ? "border-amber-400 shadow-md bg-amber-50/20" : "border-slate-200"
                  } ${!pkg.is_active ? "opacity-60 bg-slate-100" : ""}`}
                >
                  {/* Badge */}
                  {pkg.badge && (
                    <div className="absolute -top-2.5 right-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                      {pkg.badge}
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">GÓI CREDIT</div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">{pkg.name}</div>
                    <div className="text-2xl font-black text-slate-900 mt-2">
                      {pkg.price.toLocaleString("vi-VN")} <span className="text-sm font-bold text-slate-600">đ</span>
                    </div>

                    {/* Bonus Badge */}
                    <div className="mt-2.5 inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-extrabold px-2 py-0.5 rounded-md">
                      +{pkg.bonus_percent}% Credit
                    </div>

                    {/* Total Credits */}
                    <div className="mt-3 text-xs font-bold text-slate-700">
                      Nhận <span className="text-amber-600 font-extrabold">{pkg.total_credits.toLocaleString("vi-VN")}</span> Credit
                    </div>

                    {pkg.description && (
                      <div className="text-[11.5px] text-slate-500 mt-1 line-clamp-2">
                        {pkg.description}
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleTogglePackageActive(pkg)}
                      className={`font-bold text-[11px] px-2 py-1 rounded transition ${
                        pkg.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                      }`}
                    >
                      {pkg.is_active ? "● Đang Mở" : "○ Tạm Ẩn"}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPackage(pkg)}
                        className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                        title="Chỉnh sửa gói"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePackage(pkg)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Xóa gói"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. SECTION 2: BẢNG TABLE ĐƠN NẠP CREDITS TỪ TOOL DESKTOP (REALTIME) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Laptop className="text-blue-600" size={18} />
              <h2 className="text-base font-black text-slate-900">Bảng Quản Lý Lịch Sử Nạp & Cấp Credits (Tự Động Qua SePay)</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống tự động đồng bộ thời gian thực từ SePay Webhook ngay khi khách quét mã chuyển khoản thành công và tự động cấp Credit tức thì cho máy khách.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Tìm mã đơn, HWID, Key, Khách..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 w-52"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold text-slate-700"
            >
              <option value="all">Tất cả giao dịch ({transactions.length})</option>
              <option value="approved">🟢 Đã Cấp Credit ({transactions.filter((t) => t.status === "APPROVED" || t.status === "COMPLETED").length})</option>
              <option value="pending">🟡 Chờ Duyệt Thủ Công ({transactions.filter((t) => t.status === "PENDING").length})</option>
              <option value="rejected">🔴 Đã Hủy ({transactions.filter((t) => t.status === "REJECTED" || t.status === "REVOKED").length})</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Mã Đơn / Nội Dung</th>
                <th className="py-3 px-4">Thời Gian</th>
                <th className="py-3 px-4">Thiết Bị / Khách Hàng</th>
                <th className="py-3 px-4">Gói Nạp</th>
                <th className="py-3 px-4 text-right">Số Tiền (VNĐ)</th>
                <th className="py-3 px-4 text-right">Credits Cấp</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-center">Xử Lý Bởi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Chưa có giao dịch nạp credit thành công nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isPending = tx.status === "PENDING";
                  const isApproved = tx.status === "APPROVED" || tx.status === "COMPLETED";
                  const isRejected = tx.status === "REJECTED" || tx.status === "REVOKED";

                  return (
                    <tr key={tx.id} className="hover:bg-amber-50/20 transition">
                      {/* Code & Transfer content */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1">
                          {tx.order_code || tx.id}
                        </div>
                        <div className="text-[11px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {tx.transfer_content || "JACSCR"}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString("vi-VN") : "Vừa xong"}
                      </td>

                      {/* Customer & Machine Info */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{tx.customer_name || "Khách Hàng"}</div>
                        <div className="text-[11px] text-slate-500 font-mono truncate max-w-[180px]" title={tx.hwid || tx.license_key || ""}>
                          {tx.hwid || tx.license_key || "Desktop Client"}
                        </div>
                      </td>

                      {/* Package Name */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{tx.package_name || "Nạp Credits"}</span>
                        {tx.bonus_percent > 0 && (
                          <span className="ml-1 text-[10px] font-extrabold bg-orange-100 text-orange-700 px-1 py-0.5 rounded">
                            +{tx.bonus_percent}%
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        {tx.amount.toLocaleString("vi-VN")} đ
                      </td>

                      {/* Credits Granted */}
                      <td className="py-3 px-4 text-right font-black text-amber-600 whitespace-nowrap">
                        +{tx.credits_granted.toLocaleString("vi-VN")} Cr
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock size={12} />
                            Chờ Duyệt
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle size={12} />
                            Đã Cấp Credits
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                            <XCircle size={12} />
                            Đã Hủy
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproveTransaction(tx)}
                              disabled={approvingId === tx.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded shadow-sm transition flex items-center gap-1"
                            >
                              <CheckCircle size={12} />
                              {approvingId === tx.id ? "Đang cấp..." : "Duyệt & Cấp Credit"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectTransaction(tx)}
                              className="px-2 py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-[11px] rounded border border-slate-300 transition"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            {tx.approved_by === "sepay_webhook" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                ⚡ SePay Tự Động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ {tx.approved_by || "Admin Duyệt"}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. SECTION 3: CẤU HÌNH QUY ĐỔI NẠP LẺ / TÙY Ý & TOKEN SIMULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Custom Rate Config */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sliders size={16} className="text-amber-500" />
                Cấu Hình Tỷ Lệ Quy Đổi Nạp Lẻ & Tối Thiểu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Áp dụng cho khách hàng nhập số tiền tùy ý trên Tool Desktop (không chọn các gói ưu đãi ở trên).
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Giá Bán 1.000.000 Tokens (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={creditConfig.price_per_1m_token}
                    onChange={(e) => setCreditConfig({ ...creditConfig, price_per_1m_token: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    min="100"
                    step="100"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">đ</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Tương đương: 1.000đ = ~615 Credit</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số Tiền Nạp Tối Thiểu (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={creditConfig.min_deposit_amount}
                    onChange={(e) => setCreditConfig({ ...creditConfig, min_deposit_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    min="10000"
                    step="10000"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">đ</span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Mức nạp tối thiểu mỗi lần cho khách</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saveLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                <Save size={14} />
                {saveLoading ? "Đang lưu..." : "Lưu Cấu Hình Nạp Lẻ"}
              </button>
            </div>
          </form>
        </div>

        {/* Quick Simulator Tool */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Calculator size={16} />
              Mô Phỏng Tính Toán Nhanh
            </div>
            <h4 className="text-sm font-black text-white">Kiểm tra quy đổi nạp tiền & Credits</h4>

            <div className="mt-4">
              <label className="block text-xs text-slate-300 font-medium mb-1">Nhập số tiền thử nghiệm (VNĐ):</label>
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-black bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
                step="50000"
              />
            </div>

            <div className="mt-4 p-3 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Số tiền khách nạp:</span>
                <span className="font-bold text-white">{simAmount.toLocaleString("vi-VN")} đ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Credits quy đổi (Gốc):</span>
                <span className="font-bold text-amber-300">
                  {Math.round(simAmount * (615.385 / 1000)).toLocaleString("vi-VN")} Cr
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 mt-4">
            💡 Tỷ lệ tính toán tự động dựa trên cấu hình giá Token và công thức quy đổi Credit toàn hệ thống.
          </div>
        </div>
      </div>

      {/* 6. MODAL THÊM / CHỈNH SỬA GÓI CREDIT */}
      {showPackageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package className="text-amber-500" size={20} />
                {editingPackage ? `Chỉnh Sửa Gói: ${editingPackage.name}` : "Thêm Gói Credit Ưu Đãi Mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowPackageModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePackageSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Gói Credit <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Base, Starter, Growth, Pro, VIP Studio..."
                  value={pkgForm.name}
                  onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giá Bán (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={pkgForm.price}
                    onChange={(e) => handlePriceChange(Number(e.target.value), pkgForm.bonus_percent)}
                    className="w-full px-3 py-2 text-xs font-black bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    step="10000"
                    min="10000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    % Thưởng Bonus (%)
                  </label>
                  <input
                    type="number"
                    value={pkgForm.bonus_percent}
                    onChange={(e) => handlePriceChange(pkgForm.price, Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Credit cơ bản:</span>
                  <span className="font-bold text-slate-800">{pkgForm.base_credits.toLocaleString("vi-VN")} Cr</span>
                </div>
                <div className="flex justify-between font-black text-amber-800 text-sm">
                  <span>Tổng Credit khách nhận:</span>
                  <span className="font-black text-amber-600">+{pkgForm.total_credits.toLocaleString("vi-VN")} Credits</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhãn Nổi Bật (Badge)
                  </label>
                  <input
                    type="text"
                    placeholder="ĐỀ XUẤT, PHỔ BIẾN, TIẾT KIỆM..."
                    value={pkgForm.badge}
                    onChange={(e) => setPkgForm({ ...pkgForm, badge: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thứ Tự Sắp Xếp
                  </label>
                  <input
                    type="number"
                    value={pkgForm.sort_order}
                    onChange={(e) => setPkgForm({ ...pkgForm, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô Tả Gói (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Gói ưu đãi khuyên dùng cho nhà sáng tạo video..."
                  value={pkgForm.description}
                  onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pkg_active_checkbox"
                  checked={pkgForm.is_active}
                  onChange={(e) => setPkgForm({ ...pkgForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                />
                <label htmlFor="pkg_active_checkbox" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Mở bán gói này ngay trên Desktop App
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPackageModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow transition"
                >
                  {saveLoading ? "Đang lưu..." : editingPackage ? "Lưu Thay Đổi" : "Tạo Gói Mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
