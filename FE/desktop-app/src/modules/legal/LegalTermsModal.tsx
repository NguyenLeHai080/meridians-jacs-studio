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
    const textToCopy = `JACS STUDIO • SOFTWARE LICENSING & TERMS OF SERVICE
BỘ PHẬN PHÁT TRIỂN & BẢO HỘ BẢN QUYỀN JACS STUDIO
Mã tài liệu: JACS-EULA-2026-v2.6

THỎA THUẬN CẤP PHÉP SỬ DỤNG VÀ ĐIỀU KHOẢN DỊCH VỤ PHẦN MỀM JACS STUDIO
(Phiên bản: 2026.1 • Có hiệu lực thi hành từ ngày kích hoạt License Key)

Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24 tháng 11 năm 2015;
Căn cứ Luật Sở hữu trí tuệ số 36/2005/QH11 ngày 29 tháng 11 năm 2005 (sửa đổi, bổ sung năm 2009, 2019, 2022);
Căn cứ Luật Công nghệ thông tin số 67/2006/QH11 ngày 29 tháng 6 năm 2006;
Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 ngày 22 tháng 6 năm 2023;
Căn cứ Nghị định số 13/2023/NĐ-CP ngày 17 tháng 04 năm 2023 của Chính phủ về bảo vệ dữ liệu cá nhân.

Điều 1. Bản quyền phần mềm và phạm vi cấp phép sử dụng
1. JACS Studio là sản phẩm phần mềm độc quyền được phát triển bởi Nhà phát triển JACS Studio, bao gồm toàn bộ mã nguồn, cấu trúc thuật toán, giao diện đồ họa (UI/UX) và các tài liệu kỹ thuật liên quan, được bảo hộ theo pháp luật về Sở hữu trí tuệ.
2. License Key được cấp cho Khách hàng là quyền sử dụng có giới hạn (Limited), không độc quyền (Non-exclusive), không được chuyển nhượng (Non-transferable) và chỉ phục vụ cho mục đích tác nghiệp, biên tập video nội bộ theo đúng thỏa thuận.
3. Nghiêm cấm mọi hành vi sao chép, phân phối lại, cho thuê, thương mại hóa phần mềm hoặc chuyển nhượng License Key cho bên thứ ba khi chưa có văn bản chấp thuận từ Nhà phát triển.

Điều 2. Bảo mật phần mềm, kiểm soát thiết bị (HWID) và chống can thiệp mã nguồn
1. Mỗi License Key được định danh và gắn kết chặt chẽ với mã nhận dạng phần cứng (HWID) của số lượng thiết bị đã đăng ký trong gói dịch vụ.
2. Nghiêm cấm tuyệt đối mọi hành vi can thiệp trái phép vào phần mềm, bao gồm nhưng không giới hạn: đảo ngược mã nguồn (Reverse Engineering), dịch ngược (Decompilation), can thiệp bộ nhớ (Debugging/Memory Hooking), bẻ khóa (Crack), hoặc vô hiệu hóa cơ chế xác thực bản quyền.
3. Mọi hành vi vi phạm sẽ dẫn đến việc đình chỉ ngay lập tức và thu hồi vĩnh viễn quyền sử dụng mà không được hoàn lại bất kỳ khoản phí nào, đồng thời Người dùng phải chịu hoàn toàn trách nhiệm bồi thường thiệt hại theo quy định của pháp luật.

Điều 3. Trách nhiệm về dữ liệu đầu vào và tuyên bố miễn trừ trách nhiệm bản quyền nội dung
1. JACS Studio là công cụ hỗ trợ công nghệ tự động hóa quy trình phân tích và biên tập video. Nhà phát triển JACS Studio hoàn toàn không sở hữu, không quản lý, không kiểm duyệt và không lưu trữ bất kỳ video nguồn, âm thanh, hình ảnh hoặc tài liệu nào do Người dùng đưa vào xử lý.
2. Người dùng cam đoan và bảo đảm rằng mình là chủ sở hữu hợp pháp hoặc đã được cấp đầy đủ quyền sử dụng, quyền phát hành đối với toàn bộ dữ liệu, nguyên liệu đầu vào và nội dung được tạo ra thông qua phần mềm.
3. Người dùng chịu trách nhiệm pháp lý 100% trước cơ quan nhà nước có thẩm quyền và các bên thứ ba đối với mọi tranh chấp bản quyền, quyền tác giả, nhãn hiệu thương mại, quyền hình ảnh hoặc các nội dung vi phạm pháp luật phát sinh từ việc sử dụng phần mềm.
4. Nhà phát triển JACS Studio được miễn trừ hoàn toàn và vô điều kiện khỏi mọi khiếu nại, khiếu kiện, trách nhiệm dân sự, hình sự hoặc tổn thất phát sinh liên quan đến nội dung do Người dùng tạo ra.

Điều 4. Tích hợp mô hình AI và chính sách API bên thứ ba (BYOK)
1. Người dùng tự chịu trách nhiệm cấu hình, quản lý và sử dụng các khóa API cá nhân/doanh nghiệp (OpenAI, Gemini, Anthropic Claude, ElevenLabs...) theo đúng chính sách và điều khoản dịch vụ của từng nhà cung cấp.
2. Toàn bộ API Key được mã hóa an toàn cục bộ trên thiết bị của Người dùng. Nhà phát triển không chịu trách nhiệm đối với chi phí phát sinh, việc khóa tài khoản API hoặc tính chính xác, tính đầy đủ của nội dung do các mô hình trí tuệ nhân tạo bên thứ ba sinh ra.

Điều 5. Giới hạn trách nhiệm pháp lý và từ chối bảo đảm (Limitation of Liability)
1. Phần mềm được cung cấp trên nguyên tắc "Theo Nguyên Trạng" (As Is) và "Như Hiện Có" (As Available). Nhà phát triển nỗ lực tối đa để đảm bảo phần mềm hoạt động ổn định nhưng không bảo đảm rằng phần mềm sẽ hoàn toàn không có lỗi kỹ thuật hoặc tương thích 100% với mọi cấu hình máy tính của bên thứ ba.
2. Trong mọi trường hợp, Nhà phát triển JACS Studio không chịu trách nhiệm về bất kỳ thiệt hại gián tiếp, ngẫu nhiên, hệ quả, thiệt hại về lợi nhuận hoặc gián đoạn hoạt động kinh doanh phát sinh từ việc sử dụng hoặc không thể sử dụng phần mềm.

Điều 6. Hiệu lực thỏa thuận, chấp thuận điện tử và giải quyết tranh chấp
1. Bằng hành động cài đặt, kích hoạt License Key hoặc nhấn nút "Xác nhận & Đồng ý" trên giao diện phần mềm, Người dùng đã đọc, hiểu rõ và tự nguyện cam kết tuân thủ toàn bộ các điều khoản của Thỏa thuận này (có giá trị pháp lý tương đương hợp đồng bằng văn bản theo Luật Giao dịch điện tử).
2. Thỏa thuận này được điều chỉnh và giải thích theo quy định của pháp luật Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp nếu không thể giải quyết thông qua thương lượng sẽ được đưa ra giải quyết tại Tòa án có thẩm quyền theo quy định của pháp luật.

ĐẠI DIỆN NHÀ PHÁT TRIỂN JACS STUDIO
Xác thực bản quyền phần mềm: Jacs.Legal.Auth
Chữ ký điện tử / Hash: SHA256:8F92-4B10-AC99-2026-JACS-LEGAL`;

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
            <strong>THỎA THUẬN CẤP PHÉP & ĐIỀU KHOẢN SỬ DỤNG (EULA)</strong>
          </div>
          <div className="legal-cert-top-actions">
            <button
              type="button"
              className="btn-cert-tool"
              onClick={handleCopy}
              title="Sao chép toàn bộ văn bản EULA"
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
              padding: "44px 52px",
              fontFamily: '"Times New Roman", Times, "Liberation Serif", serif',
              boxSizing: "border-box",
              userSelect: "text",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* 1. Software Publisher & Legal Standard Header */}
            <div
              className="cert-sheet-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "16px",
                marginBottom: "16px",
              }}
            >
              {/* Left: Software Publisher & Doc Ref */}
              <div className="cert-header-left" style={{ textAlign: "left", width: "250px", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#0f172a",
                    textTransform: "uppercase",
                    letterSpacing: "0.01em",
                  }}
                >
                  JACS STUDIO • SOFTWARE VENDOR
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: "0.01em",
                    marginTop: "2px",
                  }}
                >
                  BỘ PHẬN PHÁT TRIỂN & BẢO HỘ BẢN QUYỀN
                </div>
                <div
                  style={{
                    width: "70px",
                    height: "1px",
                    backgroundColor: "#94a3b8",
                    margin: "6px 0",
                  }}
                />
                <div
                  style={{
                    fontSize: "10px",
                    fontFamily: "'DM Mono', Consolas, monospace",
                    color: "#64748b",
                  }}
                >
                  DOC-REF: JACS-EULA-2026-v2.6
                </div>
              </div>

              {/* Right: Legal Framework & Effective Standard */}
              <div className="cert-header-right" style={{ textAlign: "right", width: "290px", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#0f172a",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  TIÊU CHUẨN THỎA THUẬN CẤP PHÉP EULA
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#475569",
                    marginTop: "2px",
                  }}
                >
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div
                  style={{
                    width: "90px",
                    height: "1px",
                    backgroundColor: "#94a3b8",
                    margin: "6px 0 6px auto",
                  }}
                />
                <div
                  style={{
                    fontSize: "10px",
                    fontStyle: "italic",
                    color: "#64748b",
                  }}
                >
                  Phiên bản: 2026.1 • Áp dụng khi kích hoạt HWID
                </div>
              </div>
            </div>

            {/* 2. Main Title */}
            <div
              className="cert-main-title-block"
              style={{
                textAlign: "center",
                margin: "14px 0 18px 0",
              }}
            >
              <h2
                className="cert-main-heading"
                style={{
                  fontSize: "13.5px",
                  fontWeight: 900,
                  color: "#0f172a",
                  letterSpacing: "-0.01em",
                  textTransform: "uppercase",
                  margin: "0 0 6px 0",
                  lineHeight: "1.4",
                }}
              >
                THỎA THUẬN CẤP PHÉP SỬ DỤNG VÀ ĐIỀU KHOẢN DỊCH VỤ PHẦN MỀM JACS STUDIO
              </h2>
              <p
                className="cert-effective-date"
                style={{
                  fontSize: "10.5px",
                  fontStyle: "italic",
                  color: "#64748b",
                  margin: 0,
                }}
              >
                (Phiên bản: 2026.1 • Xác thực cấp phép điện tử & ràng buộc trách nhiệm pháp lý người dùng cuối)
              </p>
            </div>

            {/* 3. Legal Foundations */}
            <div
              style={{
                fontSize: "11px",
                fontStyle: "italic",
                lineHeight: "1.7",
                color: "#334155",
                marginBottom: "20px",
                paddingLeft: "4px",
              }}
            >
              <p style={{ margin: "0 0 3px 0" }}>Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24 tháng 11 năm 2015;</p>
              <p style={{ margin: "0 0 3px 0" }}>Căn cứ Luật Sở hữu trí tuệ số 36/2005/QH11 ngày 29 tháng 11 năm 2005 (sửa đổi, bổ sung năm 2009, 2019, 2022);</p>
              <p style={{ margin: "0 0 3px 0" }}>Căn cứ Luật Công nghệ thông tin số 67/2006/QH11 ngày 29 tháng 6 năm 2006;</p>
              <p style={{ margin: "0 0 3px 0" }}>Căn cứ Luật Giao dịch điện tử số 20/2023/QH15 ngày 22 tháng 6 năm 2023;</p>
              <p style={{ margin: "0 0 3px 0" }}>Căn cứ Nghị định số 13/2023/NĐ-CP ngày 17 tháng 04 năm 2023 của Chính phủ về bảo vệ dữ liệu cá nhân.</p>
            </div>

            {/* 4. Six Legal Articles */}
            <div
              className="cert-articles-container"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                fontSize: "12px",
                lineHeight: "1.65",
                color: "#1e293b",
                fontFamily: '"Times New Roman", Times, "Liberation Serif", serif',
              }}
            >
              {/* Điều 1 */}
              <div className="cert-article-block">
                <h4
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 4px 0",
                  }}
                >
                  Điều 1. Bản quyền phần mềm và phạm vi cấp phép sử dụng
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "#334155" }}>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    1. JACS Studio là sản phẩm phần mềm độc quyền được phát triển bởi Nhà phát triển JACS Studio, bao gồm toàn bộ mã nguồn, cấu trúc thuật toán, giao diện đồ họa (UI/UX) và các tài liệu kỹ thuật liên quan, được bảo hộ theo pháp luật về Sở hữu trí tuệ.
                  </p>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    2. License Key được cấp cho Khách hàng là quyền sử dụng có giới hạn (Limited), không độc quyền (Non-exclusive), không được chuyển nhượng (Non-transferable) và chỉ phục vụ cho mục đích tác nghiệp, biên tập video nội bộ theo đúng thỏa thuận.
                  </p>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    3. Nghiêm cấm mọi hành vi sao chép, phân phối lại, cho thuê, thương mại hóa phần mềm hoặc chuyển nhượng License Key cho bên thứ ba khi chưa có văn bản chấp thuận từ Nhà phát triển.
                  </p>
                </div>
              </div>

              {/* Điều 2 */}
              <div className="cert-article-block">
                <h4
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 4px 0",
                  }}
                >
                  Điều 2. Bảo mật phần mềm, kiểm soát thiết bị (HWID) và chống can thiệp mã nguồn
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "#334155" }}>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    1. Mỗi License Key được định danh và gắn kết chặt chẽ với mã nhận dạng phần cứng (HWID) của số lượng thiết bị đã đăng ký trong gói dịch vụ.
                  </p>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    2. Nghiêm cấm tuyệt đối mọi hành vi can thiệp trái phép vào phần mềm, bao gồm nhưng không giới hạn: đảo ngược mã nguồn (Reverse Engineering), dịch ngược (Decompilation), can thiệp bộ nhớ (Debugging/Memory Hooking), bẻ khóa (Crack), hoặc vô hiệu hóa cơ chế xác thực bản quyền.
                  </p>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    3. Mọi hành vi vi phạm sẽ dẫn đến việc đình chỉ ngay lập tức và thu hồi vĩnh viễn quyền sử dụng mà không được hoàn lại bất kỳ khoản phí nào, đồng thời Người dùng phải chịu hoàn toàn trách nhiệm bồi thường thiệt hại theo quy định của pháp luật.
                  </p>
                </div>
              </div>

              {/* Điều 3 */}
              <div className="cert-article-block">
                <h4
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 4px 0",
                  }}
                >
                  Điều 3. Trách nhiệm về dữ liệu đầu vào và tuyên bố miễn trừ trách nhiệm bản quyền nội dung
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "#334155" }}>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    1. JACS Studio là công cụ hỗ trợ công nghệ tự động hóa quy trình phân tích và biên tập video. Nhà phát triển JACS Studio hoàn toàn không sở hữu, không quản lý, không kiểm duyệt và không lưu trữ bất kỳ video nguồn, âm thanh, hình ảnh hoặc tài liệu nào do Người dùng đưa vào xử lý.
                  </p>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    2. Người dùng cam đoan và bảo đảm rằng mình là chủ sở hữu hợp pháp hoặc đã được cấp đầy đủ quyền sử dụng, quyền phát hành đối với toàn bộ dữ liệu, nguyên liệu đầu vào và nội dung được tạo ra thông qua phần mềm.
                  </p>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    3. Người dùng chịu trách nhiệm pháp lý 100% trước cơ quan nhà nước có thẩm quyền và các bên thứ ba đối với mọi tranh chấp bản quyền, quyền tác giả, nhãn hiệu thương mại, quyền hình ảnh hoặc các nội dung vi phạm pháp luật phát sinh từ việc sử dụng phần mềm.
                  </p>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    4. Nhà phát triển JACS Studio được miễn trừ hoàn toàn và vô điều kiện khỏi mọi khiếu nại, khiếu kiện, trách nhiệm dân sự, hình sự hoặc tổn thất phát sinh liên quan đến nội dung do Người dùng tạo ra.
                  </p>
                </div>
              </div>

              {/* Điều 4 */}
              <div className="cert-article-block">
                <h4
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 4px 0",
                  }}
                >
                  Điều 4. Tích hợp mô hình AI và chính sách API bên thứ ba (BYOK)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "#334155" }}>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    1. Người dùng tự chịu trách nhiệm cấu hình, quản lý và sử dụng các khóa API cá nhân/doanh nghiệp (OpenAI, Gemini, Anthropic Claude, ElevenLabs...) theo đúng chính sách và điều khoản dịch vụ của từng nhà cung cấp.
                  </p>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    2. Toàn bộ API Key được mã hóa an toàn cục bộ trên thiết bị của Người dùng. Nhà phát triển không chịu trách nhiệm đối với chi phí phát sinh, việc khóa tài khoản API hoặc tính chính xác, tính đầy đủ của nội dung do các mô hình trí tuệ nhân tạo bên thứ ba sinh ra.
                  </p>
                </div>
              </div>

              {/* Điều 5 */}
              <div className="cert-article-block">
                <h4
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 4px 0",
                  }}
                >
                  Điều 5. Giới hạn trách nhiệm pháp lý và từ chối bảo đảm (Limitation of Liability)
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "#334155" }}>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    1. Phần mềm được cung cấp trên nguyên tắc "Theo Nguyên Trạng" (As Is) và "Như Hiện Có" (As Available). Nhà phát triển nỗ lực tối đa để đảm bảo phần mềm hoạt động ổn định nhưng không bảo đảm rằng phần mềm sẽ hoàn toàn không có lỗi kỹ thuật hoặc tương thích 100% với mọi cấu hình máy tính của bên thứ ba.
                  </p>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    2. Trong mọi trường hợp, Nhà phát triển JACS Studio không chịu trách nhiệm về bất kỳ thiệt hại gián tiếp, ngẫu nhiên, hệ quả, thiệt hại về lợi nhuận hoặc gián đoạn hoạt động kinh doanh phát sinh từ việc sử dụng hoặc không thể sử dụng phần mềm.
                  </p>
                </div>
              </div>

              {/* Điều 6 */}
              <div className="cert-article-block">
                <h4
                  style={{
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 4px 0",
                  }}
                >
                  Điều 6. Hiệu lực thỏa thuận, chấp thuận điện tử và giải quyết tranh chấp
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "#334155" }}>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    1. Bằng hành động cài đặt, kích hoạt License Key hoặc nhấn nút "Xác nhận & Đồng ý" trên giao diện phần mềm, Người dùng đã đọc, hiểu rõ và tự nguyện cam kết tuân thủ toàn bộ các điều khoản của Thỏa thuận này (có giá trị pháp lý tương đương hợp đồng bằng văn bản theo Luật Giao dịch điện tử).
                  </p>
                  <p style={{ margin: 0, textIndent: "24px", textAlign: "justify" }}>
                    2. Thỏa thuận này được điều chỉnh và giải thích theo quy định của pháp luật Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp nếu không thể giải quyết thông qua thương lượng sẽ được đưa ra giải quyết tại Tòa án có thẩm quyền theo quy định của pháp luật.
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Dual Signature & Electronic Authorization */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "24px",
                marginTop: "28px",
                paddingTop: "16px",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              {/* Left: Software Publisher Signature */}
              <div style={{ textAlign: "center", width: "260px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#0f172a",
                    letterSpacing: "0.01em",
                  }}
                >
                  ĐẠI DIỆN NHÀ PHÁT TRIỂN JACS STUDIO
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    fontStyle: "italic",
                    color: "#64748b",
                    margin: "2px 0 4px 0",
                  }}
                >
                  (Xác thực bản quyền phần mềm)
                </div>
                <div
                  style={{
                    fontFamily: "'Brush Script MT', 'Dancing Script', 'Segoe Script', cursive",
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "#1e3a8a",
                    letterSpacing: "1px",
                    margin: "2px 0",
                  }}
                >
                  Jacs.Legal.Auth
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    fontFamily: "'DM Mono', Consolas, monospace",
                    color: "#64748b",
                  }}
                >
                  SHA256:8F92-4B10-AC99-2026-JACS-LEGAL
                </div>
              </div>

              {/* Right: End User Electronic Signature */}
              <div style={{ textAlign: "center", width: "260px" }}>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: "#0f172a",
                    letterSpacing: "0.01em",
                  }}
                >
                  NGƯỜI DÙNG CUỐI / KHÁCH HÀNG
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    fontStyle: "italic",
                    color: "#64748b",
                    margin: "2px 0 4px 0",
                  }}
                >
                  (ĐÃ KÝ CAM KẾT ĐIỆN TỬ)
                </div>
                <div
                  style={{
                    fontFamily: "'Brush Script MT', 'Dancing Script', 'Segoe Script', cursive",
                    fontSize: "26px",
                    fontWeight: 700,
                    color: "#047857",
                    letterSpacing: "1px",
                    margin: "2px 0",
                  }}
                >
                  Verified User [HWID Lock]
                </div>
                <div
                  style={{
                    fontSize: "9px",
                    fontFamily: "'DM Mono', Consolas, monospace",
                    color: "#047857",
                    fontWeight: 600,
                  }}
                >
                  ✓ ĐÃ CHẤP THUẬN 6 ĐIỀU KHOẢN EULA
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
                  Tôi đã đọc kỹ toàn bộ <strong>Thỏa Thuận Cấp Phép Sử Dụng và Điều Khoản Dịch Vụ (EULA)</strong> trên, xác nhận <strong>chịu trách nhiệm 100% về bản quyền nội dung</strong> và <strong>hoàn toàn đồng ý</strong> tuân thủ mọi điều khoản.
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
                <span>Mã thỏa thuận EULA: JACS-EULA-2026-v2.6</span>
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
