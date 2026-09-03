import React, { useState } from "react";
import { Provider } from "../../core/types";
import { Button } from "../../components/common/Button";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Modal } from "../../components/common/Modal";
import { Toast } from "../../components/common/Toast";
import { Badge } from "../../components/common/Badge";

interface AiProvidersViewProps {
  providers: Provider[];
  onCreateProvider: (data: {
    name: string;
    provider_type: string;
    base_url: string;
    model: string;
    tts_model?: string;
    api_key: string;
    capabilities: string[];
  }) => Promise<void>;
  onTestProvider: (provider: Provider) => Promise<{ status: string; latency_ms: number; detail: string }>;
  onRefresh: () => void;
  loading?: boolean;
}

export function AiProvidersView({
  providers,
  onCreateProvider,
  onTestProvider,
  onRefresh,
  loading = false,
}: AiProvidersViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pingStatus, setPingStatus] = useState<Record<string, { status: string; latency_ms?: number; loading?: boolean }>>({});

  const [form, setForm] = useState({
    name: "",
    provider_type: "openai",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    tts_model: "tts-1",
    api_key: "",
    capabilities: "analysis, vision, transcription, tts",
  });

  async function handleTest(provider: Provider) {
    setPingStatus((prev) => ({ ...prev, [provider.id]: { status: "Đang kiểm tra...", loading: true } }));
    try {
      const result = await onTestProvider(provider);
      setPingStatus((prev) => ({
        ...prev,
        [provider.id]: {
          status: result.status === "ok" ? "Kết nối tốt" : result.status,
          latency_ms: result.latency_ms,
          loading: false,
        },
      }));
    } catch (err) {
      setPingStatus((prev) => ({
        ...prev,
        [provider.id]: {
          status: err instanceof Error ? err.message : "Kiểm tra thất bại",
          loading: false,
        },
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const caps = form.capabilities
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await onCreateProvider({
        name: form.name.trim(),
        provider_type: form.provider_type,
        base_url: form.base_url.trim(),
        model: form.model.trim(),
        tts_model: form.tts_model.trim() || undefined,
        api_key: form.api_key.trim(),
        capabilities: caps,
      });

      setMessage(`Đã cấu hình thành công provider ${form.name}`);
      setIsModalOpen(false);
      setForm({
        name: "",
        provider_type: "openai",
        base_url: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
        tts_model: "tts-1",
        api_key: "",
        capabilities: "analysis, vision, transcription, tts",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu provider");
    }
  }

  function handleTypeChange(type: string) {
    let base_url = "https://api.openai.com/v1";
    let model = "gpt-4o-mini";
    let tts_model = "tts-1";
    let capabilities = "analysis, vision, transcription, tts";

    if (type === "gemini") {
      base_url = "https://generativelanguage.googleapis.com/v1beta";
      model = "gemini-1.5-flash";
      tts_model = "";
      capabilities = "analysis, vision";
    } else if (type === "anthropic") {
      base_url = "https://api.anthropic.com/v1";
      model = "claude-3-5-sonnet-20241022";
      tts_model = "";
      capabilities = "analysis, vision";
    } else if (type === "openai-compatible") {
      base_url = "https://api.groq.com/openai/v1";
      model = "llama-3.3-70b-versatile";
      tts_model = "";
      capabilities = "analysis, transcription";
    }

    setForm({
      ...form,
      provider_type: type,
      base_url,
      model,
      tts_model,
      capabilities,
    });
  }

  return (
    <div className="view-container animate-fade-in">
      <div className="view-header">
        <div>
          <h1 className="view-title">Quản Lý AI Providers & Mô Hình AI</h1>
          <p className="view-subtitle">
            Cấu hình các cổng kết nối mô hình phân tích video, thị giác máy tính và giọng đọc TTS
          </p>
        </div>
        <div className="view-actions">
          <Button variant="primary" onClick={() => setIsModalOpen(true)} icon={<span>+</span>}>
            Thêm Provider Mới
          </Button>
          <Button variant="ghost" onClick={onRefresh} loading={loading} icon={<span>↻</span>}>
            Làm mới
          </Button>
        </div>
      </div>

      {message && <Toast type="success" message={message} onClose={() => setMessage("")} />}
      {error && <Toast type="error" message={error} onClose={() => setError("")} />}

      <div className="provider-grid">
        {providers.map((provider) => {
          const ping = pingStatus[provider.id];
          return (
            <div className="admin-card provider-card" key={provider.id}>
              <div className="provider-card-top">
                <div className="provider-type-tag">
                  {provider.provider_type.toUpperCase()}
                </div>
                <div className="provider-secret-badge">
                  <code>{provider.masked_key}</code>
                </div>
              </div>

              <h3 className="provider-card-name">{provider.name}</h3>
              <div className="provider-model-badge">
                <span>Model: <strong>{provider.model}</strong></span>
                {provider.tts_model && <span> · TTS: <strong>{provider.tts_model}</strong></span>}
              </div>

              <div className="provider-caps-list">
                {provider.capabilities.map((cap) => (
                  <span className="cap-pill" key={cap}>
                    {cap}
                  </span>
                ))}
              </div>

              <div className="provider-card-footer">
                <div className="ping-result-box">
                  {ping ? (
                    <span className={`text-xs ${ping.status === "Kết nối tốt" ? "text-emerald" : "text-amber"}`}>
                      {ping.status} {ping.latency_ms !== undefined ? `(${ping.latency_ms}ms)` : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Chưa kiểm tra</span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  loading={ping?.loading}
                  onClick={() => handleTest(provider)}
                >
                  ⚡ Test Ping API
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {providers.length === 0 && (
        <div className="admin-card text-center text-muted py-12">
          Chưa cấu hình AI provider nào. Bấm "Thêm Provider Mới" để kết nối.
        </div>
      )}

      {/* MODAL THÊM PROVIDER */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Kết Nối AI Provider Mới"
        subtitle="Cấu hình API Key và Endpoint của nhà cung cấp mô hình trí tuệ nhân tạo"
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên Provider"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: OpenAI Official GPT-4o"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Loại Provider"
              value={form.provider_type}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <option value="openai">OpenAI Official</option>
              <option value="gemini">Google Gemini</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="openai-compatible">OpenAI Compatible (Groq/DeepSeek)</option>
              <option value="custom">Custom Endpoint</option>
            </Select>

            <Input
              label="Model Phân Tích (Analysis)"
              required
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </div>

          <Input
            label="Base URL API"
            type="url"
            required
            value={form.base_url}
            onChange={(e) => setForm({ ...form, base_url: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Model TTS (Tùy chọn)"
              value={form.tts_model}
              onChange={(e) => setForm({ ...form, tts_model: e.target.value })}
              placeholder="VD: tts-1"
            />
            <Input
              label="Capabilities (Phân cách bằng dấu phẩy)"
              value={form.capabilities}
              onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
              placeholder="analysis, vision, transcription, tts"
            />
          </div>

          <Input
            label="Secret API Key"
            type="password"
            required
            minLength={8}
            value={form.api_key}
            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
            placeholder="sk-••••••••••••••••"
            helper="API Key được mã hóa một chiều và không bao giờ hiển thị nguyên bản"
          />

          <div className="modal-footer mt-6">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" type="submit">
              Lưu & Kích Hoạt Provider
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
