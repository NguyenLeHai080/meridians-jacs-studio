import React from "react";
import { X, Users, ShieldCheck, Lock, Award, KeyRound, Cpu, CheckCircle2 } from "lucide-react";
import { useI18n } from "../../../core/i18n";

interface TermsRbacModalProps {
  show: boolean;
  onClose: () => void;
}

export const TermsRbacModal: React.FC<TermsRbacModalProps> = ({ show, onClose }) => {
  const { t } = useI18n();

  if (!show) return null;

  const roles = [
    {
      name: t("rbacSuperAdmin", "Super Admin"),
      roleCode: "super_admin",
      desc: t("rbacSuperAdminDesc", "Toàn quyền quản trị hệ thống, cấp phát HWID, cập nhật quy chế EULA và cấu hình AI Gateway."),
      renderLimit: "Không giới hạn",
      aiAccess: "Full BYOK Gateway",
      tagColor: "bg-purple-50 text-purple-700 border-purple-200",
      limitColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      aiColor: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      name: t("rbacAiPro", "AI Pro Member"),
      roleCode: "ai_pro",
      desc: t("rbacAiProDesc", "Biên tập video tự động, Voice Cloning, tích hợp API cao cấp và ưu tiên hàng đợi render GPU."),
      renderLimit: "500 video / ngày",
      aiAccess: "Ưu tiên hàng đợi",
      tagColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
      limitColor: "bg-blue-50 text-blue-700 border-blue-200",
      aiColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    },
    {
      name: t("rbacStandard", "Standard User"),
      roleCode: "standard",
      desc: t("rbacStandardDesc", "Thực hiện biên tập nội dung theo template tiêu chuẩn, giới hạn hạn mức xử lý tác vụ cơ bản."),
      renderLimit: "50 video / ngày",
      aiAccess: "Tính năng cơ bản",
      tagColor: "bg-slate-100 text-slate-700 border-slate-200",
      limitColor: "bg-slate-100 text-slate-700 border-slate-200",
      aiColor: "bg-slate-100 text-slate-600 border-slate-200",
    },
  ];

  const securitySpecs = [
    {
      title: t("secDpapiTitle", "Mã hóa Cục bộ Windows DPAPI & AES-256"),
      desc: t("secDpapiDesc", "Toàn bộ API Key của người dùng được mã hóa cục bộ trên thiết bị, server không lưu giữ khóa API thô."),
      icon: Lock,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    {
      title: t("secHwidTitle", "Khóa Định danh Phần cứng HWID Fingerprint"),
      desc: t("secHwidDesc", "Mã băm phần cứng (CPU, Mainboard, BIOS) đảm bảo 1 License chỉ hoạt động trên đúng thiết bị chỉ định."),
      icon: Cpu,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      title: t("secLegalTitle", "Tuân thủ Thể thức NĐ 30/2020 & Luật SHTT"),
      desc: t("secLegalDesc", "Văn bản thỏa thuận có giá trị pháp lý ràng buộc điện tử và phân định rõ 100% trách nhiệm bản quyền nội dung."),
      icon: Award,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-3xl w-full my-6 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 1. Header */}
        <div className="px-6 py-4 sm:px-8 sm:py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-purple-50/20 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-purple-500 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
              <Users size={20} className="stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                {t("rbacModalTitle", "Ma Trận Phân Quyền (RBAC) & Tiêu Chuẩn Bảo Mật")}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {t("rbacModalSubtitle", "Quy định quyền hạn tác nghiệp 3 cấp bậc, hạn mức render và tiêu chuẩn mã hóa bảo vệ bản quyền.")}
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

        {/* 2. Body */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
          {/* Section A: RBAC Matrix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound size={14} className="text-orange-600" />
                <span>{t("rbacSectionMatrix", "Ma trận 3 cấp bậc phân quyền (RBAC)")}</span>
              </h4>
              <span className="text-[11px] font-semibold text-slate-400">
                {t("rbacModalSubtitle", "Kiểm soát truy cập nội bộ")}
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">{t("rbacHeaderRole", "Cấp bậc")}</th>
                    <th className="py-3 px-4">{t("rbacHeaderPermissions", "Quyền hạn tác nghiệp")}</th>
                    <th className="py-3 px-4 text-center">{t("rbacHeaderMaxJobs", "Render / ngày")}</th>
                    <th className="py-3 px-4 text-center">{t("rbacHeaderAiAccess", "Tích hợp AI")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roles.map((role) => (
                    <tr key={role.roleCode} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${role.tagColor}`}>
                          {role.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 leading-relaxed max-w-xs">
                        {role.desc}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${role.limitColor}`}>
                          {role.renderLimit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${role.aiColor}`}>
                          {role.aiAccess}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Security Standards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>{t("rbacSectionSecurity", "Tiêu chuẩn bảo mật mã hóa & An ninh mạng")}</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {securitySpecs.map((spec, idx) => {
                const Icon = spec.icon;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${spec.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="text-xs font-bold text-slate-900 leading-snug">
                          {spec.title}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                        {spec.desc}
                      </p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      <span>{t("statusActive", "Đã kích hoạt bảo vệ")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Footer */}
        <div className="px-6 py-4 border-t border-slate-200/90 bg-slate-50/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>{t("secLegalDesc", "Chính sách áp dụng trên toàn bộ phiên bản phần mềm JACS Studio")}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all active:scale-95 shadow-2xs"
          >
            {t("btnClose", "Đóng")}
          </button>
        </div>
      </div>
    </div>
  );
};
