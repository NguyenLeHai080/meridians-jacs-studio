import React, { useState } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import { releaseService, type PublishReleasePayload } from "../../services/releaseService";

interface CreateReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const CreateReleaseModal: React.FC<CreateReleaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [version, setVersion] = useState("0.4.0");
  const [platform, setPlatform] = useState("windows");
  const [channel, setChannel] = useState("stable");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [sha256, setSha256] = useState("");
  const [fileSizeBytes, setFileSizeBytes] = useState("50000000");
  const [isMandatory, setIsMandatory] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: PublishReleasePayload = {
        version: version.trim(),
        platform,
        channel,
        download_url: downloadUrl.trim(),
        sha256: sha256.trim(),
        file_size_bytes: parseInt(fileSizeBytes) || 0,
        is_mandatory: isMandatory,
        release_notes: notes.trim() || undefined,
      };
      await releaseService.publishRelease(payload);
      onSuccess(`Đã phát hành phiên bản v${version} thành công!`);
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi phát hành phiên bản");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Phát Hành Phiên Bản OTA Mới">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div className="error-alert">{error}</div>}

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">Phiên bản (SemVer) *</label>
            <input
              type="text"
              className="form-input-mf"
              required
              placeholder="VD: 0.4.0"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Nền tảng</label>
            <select
              className="form-input-mf"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="windows">Windows (win32 / win64)</option>
              <option value="darwin">macOS (Apple Silicon / Intel)</option>
              <option value="linux">Linux (x86_64)</option>
            </select>
          </div>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Download URL *</label>
          <input
            type="url"
            className="form-input-mf"
            required
            placeholder="https://.../JACS-Studio-Setup.exe"
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
          />
        </div>

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">SHA-256 Checksum *</label>
            <input
              type="text"
              className="form-input-mf"
              required
              placeholder="64 ký tự hex"
              value={sha256}
              onChange={(e) => setSha256(e.target.value)}
            />
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Kích thước file (bytes)</label>
            <input
              type="number"
              className="form-input-mf"
              value={fileSizeBytes}
              onChange={(e) => setFileSizeBytes(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Ghi chú phát hành (Changelog)</label>
          <textarea
            className="form-input-mf"
            rows={2}
            placeholder="- Nâng cấp giao diện MintForge..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="btn-white-outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary-orange" disabled={loading}>
            {loading ? "Đang phát hành..." : "🚀 Phát Hành Ngay"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
