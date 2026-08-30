function decodeEmbeddedUrl(value) {
  return String(value || "")
    .replace(/\\u002F/gi, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003F/gi, "?")
    .replace(/\\u003D/gi, "=")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .trim();
}

function normalizeVideoUrl(value) {
  // Chat/Markdown clients sometimes escape URL punctuation (for example
  // `\_r=1`). Those backslashes are presentation escapes, not URL data.
  let normalized = decodeEmbeddedUrl(value)
    // Accept a link copied as Markdown: [title](https://...)
    .replace(/^\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)\s*[.;,]*\s*$/i, "$1")
    // Accept links copied from chat apps with angle-bracket wrapping.
    .replace(/^\s*<([^>]+)>\s*$/, "$1")
    .replace(/\\([_?&#=])/g, "$1")
    .trim();
  // A copied URL may include a trailing sentence delimiter. Keep URL query
  // values intact while removing only punctuation outside the URL.
  normalized = normalized.replace(/[),.;]+$/, "");
  return normalized;
}

function isTikTokHost(value) {
  const hostname = String(value || "").toLowerCase();
  return hostname === "tiktok.com" || hostname.endsWith(".tiktok.com");
}

function extractTikTokVideoUrls(html) {
  const candidates = [];
  const patterns = [
    /["'](?:playAddr|downloadAddr)["']\s*:\s*["']([^"']+)["']/gi,
    /(?:playAddr|downloadAddr)\\?":\\?"([^"]+)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of String(html || "").matchAll(pattern)) {
      const candidate = decodeEmbeddedUrl(match[1]);
      if (/^https?:\/\//i.test(candidate)) candidates.push(candidate);
    }
  }
  return [...new Set(candidates)];
}

// TikTok's web page is frequently protected by a WAF. A resolver response
// (for example TikWM) contains signed CDN URLs in a small JSON envelope, so
// keep its parsing separate from the HTML parser and never send that envelope
// to an AI provider.
function extractResolverVideoUrls(payload) {
  const data = payload && typeof payload === "object" ? payload.data || payload : {};
  const candidates = [data.hdplay, data.play, data.download, data.downloadAddr, data.wmplay]
    .map(decodeEmbeddedUrl)
    .filter((value) => /^https?:\/\//i.test(value));
  return [...new Set(candidates)];
}

module.exports = { decodeEmbeddedUrl, normalizeVideoUrl, extractTikTokVideoUrls, extractResolverVideoUrls, isTikTokHost };
