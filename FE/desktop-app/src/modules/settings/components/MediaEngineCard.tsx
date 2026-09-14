import React from "react";
import type { ToolPreferences } from "../../../core/types";

export interface MediaEngineCardProps {
  localPreferences: ToolPreferences;
  capabilities: {
    ffmpeg: boolean;
    ffprobe: boolean;
    ffmpegPath?: string;
    ffprobePath?: string;
  };
  update: (patch: Partial<ToolPreferences>) => Promise<void>;
  updateState: {
    checking: boolean;
    installing: boolean;
    release: any;
    message: string;
    progress: number;
  };
  checkForUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

export function MediaEngineCard({
  localPreferences,
  capabilities,
  update,
  updateState,
  checkForUpdate,
  installUpdate,
}: MediaEngineCardProps) {
  return (
    <section className="panel-card" style={{ borderRadius: "10px", padding: "14px 16px" }}>
      <div className="panel-head">
        <div>
          <span
            style={{
              fontSize: "10px",
              color: "#38bdf8",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            SYSTEM & UPDATES
          </span>
          <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
            Hệ thống & Cập nhật
          </h3>
        </div>
      </div>

      {/* Setting Toggles */}
      <div className="setting-toggle-item">
        <div className="setting-toggle-text">
          <strong>Gửi log lỗi ẩn danh</strong>
          <small>Giúp đội ngũ xử lý sự cố. Không gửi video hay API key.</small>
        </div>
        <button
          type="button"
          className={`toggle-switch ${localPreferences.telemetryEnabled ? "is-on" : ""}`}
          onClick={() => update({ telemetryEnabled: !localPreferences.telemetryEnabled })}
          aria-label="Toggle telemetry"
        >
          <i />
        </button>
      </div>

      <div className="setting-toggle-item">
        <div className="setting-toggle-text">
          <strong>Tự động kiểm tra bản cập nhật</strong>
          <small>Thông báo khi có bản phát hành mới từ server.</small>
        </div>
        <button
          type="button"
          className={`toggle-switch ${localPreferences.autoUpdateEnabled ? "is-on" : ""}`}
          onClick={() => update({ autoUpdateEnabled: !localPreferences.autoUpdateEnabled })}
          aria-label="Toggle auto update"
        >
          <i />
        </button>
      </div>

      <label className="field-label" style={{ marginTop: "14px" }}>
        Engine Render Ưu Tiên
        <select
          value={localPreferences.preferredEngine}
          onChange={(event) =>
            update({
              preferredEngine: event.target.value as ToolPreferences["preferredEngine"],
            })
          }
        >
          <option value="auto">Tự động chọn GPU tối ưu nhất</option>
          <option value="nvidia">NVIDIA NVENC (GPU)</option>
          <option value="apple">Apple VideoToolbox</option>
          <option value="cpu">CPU Software Fallback</option>
        </select>
      </label>

      {/* Update Section */}
      <div
        style={{
          marginTop: "16px",
          padding: "12px 14px",
          borderRadius: "10px",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <strong style={{ display: "block", fontSize: "12.5px" }}>Cập nhật JACS Studio</strong>
          <small style={{ color: "#94a3b8", fontSize: "11px" }}>
            {updateState.message || "Kiểm tra phiên bản mới nhất từ server."}
          </small>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "6px 12px", fontSize: "11.5px" }}
            onClick={() => void checkForUpdate()}
            disabled={updateState.checking}
          >
            {updateState.checking ? "Đang kiểm tra..." : "Kiểm tra"}
          </button>
          {updateState.release && (
            <button
              type="button"
              className="btn-primary"
              style={{ padding: "6px 12px", fontSize: "11.5px" }}
              onClick={() => void installUpdate()}
              disabled={updateState.installing}
            >
              {updateState.installing ? "Đang cập nhật..." : "Cài đặt ngay"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
