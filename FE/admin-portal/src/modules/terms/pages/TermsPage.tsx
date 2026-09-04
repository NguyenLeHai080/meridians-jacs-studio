import React, { useState, useEffect, useCallback } from "react";
import { RotateCw, Check } from "lucide-react";
import type { LegalTerms } from "../../../core/types";
import { termsService } from "../services/termsService";
import { useI18n } from "../../../core/i18n";
import "../lang"; // Auto-registers terms translation

interface TermsPageProps {
  terms?: LegalTerms;
  setTerms?: (terms: LegalTerms) => void;
  setMessage?: (msg: string) => void;
  setError?: (err: string) => void;
  onNotify?: (msg: string, type?: "success" | "error") => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({
  terms: propTerms,
  setTerms: propSetTerms,
  setMessage: propSetMessage,
  setError: propSetError,
  onNotify,
}) => {
  const { t } = useI18n();

  const [localTerms, setLocalTerms] = useState<LegalTerms>(
    propTerms || {
      title: "Điều Khoản Sử Dụng & Miễn Trừ Trách Nhiệm Pháp Lý JACS Studio",
      disclaimer: "1. BẢN QUYỀN VÀ MIỄN TRỪ TRÁCH NHIỆM NỘI DUNG\n- JACS Studio là bộ công cụ hỗ trợ biên tập video tự động.",
      ai_usage: "2. QUY ĐỊNH SỬ DỤNG AI & DỊCH VỤ BÊN THỨ BA\n- Người dùng tự cấu hình API key cá nhân.",
      license_rights: "3. QUYỀN SỬ DỤNG BẢN QUYỀN & THIẾT BỊ\n- Mỗi key kích hoạt trên thiết bị phần cứng đã đăng ký.",
      dispute_resolution: "4. GIẢI QUYẾT TRANH CHẤP\n- Cam kết thương lượng tôn trọng quyền sở hữu trí tuệ.",
    }
  );

  const activeTerms = propTerms || localTerms;

  const fetchTermsData = useCallback(async () => {
    try {
      const data = await termsService.getTerms();
      setLocalTerms(data);
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    if (!propTerms) {
      fetchTermsData();
    }
  }, [propTerms, fetchTermsData]);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (onNotify) onNotify(msg, type);
    else if (type === "error" && propSetError) propSetError(msg);
    else if (propSetMessage) propSetMessage(msg);
  };

  const updateTermsField = (next: LegalTerms) => {
    if (propSetTerms) propSetTerms(next);
    else setLocalTerms(next);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await termsService.updateTerms(activeTerms);
      updateTermsField(updated);
      notify("✓ Đã lưu phân quyền và điều khoản bảo mật thành công!", "success");
    } catch (err: any) {
      notify(err instanceof Error ? err.message : "Lỗi lưu điều khoản", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mf-card-panel">
      <div className="mf-card-header">
        <div className="mf-card-title-group">
          <h3>{t("termsTitle")}</h3>
          <p>{t("termsSubtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="form-group-mf">
          <label className="form-label-mf">Tiêu Đề Văn Bản</label>
          <input
            type="text"
            className="form-input-mf"
            value={activeTerms.title}
            onChange={(e) => updateTermsField({ ...activeTerms, title: e.target.value })}
          />
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Tuyên Bố Miễn Trừ Trách Nhiệm Pháp Lý</label>
          <textarea
            className="form-input-mf"
            rows={3}
            value={activeTerms.disclaimer}
            onChange={(e) => updateTermsField({ ...activeTerms, disclaimer: e.target.value })}
          />
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Quy Định Bản Quyền & Sử Dụng Dịch Vụ AI</label>
          <textarea
            className="form-input-mf"
            rows={3}
            value={activeTerms.ai_usage}
            onChange={(e) => updateTermsField({ ...activeTerms, ai_usage: e.target.value })}
          />
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Quyền Hạn License & Khóa Bản Quyền Khi Vi Phạm</label>
          <textarea
            className="form-input-mf"
            rows={3}
            value={activeTerms.license_rights}
            onChange={(e) => updateTermsField({ ...activeTerms, license_rights: e.target.value })}
          />
        </div>

        <button
          type="submit"
          className="btn-primary-orange"
          disabled={isSaving}
          style={{ width: "fit-content" }}
        >
          {isSaving ? <RotateCw size={16} className="animate-spin" /> : <Check size={16} />}
          {t("btnSaveTerms")}
        </button>
      </form>
    </div>
  );
};
