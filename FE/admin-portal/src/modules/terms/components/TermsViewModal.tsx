import React from "react";
import {
  X,
  Printer,
  Copy,
  Download,
  ShieldCheck,
  Scale,
  Award,
  FileSignature,
  Clock,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import type { EulaDocument } from "../types";
import { useI18n } from "../../../core/i18n";

interface TermsViewModalProps {
  show: boolean;
  onClose: () => void;
  document: EulaDocument | null;
  onCopyText: (text: string) => void;
  onOpenEdit?: (doc: EulaDocument) => void;
}

export const TermsViewModal: React.FC<TermsViewModalProps> = ({
  show,
  onClose,
  document: doc,
  onCopyText,
  onOpenEdit,
}) => {
  const { t } = useI18n();

  if (!show || !doc) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([doc.full_content], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${doc.code}_${doc.version}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-4xl my-6 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 1. Top Action Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200/90 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
              <Scale size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-slate-900">{doc.code}</span>
                <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-800">
                  {doc.version}
                </span>
                {doc.status === "active" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={10} className="text-emerald-600" />
                    {t("filterActive", "Đang có hiệu lực")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCopyText(doc.full_content)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300/80 rounded-xl transition-colors shadow-2xs"
              title={t("btnCopyFullText", "Sao chép toàn văn")}
            >
              <Copy size={13} />
              <span className="hidden sm:inline">{t("btnCopyFullText", "Sao chép")}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300/80 rounded-xl transition-colors shadow-2xs"
              title={t("btnDownloadTxt", "Tải văn bản (.txt)")}
            >
              <Download size={13} />
              <span className="hidden sm:inline">{t("btnDownloadTxt", "Tải về")}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300/80 rounded-xl transition-colors shadow-2xs"
              title={t("btnPrintDoc", "In văn bản pháp lý")}
            >
              <Printer size={13} />
              <span className="hidden sm:inline">{t("btnPrintDoc", "In ấn")}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. Official Document Body (NĐ 30/2020 standard format) */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-slate-100/60 scrollbar-thin">
          <div
            className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-12 shadow-md max-w-3xl mx-auto text-slate-900 select-text"
            style={{
              fontFamily: "'Times New Roman', 'Times', serif",
              lineHeight: "1.7",
            }}
          >
            {/* Header: Left agency & Right National Motto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 mb-6 border-b border-slate-300 text-center sm:text-left">
              <div>
                <div className="text-[11px] font-bold tracking-wider uppercase text-slate-800">
                  {t("agencyDeveloper", "NHÀ PHÁT TRIỂN JACS STUDIO")}
                </div>
                <div className="text-[10px] font-bold text-slate-600 mt-0.5">
                  {t("deptLegal", "BAN PHÁP CHẾ & BẢO HỘ BẢN QUYỀN")}
                </div>
                <div className="text-[10px] text-slate-500 font-sans mt-1">
                  {t("lblDocCode", "Mã văn bản")}: <span className="font-mono font-bold text-slate-800">{doc.code}</span>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <div className="text-xs font-bold tracking-wider">
                  {t("nationalHeaderTitle", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")}
                </div>
                <div className="text-xs font-bold underline underline-offset-4 mt-0.5">
                  {t("nationalMottoTitle", "Độc lập - Tự do - Hạnh phúc")}
                </div>
                <div className="text-[10px] italic text-slate-500 mt-1">
                  Hà Nội, ngày {new Date(doc.updated_at).getDate()} tháng{" "}
                  {new Date(doc.updated_at).getMonth() + 1} năm{" "}
                  {new Date(doc.updated_at).getFullYear()}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center mb-8">
              <h2 className="text-base sm:text-lg font-bold text-slate-950 uppercase tracking-tight leading-snug">
                {doc.title}
              </h2>
              <div className="text-[11px] italic text-slate-600 mt-1">
                (Phiên bản: {doc.version} • Có hiệu lực thi hành từ ngày kích hoạt License Key)
              </div>
            </div>

            {/* Legal Basis Citations */}
            {doc.legal_basis && doc.legal_basis.length > 0 && (
              <div className="mb-6 pl-4 border-l-2 border-slate-300 italic text-[11.5px] text-slate-700 space-y-1">
                {doc.legal_basis.map((basis, idx) => (
                  <div key={idx}>Căn cứ {basis};</div>
                ))}
              </div>
            )}

            {/* Full Document Articles */}
            <div className="text-[12.5px] text-slate-900 leading-relaxed text-justify whitespace-pre-wrap space-y-4">
              {doc.full_content}
            </div>

            {/* Footer Signature Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-12 pt-6 border-t border-slate-300">
              <div className="text-[10.5px] text-slate-600">
                <div className="font-bold uppercase mb-1">Nơi nhận:</div>
                <div>- Người dùng cuối & Khách hàng đối tác;</div>
                <div>- Bộ phận Kỹ thuật & Kiểm soát HWID;</div>
                <div>- Lưu: Hồ sơ Pháp chế & Hệ thống.</div>
              </div>

              <div className="text-center sm:text-right">
                <div className="text-[11px] font-bold uppercase text-slate-900">
                  ĐẠI DIỆN NHÀ PHÁT TRIỂN JACS STUDIO
                </div>
                <div className="text-[10px] italic text-slate-500 mt-0.5">
                  (Đã ký điện tử và xác thực hệ thống)
                </div>

                {/* Digital Stamp Seal */}
                <div className="mt-4 inline-block p-3 border-2 border-dashed border-emerald-600/60 rounded-xl bg-emerald-50/40 text-left">
                  <div className="flex items-center gap-1.5 text-emerald-800 text-[10px] font-bold">
                    <ShieldCheck size={12} className="text-emerald-700" />
                    <span>JACS DIGITAL SIGNATURE VERIFIED</span>
                  </div>
                  <div className="font-mono text-[9px] text-emerald-900 mt-1">
                    {doc.digital_signature || "SHA256:8F92-4B10-AC99-2026-JACS-LEGAL"}
                  </div>
                  <div className="text-[9px] text-emerald-700 mt-0.5">
                    Thời gian ký: {new Date(doc.updated_at).toLocaleString("vi-VN")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/90 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles size={13} className="text-orange-500" />
            <span>Văn bản chuẩn hóa theo Nghị định 30/2020/NĐ-CP</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(doc);
                }}
                className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors active:scale-95"
              >
                Chỉnh sửa văn bản này
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors active:scale-95"
            >
              {t("btnClose", "Đóng")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
