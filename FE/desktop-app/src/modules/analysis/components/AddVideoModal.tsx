import React from "react";
import { FolderFill, PlusLg, Upload, XLg } from "react-bootstrap-icons";

interface AddVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputUrl: string;
  setInputUrl: (val: string) => void;
  isAddingUrl: boolean;
  onPickFiles: () => void;
  onAddUrlSubmit: () => void;
}

export const AddVideoModal: React.FC<AddVideoModalProps> = ({
  isOpen,
  onClose,
  inputUrl,
  setInputUrl,
  isAddingUrl,
  onPickFiles,
  onAddUrlSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#10131c",
          border: "1px solid rgba(245, 158, 11, 0.35)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "500px",
          padding: "20px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            paddingBottom: "10px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <PlusLg size={16} color="#fbbf24" />
            <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: 0 }}>
              Thêm Video Nguồn Mới
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
          >
            <XLg size={15} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Option 1: Multi-file picker */}
          <div
            style={{
              background: "rgba(26, 30, 43, 0.5)",
              border: "1px dashed rgba(245, 158, 11, 0.4)",
              borderRadius: "8px",
              padding: "16px",
              textAlign: "center",
            }}
          >
            <FolderFill size={28} color="#fbbf24" style={{ margin: "0 auto 8px" }} />
            <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#f8fafc", margin: "0 0 3px" }}>
              Chọn File Video Từ Máy Tính
            </h4>
            <p style={{ fontSize: "11px", color: "#94a3b8", margin: "0 0 12px" }}>
              Hỗ trợ nạp 1 hoặc nhiều video cùng lúc (MP4, MKV, MOV, AVI, WEBM).
            </p>
            <button
              type="button"
              onClick={onPickFiles}
              style={{
                background: "linear-gradient(135deg, #d97706, #f59e0b)",
                color: "#12151f",
                border: "none",
                padding: "7px 16px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Upload size={13} /> Duyệt File Trên Máy Tính
            </button>
          </div>

          {/* Option 2: URL Input */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11.5px",
                fontWeight: 700,
                color: "#cbd5e1",
                marginBottom: "5px",
              }}
            >
              HOẶC DÁN ĐƯỜNG DẪN LINK VIDEO URL
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... hoặc TikTok URL"
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "6px",
                  padding: "7px 10px",
                  color: "#f8fafc",
                  fontSize: "12px",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={onAddUrlSubmit}
                disabled={!inputUrl.trim() || isAddingUrl}
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "#fbbf24",
                  padding: "7px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {isAddingUrl ? "Đang thêm..." : "Thêm URL"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
