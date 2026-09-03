import React, { useState, useMemo } from "react";
import { BillingTransaction, BillingSummary } from "../../core/types";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Modal } from "../../components/common/Modal";
import { Toast } from "../../components/common/Toast";
import { Pagination } from "../../components/common/Pagination";
import { StatsCard } from "../../components/common/StatsCard";

interface BillingViewProps {
  transactions: BillingTransaction[];
  summary: BillingSummary | null;
  onCreateTransaction: (data: {
    customer_name: string;
    amount: number;
    plan_type: string;
    payment_method: string;
    notes?: string;
  }) => Promise<void>;
  onRefresh: () => void;
  loading?: boolean;
}

export function BillingView({
  transactions,
  summary,
  onCreateTransaction,
  onRefresh,
  loading = false,
}: BillingViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState({
    customer_name: "",
    amount: "500000",
    plan_type: "1_month",
    payment_method: "bank_transfer",
    notes: "Thu phí kích hoạt tool",
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.notes || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPlan = planFilter === "all" ? true : tx.plan_type === planFilter;
      const matchesMethod = methodFilter === "all" ? true : tx.payment_method === methodFilter;

      return matchesSearch && matchesPlan && matchesMethod;
    });
  }, [transactions, searchTerm, planFilter, methodFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await onCreateTransaction({
        customer_name: form.customer_name.trim(),
        amount: parseFloat(form.amount) || 0,
        plan_type: form.plan_type,
        payment_method: form.payment_method,
        notes: form.notes.trim() || undefined,
      });
      setMessage(`Đã ghi nhận giao dịch thành công cho ${form.customer_name}`);
      setIsModalOpen(false);
      setForm({
        customer_name: "",
        amount: "500000",
        plan_type: "1_month",
        payment_method: "bank_transfer",
        notes: "Thu phí kích hoạt tool",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi ghi nhận dòng tiền");
    }
  }

  const planLabels: Record<string, string> = {
    "1_month": "1 Tháng",
    "3_months": "3 Tháng",
    "6_months": "6 Tháng",
    "1_year": "1 Năm",
    lifetime: "Vĩnh Viễn",
    renewal: "Gia Hạn",
    new_key: "Cấp Key Mới",
  };

  const methodLabels: Record<string, string> = {
    bank_transfer: "Chuyển Khoản",
    momo: "MoMo",
    card: "Thẻ / Visa",
    cash: "Tiền Mặt",
  };

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title">Quản Lý Dòng Tiền Gia Hạn & Doanh Thu</h1>
          <p className="view-subtitle">
            Theo dõi chi tiết các giao dịch mua mới và gia hạn license bản quyền
          </p>
        </div>
        <div className="view-actions">
          <Button variant="primary" onClick={() => setIsModalOpen(true)} icon={<span>+</span>}>
            Ghi Nhận Giao Dịch
          </Button>
          <Button variant="ghost" onClick={onRefresh} loading={loading} icon={<span>↻</span>}>
            Làm mới
          </Button>
        </div>
      </div>

      {message && <Toast type="success" message={message} onClose={() => setMessage("")} />}
      {error && <Toast type="error" message={error} onClose={() => setError("")} />}

      {/* Thẻ doanh thu */}
      <div className="stats-grid mb-6">
        <StatsCard
          title="Tổng Doanh Thu Tích Lũy"
          value={formatCurrency(summary?.total_revenue || 0)}
          icon={<span>💎</span>}
          color="emerald"
        />
        <StatsCard
          title="Doanh Thu Tháng Này"
          value={formatCurrency(summary?.this_month_revenue || 0)}
          icon={<span>📈</span>}
          color="cyan"
        />
        <StatsCard
          title="Tổng Số Giao Dịch"
          value={summary?.total_transactions || transactions.length}
          subtitle="Các lượt tạo key & gia hạn"
          icon={<span>🧾</span>}
          color="amber"
        />
      </div>

      {/* Bộ lọc */}
      <div className="filter-bar admin-card mb-6">
        <div className="filter-group-row">
          <div className="search-input-wrap">
            <Input
              placeholder="🔍 Tìm theo tên khách hàng hoặc ghi chú giao dịch..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="status-select-wrap">
            <Select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả gói</option>
              <option value="1_month">1 Tháng</option>
              <option value="3_months">3 Tháng</option>
              <option value="6_months">6 Tháng</option>
              <option value="1_year">1 Năm</option>
              <option value="lifetime">Vĩnh Viễn</option>
            </Select>
          </div>

          <div className="status-select-wrap">
            <Select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả hình thức</option>
              <option value="bank_transfer">Chuyển Khoản</option>
              <option value="momo">MoMo</option>
              <option value="card">Thẻ Visa/Mastercard</option>
              <option value="cash">Tiền Mặt</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Bảng giao dịch */}
      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khách Hàng</th>
                <th>Số Tiền</th>
                <th>Gói Dịch Vụ</th>
                <th>Phương Thức</th>
                <th>Thời Gian Giao Dịch</th>
                <th>Ghi Chú</th>
                <th>Người Ghi Nhận</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <strong className="text-white">{tx.customer_name}</strong>
                  </td>
                  <td>
                    <span className="text-emerald font-bold text-base">
                      +{formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td>
                    <span className="badge-pill badge-info">
                      {planLabels[tx.plan_type] || tx.plan_type}
                    </span>
                  </td>
                  <td>
                    <span className="badge-pill badge-neutral">
                      {methodLabels[tx.payment_method] || tx.payment_method}
                    </span>
                  </td>
                  <td>
                    <div className="text-xs">
                      <span>{new Date(tx.created_at).toLocaleDateString("vi-VN")}</span>
                      <div className="text-muted">
                        {new Date(tx.created_at).toLocaleTimeString("vi-VN")}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted text-xs">{tx.notes || "--"}</span>
                  </td>
                  <td>
                    <code className="text-xs">{tx.actor}</code>
                  </td>
                </tr>
              ))}
              {paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-10">
                    Chưa có giao dịch dòng tiền nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredTransactions.length}
          pageSize={pageSize}
        />
      </div>

      {/* MODAL GHI NHẬN GIAO DỊCH */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ghi Nhận Thu Tiền / Giao Dịch Mới"
        subtitle="Lưu lại dòng tiền thu ngoài luồng hoặc gia hạn thủ công"
        maxWidth="540px"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Input
            label="Tên Khách Hàng / Studio"
            required
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            placeholder="VD: Studio Media XYZ"
          />

          <Input
            label="Số Tiền Thu (VNĐ)"
            type="number"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="500000"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Gói Gia Hạn"
              value={form.plan_type}
              onChange={(e) => setForm({ ...form, plan_type: e.target.value })}
            >
              <option value="1_month">1 Tháng</option>
              <option value="3_months">3 Tháng</option>
              <option value="6_months">6 Tháng</option>
              <option value="1_year">1 Năm</option>
              <option value="lifetime">Vĩnh Viễn</option>
              <option value="custom">Gói Tùy Chỉnh</option>
            </Select>

            <Select
              label="Phương Thức Thanh Toán"
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            >
              <option value="bank_transfer">Chuyển Khoản</option>
              <option value="momo">MoMo</option>
              <option value="card">Thẻ / Visa</option>
              <option value="cash">Tiền Mặt</option>
            </Select>
          </div>

          <Input
            label="Ghi Chú Giao Dịch"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="VD: Thu tiền chuyển khoản đợt 2"
          />

          <div className="modal-footer mt-6">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu Giao Dịch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
