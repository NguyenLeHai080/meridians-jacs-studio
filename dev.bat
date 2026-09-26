@echo off
title JACS Studio Dev Launcher
set "DIR=%~dp0"
echo ===================================================
echo 🚀 Dang khoi dong JACS Studio (Backend + Frontend)...
echo ===================================================

echo [1/2] Khoi dong Backend API tai http://localhost:8000 ...
start "JACS Backend API" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%DIR%BE\api-server'; Write-Host '🚀 Backend API dang chay...'; python -m uvicorn app.main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Khoi dong Frontend Admin Portal tai http://localhost:5173 ...
cd /d "%DIR%"
npx pnpm dev:admin
