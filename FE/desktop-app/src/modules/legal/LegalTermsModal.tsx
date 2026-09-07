import React, { useState, useEffect } from "react";
import { Icon } from "../../shared/Icon";

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
  const [hasAgreed, setHasAgreed] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setHasAgreed(false);
    setCopiedText(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = `JACS STUDIO COMPLIANCE & LEGAL CERTIFICATE
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM — Độc lập • Tự do • Hạnh phúc
DOC-REF: JACS-LEGAL-2026-v2.4 - 2026

Điều Khoản Sử Dụng & Miễn Trừ Trách Nhiệm Pháp Lý JACS Studio
Văn bản có hiệu lực thi hành từ ngày 2026-01-01 cho toàn bộ người dùng và giấy phép JACS Studio

ĐIỀU 1. BẢN QUYỀN & TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM NỘI DUNG
1. BẢN QUYỀN VÀ MIỄN TRỪ TRÁCH NHIỆM NỘI DUNG
- JACS Studio là bộ công cụ hỗ trợ biên tập, dựng video, trích xuất cảnh và tổng hợp giọng đọc AI tự động.
- Người dùng chịu trách nhiệm pháp lý 100% đối với toàn bộ video nguồn, hình ảnh, âm thanh và văn bản do chính người dùng nhập vào hoặc xử lý qua phần mềm.
- Nhà phát triển JACS Studio không sở hữu, không lưu trữ và không chịu bất kỳ trách nhiệm pháp lý nào về tranh chấp quyền tác giả, bản quyền thương hiệu, quyền hình ảnh hoặc các khiếu nại liên quan đến nội dung do người dùng tạo ra.

ĐIỀU 2. QUY ĐỊNH SỬ DỤNG AI, VOICE CLONING & API BÊN THỨ BA (BYOK)
2. QUY ĐỊNH SỬ DỤNG AI & DỊCH VỤ BÊN THỨ BA (BYOK POLICY)
- Người dùng tự cấu hình và sử dụng API Key cá nhân (OpenAI, Gemini, ElevenLabs, Claude...) theo đúng chính sách điều khoản của từng nhà cung cấp dịch vụ tương ứng.
- Toàn bộ API Key được mã hóa cục bộ bằng Windows DPAPI / Secure Storage trên thiết bị của khách hàng; hệ thống máy chủ JACS không lưu trữ khóa API thô của người dùng.
- JACS Studio không chịu trách nhiệm đối với bất kỳ chi phí phát sinh, việc khóa tài khoản API hoặc tính chính xác của nội dung do mô hình AI của bên thứ ba sinh ra.

ĐIỀU 3. QUYỀN HẠN LICENSE, KHÓA HWID & CHỐNG BẺ KHÓA (ANTI-CRACK)
3. QUYỀN SỬ DỤNG BẢN QUYỀN & THIẾT BỊ (ANTI-CRACK & HWID)
- Mỗi License Key được cấp quyền kích hoạt sử dụng trên số lượng thiết bị phần cứng (HWID) đã đăng ký theo gói dịch vụ.
- Nghiêm cấm mọi hành vi đảo ngược mã nguồn (Reverse Engineering), bẻ khóa (Crack), chia sẻ trái phép hoặc bán lại license khi chưa có sự đồng ý bằng văn bản của JACS Studio.
- Vi phạm điều khoản sẽ dẫn đến việc thu hồi và khóa vĩnh viễn License Key trên toàn hệ thống mà không được hoàn tiền.

ĐIỀU 4. QUYỀN RIÊNG TƯ, BẢO MẬT DỮ LIỆU & GIẢI QUYẾT TRANH CHẤP
4. QUYỀN RIÊNG TƯ & GIẢI QUYẾT TRANH CHẤP
- JACS Studio chỉ thu thập mã định danh phần cứng (HWID), phiên bản app và nhật ký sự cố (Crash logs) phục vụ mục đích kiểm soát bản quyền và cải thiện độ ổn định. Không thu thập nội dung video cá nhân.
- Mọi khiếu nại hoặc hỗ trợ kỹ thuật xin vui lòng liên hệ bộ phận hỗ trợ chính thức qua kênh Telegram / Hotline hỗ trợ.
- Trong trường hợp xảy ra tranh chấp pháp lý, các bên cam kết ưu tiên thương lượng trên tinh thần tôn trọng quyền sở hữu trí tuệ và quy định pháp luật hiện hành.

---------------------------------------------------------------------------------
ĐẠI DIỆN BAN PHÁP CHẾ & AN NINH MẠNG JACS:
Jacs.Legal.Auth
Đơn vị xác thực: Ban Pháp Chế & An Ninh Mạng JACS Studio
Ký duyệt điện tử: SHA256:8F92-4B10-AC99-2026-JACS-LEGAL
Thời điểm cấp chứng chỉ: 6/9/2026

[JACS LEGAL COMPLIANCE]
CERT: 8F92-4B10-AC99-2026-JACS-LEGAL
ISO/IEC 27001 • GDPR • VN CYBERSECURITY ACT
✓ ENTERPRISE VERIFIED & SECURED`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="legal-modal-overlay" onClick={requireAgreement ? undefined : onClose}>
      <div className="legal-modal-card legal-cert-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Window Top Actions Bar */}
        <div className="legal-cert-top-bar">
          <div className="legal-cert-top-title">
            <span style={{ fontSize: "16px" }}>⚖️</span>
            <strong>VĂN BẢN ĐIỀU KHOẢN & CHỨNG THỰC PHÁP LÝ JACS STUDIO</strong>
          </div>
          <div className="legal-cert-top-actions">
            <button
              type="button"
              className="btn-cert-tool"
              onClick={handleCopy}
              title="Sao chép toàn bộ văn bản"
            >
              <Icon name="copy" size={13} />
              <span>{copiedText ? "✓ Đã sao chép" : "Sao chép"}</span>
            </button>
            <button
              type="button"
              className="btn-cert-tool"
              onClick={handlePrint}
              title="In văn bản hoặc xuất file PDF"
            >
              <Icon name="download" size={13} />
              <span>In / PDF</span>
            </button>
            {!requireAgreement && (
              <button
                type="button"
                className="btn-cert-close"
                onClick={onClose}
                title="Đóng cửa sổ"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Certificate Paper Document Sheet Viewport */}
        <div
          className="legal-cert-scroll-viewport"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 16px 36px 16px",
            background: "#080c14",
          }}
        >
          <div
            className="legal-cert-paper-sheet"
            style={{
              width: "100%",
              maxWidth: "780px",
              margin: "0 auto",
              minHeight: "fit-content",
              background: "#ffffff",
              color: "#1e293b",
              borderRadius: "14px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)",
              padding: "40px 48px 48px 48px",
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              boxSizing: "border-box",
              userSelect: "text",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* 1. Header of Certificate */}
            <div
              className="cert-sheet-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              <div className="cert-header-left" style={{ flex: 1 }}>
                <h3
                  className="cert-comp-title"
                  style={{
                    fontSize: "15px",
                    fontWeight: 900,
                    color: "#0f172a",
                    letterSpacing: "0.04em",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  JACS STUDIO COMPLIANCE & LEGAL CERTIFICATE
                </h3>
                <p
                  className="cert-nation-motto"
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    margin: "4px 0 0 0",
                    fontWeight: 500,
                  }}
                >
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM — Độc lập • Tự do • Hạnh phúc
                </p>
              </div>
              <div className="cert-header-right" style={{ flexShrink: 0 }}>
                <div
                  className="cert-doc-ref-badge"
                  style={{
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontFamily: "'DM Mono', Consolas, monospace",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#475569",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}
                >
                  DOC-REF: JACS-LEGAL-2026-v2.4 - 2026
                </div>
              </div>
            </div>

            <div
              className="cert-header-divider"
              style={{
                height: "2px",
                background: "#0f172a",
                margin: "14px 0 24px 0",
              }}
            />

            {/* 2. Main Title */}
            <div
              className="cert-main-title-block"
              style={{
                textAlign: "center",
                marginBottom: "26px",
              }}
            >
              <h2
                className="cert-main-heading"
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  color: "#0f172a",
                  letterSpacing: "-0.01em",
                  margin: "0 0 6px 0",
                }}
              >
                Điều Khoản Sử Dụng & Miễn Trừ Trách Nhiệm Pháp Lý JACS Studio
              </h2>
              <p
                className="cert-effective-date"
                style={{
                  fontSize: "12px",
                  fontStyle: "italic",
                  color: "#64748b",
                  margin: 0,
                }}
              >
                Văn bản có hiệu lực thi hành từ ngày 2026-01-01 cho toàn bộ người dùng và giấy phép JACS Studio
              </p>
            </div>

            {/* 3. Four Legal Articles */}
            <div
              className="cert-articles-container"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              {/* Điều 1 */}
              <div className="cert-article-block">
                <h4
                  className="cert-article-title"
                  style={{
                    fontSize: "13px",
                    fontWeight: 900,
                    color: "#0f172a",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    margin: "0 0 3px 0",
                  }}
                >
                  ĐIỀU 1. BẢN QUYỀN & TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM NỘI DUNG
                </h4>
                <div
                  className="cert-article-subtitle"
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    marginBottom: "6px",
                  }}
                >
                  1. BẢN QUYỀN VÀ MIỄN TRỪ TRÁCH NHIỆM NỘI DUNG
                </div>
                <ul
                  className="cert-article-list"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    JACS Studio là bộ công cụ hỗ trợ biên tập, dựng video, trích xuất cảnh và tổng hợp giọng đọc AI tự động.
                  </li>
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    Người dùng chịu trách nhiệm pháp lý 100% đối với toàn bộ video nguồn, hình ảnh, âm thanh và văn bản do chính người dùng nhập vào hoặc xử lý qua phần mềm.
                  </li>
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    Nhà phát triển JACS Studio không sở hữu, không lưu trữ và không chịu bất kỳ trách nhiệm pháp lý nào về tranh chấp quyền tác giả, bản quyền thương hiệu, quyền hình ảnh hoặc các khiếu nại liên quan đến nội dung do người dùng tạo ra.
                  </li>
                </ul>
              </div>

              {/* Điều 2 */}
              <div className="cert-article-block">
                <h4
                  className="cert-article-title"
                  style={{
                    fontSize: "13px",
                    fontWeight: 900,
                    color: "#0f172a",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    margin: "0 0 3px 0",
                  }}
                >
                  ĐIỀU 2. QUY ĐỊNH SỬ DỤNG AI, VOICE CLONING & API BÊN THỨ BA (BYOK)
                </h4>
                <div
                  className="cert-article-subtitle"
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    marginBottom: "6px",
                  }}
                >
                  2. QUY ĐỊNH SỬ DỤNG AI & DỊCH VỤ BÊN THỨ BA (BYOK POLICY)
                </div>
                <ul
                  className="cert-article-list"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    Người dùng tự cấu hình và sử dụng API Key cá nhân (OpenAI, Gemini, ElevenLabs, Claude...) theo đúng chính sách điều khoản của từng nhà cung cấp dịch vụ tương ứng.
                  </li>
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    Toàn bộ API Key được mã hóa cục bộ bằng Windows DPAPI / Secure Storage trên thiết bị của khách hàng; hệ thống máy chủ JACS không lưu trữ khóa API thô của người dùng.
                  </li>
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    JACS Studio không chịu trách nhiệm đối với bất kỳ chi phí phát sinh, việc khóa tài khoản API hoặc tính chính xác của nội dung do mô hình AI của bên thứ ba sinh ra.
                  </li>
                </ul>
              </div>

              {/* Điều 3 */}
              <div className="cert-article-block">
                <h4
                  className="cert-article-title"
                  style={{
                    fontSize: "13px",
                    fontWeight: 900,
                    color: "#0f172a",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    margin: "0 0 3px 0",
                  }}
                >
                  ĐIỀU 3. QUYỀN HẠN LICENSE, KHÓA HWID & CHỐNG BẺ KHÓA (ANTI-CRACK)
                </h4>
                <div
                  className="cert-article-subtitle"
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    marginBottom: "6px",
                  }}
                >
                  3. QUYỀN SỬ DỤNG BẢN QUYỀN & THIẾT BỊ (ANTI-CRACK & HWID)
                </div>
                <ul
                  className="cert-article-list"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    Mỗi License Key được cấp quyền kích hoạt sử dụng trên số lượng thiết bị phần cứng (HWID) đã đăng ký theo gói dịch vụ.
                  </li>
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    Nghiêm cấm mọi hành vi đảo ngược mã nguồn (Reverse Engineering), bẻ khóa (Crack), chia sẻ trái phép hoặc bán lại license khi chưa có sự đồng ý bằng văn bản của JACS Studio.
                  </li>
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    Vi phạm điều khoản sẽ dẫn đến việc thu hồi và khóa vĩnh viễn License Key trên toàn hệ thống mà không được hoàn tiền.
                  </li>
                </ul>
              </div>

              {/* Điều 4 */}
              <div className="cert-article-block">
                <h4
                  className="cert-article-title"
                  style={{
                    fontSize: "13px",
                    fontWeight: 900,
                    color: "#0f172a",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    margin: "0 0 3px 0",
                  }}
                >
                  ĐIỀU 4. QUYỀN RIÊNG TƯ, BẢO MẬT DỮ LIỆU & GIẢI QUYẾT TRANH CHẤP
                </h4>
                <div
                  className="cert-article-subtitle"
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    marginBottom: "6px",
                  }}
                >
                  4. QUYỀN RIÊNG TƯ & GIẢI QUYẾT TRANH CHẤP
                </div>
                <ul
                  className="cert-article-list"
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "5px",
                  }}
                >
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    JACS Studio chỉ thu thập mã định danh phần cứng (HWID), phiên bản app và nhật ký sự cố (Crash logs) phục vụ mục đích kiểm soát bản quyền và cải thiện độ ổn định. Không thu thập nội dung video cá nhân.
                  </li>
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    Mọi khiếu nại hoặc hỗ trợ kỹ thuật xin vui lòng liên hệ bộ phận hỗ trợ chính thức qua kênh Telegram / Hotline hỗ trợ.
                  </li>
                  <li style={{ position: "relative", paddingLeft: "16px", fontSize: "11.5px", lineHeight: "1.6", color: "#334155" }}>
                    <span style={{ position: "absolute", left: 0, color: "#64748b", fontWeight: 700 }}>–</span>
                    Trong trường hợp xảy ra tranh chấp pháp lý, các bên cam kết ưu tiên thương lượng trên tinh thần tôn trọng quyền sở hữu trí tuệ và quy định pháp luật hiện hành.
                  </li>
                </ul>
              </div>
            </div>

            {/* Dashed Separator Line */}
            <div
              className="cert-dashed-divider"
              style={{
                borderTop: "1.5px dashed #cbd5e1",
                margin: "28px 0 22px 0",
              }}
            />

            {/* 4. Signature & Official Compliance Badge Stamp */}
            <div
              className="cert-bottom-signatures-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: "24px",
                flexWrap: "wrap",
                marginTop: "auto",
              }}
            >
              {/* Left: Signature Info */}
              <div
                className="cert-sig-left-col"
                style={{
                  flex: 1,
                  minWidth: "260px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "3px",
                }}
              >
                <div
                  className="cert-sig-heading"
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "#0f172a",
                    letterSpacing: "0.03em",
                  }}
                >
                  ĐẠI DIỆN BAN PHÁP CHẾ & AN NINH MẠNG JACS:
                </div>
                <div
                  className="cert-sig-cursive-name"
                  style={{
                    fontFamily: "'Brush Script MT', 'Dancing Script', 'Segoe Script', cursive",
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "#1e3a8a",
                    letterSpacing: "1px",
                    margin: "4px 0 2px 0",
                  }}
                >
                  Jacs.Legal.Auth
                </div>
                <div
                  className="cert-sig-meta-line"
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    lineHeight: "1.4",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>Đơn vị xác thực:</span> Ban Pháp Chế & An Ninh Mạng JACS Studio
                </div>
                <div
                  className="cert-sig-meta-line"
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    lineHeight: "1.4",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>Ký duyệt điện tử:</span>{" "}
                  <code
                    style={{
                      fontFamily: "'DM Mono', Consolas, monospace",
                      fontSize: "10px",
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      padding: "1px 5px",
                      borderRadius: "4px",
                      color: "#0f172a",
                      fontWeight: 600,
                    }}
                  >
                    SHA256:8F92-4B10-AC99-2026-JACS-LEGAL
                  </code>
                </div>
                <div
                  className="cert-sig-meta-line"
                  style={{
                    fontSize: "11px",
                    color: "#475569",
                    lineHeight: "1.4",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#1e293b" }}>Thời điểm cấp chứng chỉ:</span> 6/9/2026
                </div>
              </div>

              {/* Right: Official Red Compliance Box */}
              <div
                className="cert-compliance-stamp-box"
                style={{
                  border: "2px solid #dc2626",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)",
                  padding: "12px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  boxShadow: "0 4px 14px rgba(220, 38, 38, 0.15)",
                  flexShrink: 0,
                }}
              >
                <div
                  className="stamp-shield-icon"
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    flexShrink: 0,
                    boxShadow: "0 3px 8px rgba(220, 38, 38, 0.35)",
                  }}
                >
                  <div
                    className="shield-inner"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    <span className="shield-symbol" style={{ fontSize: "15px" }}>🛡️</span>
                    <span className="shield-stars" style={{ fontSize: "7px", letterSpacing: "1px", color: "#fef08a", marginTop: "2px" }}>★★★★★</span>
                  </div>
                </div>
                <div
                  className="stamp-details-col"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  <div
                    className="stamp-comp-title"
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 900,
                      color: "#b91c1c",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    JACS LEGAL COMPLIANCE
                  </div>
                  <div
                    className="stamp-cert-code"
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 700,
                      color: "#dc2626",
                      fontFamily: "'DM Mono', Consolas, monospace",
                    }}
                  >
                    CERT: 8F92-4B10-AC99-2026-JACS-LEGAL
                  </div>
                  <div
                    className="stamp-iso-standards"
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "#7f1d1d",
                      letterSpacing: "0.02em",
                    }}
                  >
                    ISO/IEC 27001 • GDPR • VN CYBERSECURITY ACT
                  </div>
                  <div
                    className="stamp-verified-tag"
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      color: "#15803d",
                      marginTop: "3px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ✓ ENTERPRISE VERIFIED & SECURED
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Modal Footer Controls */}
        <div className="legal-cert-modal-footer">
          {requireAgreement ? (
            <>
              <label className={`legal-cert-agree-check ${hasAgreed ? "is-checked" : ""}`}>
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(e) => setHasAgreed(e.target.checked)}
                />
                <span>
                  Tôi đã đọc kỹ toàn bộ Văn bản Pháp lý & Chứng chỉ Compliance trên, xác nhận <strong>chịu trách nhiệm 100% về bản quyền nội dung</strong> và <strong>hoàn toàn đồng ý</strong> với tất cả các điều khoản của JACS Studio.
                </span>
              </label>

              <div className="legal-cert-footer-btns">
                <button type="button" className="btn-cert-cancel" onClick={onClose}>
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  className="btn-cert-agree"
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
            <div className="legal-cert-footer-btns" style={{ justifyContent: "space-between", width: "100%" }}>
              <div className="legal-cert-footer-meta">
                <Icon name="shield" size={14} />
                <span>Văn bản chứng chỉ số: DOC-REF: JACS-LEGAL-2026-v2.4 - 2026</span>
              </div>
              <button
                type="button"
                className="btn-cert-agree"
                style={{ padding: "8px 26px" }}
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
