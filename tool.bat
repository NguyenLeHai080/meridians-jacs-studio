@echo off
title JACS Desktop Tool (Electron)
echo ===================================================
echo 💻 Dang khoi dong JACS Studio Desktop Tool...
echo ===================================================
cd /d "%~dp0"
set "JACS_API_URL=http://localhost:8000"
set "VITE_API_URL=http://localhost:8000"
npx pnpm dev:electron
