import React, { useState, useMemo } from "react";
import { License, BillingTransaction } from "../../core/types";
import { Input } from "../../components/common/Input";
import { Pagination } from "../../components/common/Pagination";
import { Badge } from "../../components/common/Badge";

interface ClientsViewProps {
  licenses: License[];
  transactions: BillingTransaction[];
}

export function ClientsView({ licenses, transactions }: ClientsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const clientsData = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        contact: string;
        keysCount: number;
        activeKeysCount: number;
        totalSpent: number;
        lastSeenAt?: string | null;
        lastPlatform?: string | null;
        logoUrl?: string | null;
      }
    >();

    for (const lic of licenses) {
      const key = (lic.customer_name + "::" + lic.customer_contact).trim();
      const existing = map.get(key) || {
        name: lic.customer_name,
        contact: lic.customer_contact,
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

    // Add spending from transactions
    for (const tx of transactions) {
      for (const [key, client] of map.entries()) {
        if (
          client.name.toLowerCase() === tx.customer_name.toLowerCase() ||
          key.toLowerCase().includes(tx.customer_name.toLowerCase())
        ) {
          client.totalSpent += tx.amount;
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

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title">Quản Lý Danh Bạ Khách Hàng</h1>
          <p className="view-subtitle">
            Tổng hợp danh sách đối tác, studio, số lượng license sở hữu và tổng chi tiêu
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="filter-bar admin-card mb-6">
        <div className="search-input-wrap">
          <Input
            placeholder="🔍 Tìm kiếm theo tên khách hàng hoặc SĐT / Email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khách Hàng / Thương Hiệu</th>
                <th>Thông Tin Liên Hệ</th>
                <th>Số Key Sở Hữu</th>
                <th>Tổng Chi Tiêu</th>
                <th>Hoạt Động Gần Nhất</th>
                <th>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClients.map((client, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="flex items-center gap-3">
                      {client.logoUrl ? (
                        <img src={client.logoUrl} alt="Logo" className="w-8 h-8 rounded object-contain bg-slate-800 p-1" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {client.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <strong className="text-white">{client.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-muted text-xs">{client.contact || "--"}</span>
                  </td>
                  <td>
                    <span className="badge-pill badge-info">
                      {client.activeKeysCount} Active / {client.keysCount} Tổng
                    </span>
                  </td>
                  <td>
                    <span className="text-emerald font-semibold">
                      {formatCurrency(client.totalSpent)}
                    </span>
                  </td>
                  <td>
                    {client.lastSeenAt ? (
                      <div className="text-xs">
                        <span>{new Date(client.lastSeenAt).toLocaleDateString("vi-VN")}</span>
                        <div className="text-muted">
                          {client.lastPlatform || "Windows"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">Chưa online</span>
                    )}
                  </td>
                  <td>
                    <Badge variant={client.activeKeysCount > 0 ? "active" : "offline"}>
                      {client.activeKeysCount > 0 ? "Đang Sử Dụng" : "Hết Hạn"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {paginatedClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-10">
                    Chưa có dữ liệu khách hàng
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
          totalItems={filteredClients.length}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}
