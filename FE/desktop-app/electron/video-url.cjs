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
  let normalized = decodeEmbeddedUrl(value)
    .replace(/^\s*\[[^\]]*\]\((https?:\/\/[^)]+)\)\s*[.;,]*\s*$/i, "$1")
    .replace(/^\s*<([^>]+)>\s*$/, "$1")
    .replace(/\\([_?&#=])/g, "$1")
    .trim();
  normalized = normalized.replace(/[),.;]+$/, "");
  return normalized;
}

function isTikTokHost(value) {
  const hostname = String(value || "").toLowerCase();
  return hostname === "tiktok.com" || hostname.endsWith(".tiktok.com") || hostname === "douyin.com" || hostname.endsWith(".douyin.com");
}

function isYouTubeHost(value) {
  const hostname = String(value || "").toLowerCase();
  return hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be";
}

function extractYouTubeVideoId(urlStr) {
  const patterns = [
    /(?:v=|\/embed\/|\/shorts\/|\/v\/|youtu\.be\/)([0-9A-Za-z_-]{11})/i,
    /^([0-9A-Za-z_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = String(urlStr || "").match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function resolveYouTubeVideoUrl(parsed, signal) {
  const videoId = extractYouTubeVideoId(parsed.href);
  if (!videoId) throw new Error("Không trích xuất được Video ID từ link YouTube");

  // 1. Primary: Query YouTube Innertube ANDROID_VR API for direct MP4 stream
  const apiUrl = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";
  const payload = {
    videoId,
    context: {
      client: {
        clientName: "ANDROID_VR",
        clientVersion: "1.56.21",
        deviceMake: "Oculus",
        deviceModel: "Quest 3",
        androidSdkVersion: 32,
        userAgent: "com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; en_US; Quest 3) gzip"
      }
    }
  };

  try {
    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      },
      body: JSON.stringify(payload),
      signal
    });

    if (apiRes.ok) {
      const data = await apiRes.json().catch(() => ({}));
      const formats = data?.streamingData?.formats || [];
      const progressive = formats.filter((f) => f.url && String(f.mimeType || "").includes("video/mp4"));
      if (progressive.length) {
        // Pick highest resolution progressive MP4
        progressive.sort((a, b) => Number(b.height || 0) - Number(a.height || 0));
        const chosen = progressive[0];
        const streamRes = await fetch(chosen.url, {
          signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            Referer: "https://www.youtube.com/"
          }
        });
        if (streamRes.ok) {
          return { response: streamRes, url: chosen.url };
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) throw err;
  }

  // 2. Secondary: Fallback via Piped instances
  const pipedInstances = [
    `https://api.piped.private.coffee/streams/${videoId}`,
    `https://pipedapi.tokhmi.xyz/streams/${videoId}`,
    `https://pipedapi.leptons.xyz/streams/{videoId}`
  ];

  for (const endpoint of pipedInstances) {
    try {
      const pRes = await fetch(endpoint, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal
      });
      if (pRes.ok) {
        const data = await pRes.json().catch(() => ({}));
        const streams = data?.videoStreams || [];
        const mp4Streams = streams.filter((s) => s.url && (s.mimeType?.includes("mp4") || s.format === "mp4"));
        if (mp4Streams.length) {
          mp4Streams.sort((a, b) => (b.height || 0) - (a.height || 0));
          const chosen = mp4Streams[0];
          const streamRes = await fetch(chosen.url, { signal, headers: { "User-Agent": "Mozilla/5.0" } });
          if (streamRes.ok) return { response: streamRes, url: chosen.url };
        }
      }
    } catch {
      // try next
    }
  }

  throw new Error("Không thể giải mã luồng video YouTube. Vui lòng thử tải file video về máy và tải lên trực tiếp.");
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

function extractResolverVideoUrls(payload) {
  const data = payload && typeof payload === "object" ? payload.data || payload : {};
  const candidates = [data.hdplay, data.play, data.download, data.downloadAddr, data.wmplay]
    .map(decodeEmbeddedUrl)
    .filter((value) => /^https?:\/\//i.test(value));
  return [...new Set(candidates)];
}

function extractPageVideoUrls(html) {
  const source = String(html || "");
  const candidates = [];
  for (const tag of source.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = {};
    for (const match of tag[0].matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/gi)) attributes[match[1].toLowerCase()] = match[2];
    const property = String(attributes.property || attributes.name || "").toLowerCase();
    if (!/^(?:og:video(?::secure_url)?|twitter:player:stream)$/.test(property)) continue;
    const candidate = decodeEmbeddedUrl(attributes.content || "");
    if (/^https?:\/\//i.test(candidate)) candidates.push(candidate);
  }
  for (const match of source.matchAll(/<source\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    const candidate = decodeEmbeddedUrl(match[1]);
    if (/^https?:\/\//i.test(candidate)) candidates.push(candidate);
  }
  for (const match of source.matchAll(/["'](?:contentUrl|videoUrl|video_url|playAddr|downloadAddr|play_url|download_url|browser_native_hd_url|browser_native_sd_url|playable_url_quality_hd|playable_url)["']\s*:\s*["']([^"']+)["']/gi)) {
    const candidate = decodeEmbeddedUrl(match[1]);
    if (/^https?:\/\//i.test(candidate)) candidates.push(candidate);
  }
  return [...new Set(candidates)];
}

module.exports = {
  decodeEmbeddedUrl,
  normalizeVideoUrl,
  extractTikTokVideoUrls,
  extractResolverVideoUrls,
  extractPageVideoUrls,
  isTikTokHost,
  isYouTubeHost,
  extractYouTubeVideoId,
  resolveYouTubeVideoUrl
};
