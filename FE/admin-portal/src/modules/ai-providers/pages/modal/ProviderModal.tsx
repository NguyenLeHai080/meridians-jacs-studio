import React, { useState } from "react";
import { Modal } from "../../../../components/common/Modal";
import { useI18n } from "../../../../core/i18n";
import { providerService, type CreateProviderPayload } from "../../services/providerService";

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [providerType, setProviderType] = useState<"openai" | "gemini" | "custom">("openai");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [ttsModel, setTtsModel] = useState("tts-1");
  const [apiKey, setApiKey] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(["text", "vision", "tts"]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: CreateProviderPayload = {
        name: name.trim(),
        provider_type: providerType,
        base_url: baseUrl.trim(),
        model: model.trim(),
        tts_model: ttsModel.trim() || undefined,
        api_key: apiKey.trim(),
        capabilities,
      };
      await providerService.createProvider(payload);
      onSuccess(`Đã thêm provider ${name} thành công`);
      onClose();
      setName("");
      setApiKey("");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Lỗi thêm provider");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("createModalTitle")}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <div className="error-alert">{error}</div>}

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">Tên hiển thị *</label>
            <input
              type="text"
              className="form-input-mf"
              required
              placeholder="VD: OpenAI Primary Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Nền tảng / Loại API</label>
            <select
              className="form-input-mf"
              value={providerType}
              onChange={(e) => {
                const val = e.target.value as "openai" | "gemini" | "custom";
                setProviderType(val);
                if (val === "openai") {
                  setBaseUrl("https://api.openai.com/v1");
                  setModel("gpt-4o-mini");
                  setTtsModel("tts-1");
                } else if (val === "gemini") {
                  setBaseUrl("https://generativelanguage.googleapis.com/v1beta");
                  setModel("gemini-1.5-pro");
                  setTtsModel("");
                } else {
                  setBaseUrl("https://api.my-custom-ai.com/v1");
                  setModel("custom-model");
                }
              }}
            >
              <option value="openai">OpenAI (GPT-4o, TTS-1)</option>
              <option value="gemini">Google Gemini (Gemini 1.5)</option>
              <option value="custom">Custom Endpoint (Proxy / VLLM)</option>
            </select>
          </div>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Base URL Endpoint *</label>
          <input
            type="url"
            className="form-input-mf"
            required
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>

        <div className="mf-form-two-col">
          <div className="form-group-mf">
            <label className="form-label-mf">Model Text/Vision *</label>
            <input
              type="text"
              className="form-input-mf"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
          <div className="form-group-mf">
            <label className="form-label-mf">Model TTS Giọng đọc</label>
            <input
              type="text"
              className="form-input-mf"
              placeholder="VD: tts-1 hoặc để trống"
              value={ttsModel}
              onChange={(e) => setTtsModel(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group-mf">
          <label className="form-label-mf">Secret API Key *</label>
          <input
            type="password"
            className="form-input-mf"
            required
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button type="button" className="btn-white-outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </button>
          <button type="submit" className="btn-primary-orange" disabled={loading}>
            {loading ? "Đang lưu..." : "+ Thêm Provider"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
