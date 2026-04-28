#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
BACKEND_DIR="$ROOT_DIR/backend"
PROJECT_ENV="$ROOT_DIR/.env"
APP_PORT=8000

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

kill_old_backend() {
  local pids
  pids=$(ps ax -o pid=,command= -ww | grep "$BACKEND_DIR/.venv/bin/python main.py" | grep -v grep | awk '{print $1}' || true)
  if [[ -z "$pids" ]]; then
    pids=$(port_pids "$APP_PORT")
  fi
  if [[ -n "$pids" ]]; then
    echo "Stopping old SQLBot backend process: $pids"
    kill $pids
    sleep 1
  fi
}

if ! command_exists uv; then
  echo "Missing required command: uv"
  exit 1
fi

if [[ ! -f "$PROJECT_ENV" ]]; then
  echo "Missing $PROJECT_ENV"
  exit 1
fi

EMBEDDING_PROVIDER=$(grep -E '^EMBEDDING_PROVIDER=' "$PROJECT_ENV" | tail -n 1 | cut -d'=' -f2- | tr -d '\r' | xargs || true)

if ! port_open 127.0.0.1 5433; then
  echo "PostgreSQL/pgvector is not listening on 127.0.0.1:5433"
  exit 1
fi

cd "$BACKEND_DIR"
if [[ "$EMBEDDING_PROVIDER" == "local" ]]; then
  UV_CACHE_DIR=.uv-cache uv sync \
    --extra cpu \
    --no-dev \
    --no-install-project
  echo "Checking local embedding model..."
  .venv/bin/python scripts/check_local_embedding.py
else
  UV_CACHE_DIR=.uv-cache uv sync \
    --no-dev \
    --no-install-project \
    --no-install-package sentence-transformers \
    --no-install-package langchain-huggingface \
    --no-install-package torch
fi

kill_old_backend
ensure_port_free "$APP_PORT" "SQLBot backend"

exec env SQLBOT_RELOAD="${SQLBOT_RELOAD:-false}" .venv/bin/python main.py
