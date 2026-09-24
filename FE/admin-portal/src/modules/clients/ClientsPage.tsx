import React, { useState, useMemo } from "react";
import { useClients } from "./hooks/useClients";
import { ClientKpiCards } from "./components/ClientKpiCards";
import { ClientToolbar } from "./components/ClientToolbar";
import { ClientTable } from "./components/ClientTable";
import { CreateClientModal } from "./components/CreateClientModal";
import { EditClientModal } from "./components/EditClientModal";
import type { ClientItem } from "./types";

interface ClientsPageProps {
  searchTerm?: string;
  onNavigate?: (menu: any) => void;
  onNotify?: (message: string, type?: "success" | "error") => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({
  searchTerm: externalSearch = "",
  onNavigate,
  onNotify,
}) => {
  const {
    clients,
    loading,
    metrics,
    fetchData,
    handleCreateClient,
    handleUpdateClient,
    handleDeleteClient,
  } = useClients(onNotify);

  const [searchQuery, setSearchQuery] = useState(externalSearch);

  React.useEffect(() => {
    if (externalSearch) setSearchQuery(externalSearch);
  }, [externalSearch]);
  const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>👥 Quản Lý Khách Hàng & Đối Tác</span>
          </h2>
          <p className="text-xs text-slate-500">
            Hồ sơ khách hàng, bản quyền license đang sở hữu, thiết bị online và doanh thu lũy kế
          </p>
        </div>
      </div>

      {/* KPI metric cards */}
      <ClientKpiCards metrics={metrics} loading={loading} />

      {/* Filter toolbar */}
      <ClientToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        loading={loading}
        onRefresh={fetchData}
        onOpenCreate={() => setIsCreateOpen(true)}
      />

      {/* High-density single-line table */}
      <ClientTable
        clients={filteredClients}
        loading={loading}
        onEdit={(client) => setSelectedClient(client)}
        onDelete={handleDeleteClient}
      />

      {/* Modals */}
      <CreateClientModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateClient}
      />

      <EditClientModal
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
        onSubmit={handleUpdateClient}
      />
    </div>
  );
};
