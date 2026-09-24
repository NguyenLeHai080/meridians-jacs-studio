import React from "react";
import { Edit2, Trash2, KeyRound, Monitor, Smartphone, Building2 } from "lucide-react";
import type { ClientItem } from "../types";

interface ClientTableProps {
  clients: ClientItem[];
  loading: boolean;
  onEdit: (client: ClientItem) => void;
  onDelete: (client: ClientItem) => void;
}

export const ClientTable: React.FC<ClientTableProps> = ({
  clients,
  loading,
  onEdit,
  onDelete,
}) => {
  const getPlatformIcon = (platform?: string | null) => {
    if (!platform) return <Monitor className="w-3.5 h-3.5 text-slate-400" />;
    const p = platform.toLowerCase();
    if (p.includes("mac") || p.includes("darwin") || p.includes("win")) {
      return <Monitor className="w-3.5 h-3.5 text-blue-500" />;
    }
    return <Smartphone className="w-3.5 h-3.5 text-emerald-500" />;
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <th className="py-2.5 px-3.5 whitespace-nowrap">Khách Hàng / Đơn Vị</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Liên Hệ</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-center">Bản Quyền / Key</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Lần Cuối Hoạt Động</th>
              <th className="py-2.5 px-3 whitespace-nowrap text-right">Tổng Chi Tiêu</th>
              <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading && clients.length === 0 ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={6} className="py-3 px-3">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Không tìm thấy khách hàng nào.
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const hasActive = client.activeKeysCount > 0;
                return (
                  <tr
                    key={client.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Customer Name & Avatar */}
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        {client.logoUrl ? (
                          <img
                            src={client.logoUrl}
                            alt={client.name}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-[10px]">
                            {getInitials(client.name)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                            <span>{client.name}</span>
                            {hasActive ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Đang có key hiệu lực" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" title="Key hết hạn / Chưa có" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>Mã KH: {client.id.slice(0, 10)}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="text-slate-700 text-xs font-mono">
                        {client.contact || "—"}
                      </div>
                    </td>

                    {/* Keys count badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono bg-slate-50 text-slate-700 border border-slate-200">
                        <KeyRound className="w-3 h-3 text-amber-500" />
                        <span className="font-bold text-emerald-600">{client.activeKeysCount}</span>
                        <span className="text-slate-400">/</span>
                        <span>{client.keysCount} key</span>
                      </span>
                    </td>

                    {/* Last active & platform */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {client.lastSeenAt ? (
                        <div className="flex items-center gap-1.5">
                          {getPlatformIcon(client.lastPlatform)}
                          <div>
                            <div className="text-slate-700 text-[10.5px]">
                              {new Date(client.lastSeenAt).toLocaleString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase font-mono">
                              {client.lastPlatform || "Desktop"}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10.5px] italic">Chưa kích hoạt tool</span>
                      )}
                    </td>

                    {/* Total spent */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-[11px] font-bold text-amber-700">
                      {client.totalSpent.toLocaleString("vi-VN")} ₫
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(client)}
                          title="Chỉnh sửa thông tin khách hàng"
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(client)}
                          title="Xóa khách hàng và bản quyền"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
