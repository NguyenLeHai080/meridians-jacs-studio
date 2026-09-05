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
  const vrPayload = {
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
      body: JSON.stringify(vrPayload),
      signal
    });

    if (apiRes.ok) {
      const data = await apiRes.json().catch(() => ({}));
      const formats = data?.streamingData?.formats || [];
      const progressive = formats.filter((f) => f.url && String(f.mimeType || "").includes("video/mp4"));
      if (progressive.length) {
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

  // 2. Secondary: Fallback via Invidious / Piped instances
  const mirrorEndpoints = [
    `https://inv.nadeko.net/api/v1/videos/${videoId}`,
    `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
    `https://invidious.protokolla.fi/api/v1/videos/${videoId}`,
    `https://api.piped.private.coffee/streams/${videoId}`,
    `https://pipedapi.tokhmi.xyz/streams/${videoId}`
  ];

  for (const endpoint of mirrorEndpoints) {
    try {
      const pRes = await fetch(endpoint, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal
      });
      if (pRes.ok) {
        const data = await pRes.json().catch(() => ({}));
        const streams = data?.formatStreams || data?.videoStreams || [];
        const mp4Streams = streams.filter((s) => s.url && (s.mimeType?.includes("mp4") || s.format === "mp4" || s.container === "mp4"));
        if (mp4Streams.length) {
          mp4Streams.sort((a, b) => (Number(b.height || 0) || (b.quality ? parseInt(b.quality, 10) : 0)) - (Number(a.height || 0) || (a.quality ? parseInt(a.quality, 10) : 0)));
          const chosen = mp4Streams[0];
          const streamRes = await fetch(chosen.url, { signal, headers: { "User-Agent": "Mozilla/5.0" } });
          if (streamRes.ok) return { response: streamRes, url: chosen.url };
        }
      }
    } catch {
      // try next mirror
    }
  }

  throw new Error("YouTube đang chặn tải tự động đối với video này (yêu cầu xác minh Bot). Vui lòng dùng nút 'Chọn file từ máy' để chọn file video đã tải về máy tính.");
}

function extractTikTokVideoUrls(html) {
  const candidates = [];
  const patterns = [
    /["'](?:playAddr|downloadAddr)["']\s*:\s*["']([^"']+)["']/gi,
    /(?:playAddr|downloadAddr)\\?":\\?"([^"\\]+)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of String(html || "").matchAll(pattern)) {
      const candidate = decodeEmbeddedUrl(match[1]);
      if (/^https?:\/\//i.test(candidate) && !candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    }
  }
  return candidates;
}

function extractPageVideoUrls(html) {
  const candidates = [];
  const patterns = [
    /<meta\s+[^>]*property=["']og:video(?::secure_url|:url)?["'][^>]*content=["']([^"']+)["']/gi,
    /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:video(?::secure_url|:url)?["']/gi,
    /<meta\s+[^>]*name=["']twitter:player:stream["'][^>]*content=["']([^"']+)["']/gi,
    /<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:player:stream["']/gi,
    /<source\s+[^>]*src=["']([^"']+)["']/gi,
    /<video\s+[^>]*src=["']([^"']+)["']/gi,
    /["'](?:contentUrl|videoUrl|downloadUrl)["']\s*:\s*["']([^"']+)["']/gi,
  ];
  for (const pattern of patterns) {
    for (const match of String(html || "").matchAll(pattern)) {
      const candidate = decodeEmbeddedUrl(match[1]);
      if (/^https?:\/\//i.test(candidate) && !candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    }
  }
  return candidates;
}

function extractResolverVideoUrls(payload) {
  const candidates = [];
  const append = (value) => {
    const candidate = decodeEmbeddedUrl(value);
    if (/^https?:\/\//i.test(candidate) && !candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };
  const data = payload && typeof payload === "object" ? payload.data || payload : null;
  if (!data || typeof data !== "object") return candidates;
  for (const field of ["hdplay", "play", "wmplay", "url", "video_url"]) {
    if (typeof data[field] === "string") append(data[field]);
  }
  if (Array.isArray(data.images)) {
    for (const image of data.images) {
      if (typeof image === "string") append(image);
    }
  }
  return candidates;
}

module.exports = {
  decodeEmbeddedUrl,
  extractPageVideoUrls,
  extractResolverVideoUrls,
  extractTikTokVideoUrls,
  isTikTokHost,
  isYouTubeHost,
  normalizeVideoUrl,
  extractYouTubeVideoId,
  resolveYouTubeVideoUrl,
};
