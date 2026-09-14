import { Modal } from "../../../shared/Modal";

export interface EditorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  aspectRatio: "9:16" | "1:1" | "16:9" | "4:5";
  setAspectRatio: (ratio: "9:16" | "1:1" | "16:9" | "4:5") => void;
  setProjectMessage: (msg: string) => void;
}

export function EditorConfigModal({
  isOpen,
  onClose,
  aspectRatio,
  setAspectRatio,
  setProjectMessage,
}: EditorConfigModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấu hình Dựng & Render Video"
      eyebrow="TIMELINE STUDIO SETTINGS"
      maxWidth="480px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <label className="field-label">
          Tỷ lệ khung hình mặc định
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as "9:16" | "1:1" | "16:9" | "4:5")}
            className="ts-select-box"
            style={{ marginTop: "4px" }}
          >
            <option value="9:16">9:16 · Dọc (TikTok, Shorts, Reels)</option>
            <option value="16:9">16:9 · Ngang (YouTube, TV)</option>
            <option value="1:1">1:1 · Vuông (Facebook, Instagram)</option>
            <option value="4:5">4:5 · Chân dung (Instagram Portrait)</option>
          </select>
        </label>

        <label className="field-label">
          Độ phân giải Render Video
          <select className="ts-select-box" style={{ marginTop: "4px" }}>
            <option value="1080p">1080p Full HD (Khuyên dùng)</option>
            <option value="4k">4K Ultra HD (Chất lượng cao nhất)</option>
            <option value="720p">720p HD (Tốc độ render nhanh)</option>
          </select>
        </label>

        <label className="field-label">
          Tốc độ khung hình (Frame Rate)
          <select className="ts-select-box" style={{ marginTop: "4px" }}>
            <option value="60fps">60 FPS (Siêu mượt mà)</option>
            <option value="30fps">30 FPS (Chuẩn cơ bản)</option>
            <option value="24fps">24 FPS (Chuẩn điện ảnh)</option>
          </select>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px", gap: "8px" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Đóng
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onClose();
              setProjectMessage("✓ Đã lưu cài đặt cấu hình thành công!");
              setTimeout(() => setProjectMessage(""), 2000);
            }}
          >
            Lưu cấu hình
          </button>
        </div>
      </div>
    </Modal>
  );
}
