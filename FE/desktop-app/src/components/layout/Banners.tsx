import React from "react";
import { Icon } from "../../shared/Icon";
import type { UpdateRelease } from "../../core/types";

export const LicenseWarningBanner: React.FC<{
  daysRemaining: number;
  licenseExpiresAt: string;
  onOpenRenewal: () => void;
}> = ({ daysRemaining, licenseExpiresAt, onOpenRenewal }) => {
  const isExpired = daysRemaining <= 0;
  const msg = isExpired
    ? "Bản quyền JACS Studio của bạn ĐÃ HẾT HẠN! Vui lòng quét mã VietQR gia hạn để tiếp tục sử dụng."
    : `Bản quyền JACS Studio của bạn chỉ còn ${daysRemaining} ngày (Hết hạn lúc: ${new Date(
        licenseExpiresAt
      ).toLocaleDateString("vi-VN")}). Vui lòng gia hạn để không bị gián đoạn công việc dựng và render video!`;

  return (
    <div className="license-warning-marquee-bar">
      <div className="marquee-content-container">
        <div className="marquee-content-track">
          <span className="marquee-item">
            ⚠️ <strong>CẢNH BÁO BẢN QUYỀN:</strong> {msg}
          </span>
          <span className="marquee-item">
            ⚠️ <strong>CẢNH BẢN QUYỀN:</strong> {msg}
          </span>
        </div>
      </div>
      <button
        type="button"
        className="btn-marquee-renew"
        onClick={onOpenRenewal}
      >
        <Icon name="zap" size={13} />
        <span>⚡ Gia Hạn Ngay</span>
      </button>
    </div>
  );
};

export const AdminConfigSyncBanner: React.FC<{
  onSync: () => void;
}> = ({ onSync }) => {
  return (
    <div className="admin-config-sync-banner">
      <div className="admin-sync-left">
        <span className="admin-sync-badge">🔔 CẬP NHẬT CẤU HÌNH</span>
        <span>
          Quản trị viên vừa cập nhật thông tin hệ thống (Thông tin ngân hàng, Bảng giá hoặc Quy trình).
        </span>
      </div>
      <button
        type="button"
        className="btn-admin-sync"
        onClick={onSync}
      >
        <Icon name="refresh" size={13} />
        <span>🔄 Bấm Để Đồng Bộ Ngay</span>
      </button>
    </div>
  );
};

export const OtaUpdateBanner: React.FC<{
  update: UpdateRelease;
  isUpdating: boolean;
  updateProgress: number;
  onApplyUpdate: () => void;
  onDismiss: () => void;
}> = ({
  update,
  isUpdating,
  updateProgress,
  onApplyUpdate,
  onDismiss,
}) => {
  return (
    <div className="ota-update-banner">
      <div className="ota-banner-left">
        <span className="ota-badge">🎉 CẬP NHẬT MỚI</span>
        <div className="ota-info">
          <strong>Đã có phiên bản {update.version}</strong>
          <span>
            {update.release_notes ||
              "Bản cập nhật tính năng mới & sửa lỗi. Bấm để load bản mới ngay mà không cần cài lại tool."}
          </span>
        </div>
      </div>
      <div className="ota-banner-actions">
        {isUpdating ? (
          <div className="ota-progress-box">
            <div className="ota-progress-bar">
              <div
                className="ota-progress-fill"
                style={{ width: `${Math.max(5, updateProgress)}%` }}
              />
            </div>
            <span>{updateProgress}%</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="ota-btn-apply"
              onClick={onApplyUpdate}
            >
              ⚡ Tải & Cập nhật ngay
            </button>
            {!update.force_update && (
              <button
                type="button"
                className="ota-btn-later"
                onClick={onDismiss}
              >
                Để sau
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
