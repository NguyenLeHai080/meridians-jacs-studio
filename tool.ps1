# ==========================================================
# JACS Studio - PowerShell Desktop Tool Launcher
# ==========================================================
$DIR = $PSScriptRoot
Write-Host "💻 Đang khởi động JACS Studio Desktop Tool (Electron)..." -ForegroundColor Cyan
Set-Location $DIR
$env:JACS_API_URL = "http://localhost:8000"
$env:VITE_API_URL = "http://localhost:8000"
npx pnpm dev:electron
