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
    isManaged: Boolean(record.isManaged),
    isOfficial: Boolean(record.isOfficial),
    managedTier: record.managedTier || "",
    creditBalance: typeof record.creditBalance === "number" ? record.creditBalance : undefined,
    availableModels: Array.isArray(record.availableModels) ? record.availableModels : undefined,
  };
}

function effectiveCapabilities(record) {
  const capabilities = Array.isArray(record?.capabilities) ? record.capabilities : [];
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
  const validTypes = ["openai", "gemini", "anthropic", "deepseek", "elevenlabs", "groq", "openai-compatible", "custom"];
  if (!validTypes.includes(providerType)) throw new Error(`Loại provider '${providerType}' không được hỗ trợ`);
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
    isManaged: Boolean(value.isManaged),
    isOfficial: Boolean(value.isOfficial),
    managedTier: typeof value.managedTier === "string" ? value.managedTier.trim() : "",
    creditBalance: typeof value.creditBalance === "number" ? value.creditBalance : undefined,
    availableModels: Array.isArray(value.availableModels) ? value.availableModels : undefined,
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
      if (previous?.isManaged && !value.fromSync) {
        throw new Error("Không thể chỉnh sửa AI Provider do Admin cấp quyền quản lý");
      }
      if (!draft.apiKey && !draft.isManaged) {
        if (previous?.apiKey) {
          draft.apiKey = previous.apiKey;
        } else if (value.copyFromId) {
          const source = records.find((item) => item.id === String(value.copyFromId));
          if (source?.apiKey) {
            draft.apiKey = source.apiKey;
          }
        }
      }
      if (!draft.isManaged && (!draft.apiKey || draft.apiKey.length < 8 || draft.apiKey.length > 4096)) {
        throw new Error("API key phải có từ 8 đến 4096 ký tự");
      }
      const record = { id: previous?.id || cryptoImpl.randomUUID(), ...draft };
      if (index >= 0) records[index] = record; else records.push(record);
      writeRecords(records);
      return providerPublic(record);
    },
    syncManaged(managedProviders) {
      if (!Array.isArray(managedProviders)) return;
      const records = readRecords();
      let changed = false;
      for (const mp of managedProviders) {
        if (!mp || !mp.id) continue;
        const index = records.findIndex((r) => r.id === mp.id || (r.isManaged && r.name === mp.name));
        const draft = {
          id: index >= 0 ? records[index].id : mp.id,
          name: mp.name,
          providerType: mp.providerType || "openai-compatible",
          baseUrl: mp.baseUrl,
          model: mp.model,
          ttsModel: mp.ttsModel || "",
          transcriptionModel: mp.transcriptionModel || "",
          capabilities: Array.isArray(mp.capabilities) ? mp.capabilities : ["analysis", "vision"],
          enabled: mp.enabled !== false,
          apiKey: mp.apiKey || "MANAGED_ADMIN_KEY",
          isManaged: true,
          isOfficial: Boolean(mp.isOfficial),
          managedTier: mp.managedTier || "Enterprise",
          creditBalance: typeof mp.creditBalance === "number" ? mp.creditBalance : undefined,
          availableModels: Array.isArray(mp.availableModels) ? mp.availableModels : undefined,
        };
        if (index >= 0) {
          records[index] = { ...records[index], ...draft };
        } else {
          records.unshift(draft);
        }
        changed = true;
      }
      if (changed) writeRecords(records);
    },
    delete(id) {
      const records = readRecords();
      const target = records.find((item) => item.id === String(id));
      if (target?.isManaged) {
        throw new Error("Không thể xóa AI Provider do Admin cấp quyền quản lý");
      }
      const next = records.filter((item) => item.id !== String(id));
      if (next.length !== records.length) writeRecords(next);
    },
  };
}

module.exports = { createProviderStore, providerPublic, validateProviderDraft };
