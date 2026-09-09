import React, { Fragment, useMemo } from "react";
import {
  Stars,
  ArrowRepeat,
  CpuFill,
  BoxArrowUpRight,
  ShieldLockFill,
  KeyFill,
} from "react-bootstrap-icons";
import type { CloudModelItem } from "../constants/providerConfigs";

export interface CloudModelHubProps {
  cloudModels: CloudModelItem[];
  lastSyncedTime: string;
  syncingCloud: boolean;
  syncWithCloudAdmin: () => Promise<void>;
  testingModelId: string;
  cloudModelTestResults: Record<
    string,
    { status: "reachable" | "unreachable"; latencyMs: number; detail: string }
  >;
  testCloudModel: (item: CloudModelItem) => Promise<void>;
  selectCloudModelForAnalysis: (item: CloudModelItem) => void;
  configureBYOKForCloudModel: (item: CloudModelItem) => void;
}

export function CloudModelHub({
  cloudModels,
  lastSyncedTime,
  syncingCloud,
  syncWithCloudAdmin,
  testingModelId,
  cloudModelTestResults,
  testCloudModel,
  selectCloudModelForAnalysis,
  configureBYOKForCloudModel,
}: CloudModelHubProps) {
  const groupedCloudModels = useMemo(() => {
    const groups: Record<string, CloudModelItem[]> = {};
    for (const m of cloudModels) {
      const p = m.provider_name || "Khác";
      if (!groups[p]) groups[p] = [];
      groups[p].push(m);
    }
    return groups;
  }, [cloudModels]);

  return (
    <section
      className="panel-card"
      style={{
        borderRadius: "12px",
        padding: "16px 20px",
        marginBottom: "28px",
        width: "100%",
        boxSizing: "border-box",
        background: "linear-gradient(180deg, #111827 0%, #0b0f19 100%)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
      }}
    >
      <div
        className="panel-head"
        style={{
          marginBottom: "14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
            <span
              style={{
                fontSize: "10px",
                color: "#fbbf24",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "2px 7px",
                borderRadius: "4px",
              }}
            >
              🌐 CLOUD AI MODEL HUB · ĐỒNG BỘ TRỰC TIẾP
            </span>
            {lastSyncedTime && (
              <span style={{ fontSize: "11px", color: "#34d399", fontWeight: 700 }}>
                ● Cập nhật lúc {lastSyncedTime}
              </span>
            )}
          </div>
          <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", margin: "2px 0 0" }}>
            Danh Sách Model Cấp Phép & Bảng Giá AI (Cloud Admin)
          </h3>
          <p className="subtle" style={{ fontSize: "12px", color: "#94a3b8", margin: "3px 0 0" }}>
            Toàn bộ các Model hàng đầu được cấu hình và định giá minh bạch từ Cloud Server. Người dùng
            có thể sử dụng ngay lập tức hoặc chọn "Nhập Key" để sử dụng API Key cá nhân.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void syncWithCloudAdmin()}
            disabled={syncingCloud}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#fbbf24",
              cursor: syncingCloud ? "wait" : "pointer",
            }}
          >
            <ArrowRepeat size={13} className={syncingCloud ? "animate-spin" : ""} />
            {syncingCloud ? "Đang đồng bộ..." : "Đồng bộ từ Cloud Admin"}
          </button>
        </div>
      </div>

      {/* Cloud Model Table */}
      <div className="jacs-table-wrapper" style={{ overflowX: "auto" }}>
        <table className="jacs-table" style={{ width: "100%", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "rgba(0, 0, 0, 0.35)" }}>
              <th style={{ width: "40px" }}>#</th>
              <th>TÊN MODEL & ID</th>
              <th>NHÀ PHÁT TRIỂN</th>
              <th>CHUYÊN DỤNG & CÔNG NGHỆ</th>
              <th>GIÁ TIỀN (VNĐ/1M TOKEN)</th>
              <th>GIÁ CREDIT (Cr/1M)</th>
              <th>ƯU ĐÃI & REQUEST</th>
              <th style={{ minWidth: "120px" }}>TRẠNG THÁI</th>
              <th
                style={{
                  minWidth: "290px",
                  width: "290px",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                }}
              >
                THAO TÁC
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groupedCloudModels).length > 0 ? (
              Object.entries(groupedCloudModels).map(([providerGroup, items], gIdx) => (
                <Fragment key={`grp-body-${providerGroup}-${gIdx}`}>
                  <tr
                    key={`grp-head-${providerGroup}-${gIdx}`}
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(245, 158, 11, 0.14) 0%, rgba(30, 41, 59, 0.45) 100%)",
                      borderLeft: "3px solid #f59e0b",
                    }}
                  >
                    <td
                      colSpan={9}
                      style={{ padding: "8px 12px", borderBottom: "1px solid rgba(245, 158, 11, 0.2)" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Stars size={14} color="#fbbf24" />
                        <strong
                          style={{
                            color: "#f8fafc",
                            fontSize: "12.5px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {providerGroup}
                        </strong>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            background: "rgba(245, 158, 11, 0.2)",
                            color: "#fbbf24",
                            fontWeight: 700,
                          }}
                        >
                          {items.length} model
                        </span>
                      </div>
                    </td>
                  </tr>
                  {items.map((item, idx) => (
                    <tr
                      key={item.id || `${providerGroup}-${idx}`}
                      style={{
                        transition: "background 0.2s ease",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <td style={{ color: "#64748b", fontWeight: 600, fontSize: "11px" }}>
                        {idx + 1}
                      </td>
                      <td>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <CpuFill size={13} color="#fbbf24" />
                            <strong
                              style={{ color: "#ffffff", fontFamily: "monospace", fontSize: "12.5px" }}
                            >
                              {item.model}
                            </strong>
                          </div>
                          <small
                            style={{
                              color: "#94a3b8",
                              fontSize: "10.5px",
                              display: "block",
                              marginTop: "2px",
                            }}
                          >
                            {item.price_per_request
                              ? `Phí cố định: ${item.price_per_request}đ/request`
                              : "gốc: 0đ/request (không tính phí thêm)"}
                          </small>
                          {testingModelId === (item.id || item.model) ? (
                            <div
                              style={{
                                marginTop: "4px",
                                fontSize: "10.5px",
                                color: "#38bdf8",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <ArrowRepeat size={10} className="animate-spin" /> Đang kiểm tra kết nối
                              AI...
                            </div>
                          ) : cloudModelTestResults[item.id || item.model] ? (
                            <div style={{ marginTop: "4px" }}>
                              {cloudModelTestResults[item.id || item.model].status ===
                              "reachable" ? (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    color: "#34d399",
                                    fontWeight: 750,
                                    background: "rgba(16, 185, 129, 0.12)",
                                    border: "1px solid rgba(16, 185, 129, 0.3)",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  ✓ Sẵn sàng (
                                  {cloudModelTestResults[item.id || item.model].latencyMs}ms)
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    color: "#f87171",
                                    fontWeight: 750,
                                    background: "rgba(239, 68, 68, 0.12)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  ✕ {cloudModelTestResults[item.id || item.model].detail || "Lỗi"}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: "#cbd5e1", fontSize: "11.5px" }}>
                          {item.provider_name}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            background:
                              item.category === "cinema"
                                ? "rgba(236, 72, 153, 0.15)"
                                : item.category === "vision"
                                ? "rgba(16, 185, 129, 0.15)"
                                : item.category === "voice"
                                ? "rgba(245, 158, 11, 0.15)"
                                : item.category === "transcription"
                                ? "rgba(168, 85, 247, 0.15)"
                                : "rgba(255, 255, 255, 0.06)",
                            color:
                              item.category === "cinema"
                                ? "#f472b6"
                                : item.category === "vision"
                                ? "#34d399"
                                : item.category === "voice"
                                ? "#fbbf24"
                                : item.category === "transcription"
                                ? "#c084fc"
                                : "#94a3b8",
                            fontWeight: 700,
                            display: "inline-block",
                            lineHeight: 1.4,
                          }}
                        >
                          {item.purpose || item.category || "Phân tích AI"}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: "11.5px", color: "#e2e8f0" }}>
                          <div style={{ color: "#38bdf8", fontWeight: 700 }}>
                            In: {item.input_price}đ/1M
                          </div>
                          <div style={{ color: "#a78bfa", fontWeight: 700 }}>
                            Out: {item.output_price}đ/1M
                          </div>
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "inline-flex",
                            flexDirection: "column",
                            gap: "2px",
                            background: "rgba(245, 158, 11, 0.1)",
                            border: "1px solid rgba(245, 158, 11, 0.28)",
                            padding: "3px 8px",
                            borderRadius: "5px",
                            fontSize: "11px",
                            fontWeight: 800,
                            color: "#fbbf24",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span>In: {((item.input_price || 0) / 1000).toFixed(2)} Cr/1M</span>
                          <span>Out: {((item.output_price || 0) / 1000).toFixed(2)} Cr/1M</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "11px", color: "#cbd5e1" }}>
                          <span style={{ color: "#34d399", fontWeight: 700 }}>
                            Cache: -{item.cache_discount_pct ?? 20}%
                          </span>
                          <br />
                          <span style={{ color: item.price_per_request ? "#fbbf24" : "#94a3b8" }}>
                            {item.price_per_request ? `${item.price_per_request}đ/req` : "0đ/req"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 750,
                            color: item.is_selling ? "#10b981" : "#94a3b8",
                            background: item.is_selling
                              ? "rgba(16, 185, 129, 0.12)"
                              : "rgba(148, 163, 184, 0.12)",
                            border: item.is_selling
                              ? "1px solid rgba(16, 185, 129, 0.3)"
                              : "1px solid rgba(148, 163, 184, 0.2)",
                            padding: "3px 7px",
                            borderRadius: "4px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {item.is_selling ? "● Đã Cấp Phép" : "○ Tạm Ngưng"}
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          width: "290px",
                          minWidth: "290px",
                        }}
                      >
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "6px",
                            flexWrap: "nowrap",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => selectCloudModelForAnalysis(item)}
                            style={{
                              background: "linear-gradient(135deg, #d97706, #f59e0b)",
                              border: "none",
                              color: "#12151f",
                              padding: "5px 11px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 800,
                              cursor: "pointer",
                              boxShadow: "0 0 8px rgba(245, 158, 11, 0.3)",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                            title="Chọn model này để làm việc trên công cụ"
                          >
                            ⚡ Kích Hoạt
                          </button>
                          <button
                            type="button"
                            onClick={() => void testCloudModel(item)}
                            disabled={testingModelId === (item.id || item.model)}
                            style={{
                              background: "rgba(56, 189, 248, 0.14)",
                              border: "1px solid rgba(56, 189, 248, 0.35)",
                              color: "#38bdf8",
                              padding: "5px 9px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 750,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                            title="Kiểm tra độ trễ kết nối API"
                          >
                            {testingModelId === (item.id || item.model) ? "Testing..." : "🔍 Test"}
                          </button>
                          <button
                            type="button"
                            onClick={() => configureBYOKForCloudModel(item)}
                            style={{
                              background: "rgba(255, 255, 255, 0.06)",
                              border: "1px solid rgba(255, 255, 255, 0.14)",
                              color: "#f8fafc",
                              padding: "5px 9px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                            title="Nhập API Key riêng của bạn để dùng không tốn Credit"
                          >
                            🔑 Nhập Key
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "28px", color: "#94a3b8" }}>
                  Chưa có dữ liệu Model từ Cloud Admin. Nhấn nút "Đồng bộ từ Cloud Admin" để tải danh
                  sách.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
