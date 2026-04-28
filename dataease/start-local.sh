#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd "$SCRIPT_DIR/.." && pwd)
PROJECT_DIR="$ROOT_DIR/dataease"
BACKEND_DIR="$PROJECT_DIR/core/core-backend"
FRONTEND_DIR="$PROJECT_DIR/core/core-frontend"
LOCAL_DIR="$ROOT_DIR/tmp/dataease-local"
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

resolve_java_home() {
  if [[ -n "${JAVA_HOME:-}" && -x "${JAVA_HOME}/bin/java" ]]; then
    echo "$JAVA_HOME"
    return
  fi

  if command_exists /usr/libexec/java_home; then
    /usr/libexec/java_home -v 21 2>/dev/null || true
  fi
}

install_frontend_deps_if_needed() {
  if [[ -d "$FRONTEND_DIR/node_modules" ]]; then
    return
  fi

  echo "Installing DataEase frontend dependencies..."
  (
    cd "$FRONTEND_DIR"
    npm install
  )
}

start_backend() {
  local java_home="$1"

  if port_open 127.0.0.1 8100; then
    echo "DataEase backend already appears to be running on http://localhost:8100"
    return
  fi

  echo "Starting DataEase backend..."
  (
    cd "$BACKEND_DIR"
    nohup env \
      JAVA_HOME="$java_home" \
      PATH="$java_home/bin:$PATH" \
      mvn \
      -Dspring-boot.run.profiles=standalone \
      "-Dspring-boot.run.jvmArguments=-Duser.home=$LOCAL_DIR/home -Dspring.config.additional-location=file:$LOCAL_DIR/spring/" \
      spring-boot:run \
      >"$BACKEND_LOG" 2>&1 &
  )

  wait_for_port 127.0.0.1 8100 "DataEase backend"
}

start_frontend() {
  if port_open 127.0.0.1 8080; then
    echo "DataEase frontend already appears to be running on http://localhost:8080"
    return
  fi

  echo "Starting DataEase frontend..."
  (
    cd "$FRONTEND_DIR"
    nohup npm run dev >"$FRONTEND_LOG" 2>&1 &
  )

  wait_for_port 127.0.0.1 8080 "DataEase frontend"
}

main() {
  require_cmd mvn
  require_cmd npm
  require_cmd node

  local java_home
  java_home="$(resolve_java_home)"
  if [[ -z "$java_home" ]]; then
    echo "JDK 21 is required. Set JAVA_HOME to a JDK 21 installation and retry."
    exit 1
  fi

  if ! port_open 127.0.0.1 3306; then
    echo "MySQL is not listening on 127.0.0.1:3306. Expected database: dataease10 / root / 123456"
    exit 1
  fi

  if ! port_open 127.0.0.1 6379; then
    echo "Redis is not listening on 127.0.0.1:6379. Expected password: 123456"
    exit 1
  fi

  install_frontend_deps_if_needed
  start_backend "$java_home"
  start_frontend

  cat <<EOF
DataEase local stack is starting.
Backend:  http://localhost:8100
Frontend: http://localhost:8080
Swagger:  http://localhost:8100/swagger-ui.html

Logs:
  $BACKEND_LOG
  $FRONTEND_LOG
EOF
}

main "$@"
