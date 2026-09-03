#!/usr/bin/env bash
set -eu
set -o pipefail

TARGET_ENV="${1:-}"
ROOT_DIR="${2:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"

case "$TARGET_ENV" in
  staging|prod) ;;
  *) echo "Usage: $0 <staging|prod> [release-directory]" >&2; exit 64 ;;
esac

ENV_FILE="${JACS_ENV_FILE:-$ROOT_DIR/.env}"
if [[ ! -s "$ENV_FILE" && -s "$(dirname "$ROOT_DIR")/.env" ]]; then
  ENV_FILE="$(dirname "$ROOT_DIR")/.env"
fi
COMPOSE_FILE="$ROOT_DIR/deploy/compose.$TARGET_ENV.yml"
PROJECT="jacs-studio-$TARGET_ENV"

if [[ ! -s "$ENV_FILE" ]]; then
  echo "Missing environment file: $ENV_FILE" >&2
  exit 78
fi
if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing compose file: $COMPOSE_FILE" >&2
  exit 78
fi

echo "========================================================"
echo "🚀 DEPLOYING JACS STUDIO -> [${TARGET_ENV^^}]"
echo "========================================================"
echo "  • Environment File: $ENV_FILE"
echo "  • Compose File:     $COMPOSE_FILE"
echo "  • Project Name:     $PROJECT"

# Validate required environment variables
grep -q '^JACS_ADMIN_PASSWORD_HASH=.' "$ENV_FILE" || { echo "JACS_ADMIN_PASSWORD_HASH is required" >&2; exit 78; }
grep -q '^JACS_ADMIN_EMAIL=.' "$ENV_FILE" || { echo "JACS_ADMIN_EMAIL is required" >&2; exit 78; }
grep -q '^JACS_CORS_ORIGINS=.' "$ENV_FILE" || { echo "JACS_CORS_ORIGINS is required" >&2; exit 78; }
grep -q '^JACS_DATABASE_URL=.' "$ENV_FILE" || { echo "JACS_DATABASE_URL is required" >&2; exit 78; }
grep -q '^JACS_DB_NAME=.' "$ENV_FILE" || { echo "JACS_DB_NAME is required" >&2; exit 78; }
grep -q '^JACS_DB_USER=.' "$ENV_FILE" || { echo "JACS_DB_USER is required" >&2; exit 78; }
grep -q '^JACS_DB_PASSWORD=.' "$ENV_FILE" || { echo "JACS_DB_PASSWORD is required" >&2; exit 78; }
grep -q '^JACS_SECRET_KEY=.' "$ENV_FILE" || { echo "JACS_SECRET_KEY is required" >&2; exit 78; }

cd "$ROOT_DIR"

# Validate compose configuration
docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet

# Build and start services with minimal downtime
echo "▶ Building and launching containers..."
docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans

# Show running status
docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

PORT=84
[[ "$TARGET_ENV" == "staging" ]] && PORT=85

echo "▶ Waiting for service health check on port $PORT..."
for attempt in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/health/live" >/dev/null 2>&1; then
    echo "✓ JACS Studio [$TARGET_ENV] is HEALTHY and READY on port $PORT!"
    
    # Auto-clean dangling build images to keep server disk optimized
    echo "▶ Cleaning dangling images..."
    docker image prune -f >/dev/null 2>&1 || true
    
    echo "🎉 Deployment to [${TARGET_ENV^^}] completed successfully!"
    exit 0
  fi
  sleep 2
done

echo "❌ JACS Studio [$TARGET_ENV] did not become healthy in time!" >&2
docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100
exit 1
