# ==========================================================
# JACS Studio - PowerShell Dev Launcher
# ==========================================================
$DIR = $PSScriptRoot

Write-Host "🚀 Đang khởi động JACS Studio (Backend + Frontend)..." -ForegroundColor Cyan

# Kiểm tra và giải phóng port 8000 nếu có tiến trình python cũ bị treo
$busyPort = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($busyPort) {
    Write-Host "⚠️ Phát hiện tiến trình cũ ($busyPort) đang chiếm port 8000, đang giải phóng..." -ForegroundColor Yellow
    Stop-Process -Id $busyPort -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# 1. Khởi động Backend API (FastAPI) trên cửa sổ riêng
Write-Host "👉 Đang mở cửa sổ Backend API tại http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -WorkingDirectory "$DIR\BE\api-server" -ArgumentList "-NoExit", "-Command", "Write-Host '🚀 Backend API đang chạy...'; python -m uvicorn app.main:app --reload --port 8000"

# Chờ 2 giây để Backend API kịp khởi động
Start-Sleep -Seconds 2

# 2. Khởi động Frontend Admin Portal tại cửa sổ hiện tại
Write-Host "👉 Khởi động Frontend Admin Portal tại http://localhost:5173 ..." -ForegroundColor Green
Set-Location $DIR
npx pnpm dev:admin
