#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found at $ENV_FILE"
  exit 1
fi

TOKEN=$(grep -E '^(TUNNEL_TOKEN|tunnel_toke)=' "$ENV_FILE" | head -n 1 | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')

if [ -z "$TOKEN" ]; then
  echo "Error: TUNNEL_TOKEN or tunnel_toke not found in $ENV_FILE"
  exit 1
fi

ACTION="${1:-start}"

case "$ACTION" in
  start)
    docker rm -f cloudflared 2>/dev/null || true
    echo "Starting Cloudflare tunnel service using token from backend/.env..."
    docker run -d \
      --name cloudflared \
      --restart unless-stopped \
      --network host \
      cloudflare/cloudflared:latest tunnel --no-autoupdate run --token "$TOKEN"
    echo "Tunnel container started with --restart unless-stopped (running as a service)."
    docker ps --filter "name=cloudflared"
    ;;
  stop)
    echo "Stopping Cloudflare tunnel..."
    docker stop cloudflared || true
    docker rm cloudflared || true
    echo "Tunnel stopped."
    ;;
  restart)
    "$0" stop
    "$0" start
    ;;
  logs)
    docker logs -f cloudflared
    ;;
  status)
    docker ps --filter "name=cloudflared"
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|status}"
    exit 1
    ;;
esac
