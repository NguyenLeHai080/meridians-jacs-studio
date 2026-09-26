import React, { useState, useEffect } from "react";
import {
  X,
  Sliders,
  Loader2,
  Tag,
  DollarSign,
  Zap,
  Info,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { MyModelItem } from "../../pages/AiModelsPricingPage";

export interface ClientPricingPayload {
  model_name: string;
  input_price_1m: number;
  output_price_1m: number;
  cache_read_1m: number;
  cache_write_1m: number;
  cost_per_call: number;
  pricing_unit: "1M" | "call";
  price_type: "Giá linh hoạt" | "Giá cố định" | "Theo yêu cầu";
  client_credits: number;
  client_vnd: number;
  enabled: boolean;
  notes: string;
}

interface PricingEditModalProps {
  model: MyModelItem | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: ClientPricingPayload) => void;
}

export const PricingEditModal: React.FC<PricingEditModalProps> = ({
  model,
  saving,
  onClose,
  onSave,
}) => {
  const [pricingUnit, setPricingUnit] = useState<"1M" | "call">("1M");
  const [priceType, setPriceType] = useState<"Giá linh hoạt" | "Giá cố định" | "Theo yêu cầu">("Giá linh hoạt");
  
  // Pricing values
  const [inputPrice, setInputPrice] = useState<number>(2600);
  const [outputPrice, setOutputPrice] = useState<number>(13000);
  const [cacheRead, setCacheRead] = useState<number>(260);
  const [cacheWrite, setCacheWrite] = useState<number>(3250);
  const [costPerCall, setCostPerCall] = useState<number>(100);

  // Credits & Client VND
  const [credits, setCredits] = useState<number>(1.0);
  const [clientVnd, setClientVnd] = useState<number>(1000);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!model) return;

    const isCall =
      model.pricing_unit === "call" ||
      model.upstream_price?.toLowerCase().includes("request") ||
      model.name?.toLowerCase().includes("image");

    setPricingUnit(isCall ? "call" : "1M");
    setPriceType((model.price_type as any) || (isCall ? "Giá cố định" : "Giá linh hoạt"));

    const baseCost = model.upstream_cost_vnd || 1000;

    if (isCall) {
      const callVal = model.cost_per_call || (model.client_vnd && model.client_vnd > 0 ? model.client_vnd : Math.round(baseCost * 1.5));
      setCostPerCall(callVal);
      setClientVnd(callVal);
      setCredits(model.client_credits || Math.max(0.1, +(callVal / 1000).toFixed(2)));
    } else {
      const inVal = model.input_price_1m !== undefined && model.input_price_1m > 0
        ? model.input_price_1m
        : Math.round(baseCost * 1.2);
      const outVal = model.output_price_1m !== undefined && model.output_price_1m > 0
        ? model.output_price_1m
        : Math.round(inVal * 5);
      const cReadVal = model.cache_read_1m !== undefined && model.cache_read_1m > 0
        ? model.cache_read_1m
        : Math.round(inVal * 0.1);
      const cWriteVal = model.cache_write_1m !== undefined && model.cache_write_1m > 0
        ? model.cache_write_1m
        : Math.round(inVal * 1.25);

      setInputPrice(inVal);
      setOutputPrice(outVal);
      setCacheRead(cReadVal);
      setCacheWrite(cWriteVal);
      setClientVnd(model.client_vnd || outVal);
      setCredits(model.client_credits || Math.max(0.1, +(outVal / 1000).toFixed(2)));
    }

    setEnabled(model.enabled ?? true);
    setNotes(model.notes || "");
  }, [model]);

  if (!model) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      model_name: model.name,
      input_price_1m: inputPrice,
      output_price_1m: outputPrice,
      cache_read_1m: cacheRead,
      cache_write_1m: cacheWrite,
      cost_per_call: costPerCall,
      pricing_unit: pricingUnit,
      price_type: priceType,
      client_credits: credits,
      client_vnd: pricingUnit === "call" ? costPerCall : clientVnd,
      enabled,
      notes,
    });
  };

  // Profit Margin estimation
  const effectiveCost = model.upstream_cost_vnd || 1;
  const effectiveSale = pricingUnit === "call" ? costPerCall : outputPrice;
  const profitMargin = Math.round(((effectiveSale - effectiveCost) / effectiveCost) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Điều Chỉnh Bảng Giá Bán Cho Client
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono font-bold text-orange-600">{model.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-200/80 text-slate-700 font-medium">
                  {model.group}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Reference: Upstream Provider Price */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-1">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
              Biểu Giá Gốc Nhà Cung Cấp (Upstream Cost)
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-slate-800 text-xs font-bold">
                {model.upstream_price || "in 500 • out 1000 đ / 1M"}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Giá vốn ước tính:{" "}
                <strong className="text-slate-800 font-mono">
                  {model.upstream_cost_vnd?.toLocaleString("vi-VN")} ₫
                </strong>
              </span>
            </div>
          </div>

          {/* Unit & Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                Hình Thức Tính Phí
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPricingUnit("1M")}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    pricingUnit === "1M"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Theo Token (/1M)
                </button>
                <button
                  type="button"
                  onClick={() => setPricingUnit("call")}
                  className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    pricingUnit === "call"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Theo Yêu Cầu (/call)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                Loại Biểu Giá (Hiển thị Tag)
              </label>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-orange-500"
              >
                <option value="Giá linh hoạt">Giá linh hoạt (Bậc dùng)</option>
                <option value="Giá cố định">Giá cố định</option>
                <option value="Theo yêu cầu">Theo yêu cầu</option>
              </select>
            </div>
          </div>

          {/* Detailed Selling Prices Applied to Clients */}
          <div className="rounded-xl border border-slate-200/90 p-3.5 space-y-3 bg-white shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
                Bảng Giá Bán Chi Tiết Cho Client (VND)
              </span>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                Ước tính lợi nhuận: {profitMargin > 0 ? `+${profitMargin}%` : `${profitMargin}%`}
              </span>
            </div>

            {pricingUnit === "1M" ? (
              <div className="space-y-3">
                {/* In & Out */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Giá Đầu Vào (Input) / 1M tokens
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={inputPrice}
                        onChange={(e) => setInputPrice(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Giá Đầu Ra (Output) / 1M tokens
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={outputPrice}
                        onChange={(e) => setOutputPrice(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                    </div>
                  </div>
                </div>

                {/* Cache Read & Cache Write */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                      Đọc Bộ Nhớ Đệm (Cache Hit) / 1M
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={cacheRead}
                        onChange={(e) => setCacheRead(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-emerald-50/40 focus:bg-white border border-emerald-200 rounded-xl font-mono text-emerald-800 font-bold focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">₫</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Ghi Bộ Nhớ Đệm (Cache Write) / 1M
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={cacheWrite}
                        onChange={(e) => setCacheWrite(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Giá Mỗi Lần Gọi (Per Request)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={costPerCall}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCostPerCall(v);
                      setClientVnd(v);
                    }}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-orange-500"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                </div>
              </div>
            )}
          </div>

          {/* Credits Equivalence */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Credits Trừ / 1K Tokens hoặc Request
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Tương Đương VNĐ
              </label>
              <input
                type="number"
                step="100"
                min="0"
                value={clientVnd}
                onChange={(e) => setClientVnd(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl font-mono text-slate-900 font-bold focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Ghi chú cấu hình nội bộ
            </label>
            <input
              type="text"
              placeholder="VD: Model ưu tiên lập trình và phân tích dữ liệu"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Checkbox enable */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id="model_enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-0 cursor-pointer"
            />
            <label htmlFor="model_enabled" className="text-slate-800 font-bold text-xs cursor-pointer select-none">
              Mở quyền cho Client Desktop & Quảng trường mô hình sử dụng model này
            </label>
          </div>

          {/* Info notification */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-blue-800 text-[11px]">
            <Info size={14} className="shrink-0 mt-0.5 text-blue-600" />
            <span>
              Bảng giá này sẽ tự động được đồng bộ và áp dụng trực tiếp lên <strong>Quảng trường mô hình</strong> và Cổng Client API.
            </span>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Lưu & Áp Dụng Bảng Giá</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
