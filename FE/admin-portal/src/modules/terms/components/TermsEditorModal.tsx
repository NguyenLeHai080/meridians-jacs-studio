import React, { useState } from "react";
import {
  X,
  FileEdit,
  FileText,
  Eye,
  Check,
  RotateCw,
  Sparkles,
} from "lucide-react";
import type { EulaDocument } from "../types";
import type { EulaFormData } from "../hooks/useTermsManagement";
import { useI18n } from "../../../core/i18n";

interface TermsEditorModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e?: React.FormEvent) => void;
  isCreating: boolean;
  selectedDoc: EulaDocument | null;
  formData: EulaFormData;
  setFormData: React.Dispatch<React.SetStateAction<EulaFormData>>;
  isSaving: boolean;
}

export const TermsEditorModal: React.FC<TermsEditorModalProps> = ({
  show,
  onClose,
  onSubmit,
  isCreating,
  selectedDoc,
  formData,
  setFormData,
  isSaving,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  if (!show) return null;

  // Insert standard templates helpers
  const handleInsertClause = (clauseText: string) => {
    setFormData((prev) => ({
      ...prev,
      full_content: prev.full_content ? `${prev.full_content}\n\n${clauseText}` : clauseText,
    }));
  };

  // Quick insertion helpers
  const clauses = [
    {
      label: t("templateNationalHeader", "+ Quốc hiệu & Tiêu ngữ"),
      text: `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n---o0o---`,
    },
    {
      label: t("templateLegalBasis", "+ Căn cứ Pháp luật"),
      text: `Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24 tháng 11 năm 2015;\nCăn cứ Luật Sở hữu trí tuệ số 36/2005/QH11 (sửa đổi bổ sung 2022);\nCăn cứ Luật Giao dịch điện tử số 20/2023/QH15;\nCăn cứ Nghị định số 30/2020/NĐ-CP về công tác văn thư;\nCăn cứ Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.`,
    },
    {
      label: t("templateIpLicense", "+ Bản quyền SHTT & Cấp phép"),
      text: `Điều ... Bản quyền phần mềm và phạm vi cấp phép sử dụng\n1. JACS Studio là sản phẩm phần mềm độc quyền được bảo hộ theo pháp luật về Sở hữu trí tuệ.\n2. License Key được cấp cho Khách hàng là quyền sử dụng có giới hạn (Limited), không độc quyền, không được chuyển nhượng.\n3. Nghiêm cấm mọi hành vi sao chép, dịch ngược mã nguồn, chia sẻ hoặc thương mại hóa trái phép.`,
    },
    {
      label: t("templateHwidSecurity", "+ Kiểm soát HWID & Chống Crack"),
      text: `Điều ... Kiểm soát thiết bị phần cứng (HWID) và bảo mật mã nguồn\n1. License Key được gắn kết chặt chẽ với mã nhận dạng phần cứng (HWID) của máy tính đăng ký.\n2. Mọi hành vi can thiệp bộ nhớ (Memory Hooking), dịch ngược (Reverse Engineering) sẽ bị thu hồi giấy phép vĩnh viễn mà không hoàn tiền.`,
    },
    {
      label: t("templateAiDisclaimer", "+ Miễn trừ nội dung AI 100%"),
      text: `Điều ... Miễn trừ trách nhiệm bản quyền nội dung Người dùng\n1. Người dùng cam đoan sở hữu hợp pháp đối với toàn bộ dữ liệu, hình ảnh, video đưa vào xử lý.\n2. Người dùng chịu trách nhiệm pháp lý 100% trước cơ quan có thẩm quyền đối với mọi tranh chấp bản quyền nội dung phát sinh.\n3. Nhà phát triển JACS Studio được miễn trừ hoàn toàn và vô điều kiện khỏi mọi khiếu nại, khiếu kiện liên quan.`,
    },
    {
      label: t("templateDigitalSignature", "+ Chữ ký số & Xác thực"),
      text: `ĐẠI DIỆN BỘ PHẬN PHÁT TRIỂN & BẢO HỘ BẢN QUYỀN JACS STUDIO\nXác thực bản quyền: Jacs.Legal.Auth\nChữ ký điện tử / Hash: SHA256:8F92-4B10-AC99-2026-JACS-LEGAL`,
    },
  ];

  const wordCount = formData.full_content.trim() ? formData.full_content.trim().split(/\s+/).length : 0;
  const charCount = formData.full_content.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl my-4 sm:my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 1. Modal Header */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-orange-50/30 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-orange-500 via-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
              <FileEdit size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {isCreating
                    ? t("createTermsModalTitle", "Soạn Thảo Văn Bản Thỏa Thuận Cấp Phép (EULA)")
                    : t("editTermsModalTitle", "Chỉnh Sửa Văn Bản Quy Chế Cấp Phép")}
                </h3>
                {!isCreating && selectedDoc && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedDoc.code}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {t("editTermsModalDesc", "Chỉnh sửa toàn văn thỏa thuận cấp phép và điều khoản sử dụng theo thể thức văn bản quy định.")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Modal Body */}
        <form onSubmit={onSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5 scrollbar-thin">
          {/* Section A: Document Metadata Grid */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={13} className="text-orange-600" />
                <span>{t("metaSectionTitle", "Thông tin định danh văn bản")}</span>
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {t("metaStandardBadge", "Thể thức chuẩn Nghị định 30/2020/NĐ-CP")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-3.5">
              {/* Title */}
              <div className="md:col-span-8">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("lblDocTitle", "Tiêu đề văn bản thỏa thuận")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={t("placeholderDocTitle", "Ví dụ: THỎA THUẬN CẤP PHÉP SỬ DỤNG VÀ ĐIỀU KHOẢN DỊCH VỤ PHẦN MỀM JACS STUDIO")}
                  className="w-full px-3.5 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/15 transition-all shadow-2xs"
                />
              </div>

              {/* Code */}
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("lblDocCode", "Số / Ký hiệu văn bản (Doc Ref)")}
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder={t("placeholderDocCode", "JACS-EULA-2026-v2.6")}
                  className="w-full px-3.5 py-2 font-mono text-xs font-bold text-slate-900 bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/15 transition-all shadow-2xs"
                />
              </div>

              {/* Version */}
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("lblDocVersion", "Phiên bản ban hành")}
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="v2.6.0"
                  className="w-full px-3.5 py-2 font-mono text-xs font-bold text-slate-900 bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/15 transition-all shadow-2xs"
                />
              </div>

              {/* Category */}
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("lblDocCategory", "Phân loại thỏa thuận")}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as EulaDocument["category"] })
                  }
                  className="w-full px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-200 focus:border-orange-500 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/15 transition-all shadow-2xs"
                >
                  <option value="enterprise">{t("categoryEnterprise", "Doanh nghiệp (Enterprise)")}</option>
                  <option value="standard">{t("categoryStandard", "Cá nhân (Standard)")}</option>
                  <option value="ai_policy">{t("categoryAiPolicy", "Chính sách AI & BYOK")}</option>
                  <option value="security">{t("categorySecurity", "Quy định Bảo mật & Mã nguồn")}</option>
                  <option value="custom">{t("categoryCustom", "Quy chế chung / Tùy chỉnh")}</option>
                </select>
              </div>

              {/* Status */}
              <div className="md:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t("lblDocStatus", "Hiệu lực thi hành")}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "active" })}
                    className={`px-2 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      formData.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {t("filterActive", "Có hiệu lực")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "draft" })}
                    className={`px-2 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      formData.status === "draft"
                        ? "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-500/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {t("filterDraft", "Dự thảo")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "archived" })}
                    className={`px-2 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      formData.status === "archived"
                        ? "bg-slate-100 text-slate-700 border-slate-300 ring-2 ring-slate-400/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {t("filterArchived", "Hết hiệu lực")}
                  </button>
                </div>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center gap-5 text-xs font-semibold text-slate-700">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.requires_hwid_binding}
                  onChange={(e) =>
                    setFormData({ ...formData, requires_hwid_binding: e.target.checked })
                  }
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <span>{t("chkHwidBinding", "Khóa định danh phần cứng (HWID Binding)")}</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.requires_content_disclaimer}
                  onChange={(e) =>
                    setFormData({ ...formData, requires_content_disclaimer: e.target.checked })
                  }
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <span>{t("chkAiDisclaimer", "Tuyên bố miễn trừ trách nhiệm nội dung AI")}</span>
              </label>
            </div>
          </div>

          {/* Section B: Unified Full Text Editor Toolbar & Tabs */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("editor")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "editor"
                      ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <FileEdit size={13} />
                  <span>{t("tabFullEditor", "Soạn thảo toàn văn")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "preview"
                      ? "bg-orange-50 text-orange-700 border border-orange-200 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Eye size={13} />
                  <span>{t("tabPreviewPaper", "Xem trước thể thức văn bản")}</span>
                </button>
              </div>

              {/* Realtime stats badge */}
              <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
                <span>{wordCount.toLocaleString()} {t("wordCountUnit", "từ")}</span>
                <span>•</span>
                <span>{charCount.toLocaleString()} {t("charCountUnit", "ký tự")}</span>
              </div>
            </div>

            {/* Quick clause template chips */}
            {activeTab === "editor" && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles size={10} className="text-orange-500" />
                  {t("quickTemplates", "Mẫu nhanh:")}
                </span>
                {clauses.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleInsertClause(c.text)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap active:scale-95 shrink-0"
                  >
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Editor Area */}
            {activeTab === "editor" ? (
              <div className="relative">
                <textarea
                  rows={14}
                  required
                  value={formData.full_content}
                  onChange={(e) => setFormData({ ...formData, full_content: e.target.value })}
                  placeholder={t("placeholderEditor", "Nhập toàn bộ nội dung văn bản thỏa thuận cấp phép và điều khoản sử dụng tại đây...")}
                  className="w-full p-4 font-mono text-xs text-slate-900 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-orange-500 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-orange-500/15 leading-relaxed resize-y scrollbar-thin shadow-inner"
                  style={{ minHeight: "340px" }}
                />
              </div>
            ) : (
              /* Live Preview Paper */
              <div
                className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-sm overflow-y-auto max-h-[400px] scrollbar-thin text-slate-900"
                style={{
                  fontFamily: "'Times New Roman', 'Times', serif",
                  backgroundColor: "#ffffff",
                }}
              >
                {/* Header */}
                <div className="text-center mb-6 border-b border-slate-200 pb-4">
                  <div className="text-xs font-bold tracking-wider">{t("nationalHeaderTitle", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")}</div>
                  <div className="text-xs font-bold underline underline-offset-4 mt-0.5">
                    {t("nationalMottoTitle", "Độc lập - Tự do - Hạnh phúc")}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 font-sans">
                    {t("lblDocCode", "Số")}: <span className="font-mono font-bold text-slate-800">{formData.code}</span> • {t("lblDocVersion", "Phiên bản")}: {formData.version}
                  </div>
                  <div className="text-sm sm:text-base font-bold text-slate-900 mt-3 uppercase tracking-tight">
                    {formData.title}
                  </div>
                </div>

                {/* Content paragraphs */}
                <div className="space-y-3 text-xs leading-relaxed text-justify whitespace-pre-wrap">
                  {formData.full_content}
                </div>
              </div>
            )}
          </div>
        </form>

        {/* 3. Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/90 bg-slate-50/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all active:scale-95"
          >
            {t("btnCancel", "Hủy bỏ")}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, status: "draft" }));
                onSubmit();
              }}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{t("btnSaveDraft", "Lưu dự thảo")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormData((prev) => ({ ...prev, status: "active" }));
                onSubmit();
              }}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-xl shadow-md shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? <RotateCw size={14} className="animate-spin" /> : <Check size={14} />}
              <span>{isSaving ? t("btnSaving", "Đang lưu...") : t("btnSaveAndApply", "Lưu & Ban hành")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
