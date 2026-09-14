#!/bin/bash
# Script khởi động đồng thời cả Backend API và Frontend Admin Portal
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🚀 Khởi động JACS Studio (Backend & Frontend)..."

# 1. Khởi động Backend API ở chế độ ngầm
if [ -f "BE/api-server/.venv/bin/uvicorn" ]; then
  BE/api-server/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
  BACKEND_PID=$!
  echo "✅ Backend API đang chạy tại http://localhost:8000 (PID: $BACKEND_PID)"
else
  echo "⚠️ Không tìm thấy virtualenv trong BE/api-server/.venv"
fi

# Tự động dọn dẹp khi nhấn Ctrl+C
cleanup() {
  echo ""
  echo "🛑 Đang dừng server..."
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Khởi động Frontend Admin Portal
echo "✅ Frontend mở tại: http://jacs.local (qua OrbStack) hoặc http://localhost:5173"
pnpm dev:admin

wait
