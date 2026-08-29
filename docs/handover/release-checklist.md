# Release checklist

- [ ] Issue, changelog và phạm vi release đã được liên kết trong PR.
- [ ] CI pass: ruff, pytest, TypeScript build và security scan.
- [ ] Migration forward/rollback đã chạy ở staging; backup đã kiểm tra restore.
- [ ] Provider, license, telemetry, job và OTA smoke test pass.
- [ ] Windows 11 và macOS Intel/Apple Silicon build được ký code.
- [ ] Manifest có version, platform, channel, URL, SHA-512, signature và rollout.
- [ ] Release notes nêu breaking change, force-update reason và rollback plan.
- [ ] QA/Product Owner approve; tạo PR `staging -> prod` theo Gitflow.
- [ ] Theo dõi error rate, queue age, provider cost và rollback window sau release.
