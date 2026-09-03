import React, { useEffect, useState } from "react";
import { getApiBaseUrl } from "../../core/api";
import { Icon } from "../../shared/Icon";

export interface LegalTermsData {
  title: string;
  disclaimer: string;
  ai_usage: string;
  license_rights: string;
  dispute_resolution: string;
  updated_at?: string;
}

const DEFAULT_TERMS: LegalTermsData = {
  title: "Điều Khoản Sử Dụng & Miễn Trừ Trách Nhiệm Pháp Lý JACS Studio",
  disclaimer: `1. BẢN QUYỀN VÀ MIỄN TRỪ TRÁCH NHIỆM NỘI DUNG
- JACS Studio là bộ công cụ chuyên sâu hỗ trợ biên tập, dựng video, trích xuất scene map và tổng hợp lồng tiếng Voice AI tự động.
- Người dùng chịu trách nhiệm pháp lý 100% đối với toàn bộ video nguồn, hình ảnh, âm thanh, kịch bản và văn bản do chính người dùng nhập vào hoặc xuất bản qua phần mềm.
- Nhà phát triển JACS Studio không sở hữu, không lưu trữ và không chịu bất kỳ trách nhiệm pháp lý nào về tranh chấp quyền tác giả, bản quyền thương hiệu, quyền hình ảnh hoặc các khiếu nại liên quan đến nội dung do người dùng tạo ra.`,
  ai_usage: `2. QUY ĐỊNH SỬ DỤNG AI & DỊCH VỤ BÊN THỨ BA
- Người dùng tự cấu hình và sử dụng API Key (OpenAI, Google Gemini, ElevenLabs, Claude, Azure...) theo đúng chính sách điều khoản của từng nhà cung cấp dịch vụ tương ứng.
- JACS Studio không chịu trách nhiệm đối với bất kỳ chi phí phát sinh, việc khóa tài khoản API hoặc tính chính xác, bản quyền của nội dung do mô hình AI của bên thứ ba sinh ra.`,
  license_rights: `3. QUYỀN SỬ DỤNG BẢN QUYỀN & THIẾT BỊ
- Mỗi License Key được cấp quyền kích hoạt sử dụng trên số lượng thiết bị phần cứng (HWID) đã đăng ký theo gói dịch vụ bản quyền.
- Nghiêm cấm mọi hành vi đảo ngược mã nguồn (Reverse Engineering), bẻ khóa (Crack), chia sẻ trái phép hoặc bán lại license khi chưa có sự đồng ý bằng văn bản của JACS Studio.
- Mọi hành vi vi phạm điều khoản sẽ dẫn đến việc thu hồi và khóa vĩnh viễn License Key trên toàn bộ hệ thống máy chủ mà không được hoàn tiền.`,
  dispute_resolution: `4. GIẢI QUYẾT TRANH CHẤP & LIÊN HỆ
- Mọi thắc mắc, yêu cầu khiếu nại hoặc hỗ trợ kỹ thuật xin vui lòng liên hệ trực tiếp với bộ phận chăm sóc khách hàng của JACS Studio qua kênh hỗ trợ chính thức.
- Trong trường hợp xảy ra tranh chấp pháp lý, các bên cam kết ưu tiên thương lượng trên tinh thần tôn trọng quyền sở hữu trí tuệ và tuân thủ quy định pháp luật hiện hành.`,
};

interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requireAgreement?: boolean;
  onAgreeAndProceed?: () => void;
}

export function LegalTermsModal({
  isOpen,
  onClose,
  requireAgreement = false,
  onAgreeAndProceed,
}: LegalTermsModalProps) {
  const [activeTab, setActiveTab] = useState<"disclaimer" | "ai" | "license" | "dispute">("disclaimer");
  const [terms, setTerms] = useState<LegalTermsData>(DEFAULT_TERMS);
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Reset checkbox state when modal opens
    setHasAgreed(false);

    let mounted = true;
    const apiUrl = getApiBaseUrl();
    fetch(`${apiUrl}/api/v1/system/terms`)
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const payload = (data && typeof data === "object" && "data" in data ? data.data : data) as LegalTermsData;
        if (payload && payload.title) {
          setTerms(payload);
        }
      })
      .catch((err) => {
        console.warn("Using offline fallback legal terms:", err);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="legal-modal-overlay" onClick={requireAgreement ? undefined : onClose}>
      <div
        className="legal-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="legal-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.35))",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                display: "grid",
                placeItems: "center",
                color: "#60a5fa",
              }}
            >
              <Icon name="shield" size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: "15px", color: "#f8fafc", fontWeight: 800, lineHeight: 1.35 }}>
                {terms.title || "Điều Khoản Sử Dụng & Miễn Trừ Trách Nhiệm Pháp Lý JACS Studio"}
              </h3>
              <p style={{ margin: "4px 0 0 0", fontSize: "11.5px", color: "#94a3b8", lineHeight: 1.4 }}>
                {requireAgreement
                  ? "Vui lòng đọc kỹ thông báo pháp lý và xác nhận đồng ý để mở khóa không gian làm việc"
                  : "Quy định pháp lý, chính sách bản quyền và giới hạn sử dụng phần mềm JACS Studio"}
              </p>
            </div>
          </div>
          {!requireAgreement && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#94a3b8",
                width: "30px",
                height: "30px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)"; }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="legal-modal-tab-bar">
          <button
            type="button"
            className={`legal-modal-tab-btn ${activeTab === "disclaimer" ? "is-active" : ""}`}
            onClick={() => setActiveTab("disclaimer")}
          >
            ⚖️ 1. Miễn trừ bản quyền nội dung
          </button>
          <button
            type="button"
            className={`legal-modal-tab-btn ${activeTab === "ai" ? "is-active" : ""}`}
            onClick={() => setActiveTab("ai")}
          >
            🤖 2. Dịch vụ AI & API Key
          </button>
          <button
            type="button"
            className={`legal-modal-tab-btn ${activeTab === "license" ? "is-active" : ""}`}
            onClick={() => setActiveTab("license")}
          >
            🔑 3. Quyền License & Thiết bị
          </button>
          <button
            type="button"
            className={`legal-modal-tab-btn ${activeTab === "dispute" ? "is-active" : ""}`}
            onClick={() => setActiveTab("dispute")}
          >
            📜 4. Giải quyết tranh chấp
          </button>
        </div>

        {/* Content Body */}
        <div className="legal-modal-body">
          {activeTab === "disclaimer" && (
            <div className="legal-content-card">
              <div className="legal-content-card-title" style={{ color: "#fbbf24" }}>
                <span>⚠️</span> 1. QUY ĐỊNH BẢN QUYỀN & MIỄN TRỪ TRÁCH NHIỆM NỘI DUNG
              </div>
              <div className="legal-content-text">
                {terms.disclaimer}
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="legal-content-card">
              <div className="legal-content-card-title" style={{ color: "#38bdf8" }}>
                <span>🤖</span> 2. QUY ĐỊNH SỬ DỤNG DỊCH VỤ AI & API KEY BÊN THỨ BA
              </div>
              <div className="legal-content-text">
                {terms.ai_usage}
              </div>
            </div>
          )}

          {activeTab === "license" && (
            <div className="legal-content-card">
              <div className="legal-content-card-title" style={{ color: "#34d399" }}>
                <span>🔑</span> 3. QUYỀN HẠN BẢN QUYỀN & GIỚI HẠN THIẾT BỊ SỬ DỤNG (HWID)
              </div>
              <div className="legal-content-text">
                {terms.license_rights}
              </div>
            </div>
          )}

          {activeTab === "dispute" && (
            <div className="legal-content-card">
              <div className="legal-content-card-title" style={{ color: "#c084fc" }}>
                <span>📜</span> 4. CƠ CHẾ GIẢI QUYẾT KHIẾU NẠI & TRANH CHẤP PHÁP LÝ
              </div>
              <div className="legal-content-text">
                {terms.dispute_resolution}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: "14px",
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: "10px",
              padding: "10px 14px",
              fontSize: "12px",
              color: "#38bdf8",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 600,
            }}
          >
            <span>💡</span>
            <span>
              Người dùng tự chịu trách nhiệm pháp lý 100% đối với toàn bộ video nguồn, âm thanh và sản phẩm tạo ra.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="legal-modal-footer">
          {requireAgreement ? (
            <>
              {/* Checkbox agreement */}
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  cursor: "pointer",
                  userSelect: "none",
                  background: hasAgreed ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 255, 255, 0.03)",
                  border: hasAgreed ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                  style={{
                    width: "17px",
                    height: "17px",
                    marginTop: "2px",
                    accentColor: "#38bdf8",
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontSize: "12.5px", color: hasAgreed ? "#f8fafc" : "#cbd5e1", lineHeight: 1.45 }}>
                  Tôi xác nhận đã đọc kỹ, hiểu rõ và <strong>hoàn toàn đồng ý</strong> với toàn bộ Điều khoản sử dụng, Luật miễn trừ trách nhiệm bản quyền nội dung & Quy định sử dụng của JACS Studio.
                </span>
              </label>

              <div className="legal-footer-actions">
                <button
                  type="button"
                  className="btn-legal-cancel"
                  onClick={onClose}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  className="btn-legal-agree"
                  disabled={!hasAgreed}
                  onClick={() => {
                    if (hasAgreed) {
                      onAgreeAndProceed?.();
                    }
                  }}
                >
                  <span>Đồng Ý & Mở Khóa Vào Tool</span>
                  <Icon name="arrow" size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="legal-footer-actions" style={{ justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                Phiên bản hiệu lực: 2026 · JACS Studio Legal Team
              </span>
              <button
                type="button"
                className="btn-legal-agree"
                style={{ padding: "8px 20px" }}
                onClick={onClose}
              >
                Tôi Đã Hiểu & Đóng
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
