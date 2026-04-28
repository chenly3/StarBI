#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
PROJECT_DIR="$ROOT_DIR/SQLBot"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
LOCAL_DIR="$ROOT_DIR/tmp/sqlbot-local"
LOG_DIR="$LOCAL_DIR/run-logs"

BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

mkdir -p "$LOG_DIR"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

port_open() {
  local host="$1"
  local port="$2"

  if command_exists nc; then
    nc -z "$host" "$port" >/dev/null 2>&1
    return
  fi

  (echo >"/dev/tcp/$host/$port") >/dev/null 2>&1
}

wait_for_port() {
  local host="$1"
  local port="$2"
  local name="$3"
  local timeout="${4:-60}"
  local elapsed=0

  until port_open "$host" "$port"; do
    sleep 1
    elapsed=$((elapsed + 1))
    if [[ "$elapsed" -ge "$timeout" ]]; then
      echo "$name did not become ready on $host:$port within ${timeout}s."
      return 1
    fi
  done
}

require_cmd() {
  local name="$1"
  if ! command_exists "$name"; then
    echo "Missing required command: $name"
    exit 1
  fi
}

bootstrap_backend_if_needed() {
  if [[ -x "$BACKEND_DIR/.venv/bin/python" ]]; then
    return
  fi

  echo "Creating SQLBot backend virtualenv with uv..."
  (
    cd "$BACKEND_DIR"
    UV_CACHE_DIR=.uv-cache uv sync \
      --no-dev \
      --no-install-project \
      --no-install-package sentence-transformers \
      --no-install-package langchain-huggingface \
      --no-install-package torch
  )
}

install_frontend_deps_if_needed() {
  if [[ -d "$FRONTEND_DIR/node_modules" ]]; then
    return
  fi

  echo "Installing SQLBot frontend dependencies..."
  (
    cd "$FRONTEND_DIR"
    npm install
  )
}

start_backend() {
  if port_open 127.0.0.1 8000; then
    echo "SQLBot backend already appears to be running on http://localhost:8000"
    return
  fi

  echo "Starting SQLBot backend..."
  (
    cd "$BACKEND_DIR"
    nohup env SQLBOT_RELOAD="${SQLBOT_RELOAD:-false}" .venv/bin/python main.py >"$BACKEND_LOG" 2>&1 &
  )

  wait_for_port 127.0.0.1 8000 "SQLBot backend"
}

start_frontend() {
  if port_open 127.0.0.1 5173; then
    echo "SQLBot frontend already appears to be running on http://localhost:5173"
    return
  fi

  echo "Starting SQLBot frontend..."
  (
    cd "$FRONTEND_DIR"
    nohup npm run dev >"$FRONTEND_LOG" 2>&1 &
  )

  wait_for_port 127.0.0.1 5173 "SQLBot frontend"
}

main() {
  require_cmd uv
  require_cmd npm
  require_cmd node

  if ! port_open 127.0.0.1 5433; then
    echo "PostgreSQL/pgvector is not listening on 127.0.0.1:5433. Expected database: sqlbot / root / 1q1w1e1r"
    exit 1
  fi

  if [[ ! -f "$PROJECT_DIR/.env" ]]; then
    echo "Missing $PROJECT_DIR/.env"
    exit 1
  fi

  bootstrap_backend_if_needed
  install_frontend_deps_if_needed
  start_backend
  start_frontend

  cat <<EOF
SQLBot local stack is starting.
Backend:  http://localhost:8000
Docs:     http://localhost:8000/docs
Frontend: http://localhost:5173

Logs:
  $BACKEND_LOG
  $FRONTEND_LOG
EOF
}

main "$@"
