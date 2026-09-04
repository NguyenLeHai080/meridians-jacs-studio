const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function providerPublic(record) {
  const capabilities = effectiveCapabilities(record);
  return {
    id: record.id,
    name: record.name,
    providerType: record.providerType,
    baseUrl: record.baseUrl,
    model: record.model,
    transcriptionModel: record.transcriptionModel,
    ttsModel: record.ttsModel,
    capabilities,
    enabled: record.enabled,
    hasApiKey: Boolean(record.apiKey),
    maskedKey: record.apiKey ? `********${record.apiKey.slice(-4)}` : "********",
  };
}

function effectiveCapabilities(record) {
  const capabilities = Array.isArray(record?.capabilities) ? record.capabilities : [];
  // A compatible API does not imply its model supports every endpoint. In
  // particular, Groq Whisper accepts /audio/transcriptions but cannot serve
  // chat completions or /audio/speech, so honor only explicit capabilities.
  return [...new Set(capabilities)];
}

function validateProviderDraft(value) {
  if (!value || typeof value !== "object") throw new Error("Cấu hình provider không hợp lệ");
  const name = String(value.name || "").trim();
  const providerType = String(value.providerType || "").trim();
  const baseUrl = String(value.baseUrl || "").trim().replace(/\/+$/, "");
  const model = String(value.model || "").trim();
  const capabilities = Array.isArray(value.capabilities)
    ? [...new Set(value.capabilities.map((item) => String(item).trim()).filter(Boolean))]
    : [];
  if (!name || name.length > 120 || !model || model.length > 160) throw new Error("Tên và model provider không hợp lệ");
  if (!["openai", "gemini", "anthropic", "openai-compatible", "custom"].includes(providerType)) throw new Error("Loại provider không được hỗ trợ");
  let parsed;
  try { parsed = new URL(baseUrl); } catch { throw new Error("Base URL provider không hợp lệ"); }
  const localHttp = parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHttp) throw new Error("Base URL phải dùng HTTPS (HTTP chỉ cho localhost)");
  if (parsed.username || parsed.password) throw new Error("Base URL không được chứa thông tin đăng nhập");
  return {
    name,
    providerType,
    baseUrl,
    model,
    ttsModel: typeof value.ttsModel === "string" ? value.ttsModel.trim().slice(0, 160) : "",
    transcriptionModel: typeof value.transcriptionModel === "string" ? value.transcriptionModel.trim().slice(0, 160) : "",
    capabilities,
    enabled: value.enabled !== false,
    apiKey: typeof value.apiKey === "string" ? value.apiKey.trim() : "",
  };
}

function createProviderStore({ filePath, safeStorage, fsImpl = fs, cryptoImpl = crypto }) {
  function encryptionAvailable() {
    return Boolean(safeStorage?.isEncryptionAvailable?.());
  }

  function readRecords() {
    if (!fsImpl.existsSync(filePath)) return [];
    if (!encryptionAvailable()) throw new Error("Secure storage của hệ điều hành chưa sẵn sàng; hãy mở khóa Keychain/Credential Manager rồi thử lại");
    try {
      const decrypted = safeStorage.decryptString(fsImpl.readFileSync(filePath));
      const records = JSON.parse(decrypted);
      if (!Array.isArray(records)) throw new Error("Invalid provider storage");
      return records;
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error("File provider đã hỏng; không thể giải mã cấu hình");
      throw error;
    }
  }

  function writeRecords(records) {
    if (!encryptionAvailable()) throw new Error("Secure storage của hệ điều hành chưa sẵn sàng; hãy mở khóa Keychain/Credential Manager rồi thử lại");
    fsImpl.mkdirSync(path.dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp-${process.pid}`;
    fsImpl.writeFileSync(temporaryPath, safeStorage.encryptString(JSON.stringify(records)), { mode: 0o600 });
    fsImpl.renameSync(temporaryPath, filePath);
  }

  return {
    isAvailable: encryptionAvailable,
    list() { return readRecords().map(providerPublic); },
    find(id) {
      const record = readRecords().find((item) => item.id === String(id));
      return record ? { ...record, capabilities: effectiveCapabilities(record) } : undefined;
    },
    save(value) {
      const draft = validateProviderDraft(value);
      const records = readRecords();
      const index = value.id ? records.findIndex((item) => item.id === String(value.id)) : -1;
      const previous = index >= 0 ? records[index] : null;
      if (!draft.apiKey && previous?.apiKey) draft.apiKey = previous.apiKey;
      if (!draft.apiKey || draft.apiKey.length < 8 || draft.apiKey.length > 4096) throw new Error("API key phải có từ 8 đến 4096 ký tự");
      const record = { id: previous?.id || cryptoImpl.randomUUID(), ...draft };
      if (index >= 0) records[index] = record; else records.push(record);
      writeRecords(records);
      return providerPublic(record);
    },
    delete(id) {
      const records = readRecords();
      const next = records.filter((item) => item.id !== String(id));
      if (next.length !== records.length) writeRecords(next);
    },
  };
}

module.exports = { createProviderStore, providerPublic, validateProviderDraft };
