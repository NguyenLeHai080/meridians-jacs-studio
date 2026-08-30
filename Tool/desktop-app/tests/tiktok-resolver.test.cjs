const assert = require("node:assert/strict");
const test = require("node:test");
const { decodeEmbeddedUrl, extractResolverVideoUrls, extractTikTokVideoUrls, isTikTokHost, normalizeVideoUrl } = require("../electron/video-url.cjs");

test("recognizes TikTok hosts without accepting lookalike domains", () => {
  assert.equal(isTikTokHost("www.tiktok.com"), true);
  assert.equal(isTikTokHost("vm.tiktok.com"), true);
  assert.equal(isTikTokHost("tiktok.com.example.org"), false);
});

test("extracts and decodes TikTok play/download addresses", () => {
  const html = String.raw`{"playAddr":"https:\u002F\u002Fv16.tiktokcdn.com\u002Fvideo\u002Fsource?a=1\u0026b=2","downloadAddr":"https:\u002F\u002Fv16.tiktokcdn.com\u002Fvideo\u002Fdownload"}`;
  assert.deepEqual(extractTikTokVideoUrls(html), [
    "https://v16.tiktokcdn.com/video/source?a=1&b=2",
    "https://v16.tiktokcdn.com/video/download",
  ]);
  assert.equal(decodeEmbeddedUrl(String.raw`https:\u002F\u002Fexample.com\u002Fa&amp;b=1`), "https://example.com/a&b=1");
});

test("extracts signed video URLs from resolver envelopes", () => {
  assert.deepEqual(extractResolverVideoUrls({ code: 0, data: {
    hdplay: "https://cdn.example/hd.mp4",
    play: "https://cdn.example/play.mp4",
    wmplay: "https://cdn.example/watermark.mp4",
  } }), ["https://cdn.example/hd.mp4", "https://cdn.example/play.mp4", "https://cdn.example/watermark.mp4"]);
});

test("normalizes URLs copied with Markdown escape characters", () => {
  assert.equal(
    normalizeVideoUrl("https://www.tiktok.com/@hhmovie51/video/7677523402785164557?\\_r=1&\\_t=ZS-99JQgslOzPL"),
    "https://www.tiktok.com/@hhmovie51/video/7677523402785164557?_r=1&_t=ZS-99JQgslOzPL",
  );
  assert.equal(
    normalizeVideoUrl("[TikTok](https://www.tiktok.com/@demo/video/123?\\_r=1)."),
    "https://www.tiktok.com/@demo/video/123?_r=1",
  );
  assert.equal(
    normalizeVideoUrl("<https://cdn.example/video.mp4>"),
    "https://cdn.example/video.mp4",
  );
});
