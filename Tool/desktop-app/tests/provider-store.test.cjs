const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createProviderStore, validateProviderDraft } = require("../electron/provider-store.cjs");

function fakeSafeStorage() {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from([...Buffer.from(value)].map((item) => item ^ 0xaa)),
    decryptString: (value) => Buffer.from([...value].map((item) => item ^ 0xaa)).toString("utf8"),
  };
}

function createFixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "jacs-provider-"));
  const filePath = path.join(directory, "providers.bin");
  const store = createProviderStore({ filePath, safeStorage: fakeSafeStorage(), cryptoImpl: { randomUUID: () => "provider-1" } });
  return { directory, filePath, store };
}

test("provider store persists encrypted metadata without exposing the API key", () => {
  const fixture = createFixture();
  try {
    const saved = fixture.store.save({
      name: "Customer OpenAI",
      providerType: "openai",
      baseUrl: "https://api.openai.com/v1/",
      model: "gpt-4o-mini",
      apiKey: "sk-secret-value",
      capabilities: ["analysis", "analysis"],
      enabled: true,
    });
    assert.equal(saved.id, "provider-1");
    assert.equal(saved.hasApiKey, true);
    assert.equal(saved.maskedKey, "********alue");
    assert.equal(fixture.store.list()[0].baseUrl, "https://api.openai.com/v1");
    assert.equal(fixture.store.list()[0].apiKey, undefined);
    assert.equal(fs.readFileSync(fixture.filePath).includes("sk-secret-value"), false);
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test("editing a provider keeps its key when the key field is left blank", () => {
  const fixture = createFixture();
  try {
    const created = fixture.store.save({ name: "Gemini", providerType: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.0-flash", apiKey: "gemini-secret", capabilities: ["analysis"], enabled: true });
    const edited = fixture.store.save({ id: created.id, name: "Gemini customer", providerType: "gemini", baseUrl: created.baseUrl, model: created.model, apiKey: "", capabilities: ["vision"], enabled: true });
    assert.equal(edited.hasApiKey, true);
    assert.deepEqual(fixture.store.find(created.id).capabilities, ["vision"]);
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true });
  }
});

test("provider endpoint validation rejects remote HTTP and credentials in URLs", () => {
  assert.throws(() => validateProviderDraft({ name: "Bad", providerType: "openai", baseUrl: "http://example.com/v1", model: "model", apiKey: "12345678" }), /HTTPS/);
  assert.throws(() => validateProviderDraft({ name: "Bad", providerType: "openai", baseUrl: "https://user:pass@example.com/v1", model: "model", apiKey: "12345678" }), /thông tin đăng nhập/);
});
