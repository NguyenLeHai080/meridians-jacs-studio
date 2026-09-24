import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { licenseService } from "../../licenses/services/licenseService";
import { billingService } from "../../billing/services/billingService";
import { clientService } from "../services/clientService";
import { showToast, confirmDialog } from "../../../core/swal";
import type { License, BillingTransaction } from "../../../core/types";
import type { ClientItem, ClientMetrics, CreateClientInput, EditClientInput } from "../types";

export function useClients(onNotify?: (msg: string, type?: "success" | "error") => void) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false);

  const notify = useCallback(
    (msg: string, type: "success" | "error" = "success") => {
      showToast(msg, type);
      if (onNotify) onNotify(msg, type);
    },
    [onNotify]
  );

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
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
      notify("Không thể tải danh sách khách hàng", "error");
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [notify]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const clients: ClientItem[] = useMemo(() => {
    const map = new Map<string, ClientItem>();

    for (const lic of licenses) {
      const name = lic.customer_name?.trim() || "Chưa đặt tên";
      const contact = lic.customer_contact?.trim() || "";
      const key = `${name}::${contact}`.toLowerCase();

      const existing = map.get(key) || {
        id: key,
        name,
        contact,
        keysCount: 0,
        activeKeysCount: 0,
        totalSpent: 0,
        lastSeenAt: null,
        lastPlatform: null,
        logoUrl: lic.logo_url,
        licenseIds: [],
      };

      existing.keysCount += 1;
      existing.licenseIds.push(lic.id);
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
      for (const [key, client] of map.entries()) {
        const matchesName =
          tx.customer_name &&
          client.name.toLowerCase().includes(tx.customer_name.toLowerCase());
        const matchesLic =
          tx.license_id && client.licenseIds.includes(tx.license_id);

        if (matchesName || matchesLic) {
          client.totalSpent += Number(tx.amount || 0);
          map.set(key, client);
          break;
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.activeKeysCount - a.activeKeysCount || b.totalSpent - a.totalSpent
    );
  }, [licenses, transactions]);

  const metrics: ClientMetrics = useMemo(() => {
    const totalClients = clients.length;
    const activeClients = clients.filter((c) => c.activeKeysCount > 0).length;
    const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
    const onlineDevices = clients.filter(
      (c) => c.lastSeenAt && new Date(c.lastSeenAt).getTime() > fifteenMinsAgo
    ).length;
    const totalSpent = clients.reduce((acc, c) => acc + c.totalSpent, 0);

    return { totalClients, activeClients, onlineDevices, totalSpent };
  }, [clients]);

  const handleCreateClient = async (input: CreateClientInput): Promise<boolean> => {
    try {
      await clientService.createClient(input);
      notify(`Đã tạo khách hàng "${input.name}" thành công!`, "success");
      await fetchData();
      return true;
    } catch (e: any) {
      notify(e?.message || "Lỗi tạo khách hàng", "error");
      return false;
    }
  };

  const handleUpdateClient = async (input: EditClientInput): Promise<boolean> => {
    try {
      await clientService.updateClient(input);
      notify(`Đã cập nhật thông tin khách hàng "${input.newName}"!`, "success");
      await fetchData();
      return true;
    } catch (e: any) {
      notify(e?.message || "Lỗi cập nhật khách hàng", "error");
      return false;
    }
  };

  const handleDeleteClient = async (client: ClientItem): Promise<void> => {
    const ok = await confirmDialog({
      title: "Xác nhận xóa khách hàng?",
      text: `Toàn bộ ${client.keysCount} license & bản quyền của "${client.name}" sẽ bị hủy vĩnh viễn!`,
      isDestructive: true,
    });
    if (!ok) return;

    try {
      await clientService.deleteClient(client.licenseIds);
      notify(`Đã xóa khách hàng "${client.name}" thành công!`, "success");
      await fetchData();
    } catch (e: any) {
      notify(e?.message || "Lỗi xóa khách hàng", "error");
    }
  };

  return {
    clients,
    loading,
    metrics,
    fetchData,
    handleCreateClient,
    handleUpdateClient,
    handleDeleteClient,
  };
}
