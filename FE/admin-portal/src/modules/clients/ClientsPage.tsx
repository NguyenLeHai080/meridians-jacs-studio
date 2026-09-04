import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Users, RefreshCw, KeyRound, Building2 } from "lucide-react";
import type { License, BillingTransaction } from "../../core/types";
import { licenseService } from "../licenses/services/licenseService";
import { billingService } from "../billing/services/billingService";
import { DataTable, StatusBadge, Column } from "../../components/common";

interface ClientItem {
  name: string;
  contact: string;
  keysCount: number;
  activeKeysCount: number;
  totalSpent: number;
  lastSeenAt?: string | null;
  lastPlatform?: string | null;
  logoUrl?: string | null;
}

interface ClientsPageProps {
  licenses?: License[];
  transactions?: BillingTransaction[];
  searchTerm?: string;
  onNavigate?: (menu: any) => void;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({
  licenses: propLicenses,
  transactions: propTransactions,
  searchTerm: externalSearch = "",
  onNotify,
}) => {
  const [licenses, setLicenses] = useState<License[]>(propLicenses || []);
  const [transactions, setTransactions] = useState<BillingTransaction[]>(propTransactions || []);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(externalSearch);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [lics, txs] = await Promise.allSettled([
        licenseService.getLicenses(),
        billingService.getTransactions(),
      ]);
      if (lics.status === "fulfilled" && Array.isArray(lics.value)) {
        setLicenses(lics.value);
      }
      if (txs.status === "fulfilled" && Array.isArray(txs.value)) {
        setTransactions(txs.value);
      }
    } catch {
      if (onNotify) onNotify("Không thể tải danh bạ khách hàng", "error");
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    if (!propLicenses || !propTransactions) {
      fetchData();
    }
  }, [propLicenses, propTransactions, fetchData]);

  useEffect(() => {
    if (externalSearch) {
      setSearchTerm(externalSearch);
    }
  }, [externalSearch]);

  const clientsData = useMemo(() => {
    const map = new Map<string, ClientItem>();

    for (const lic of licenses) {
      const name = lic.customer_name?.trim() || "Chưa đặt tên";
      const contact = lic.customer_contact?.trim() || "";
      const key = `${name}::${contact}`.toLowerCase();

      const existing = map.get(key) || {
        name,
        contact,
        keysCount: 0,
        activeKeysCount: 0,
        totalSpent: 0,
        lastSeenAt: null,
        lastPlatform: null,
        logoUrl: lic.logo_url,
      };

      existing.keysCount += 1;
      if (lic.status === "active") existing.activeKeysCount += 1;
      if (lic.last_seen_at) {
        if (!existing.lastSeenAt || new Date(lic.last_seen_at) > new Date(existing.lastSeenAt)) {
          existing.lastSeenAt = lic.last_seen_at;
          existing.lastPlatform = lic.last_platform;
        }
      }
      if (!existing.logoUrl && lic.logo_url) existing.logoUrl = lic.logo_url;

      map.set(key, existing);
    }

    for (const tx of transactions) {
      if (!tx.customer_name) continue;
      const txName = tx.customer_name.trim().toLowerCase();
      for (const [key, client] of map.entries()) {
        if (
          client.name.toLowerCase() === txName ||
          key.includes(txName)
        ) {
          client.totalSpent += tx.amount || 0;
        }
      }
    }

    return Array.from(map.values());
  }, [licenses, transactions]);

  const filteredClients = useMemo(() => {
    return clientsData.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clientsData, searchTerm]);

  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  const columns: Column<ClientItem>[] = [
    {
      key: "name",
      header: "Khách Hàng / Studio",
      render: (client) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {client.logoUrl ? (
            <img
              src={client.logoUrl}
              alt="Logo"
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                objectFit: "contain",
                background: "#f1f5f9",
                padding: "2px",
                border: "1px solid #e2e8f0",
              }}
            />
          ) : (
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                border: "1px solid #fed7aa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
                fontWeight: 800,
                color: "#ea580c",
              }}
            >
              {client.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <strong style={{ color: "#0f172a", fontSize: "0.88rem" }}>
              {client.name}
            </strong>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Thông Tin Liên Hệ",
      render: (client) => (
        <span style={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 500 }}>
          {client.contact || "--"}
        </span>
      ),
    },
    {
      key: "keys",
      header: "Số Key Sở Hữu",
      render: (client) => (
        <StatusBadge
          status="active"
          label={`${client.activeKeysCount} Active / ${client.keysCount} Tổng`}
        />
      ),
    },
    {
      key: "spent",
      header: "Tổng Tiền Nạp",
      render: (client) => (
        <strong style={{ color: "#059669", fontSize: "0.85rem" }}>
          {formatCurrency(client.totalSpent)}
        </strong>
      ),
    },
    {
      key: "lastSeen",
      header: "Hoạt Động Gần Nhất",
      render: (client) =>
        client.lastSeenAt ? (
          <div>
            <div style={{ fontSize: "0.8rem", color: "#0f172a", fontWeight: 600 }}>
              {new Date(client.lastSeenAt).toLocaleDateString("vi-VN")}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              {client.lastPlatform || "Windows"}
            </div>
          </div>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Chưa online</span>
        ),
    },
    {
      key: "status",
      header: "Trạng Thái",
      render: (client) => (
        <StatusBadge
          status={client.activeKeysCount > 0 ? "active" : "warning"}
          label={client.activeKeysCount > 0 ? "Đang Sử Dụng" : "Hết Hạn"}
        />
      ),
    },
  ];

  return (
    <div className="view-container animate-fade-in">
      {/* Page Header */}
      <div className="page-header-row">
        <div className="page-title-group">
          <h1>
            <Users size={24} color="var(--primary)" />
            Quản Lý Danh Bạ Khách Hàng
          </h1>
          <p>
            Tổng hợp danh sách đối tác, studio, số lượng license sở hữu và tổng chi tiêu nạp tiền
          </p>
        </div>
        <div className="page-actions-group">
          <button
            type="button"
            className="btn-white-outline"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="kpi-cards-grid-mintforge mb-6">
        <div className="kpi-card-mf">
          <div className="kpi-circle-icon circle-orange">
            <Building2 size={22} />
          </div>
          <div className="kpi-content-box">
            <div className="kpi-label-mf">Tổng khách hàng / Studio</div>
            <div className="kpi-value-mf">{clientsData.length}</div>
            <div className="kpi-subtext-indicator">
              <span className="subtext-green">● Hoạt động</span>
            </div>
          </div>
        </div>

        <div className="kpi-card-mf">
          <div className="kpi-circle-icon circle-green">
            <KeyRound size={22} />
          </div>
          <div className="kpi-content-box">
            <div className="kpi-label-mf">Bản quyền đã cấp</div>
            <div className="kpi-value-mf">{licenses.length}</div>
            <div className="kpi-subtext-indicator">
              <span className="subtext-green">{licenses.filter((l) => l.status === "active").length} active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Master DataTable Component */}
      <DataTable
        title={`Danh Sách Khách Hàng (${filteredClients.length})`}
        subtitle="Đối tác và người dùng phần mềm JACS Studio"
        columns={columns}
        data={paginatedClients}
        keyExtractor={(_item, idx) => idx}
        loading={loading}
        search={{
          value: searchTerm,
          onChange: (val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          },
          placeholder: "Tìm kiếm theo tên khách hàng hoặc SĐT / Email...",
        }}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: setCurrentPage,
          totalItems: filteredClients.length,
          pageSize,
        }}
      />
    </div>
  );
};
