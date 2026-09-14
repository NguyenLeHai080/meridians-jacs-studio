import React from "react";
import { FolderFill, Trash3Fill } from "react-bootstrap-icons";
import type { ToolPreferences } from "../../../core/types";
import { getRuntime } from "../../../core/runtime";

export interface WorkspaceSettingsCardProps {
  localPreferences: ToolPreferences;
  update: (patch: Partial<ToolPreferences>) => Promise<void>;
  chooseOutputFolder: () => Promise<void>;
  clearCache: () => Promise<void>;
}

export function WorkspaceSettingsCard({
  localPreferences,
  update,
  chooseOutputFolder,
  clearCache,
}: WorkspaceSettingsCardProps) {
  return (
    <section className="panel-card" style={{ borderRadius: "10px", padding: "14px 16px" }}>
      <div className="panel-head">
        <div>
          <span
            style={{
              fontSize: "10px",
              color: "#fbbf24",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            WORKSPACE & STORAGE
          </span>
          <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
            Thư mục & Dữ liệu máy
          </h3>
        </div>
      </div>

      <div className="field-pair">
        <label className="field-label">
          Tên workspace
          <input
            maxLength={120}
            value={localPreferences.workspaceName}
            onChange={(event) => update({ workspaceName: event.target.value })}
          />
        </label>
        <label className="field-label">
          Tên người dùng
          <input
            maxLength={120}
            value={localPreferences.operatorName}
            onChange={(event) => update({ operatorName: event.target.value })}
          />
        </label>
      </div>

      <div style={{ marginTop: "14px" }}>
        <label className="field-label">
          Thư mục Workspace
          <div className="path-input-row">
            <FolderFill size={14} color="#38bdf8" />
            <span>{localPreferences.workspacePath}</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "4px 10px", fontSize: "11px" }}
              onClick={() => void getRuntime().revealPath(localPreferences.workspacePath)}
            >
              Mở
            </button>
          </div>
        </label>

        <label className="field-label">
          Thư mục Output Video
          <div className="path-input-row">
            <FolderFill size={14} color="#38bdf8" />
            <span>{localPreferences.outputPath}</span>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "4px 10px", fontSize: "11px" }}
              onClick={() => void chooseOutputFolder()}
            >
              Đổi
            </button>
          </div>
        </label>

        <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>Giải phóng cache và video tạm</span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void clearCache()}
            style={{
              color: "#f87171",
              borderColor: "rgba(248, 113, 113, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 10px",
              fontSize: "11.5px",
            }}
          >
            <Trash3Fill size={12} /> Dọn dẹp cache
          </button>
        </div>
      </div>
    </section>
  );
}
