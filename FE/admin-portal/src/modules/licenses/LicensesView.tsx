import React, { useState, useMemo } from "react";
import { License } from "../../core/types";
import { Button } from "../../components/common/Button";
import { Badge } from "../../components/common/Badge";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Modal } from "../../components/common/Modal";
import { CopyButton } from "../../components/common/CopyButton";
import { Pagination } from "../../components/common/Pagination";
import { Toast } from "../../components/common/Toast";

interface LicensesViewProps {
  licenses: License[];
  onCreateLicense: (data: {
    customer_name: string;
    customer_contact: string;
    hwid: string;
    expires_at: string | null;
    max_jobs_per_day: number;
    premium_ai: boolean;
    logo_url?: string;
    notes?: string;
    amount: number;
    plan_type: string;
    payment_method: string;
  }) => Promise<{ key: string }>;
  onUpdateLicense: (
    id: string,
    data: {
      customer_name?: string;
      customer_contact?: string;
      max_jobs_per_day?: number;
      premium_ai?: boolean;
      logo_url?: string;
      notes?: string;
      expires_at?: string | null;
    }
  ) => Promise<void>;
  onDeleteLicense: (id: string) => Promise<void>;
  onToggleStatus: (license: License) => Promise<void>;
  onRenewLicense: (
    id: string,
    data: {
      expires_at: string;
      reason: string;
      amount: number;
      plan_type: string;
      payment_method: string;
    }
  ) => Promise<void>;
  onResetHwid: (id: string, data: { hwid: string; reason: string }) => Promise<void>;
  isCreatingModalOpen: boolean;
  onCloseCreatingModal: () => void;
  onOpenCreatingModal: () => void;
}

export function LicensesView({
  licenses,
  onCreateLicense,
  onUpdateLicense,
  onDeleteLicense,
  onToggleStatus,
  onRenewLicense,
  onResetHwid,
  isCreatingModalOpen,
  onCloseCreatingModal,
  onOpenCreatingModal,
}: LicensesViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Feedback state
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // Form states for Create Modal
  const [createForm, setCreateForm] = useState({
    customer_name: "",
    customer_contact: "",
    hwid: "",
    plan_preset: "1_month",
    custom_expires_at: "",
    amount: "500000",
    payment_method: "bank_transfer",
    max_jobs_per_day: "100",
    premium_ai: true,
    logo_url: "",
    notes: "",
  });

  // Edit Modal
  const [editingLicense, setEditingLicense] = useState<License | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: "",
    customer_contact: "",
    max_jobs_per_day: "100",
    premium_ai: true,
    logo_url: "",
    notes: "",
    expires_at: "",
  });

  // Renew Modal
  const [renewingLicense, setRenewingLicense] = useState<License | null>(null);
  const [renewForm, setRenewForm] = useState({
    months_to_add: "1",
    amount: "500000",
    payment_method: "bank_transfer",
    reason: "Gia hạn hợp đồng định kỳ",
  });

  // Reset HWID Modal
  const [resetHwidLicense, setResetHwidLicense] = useState<License | null>(null);
  const [resetHwidForm, setResetHwidForm] = useState({
    new_hwid: "",
    reason: "Khách hàng đổi máy mới",
  });

  // Delete Confirm Modal
  const [deletingLicense, setDeletingLicense] = useState<License | null>(null);

  // Helper HWID Normalization
  function normalizeHwid(value: string) {
    const raw = value.replace(/[\s\u200b-\u200d\ufeff]+/g, "").toUpperCase();
    const match = raw.match(/JACS-(?:MAC|WIN|LNX)-[A-F0-9]{32}/);
    return match ? match[0] : raw;
  }

  // Filtered & Paginated items
  const filteredLicenses = useMemo(() => {
    return (licenses || []).filter((item) => {
      if (!item) return false;
      const matchesSearch =
        (item.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.customer_contact || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.hwid || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.key_hint || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ? true : item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [licenses, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredLicenses.length / pageSize) || 1;
  const paginatedLicenses = filteredLicenses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Handlers
  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const cleanHwid = normalizeHwid(createForm.hwid);
      if (!cleanHwid.startsWith("JACS-")) {
        throw new Error("Mã máy HWID không hợp lệ. Vui lòng lấy từ bản Desktop.");
      }

      // Calculate expiry based on preset
      let expiryDate: Date | null = null;
      if (createForm.plan_preset === "1_month") {
        expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
      } else if (createForm.plan_preset === "3_months") {
        expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 3);
      } else if (createForm.plan_preset === "6_months") {
        expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 6);
      } else if (createForm.plan_preset === "1_year") {
        expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      } else if (createForm.plan_preset === "custom" && createForm.custom_expires_at) {
        expiryDate = new Date(createForm.custom_expires_at);
      }

      const result = await onCreateLicense({
        customer_name: createForm.customer_name.trim(),
        customer_contact: createForm.customer_contact.trim(),
        hwid: cleanHwid,
        expires_at: expiryDate ? expiryDate.toISOString() : null,
        max_jobs_per_day: parseInt(createForm.max_jobs_per_day, 10) || 100,
        premium_ai: createForm.premium_ai,
        logo_url: createForm.logo_url.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
        amount: parseFloat(createForm.amount) || 0,
        plan_type: createForm.plan_preset,
        payment_method: createForm.payment_method,
      });

      setCreatedKey(result.key);
      setMessage(`Đã tạo thành công license cho ${createForm.customer_name}`);
      setCreateForm({
        customer_name: "",
        customer_contact: "",
        hwid: "",
        plan_preset: "1_month",
        custom_expires_at: "",
        amount: "500000",
        payment_method: "bank_transfer",
        max_jobs_per_day: "100",
        premium_ai: true,
        logo_url: "",
        notes: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo license");
    }
  }

  function handleOpenEdit(license: License) {
    setEditingLicense(license);
    setEditForm({
      customer_name: license.customer_name,
      customer_contact: license.customer_contact,
      max_jobs_per_day: String(license.max_jobs_per_day),
      premium_ai: license.premium_ai,
      logo_url: license.logo_url || "",
      notes: license.notes || "",
      expires_at: license.expires_at ? license.expires_at.slice(0, 16) : "",
    });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLicense) return;
    try {
      await onUpdateLicense(editingLicense.id, {
        customer_name: editForm.customer_name.trim(),
        customer_contact: editForm.customer_contact.trim(),
        max_jobs_per_day: parseInt(editForm.max_jobs_per_day, 10) || 100,
        premium_ai: editForm.premium_ai,
        logo_url: editForm.logo_url.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
        expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null,
      });
      setMessage(`Đã cập nhật thông tin key ${editingLicense.key_hint}`);
      setEditingLicense(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật license");
    }
  }

  function handleOpenRenew(license: License) {
    setRenewingLicense(license);
    setRenewForm({
      months_to_add: "1",
      amount: "500000",
      payment_method: "bank_transfer",
      reason: "Gia hạn hợp đồng định kỳ",
    });
  }

  async function handleRenewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!renewingLicense) return;
    try {
      const currentExpiry = renewingLicense.expires_at
        ? new Date(renewingLicense.expires_at)
        : new Date();
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const months = parseInt(renewForm.months_to_add, 10) || 1;
      baseDate.setMonth(baseDate.getMonth() + months);

      await onRenewLicense(renewingLicense.id, {
        expires_at: baseDate.toISOString(),
        reason: renewForm.reason.trim(),
        amount: parseFloat(renewForm.amount) || 0,
        plan_type: `${months}_months`,
        payment_method: renewForm.payment_method,
      });

      setMessage(`Đã gia hạn thành công key ${renewingLicense.key_hint} thêm ${months} tháng`);
      setRenewingLicense(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi gia hạn license");
    }
  }

  function handleOpenResetHwid(license: License) {
    setResetHwidLicense(license);
    setResetHwidForm({ new_hwid: "", reason: "Khách đổi máy" });
  }

  async function handleResetHwidSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetHwidLicense) return;
    try {
      const cleanHwid = normalizeHwid(resetHwidForm.new_hwid);
      if (!cleanHwid.startsWith("JACS-")) {
        throw new Error("Mã máy HWID không hợp lệ.");
      }
      await onResetHwid(resetHwidLicense.id, {
        hwid: cleanHwid,
        reason: resetHwidForm.reason.trim(),
      });
      setMessage(`Đã đổi mã máy thành công cho key ${resetHwidLicense.key_hint}`);
      setResetHwidLicense(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi đổi mã máy");
    }
  }

  async function handleDeleteSubmit() {
    if (!deletingLicense) return;
    try {
      await onDeleteLicense(deletingLicense.id);
      setMessage(`Đã xóa hoàn toàn key ${deletingLicense.key_hint}`);
      setDeletingLicense(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa license");
    }
  }

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title">Quản Lý Key Theo Máy (HWID)</h1>
          <p className="view-subtitle">
            Cấp phép, đổi máy, gia hạn thời gian, cấp logo thương hiệu và quản lý quyền truy cập
          </p>
        </div>
        <div className="view-actions">
          <Button variant="primary" onClick={onOpenCreatingModal} icon={<span>+</span>}>
            Cấp Key Mới
          </Button>
        </div>
      </div>

      {message && <Toast type="success" message={message} onClose={() => setMessage("")} />}
      {error && <Toast type="error" message={error} onClose={() => setError("")} />}

      {/* Bộ lọc tìm kiếm */}
      <div className="filter-bar admin-card mb-6">
        <div className="filter-group-row">
          <div className="search-input-wrap">
            <Input
              placeholder="🔍 Tìm kiếm theo tên khách hàng, SĐT, HWID hoặc mã key..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="status-select-wrap">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động (Active)</option>
              <option value="blocked">Đang bị khóa (Blocked)</option>
              <option value="expired">Đã hết hạn (Expired)</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Bảng danh sách License */}
      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Key Hint</th>
                <th>Khách Hàng / Liên Hệ</th>
                <th>Mã Máy (HWID)</th>
                <th>Logo Cấp</th>
                <th>Hạn Dùng</th>
                <th>Trạng Thái</th>
                <th className="text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLicenses.map((lic) => {
                const isExpired = lic.expires_at && new Date(lic.expires_at) <= new Date();
                const displayStatus = isExpired ? "expired" : lic.status;

                return (
                  <tr key={lic.id}>
                    <td>
                      <div className="key-hint-cell">
                        <code className="key-code">{lic.key_hint}</code>
                        <CopyButton text={lic.key_hint} label="" copiedLabel="" />
                      </div>
                    </td>
                    <td>
                      <strong className="text-white">{lic.customer_name}</strong>
                      <div className="text-muted text-xs">{lic.customer_contact}</div>
                      {lic.notes && <div className="text-amber text-xs italic">Note: {lic.notes}</div>}
                    </td>
                    <td>
                      <div className="hwid-cell">
                        <code className="hwid-code" title={lic.hwid}>
                          {lic.hwid.slice(0, 18)}...
                        </code>
                        <CopyButton text={lic.hwid} label="" copiedLabel="" />
                      </div>
                    </td>
                    <td>
                      {lic.logo_url ? (
                        <div className="logo-preview-badge" title={lic.logo_url}>
                          <img src={lic.logo_url} alt="Logo" className="logo-thumb" />
                          <span className="text-xs">Đã cấp</span>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">Mặc định</span>
                      )}
                    </td>
                    <td>
                      {lic.expires_at ? (
                        <div>
                          <span>{new Date(lic.expires_at).toLocaleDateString("vi-VN")}</span>
                          <div className="text-muted text-xs">
                            {new Date(lic.expires_at).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="badge-pill badge-info">Vĩnh viễn</span>
                      )}
                    </td>
                    <td>
                      <Badge variant={displayStatus === "active" ? "active" : displayStatus === "blocked" ? "blocked" : "expired"}>
                        {displayStatus === "active"
                          ? "Hoạt động"
                          : displayStatus === "blocked"
                          ? "Bị khóa"
                          : "Hết hạn"}
                      </Badge>
                    </td>
                    <td>
                      <div className="table-actions-row">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleStatus(lic)}
                          title={lic.status === "active" ? "Khóa key này" : "Mở khóa key này"}
                        >
                          {lic.status === "active" ? "🔒 Khóa" : "🔓 Mở"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenRenew(lic)}
                          title="Gia hạn thời gian key"
                        >
                          📅 Gia hạn
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenResetHwid(lic)}
                          title="Gán mã máy mới"
                        >
                          🔄 Đổi máy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(lic)}
                          title="Sửa thông tin / Logo"
                        >
                          ✏️ Sửa
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setDeletingLicense(lic)}
                          title="Xóa key"
                        >
                          🗑️
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedLicenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-10">
                    Không tìm thấy license nào phù hợp
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
          totalItems={filteredLicenses.length}
          pageSize={pageSize}
        />
      </div>

      {/* MODAL 1: TẠO LICENSE MỚI */}
      <Modal
        isOpen={isCreatingModalOpen}
        onClose={onCloseCreatingModal}
        title="Cấp Phép License Mới"
        subtitle="Tạo mã bản quyền gắn với mã máy thật và cấp logo thương hiệu riêng"
        maxWidth="680px"
      >
        {createdKey ? (
          <div className="created-key-card animate-scale-in">
            <div className="created-key-badge">🎉 ĐÃ TẠO LICENSE THÀNH CÔNG</div>
            <p className="text-sm text-muted mb-2">
              Hãy gửi mã License Key dưới đây cho khách hàng để kích hoạt trên bản Desktop:
            </p>
            <div className="created-key-box">
              <code className="created-key-text">{createdKey}</code>
              <CopyButton text={createdKey} label="Copy License Key" size="md" />
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="primary"
                onClick={() => {
                  setCreatedKey(null);
                  onCloseCreatingModal();
                }}
              >
                Hoàn tất & Đóng
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Tên Khách Hàng / Studio"
                required
                value={createForm.customer_name}
                onChange={(e) => setCreateForm({ ...createForm, customer_name: e.target.value })}
                placeholder="VD: Nguyễn Văn A / Studio Media"
              />
              <Input
                label="SĐT hoặc Email"
                required
                value={createForm.customer_contact}
                onChange={(e) => setCreateForm({ ...createForm, customer_contact: e.target.value })}
                placeholder="VD: 0987654321 / client@gmail.com"
              />
            </div>

            <Input
              label="Mã Máy Thật (Device ID / HWID)"
              required
              value={createForm.hwid}
              onChange={(e) => setCreateForm({ ...createForm, hwid: e.target.value })}
              placeholder="VD: JACS-WIN-6CEE353124BD6146710EEBC9A3141263"
              helper="Copy từ màn hình Khóa Kích Hoạt của bản Desktop. Không dùng WEB-DEMO-MACHINE."
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Gói Thời Hạn"
                value={createForm.plan_preset}
                onChange={(e) => setCreateForm({ ...createForm, plan_preset: e.target.value })}
              >
                <option value="1_month">1 Tháng (30 ngày)</option>
                <option value="3_months">3 Tháng (90 ngày)</option>
                <option value="6_months">6 Tháng (180 ngày)</option>
                <option value="1_year">1 Năm (365 ngày)</option>
                <option value="lifetime">Vĩnh Viễn (Không hết hạn)</option>
                <option value="custom">Tự chọn ngày cụ thể</option>
              </Select>

              {createForm.plan_preset === "custom" ? (
                <Input
                  label="Ngày Hết Hạn"
                  type="datetime-local"
                  required
                  value={createForm.custom_expires_at}
                  onChange={(e) => setCreateForm({ ...createForm, custom_expires_at: e.target.value })}
                />
              ) : (
                <Input
                  label="Số Tiền Thu (VNĐ)"
                  type="number"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                  placeholder="500000"
                  helper="Tự động ghi nhận vào Dòng Tiền Gia Hạn"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Hình Thức Thanh Toán"
                value={createForm.payment_method}
                onChange={(e) => setCreateForm({ ...createForm, payment_method: e.target.value })}
              >
                <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                <option value="momo">Ví MoMo</option>
                <option value="card">Thẻ tín dụng / Visa</option>
                <option value="cash">Tiền mặt</option>
              </Select>

              <Input
                label="Số Job Tối Đa / Ngày"
                type="number"
                value={createForm.max_jobs_per_day}
                onChange={(e) => setCreateForm({ ...createForm, max_jobs_per_day: e.target.value })}
              />
            </div>

            <Input
              label="Cấp Logo Thương Hiệu Riêng (URL ảnh)"
              value={createForm.logo_url}
              onChange={(e) => setCreateForm({ ...createForm, logo_url: e.target.value })}
              placeholder="VD: https://domain.com/logo-client.png hoặc Data URL"
              helper="Khi khách kích hoạt tool, tool sẽ tự nhận logo này hiển thị trong Brand Kit"
            />

            <Input
              label="Ghi Chú Quản Trị (Tùy chọn)"
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              placeholder="VD: Khách VIP gói nâng cao"
            />

            <div className="modal-footer mt-6">
              <Button variant="ghost" type="button" onClick={onCloseCreatingModal}>
                Hủy
              </Button>
              <Button variant="primary" type="submit">
                Tạo Key & Xuất Bản Quyền
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 2: SỬA LICENSE */}
      <Modal
        isOpen={Boolean(editingLicense)}
        onClose={() => setEditingLicense(null)}
        title="Chỉnh Sửa Thông Tin License"
        subtitle={`Chỉnh sửa thông tin cho key ${editingLicense?.key_hint}`}
        maxWidth="600px"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Tên Khách Hàng / Studio"
            required
            value={editForm.customer_name}
            onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
          />

          <Input
            label="SĐT / Email Liên Hệ"
            required
            value={editForm.customer_contact}
            onChange={(e) => setEditForm({ ...editForm, customer_contact: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Số Job / Ngày"
              type="number"
              value={editForm.max_jobs_per_day}
              onChange={(e) => setEditForm({ ...editForm, max_jobs_per_day: e.target.value })}
            />
            <Input
              label="Ngày Hết Hạn"
              type="datetime-local"
              value={editForm.expires_at}
              onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
              helper="Để trống nếu vĩnh viễn"
            />
          </div>

          <Input
            label="Logo Thương Hiệu Cấp Riêng (URL ảnh)"
            value={editForm.logo_url}
            onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })}
            placeholder="https://... hoặc Data URL"
          />

          <Input
            label="Ghi Chú"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />

          <div className="modal-footer mt-6">
            <Button variant="ghost" type="button" onClick={() => setEditingLicense(null)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu Thay Đổi
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: GIA HẠN LICENSE */}
      <Modal
        isOpen={Boolean(renewingLicense)}
        onClose={() => setRenewingLicense(null)}
        title="Gia Hạn Thời Gian Sử Dụng Key"
        subtitle={`Gia hạn cho khách hàng ${renewingLicense?.customer_name} (${renewingLicense?.key_hint})`}
        maxWidth="540px"
      >
        <form onSubmit={handleRenewSubmit} className="space-y-4">
          <Select
            label="Thời Gian Gia Hạn Thêm"
            value={renewForm.months_to_add}
            onChange={(e) => setRenewForm({ ...renewForm, months_to_add: e.target.value })}
          >
            <option value="1">+ 1 Tháng (30 ngày)</option>
            <option value="3">+ 3 Tháng (90 ngày)</option>
            <option value="6">+ 6 Tháng (180 ngày)</option>
            <option value="12">+ 1 Năm (365 ngày)</option>
          </Select>

          <Input
            label="Số Tiền Thu Gia Hạn (VNĐ)"
            type="number"
            value={renewForm.amount}
            onChange={(e) => setRenewForm({ ...renewForm, amount: e.target.value })}
            helper="Khoản tiền này sẽ được tự động cộng vào Báo cáo Dòng Tiền"
          />

          <Select
            label="Phương Thức Thanh Toán"
            value={renewForm.payment_method}
            onChange={(e) => setRenewForm({ ...renewForm, payment_method: e.target.value })}
          >
            <option value="bank_transfer">Chuyển khoản ngân hàng</option>
            <option value="momo">Ví MoMo</option>
            <option value="card">Thẻ tín dụng / Visa</option>
            <option value="cash">Tiền mặt</option>
          </Select>

          <Input
            label="Lý Do / Ghi Chú Gia Hạn"
            required
            value={renewForm.reason}
            onChange={(e) => setRenewForm({ ...renewForm, reason: e.target.value })}
          />

          <div className="modal-footer mt-6">
            <Button variant="ghost" type="button" onClick={() => setRenewingLicense(null)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Xác Nhận Gia Hạn & Ghi Nhận Doanh Thu
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: RESET HWID (ĐỔI MÁY) */}
      <Modal
        isOpen={Boolean(resetHwidLicense)}
        onClose={() => setResetHwidLicense(null)}
        title="Đổi Mã Máy (Reset HWID)"
        subtitle={`Gán key ${resetHwidLicense?.key_hint} sang thiết bị phần cứng mới`}
        maxWidth="540px"
      >
        <form onSubmit={handleResetHwidSubmit} className="space-y-4">
          <Input
            label="Mã Máy Mới (HWID)"
            required
            value={resetHwidForm.new_hwid}
            onChange={(e) => setResetHwidForm({ ...resetHwidForm, new_hwid: e.target.value })}
            placeholder="VD: JACS-WIN-..."
            helper="Copy từ bản Desktop trên máy mới của khách hàng"
          />

          <Input
            label="Lý Do Đổi Máy"
            required
            value={resetHwidForm.reason}
            onChange={(e) => setResetHwidForm({ ...resetHwidForm, reason: e.target.value })}
            placeholder="VD: Khách hàng nâng cấp máy tính mới"
          />

          <div className="modal-footer mt-6">
            <Button variant="ghost" type="button" onClick={() => setResetHwidLicense(null)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Xác Nhận Đổi Máy
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 5: XÁC NHẬN XÓA LICENSE */}
      <Modal
        isOpen={Boolean(deletingLicense)}
        onClose={() => setDeletingLicense(null)}
        title="Xác Nhận Xóa License"
        maxWidth="460px"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Bạn có chắc chắn muốn xóa hoàn toàn License key{" "}
            <strong className="text-white">{deletingLicense?.key_hint}</strong> của khách hàng{" "}
            <strong className="text-white">{deletingLicense?.customer_name}</strong>?
          </p>
          <p className="text-xs text-danger">
            ⚠️ Thao tác này không thể hoàn tác. Bản Desktop đang dùng key này sẽ bị ngắt quyền truy cập.
          </p>

          <div className="modal-footer mt-6">
            <Button variant="ghost" onClick={() => setDeletingLicense(null)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleDeleteSubmit}>
              Xóa Vĩnh Viễn
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
