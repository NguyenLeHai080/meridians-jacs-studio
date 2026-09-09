import { useState, useEffect, useMemo, useCallback } from "react";
import type { CreditConfig } from "../../../core/types";
import {
  planService,
  CreditPackage,
  CreditTopupTransaction,
} from "../services/planService";
import { showToast } from "../../../core/swal";
import { useI18n } from "../../../core/i18n";

export interface UsePlansManagementOptions {
  externalSearch?: string;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export interface PackageFormState {
  name: string;
  price: number;
  base_credits: number;
  bonus_percent: number;
  total_credits: number;
  badge: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

const DEFAULT_PACKAGE_FORM: PackageFormState = {
  name: "",
  price: 500000,
  base_credits: 500000,
  bonus_percent: 10,
  total_credits: 550000,
  badge: "",
  description: "",
  sort_order: 1,
  is_active: true,
};

export const usePlansManagement = ({
  externalSearch = "",
  onNotify,
}: UsePlansManagementOptions = {}) => {
  const { t } = useI18n();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<"packages" | "transactions" | "rates">("packages");

  // Loading States
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [txActionLoading, setTxActionLoading] = useState(false);

  // Credit Config
  const [creditConfig, setCreditConfig] = useState<CreditConfig>({
    price_per_1m_token: 1000,
    cost_per_1m_token: 650,
    token_in_price: 500,
    token_out_price: 900,
    min_deposit_amount: 100000,
    is_active: true,
  });

  // Credit Packages
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [packageForm, setPackageForm] = useState<PackageFormState>(DEFAULT_PACKAGE_FORM);
  const [showDeletePkgModal, setShowDeletePkgModal] = useState(false);
  const [pkgToDelete, setPkgToDelete] = useState<CreditPackage | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<CreditTopupTransaction[]>([]);
  const [searchFilter, setSearchFilter] = useState(externalSearch);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Transaction Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [txToApprove, setTxToApprove] = useState<CreditTopupTransaction | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [txToReject, setTxToReject] = useState<CreditTopupTransaction | null>(null);

  // Simulator
  const [simAmount, setSimAmount] = useState<number>(500000);

  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      if (onNotify) onNotify(msg, type);
      else showToast(msg, type);
    },
    [onNotify]
  );

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [cfgRes, pkgsRes, txsRes] = await Promise.allSettled([
        planService.getCreditConfig(),
        planService.getCreditPackages(),
        planService.getCreditTopupTransactions(),
      ]);

      if (cfgRes.status === "fulfilled" && cfgRes.value) {
        setCreditConfig((prev) => ({ ...prev, ...cfgRes.value }));
      }
      if (pkgsRes.status === "fulfilled" && pkgsRes.value) {
        setPackages(pkgsRes.value);
      }
      if (txsRes.status === "fulfilled" && txsRes.value) {
        setTransactions(txsRes.value);
      }
    } catch {
      notify(t("toastFetchError", "Không thể tải dữ liệu gói credit & giao dịch."), "error");
    } finally {
      setLoading(false);
    }
  }, [notify, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync external search
  useEffect(() => {
    if (externalSearch) setSearchFilter(externalSearch);
  }, [externalSearch]);

  // Reset page on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, statusFilter, pageSize]);

  // Metrics
  const metrics = useMemo(() => {
    const totalPackages = packages.length;
    const activePackages = packages.filter((p) => p.is_active).length;
    const pendingTopups = transactions.filter(
      (tx) => (tx.status || "").toUpperCase() === "PENDING"
    ).length;
    const totalRevenue = transactions
      .filter((tx) => {
        const s = (tx.status || "").toUpperCase();
        return s === "COMPLETED" || s === "APPROVED";
      })
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    return { totalPackages, activePackages, pendingTopups, totalRevenue };
  }, [packages, transactions]);

  // Simulator Calculations
  const simulation = useMemo(() => {
    const pricePer1M = creditConfig.price_per_1m_token || 1000;
    const costPer1M = creditConfig.cost_per_1m_token || 650;
    const baseCredits = Math.round((simAmount / pricePer1M) * 1000000);
    const estCost = Math.round((baseCredits / 1000000) * costPer1M);
    const estProfit = simAmount - estCost;
    const profitMargin = simAmount > 0 ? ((estProfit / simAmount) * 100).toFixed(1) : "0.0";

    return { baseCredits, estCost, estProfit, profitMargin };
  }, [simAmount, creditConfig]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    let list = transactions;

    if (statusFilter !== "all") {
      list = list.filter(
        (tx) => (tx.status || "").toUpperCase() === statusFilter.toUpperCase()
      );
    }

    const q = searchFilter.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (tx) =>
          tx.order_code?.toLowerCase().includes(q) ||
          tx.customer_name?.toLowerCase().includes(q) ||
          tx.license_key?.toLowerCase().includes(q) ||
          tx.hwid?.toLowerCase().includes(q) ||
          tx.package_name?.toLowerCase().includes(q) ||
          tx.transfer_content?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [transactions, statusFilter, searchFilter]);

  // Paginated Transactions
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, safeCurrentPage, pageSize]);

  // Save Token Rate Config
  const handleSaveCreditConfig = async () => {
    try {
      setSaveLoading(true);
      await planService.saveCreditConfig(creditConfig);
      notify(t("toastSaveConfigSuccess", "Đã lưu cấu hình tỷ giá Token thành công."), "success");
    } catch {
      notify(t("toastError", "Lỗi lưu cấu hình tỷ giá."), "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Open Create Package Modal
  const handleOpenCreatePackage = () => {
    const defaultPrice = 500000;
    const pricePer1M = creditConfig.price_per_1m_token || 1000;
    const baseCredits = Math.round((defaultPrice / pricePer1M) * 1000000);
    const bonus = 10;
    const totalCredits = Math.round(baseCredits * (1 + bonus / 100));

    setPackageForm({
      ...DEFAULT_PACKAGE_FORM,
      price: defaultPrice,
      base_credits: baseCredits,
      bonus_percent: bonus,
      total_credits: totalCredits,
      sort_order: packages.length + 1,
    });
    setIsEditingPackage(false);
    setSelectedPackage(null);
    setShowPackageModal(true);
  };

  // Open Edit Package Modal
  const handleOpenEditPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setIsEditingPackage(true);
    setPackageForm({
      name: pkg.name || "",
      price: pkg.price || 0,
      base_credits: pkg.base_credits || 0,
      bonus_percent: pkg.bonus_percent || 0,
      total_credits: pkg.total_credits || 0,
      badge: pkg.badge || "",
      description: pkg.description || "",
      sort_order: pkg.sort_order || 1,
      is_active: pkg.is_active ?? true,
    });
    setShowPackageModal(true);
  };

  // Auto-calculate Package Form Credits on Price / Bonus Change
  const updatePackageFormPrice = (newPrice: number) => {
    const pricePer1M = creditConfig.price_per_1m_token || 1000;
    const baseCredits = Math.round((newPrice / pricePer1M) * 1000000);
    const totalCredits = Math.round(baseCredits * (1 + packageForm.bonus_percent / 100));
    setPackageForm((prev) => ({
      ...prev,
      price: newPrice,
      base_credits: baseCredits,
      total_credits: totalCredits,
    }));
  };

  const updatePackageFormBonus = (newBonus: number) => {
    const totalCredits = Math.round(packageForm.base_credits * (1 + newBonus / 100));
    setPackageForm((prev) => ({
      ...prev,
      bonus_percent: newBonus,
      total_credits: totalCredits,
    }));
  };

  // Submit Package Form
  const handleSavePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageForm.name.trim() || packageForm.price <= 0) return;

    try {
      setSaveLoading(true);
      if (isEditingPackage && selectedPackage) {
        await planService.updateCreditPackage(selectedPackage.id, packageForm);
        notify(t("toastUpdatePackageSuccess", "Đã cập nhật gói Credit thành công."), "success");
      } else {
        await planService.createCreditPackage(packageForm);
        notify(t("toastCreatePackageSuccess", "Đã tạo mới gói Credit thành công."), "success");
      }
      setShowPackageModal(false);
      await fetchData();
    } catch {
      notify(t("toastError", "Lỗi lưu thông tin gói Credit."), "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Toggle Package Status
  const handleTogglePackageStatus = async (pkg: CreditPackage) => {
    try {
      await planService.updateCreditPackage(pkg.id, { is_active: !pkg.is_active });
      notify(
        `Đã ${!pkg.is_active ? "mở bán" : "tạm ẩn"} gói ${pkg.name}`,
        "success"
      );
      await fetchData();
    } catch {
      notify(t("toastError", "Lỗi cập nhật trạng thái gói."), "error");
    }
  };

  // Open Delete Package Modal
  const handleOpenDeletePackage = (pkg: CreditPackage) => {
    setPkgToDelete(pkg);
    setShowDeletePkgModal(true);
  };

  // Submit Delete Package
  const handleDeletePackageSubmit = async () => {
    if (!pkgToDelete) return;
    try {
      setSaveLoading(true);
      await planService.deleteCreditPackage(pkgToDelete.id);
      notify(t("toastDeletePackageSuccess", `Đã xóa gói ${pkgToDelete.name}`), "success");
      setShowDeletePkgModal(false);
      setPkgToDelete(null);
      await fetchData();
    } catch {
      notify(t("toastError", "Lỗi xóa gói Credit."), "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Open Approve Transaction Modal
  const handleOpenApproveTopup = (tx: CreditTopupTransaction) => {
    setTxToApprove(tx);
    setShowApproveModal(true);
  };

  // Submit Approve Transaction
  const handleApproveTopupSubmit = async () => {
    if (!txToApprove) return;
    try {
      setTxActionLoading(true);
      await planService.approveCreditTopup(txToApprove.id);
      notify(
        t(
          "toastApproveSuccess",
          `Đã duyệt thành công đơn ${txToApprove.order_code} (+${txToApprove.credits_granted.toLocaleString()} credits)`
        ),
        "success"
      );
      setShowApproveModal(false);
      setTxToApprove(null);
      await fetchData();
    } catch {
      notify(t("toastError", "Lỗi duyệt đơn nạp credit."), "error");
    } finally {
      setTxActionLoading(false);
    }
  };

  // Open Reject Transaction Modal
  const handleOpenRejectTopup = (tx: CreditTopupTransaction) => {
    setTxToReject(tx);
    setShowRejectModal(true);
  };

  // Submit Reject Transaction
  const handleRejectTopupSubmit = async () => {
    if (!txToReject) return;
    try {
      setTxActionLoading(true);
      await planService.rejectCreditTopup(txToReject.id);
      notify(
        t("toastRejectSuccess", `Đã từ chối đơn ${txToReject.order_code}`),
        "success"
      );
      setShowRejectModal(false);
      setTxToReject(null);
      await fetchData();
    } catch {
      notify(t("toastError", "Lỗi từ chối đơn nạp."), "error");
    } finally {
      setTxActionLoading(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    loading,
    saveLoading,
    txActionLoading,
    creditConfig,
    setCreditConfig,
    packages,
    transactions,
    metrics,
    simulation,
    simAmount,
    setSimAmount,
    // Transactions Filtering & Pagination
    searchFilter,
    setSearchFilter,
    statusFilter,
    setStatusFilter,
    currentPage: safeCurrentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredTransactions,
    paginatedTransactions,
    totalPages,
    // Package Modal
    showPackageModal,
    setShowPackageModal,
    isEditingPackage,
    selectedPackage,
    packageForm,
    setPackageForm,
    updatePackageFormPrice,
    updatePackageFormBonus,
    showDeletePkgModal,
    setShowDeletePkgModal,
    pkgToDelete,
    // Transaction Action Modals
    showApproveModal,
    setShowApproveModal,
    txToApprove,
    showRejectModal,
    setShowRejectModal,
    txToReject,
    // Actions
    fetchData,
    handleSaveCreditConfig,
    handleOpenCreatePackage,
    handleOpenEditPackage,
    handleSavePackageSubmit,
    handleTogglePackageStatus,
    handleOpenDeletePackage,
    handleDeletePackageSubmit,
    handleOpenApproveTopup,
    handleApproveTopupSubmit,
    handleOpenRejectTopup,
    handleRejectTopupSubmit,
  };
};
