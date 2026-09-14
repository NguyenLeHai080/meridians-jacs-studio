import { Copy, ExternalLink, X, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { License } from "../../../core/types";
import { useI18n } from "../../../core/i18n";

export interface LegalCertificateModalProps {
  show: boolean;
  onClose: () => void;
  license: License | null;
  notify: (msg: string, type?: "success" | "error") => void;
}

export function LegalCertificateModal({
  show,
  onClose,
  license,
  notify,
}: LegalCertificateModalProps) {
  const { t } = useI18n();

  if (!show || !license) return null;

  const handleCopyLegal = () => {
    const fullText = `${t("legalCertHeader")}
${t("legalCertDocRef")}

${t("legalCertDocTitle")}
${t("legalCertCustomer")} ${license.customer_name}
${t("legalCertHwid")} ${license.hwid || "N/A"}
${t("legalCertKey")} ${license.license_key || license.key_hint}
${t("legalCertStatus")} ${t("legalCertStatusAgreed")}

${t("legalCertArticle1Title")}
- ${t("legalCertArticle1_1")}
- ${t("legalCertArticle1_2")}
- ${t("legalCertArticle1_3")}

${t("legalCertArticle2Title")}
- ${t("legalCertArticle2_1")}
- ${t("legalCertArticle2_2")}
- ${t("legalCertArticle2_3")}

${t("legalCertArticle3Title")}
- ${t("legalCertArticle3_1")}
- ${t("legalCertArticle3_2")}
- ${t("legalCertArticle3_3")}

${t("legalCertArticle4Title")}
- ${t("legalCertArticle4_1")}
- ${t("legalCertArticle4_2")}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullText);
      notify(t("legalCertCopiedToast"), "success");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(8, 12, 20, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#080c14",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "840px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-up"
      >
        {/* Top Bar */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#0f172a",
            color: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 750 }}>
            <span style={{ fontSize: "17px" }}>⚖️</span>
            <span>{t("legalCertHeader")}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCopyLegal}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f1f5f9",
                padding: "5px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Copy size={13} />
              {t("btnCopy")}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#f1f5f9",
                padding: "5px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ExternalLink size={13} />
              {t("btnPrintPdf")}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Document Paper Sheet Viewport */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 20px 36px 20px",
            background: "#080c14",
          }}
        >
          <div
            style={{
              maxWidth: "760px",
              margin: "0 auto",
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: "12px",
              padding: "36px 40px 44px 40px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
              fontSize: "13px",
              lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          >
            {/* Document Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f172a", paddingBottom: "14px", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontSize: "17px", fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>
                  {t("legalCertDocTitle")}
                </h2>
                <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                  JACS STUDIO COMPLIANCE & LEGAL FRAMEWORK
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ background: "#f1f5f9", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700, fontFamily: "monospace", color: "#334155", border: "1px solid #cbd5e1" }}>
                  {t("legalCertDocRef")}
                </span>
              </div>
            </div>

            {/* Document Title */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <h1 style={{ fontSize: "19px", fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>
                {t("legalCertDocTitle")}
              </h1>
              <p style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", margin: 0 }}>
                {t("legalCertDocSubtitle")}
              </p>
            </div>

            {/* Audit Evidence Box */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: "10px",
                padding: "14px 18px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 800, color: "#166534", marginBottom: "8px" }}>
                <ShieldCheck size={16} />
                {t("legalCertConfirmedBar")}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "#64748b" }}>{t("legalCertCustomer")}</span>{" "}
                  <strong style={{ color: "#0f172a" }}>{license.customer_name}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>{t("legalCertContact")}</span>{" "}
                  <strong style={{ color: "#0f172a" }}>{license.customer_contact || "N/A"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>{t("legalCertHwid")}</span>{" "}
                  <span style={{ fontFamily: "monospace", color: "#334155", fontWeight: 600 }}>{license.hwid || "N/A"}</span>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>{t("legalCertKey")}</span>{" "}
                  <span style={{ fontFamily: "monospace", color: "#047857", fontWeight: 700 }}>{license.license_key || license.key_hint}</span>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>{t("legalCertSignDate")}</span>{" "}
                  <strong style={{ color: "#0f172a" }}>
                    {license.terms_accepted_at
                      ? new Date(license.terms_accepted_at).toLocaleString()
                      : "2026-01-01"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b" }}>{t("legalCertStatus")}</span>{" "}
                  <strong style={{ color: "#16a34a" }}>{t("legalCertStatusAgreed")}</strong>
                </div>
              </div>
            </div>

            {/* 4 Articles Content */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#334155" }}>
              <div>
                <h3 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                  {t("legalCertArticle1Title")}
                </h3>
                <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: "12.5px" }}>
                  <li>{t("legalCertArticle1_1")}</li>
                  <li><strong>{t("legalCertArticle1_2")}</strong></li>
                  <li>{t("legalCertArticle1_3")}</li>
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                  {t("legalCertArticle2Title")}
                </h3>
                <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: "12.5px" }}>
                  <li>{t("legalCertArticle2_1")}</li>
                  <li>{t("legalCertArticle2_2")}</li>
                  <li>{t("legalCertArticle2_3")}</li>
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                  {t("legalCertArticle3Title")}
                </h3>
                <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: "12.5px" }}>
                  <li>{t("legalCertArticle3_1")}</li>
                  <li>{t("legalCertArticle3_2")}</li>
                  <li>{t("legalCertArticle3_3")}</li>
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: "13.5px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
                  {t("legalCertArticle4Title")}
                </h3>
                <ul style={{ margin: "4px 0 0 18px", padding: 0, fontSize: "12.5px" }}>
                  <li>{t("legalCertArticle4_1")}</li>
                  <li>{t("legalCertArticle4_2")}</li>
                </ul>
              </div>
            </div>

            {/* Official Stamp & Certificate Signature */}
            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>{t("legalCertOfficialSign")}</div>
                <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>Jacs.Legal.Auth</div>
                <div style={{ fontSize: "11px", color: "#475569", fontFamily: "monospace" }}>
                  SHA256:8F92-4B10-AC99-2026-JACS-LEGAL
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", color: "#047857", fontWeight: 700 }}>
                  ✓ ISO/IEC 27001 • GDPR • CYBERSECURITY COMPLIANT
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Confirmation Box */}
        <div
          style={{
            padding: "14px 24px",
            background: "#0f172a",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a7f3d0", fontSize: "12px", fontWeight: 650 }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>{t("legalCertConfirmedFooter")}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#ea580c",
              border: "none",
              color: "#ffffff",
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("modalClose")}
          </button>
        </div>
      </div>
    </div>
  );
}
