Place platform-specific `ffmpeg` and `ffprobe` binaries here before packaging:

- `bin/darwin-arm64/ffmpeg` and `bin/darwin-arm64/ffprobe`
- `bin/darwin-x64/ffmpeg` and `bin/darwin-x64/ffprobe`
- `bin/win32-x64/ffmpeg.exe` and `bin/win32-x64/ffprobe.exe`

The legacy `bin/darwin` and `bin/win32` folders are still accepted when
running an older checkout, but must not be shared between architectures.

The application also accepts `JACS_FFMPEG_PATH` and `JACS_FFPROBE_PATH` for QA.

CI and local release builds can copy binaries from the host with:

```bash
node FE/desktop-app/scripts/prepare-media-binaries.cjs
```

The release workflow installs FFmpeg on each native runner before packaging.
Do not commit the binary files themselves; keep the corresponding license and
notice files in this directory. When `ffprobe` is unavailable, the desktop
falls back to FFmpeg metadata parsing and still supports frame analysis and
rendering.
