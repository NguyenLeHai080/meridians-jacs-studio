import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import {
  Palette,
  Sparkles,
  Lock,
  Unlock,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  ShieldAlert,
  Send,
  Sliders,
} from "lucide-react";
import { apiRequest } from "../../core/api";
import type { ToolConfig, MenuLockItem } from "../../core/types";

interface ToolConfigPageProps {
  token: string;
  language: string;
}

const DEFAULT_MENUS: { key: string; label: string; icon: string; category: string }[] = [
  { key: "sources", label: "1. Nguồn Video", icon: "📁", category: "Quy trình cốt lõi" },
  { key: "analysis", label: "2. Phân Tích AI", icon: "⚡", category: "Quy trình cốt lõi" },
  { key: "story", label: "3. Kịch Bản & Voice", icon: "🎙️", category: "Quy trình cốt lõi" },
  { key: "timeline", label: "4. Dựng & Timeline", icon: "🎬", category: "Quy trình cốt lõi" },
  { key: "brand", label: "5. Phụ Đề & Brand", icon: "🎨", category: "Quy trình cốt lõi" },
  { key: "render", label: "6. Render Xuất Bản", icon: "📤", category: "Quy trình cốt lõi" },
  { key: "batch", label: "Tạo Job Hàng Loạt", icon: "⏳", category: "Tiện ích mở rộng" },
  { key: "billing", label: "Lịch Sử Gia Hạn", icon: "💳", category: "Tài khoản & Bản quyền" },
  { key: "activation", label: "License & Thiết Bị", icon: "🔑", category: "Tài khoản & Bản quyền" },
  { key: "logs", label: "Nhật Ký Hệ Thống", icon: "📜", category: "Hệ thống" },
  { key: "settings", label: "Cài Đặt Tool", icon: "⚙️", category: "Hệ thống" },
];

export function ToolConfigPage({ token, language }: ToolConfigPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [brandName, setBrandName] = useState("JACS STUDIO");
  const [toolSlogan, setToolSlogan] = useState("Judicious AI Content Scanner & Video Synthesis Engine");
  const [logoUrl, setLogoUrl] = useState("");
  const [supportContact, setSupportContact] = useState("https://t.me/jacs_support");
  const [menuLocks, setMenuLocks] = useState<Record<string, MenuLockItem>>({});

  const fetchConfig = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest<{ data: ToolConfig }>("/api/v1/system/tool-config", {}, token);
      const data = res?.data || (res as unknown as ToolConfig);
      if (data) {
        setBrandName(data.studio_brand_name || "JACS STUDIO");
        setToolSlogan(data.tool_slogan || "Judicious AI Content Scanner & Video Synthesis Engine");
        setLogoUrl(data.custom_logo_url || "");
        setSupportContact(data.support_contact || "https://t.me/jacs_support");
        
        const initialLocks: Record<string, MenuLockItem> = {};
        DEFAULT_MENUS.forEach((m) => {
          initialLocks[m.key] = data.menu_locks?.[m.key] || {
            locked: false,
            title: m.label,
            message: `Tính năng ${m.label} đang trong quá trình nâng cấp và phát triển. Quý khách vui lòng quay lại sau!`,
          };
        });
        setMenuLocks(initialLocks);
      }
    } catch (err: any) {
      setError(err?.message || "Không tải được cấu hình thương hiệu tool");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Dung lượng ảnh không được vượt quá 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoUrl(reader.result);
        setMessage("✓ Đã nạp ảnh Logo thành công! Hãy bấm Lưu để áp dụng.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleLock = (key: string) => {
    setMenuLocks((prev) => {
      const current = prev[key] || {
        locked: false,
        title: DEFAULT_MENUS.find((m) => m.key === key)?.label || key,
        message: "Tính năng đang được phát triển",
      };
      return {
        ...prev,
        [key]: {
          ...current,
          locked: !current.locked,
        },
      };
    });
  };

  const handleMessageChange = (key: string, msg: string) => {
    setMenuLocks((prev) => {
      const current = prev[key] || {
        locked: false,
        title: DEFAULT_MENUS.find((m) => m.key === key)?.label || key,
        message: "",
      };
      return {
        ...prev,
        [key]: {
          ...current,
          message: msg,
        },
      };
    });
  };

  const handleSave = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(
        "/api/v1/system/tool-config",
        {
          method: "PUT",
          body: JSON.stringify({
            studio_brand_name: brandName.trim(),
            tool_slogan: toolSlogan.trim(),
            custom_logo_url: logoUrl.trim(),
            support_contact: supportContact.trim(),
            menu_locks: menuLocks,
          }),
        },
        token
      );
      setMessage("🎉 Đã lưu cấu hình thương hiệu & khoá Menu thành công! Mọi máy khách sẽ tự động cập nhật ngay lập tức.");
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu cấu hình thương hiệu");
    } finally {
      setSaving(false);
    }
  };

  const unlockAll = () => {
    const updated: Record<string, MenuLockItem> = {};
    Object.keys(menuLocks).forEach((k) => {
      updated[k] = { ...menuLocks[k], locked: false };
    });
    setMenuLocks(updated);
  };

  const lockUnderDevDefaults = () => {
    const updated: Record<string, MenuLockItem> = {};
    DEFAULT_MENUS.forEach((m) => {
      const isDev = ["brand"].includes(m.key);
      updated[m.key] = {
        locked: isDev,
        title: m.label,
        message: `Tính năng ${m.label} đang được nâng cấp và phát triển, vui lòng quay lại sau!`,
      };
    });
    setMenuLocks(updated);
  };

  const lockedCount = Object.values(menuLocks).filter((m) => m.locked).length;

  if (loading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: "0 auto 16px", color: "#f97316" }} />
        <p style={{ fontSize: "14px", fontWeight: 600 }}>Đang tải cấu hình thương hiệu và quyền Menu...</p>
      </div>
    );
  }

  return (
    <div className="tool-config-container animate-fade-in">
      
      {/* Top Action Control Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569", background: "#f1f5f9", padding: "4px 10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
            Trạng thái: <strong style={{ color: lockedCount > 0 ? "#f97316" : "#10b981" }}>{lockedCount > 0 ? `Đang khoá ${lockedCount} menu` : "Mở toàn bộ menu"}</strong>
          </span>
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Tên Tool: <strong style={{ color: "#0f172a" }}>{brandName || "JACS STUDIO"}</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            type="button"
            onClick={fetchConfig}
            className="btn-white-outline"
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
          >
            <RefreshCw size={14} /> Làm Mới
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="btn-primary-orange"
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 18px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" }}
          >
            <Sparkles size={15} /> {saving ? "Đang lưu..." : "💾 Lưu & Áp Dụng Lên Tool"}
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {message && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "10px 14px", color: "#065f46", display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.25rem", fontSize: "0.875rem", fontWeight: 600 }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", color: "#991b1b", display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.25rem", fontSize: "0.875rem", fontWeight: 600 }}>
          <AlertCircle size={18} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: 2 Matching Card Panels */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "1.5rem", alignItems: "start" }}>
        
        {/* Card 1: Tool Name & Logo Branding */}
        <div className="mf-card-panel" style={{ padding: "1.5rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.25rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem" }}>
            <Palette size={18} color="#f97316" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              1. Đổi Tên Tool & Logo Tự Động
            </h3>
          </div>

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                🏷️ Tên Thương Hiệu Phần Mềm (Tool Name)
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="VD: MERIDIANS JACS STUDIO PRO"
                className="form-input-mf"
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.9rem", fontWeight: 700, borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
              />
              <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px", display: "block" }}>
                Tên này sẽ tự động xuất hiện trên Sidebar, Tiêu đề cửa sổ và màn hình đăng nhập của Tool.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                📝 Khẩu Hiệu / Subtitle (Slogan)
              </label>
              <input
                type="text"
                value={toolSlogan}
                onChange={(e) => setToolSlogan(e.target.value)}
                placeholder="VD: Judicious AI Content Scanner & Video Synthesis Engine"
                className="form-input-mf"
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                🖼️ Logo Biểu Tượng Phần Mềm
              </label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Dán link URL ảnh logo hoặc tải từ máy tính..."
                  className="form-input-mf"
                  style={{ flex: 1, padding: "7px 10px", fontSize: "0.825rem", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}
                />
                <label className="btn-white-outline" style={{ padding: "7px 12px", borderRadius: "6px", fontSize: "0.825rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                  <Upload size={13} /> Tải ảnh
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                </label>
              </div>

              {/* Live Preview of Sidebar Brand (Dark Mode Mockup) */}
              <div style={{ marginTop: "10px", background: "#0b1120", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  <Eye size={12} /> Xem Trước Hiển Thị Trên Tool (Live Preview)
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(15, 23, 42, 0.8)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <img
                    src={logoUrl || "./icon.png"}
                    alt="Logo Preview"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "./icon.png"; }}
                    style={{ width: "34px", height: "34px", borderRadius: "6px", objectFit: "cover", boxShadow: "0 0 12px rgba(56, 189, 248, 0.4)" }}
                  />
                  <div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "0.3px" }}>
                      {brandName || "JACS STUDIO"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 500 }}>
                      {toolSlogan || "STUDIO PRO"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                💬 Link Hỗ Trợ / Liên Hệ Kỹ Thuật (Telegram / Zalo)
              </label>
              <input
                type="text"
                value={supportContact}
                onChange={(e) => setSupportContact(e.target.value)}
                placeholder="VD: https://t.me/jacs_support hoặc Hotline Zalo..."
                className="form-input-mf"
                style={{ width: "100%", padding: "7px 10px", fontSize: "0.825rem", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </form>
        </div>

        {/* Card 2: Feature Locks & Under Development Manager */}
        <div className="mf-card-panel" style={{ padding: "1.5rem", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldAlert size={18} color="#f97316" />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                2. Khoá Tạm Thời Menu (Báo Đang Phát Triển)
              </h3>
            </div>
            
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={unlockAll}
                className="btn-white-outline"
                style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "0.775rem", fontWeight: 700, cursor: "pointer" }}
              >
                Mở Tất Cả
              </button>
              <button
                type="button"
                onClick={lockUnderDevDefaults}
                style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c", padding: "4px 10px", borderRadius: "6px", fontSize: "0.775rem", fontWeight: 700, cursor: "pointer" }}
              >
                Mặc Định
              </button>
            </div>
          </div>

          <p style={{ color: "#64748b", fontSize: "0.8rem", marginBottom: "1rem", lineHeight: "1.4" }}>
            💡 Khi bạn bật <strong>[ 🔒 Khoá Menu ]</strong>, trên Tool người dùng sẽ thấy huy hiệu <em>"🚧 Đang phát triển"</em>. Khi người dùng click vào tab đó, hệ thống sẽ hiện thông báo bạn đã nhập bên dưới thay vì vào giao diện.
          </p>

          {/* Menus List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "560px", overflowY: "auto", paddingRight: "4px" }}>
            {DEFAULT_MENUS.map((m) => {
              const lockInfo = menuLocks[m.key] || { locked: false, title: m.label, message: "" };
              const isLocked = Boolean(lockInfo.locked);

              return (
                <div
                  key={m.key}
                  style={{
                    background: isLocked ? "#fff1f2" : "#f8fafc",
                    border: isLocked ? "1px solid #fecdd3" : "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isLocked ? "6px" : "0", flexWrap: "wrap", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "14px" }}>{m.icon}</span>
                      <strong style={{ fontSize: "0.875rem", color: isLocked ? "#be123c" : "#1e293b" }}>
                        {m.label}
                      </strong>
                      <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: isLocked ? "#ffe4e6" : "#e2e8f0", color: isLocked ? "#9f1239" : "#64748b", fontWeight: 600 }}>
                        {m.category}
                      </span>
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleLock(m.key)}
                      style={{
                        background: isLocked ? "#fecdd3" : "#ecfdf5",
                        border: isLocked ? "1px solid #fda4af" : "1px solid #a7f3d0",
                        color: isLocked ? "#be123c" : "#047857",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "0.775rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
                      {isLocked ? "🔒 Đang Khoá (Báo Đang Phát Triển)" : "🟢 Hoạt Động Bình Thường"}
                    </button>
                  </div>

                  {/* Notice Input (Only shown if locked) */}
                  {isLocked && (
                    <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed #fecdd3" }}>
                      <label style={{ display: "block", fontSize: "0.725rem", fontWeight: 700, color: "#be123c", marginBottom: "3px" }}>
                        📢 Nội dung thông báo hiển thị cho khách khi bấm vào menu này:
                      </label>
                      <input
                        type="text"
                        value={lockInfo.message || ""}
                        onChange={(e) => handleMessageChange(m.key, e.target.value)}
                        placeholder={`VD: Tính năng ${m.label} đang được nâng cấp và phát triển, vui lòng quay lại sau!`}
                        style={{ width: "100%", background: "#ffffff", border: "1px solid #fda4af", borderRadius: "5px", padding: "5px 8px", color: "#1e293b", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
