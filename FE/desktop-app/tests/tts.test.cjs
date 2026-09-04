const assert = require("node:assert/strict");
const test = require("node:test");
const { formatTtsProviderError, normalizeTtsVoice, resolveTtsModels, resolveTtsVoices } = require("../electron/tts.cjs");

test("prioritizes the explicitly configured gateway TTS model", () => {
  assert.deepEqual(resolveTtsModels({ providerType: "openai-compatible", ttsModel: "customer-tts", baseUrl: "https://gateway.example.com/v1" }), ["customer-tts", "tts-1"]);
  assert.deepEqual(resolveTtsModels({ providerType: "openai-compatible", ttsModel: "gpt-4o-mini-tts", baseUrl: "https://gateway.example.com/v1" }), ["tts-1"]);
  assert.deepEqual(resolveTtsModels({ providerType: "openai", baseUrl: "https://api.openai.com/v1" }), ["tts-1", "gpt-4o-mini-tts"]);
});

test("maps locale voices and falls back by gender", () => {
  assert.equal(normalizeTtsVoice("vi-VN-HoaiMy"), "nova");
  assert.equal(normalizeTtsVoice("unknown", "male"), "onyx");
  assert.equal(normalizeTtsVoice("unknown", "female"), "nova");
  assert.deepEqual(resolveTtsVoices("coral", "female"), ["coral", "nova"]);
  assert.deepEqual(resolveTtsVoices("unknown", "male"), ["onyx"]);
});

test("explains missing gateway pricing rules", () => {
  const message = formatTtsProviderError(400, "No pricing rule for this model", "gpt-4o-mini-tts");
  assert.match(message, /chưa cấu hình pricing/i);
  assert.match(message, /gpt-4o-mini-tts/);
});
