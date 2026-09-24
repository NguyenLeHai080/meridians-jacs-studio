import React from "react";
import { Globe, Plus, Tag } from "lucide-react";
import type { AvailableMarketModel } from "../../pages/AiModelsPricingPage";

interface PricingMarketplaceTableProps {
  models: AvailableMarketModel[];
  loading: boolean;
  onImportToPricing: (item: AvailableMarketModel) => void;
}

export const PricingMarketplaceTable: React.FC<PricingMarketplaceTableProps> = ({
  models,
  loading,
  onImportToPricing,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <th className="py-2.5 px-3.5 whitespace-nowrap">Model / Dòng Sản Phẩm</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Phân Loại</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Biểu Giá Nhà Cung Cấp</th>
              <th className="py-2.5 px-3 whitespace-nowrap">Mã Model Chi Tiết</th>
              <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Hành Động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading && models.length === 0 ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={5} className="py-3 px-3">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : models.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Không tìm thấy model nào từ nhà cung cấp.
                </td>
              </tr>
            ) : (
              models.map((item, idx) => (
                <tr
                  key={item.product_id || idx}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  {/* Label */}
                  <td className="py-2.5 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                        <Globe className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-xs">
                          {item.label}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {item.product_id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Group */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                      {item.group}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 font-mono text-emerald-600 font-semibold text-xs">
                      <Tag className="w-3 h-3 text-emerald-500" />
                      <span>{item.price_label}</span>
                    </div>
                  </td>

                  {/* Models list */}
                  <td className="py-2.5 px-3 max-w-xs truncate font-mono text-[10.5px] text-slate-500">
                    {item.models?.join(", ") || item.product_id}
                  </td>

                  {/* Add action */}
                  <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => onImportToPricing(item)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm Vào Định Giá</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
