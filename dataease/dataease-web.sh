#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
MODE="${1:-dev}"
FRONTEND_DIR="$ROOT_DIR/core/core-frontend"
DIST_DIR="$FRONTEND_DIR/dist"
APP_PORT=8080

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

port_pids() {
  local port="$1"
  if command_exists lsof; then
    lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
  fi
}

ensure_port_free() {
  local port="$1"
  local name="$2"
  local pids
  pids=$(port_pids "$port")
  if [[ -n "$pids" ]]; then
    echo "$name port $port is still occupied by: $pids"
    ps -p $pids -o pid=,command=
    exit 1
  fi
}

kill_old_frontend() {
  local pids
  pids=$(ps ax -o pid=,command= -ww | grep "$FRONTEND_DIR/node_modules/.bin/vite" | grep -v grep | awk '{print $1}' || true)
  if [[ -n "$pids" ]]; then
    echo "Stopping old DataEase frontend process: $pids"
    kill $pids
    sleep 1
  fi
}

clear_dist() {
  if [[ -d "$DIST_DIR" ]]; then
    echo "Removing DataEase frontend dist: $DIST_DIR"
    rm -rf "$DIST_DIR"
  fi
}

cd "$FRONTEND_DIR"
if [[ ! -d node_modules ]]; then
  npm install
fi

case "$MODE" in
  dev)
    kill_old_frontend
    ensure_port_free "$APP_PORT" "DataEase frontend"
    exec npm run dev -- --port "$APP_PORT" --strictPort
    ;;
  build)
    clear_dist
    exec npm run build:base
    ;;
  *)
    echo "Usage: ./dataease-web.sh [dev|build]"
    exit 1
    ;;
esac
