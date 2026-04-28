#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
DEFAULT_TIMEOUT_SECONDS=900
DRY_RUN=false
TIMEOUT_SECONDS="$DEFAULT_TIMEOUT_SECONDS"

SERVICES=()
UNKNOWN_INPUTS=()

ORDERED_SERVICES=(
  "dataease-app"
  "sqlbot-app"
  "dataease-web"
  "sqlbot-web"
)

usage() {
  cat <<'EOF'
Usage:
  ./browser-verify-preflight.sh [--dry-run] [--timeout seconds] <changed-path-or-service>...

Purpose:
  Decide which local services must be restarted before browser automation verification,
  based on the code paths that changed in this workspace.

Accepted service aliases:
  dataease-app
  dataease-web
  sqlbot-app
  sqlbot-web

Examples:
  ./browser-verify-preflight.sh \
    dataease/core/core-frontend/src/views/sqlbot-new/index.vue \
    SQLBot/backend/apps/chat/task/clarification.py

  ./browser-verify-preflight.sh dataease-app sqlbot-app dataease-web

Behavior:
  1. Map changed paths to impacted services
  2. Restart each impacted service in a dedicated tmux session
  3. Wait for each service port to become reachable
  4. Exit only after the restart preflight is ready for browser automation
EOF
}

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

contains_service() {
  local needle="$1"
  local item
  for item in "${SERVICES[@]:-}"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

add_service() {
  local service="$1"
  if ! contains_service "$service"; then
    SERVICES+=("$service")
  fi
}

normalize_input() {
  local input="$1"
  input="${input#$ROOT_DIR/}"
  input="${input#./}"
  printf '%s\n' "$input"
}

classify_input() {
  local raw_input="$1"
  local input
  input=$(normalize_input "$raw_input")

  case "$input" in
    dataease-app|dataease-web|sqlbot-app|sqlbot-web)
      add_service "$input"
      ;;
    dataease/core/core-frontend/*)
      add_service "dataease-web"
      ;;
    dataease/core/core-backend/*|dataease/sdk/*|dataease/de-xpack/*)
      add_service "dataease-app"
      ;;
    SQLBot/backend/*)
      add_service "sqlbot-app"
      ;;
    SQLBot/frontend/*|SQLBot/g2-ssr/*)
      add_service "sqlbot-web"
      ;;
    *)
      UNKNOWN_INPUTS+=("$raw_input")
      ;;
  esac
}

service_script() {
  case "$1" in
    dataease-app) printf '%s\n' "$ROOT_DIR/dataease/dataease-app.sh" ;;
    dataease-web) printf '%s\n' "$ROOT_DIR/dataease/dataease-web.sh" ;;
    sqlbot-app) printf '%s\n' "$ROOT_DIR/SQLBot/sqlbot-app.sh" ;;
    sqlbot-web) printf '%s\n' "$ROOT_DIR/SQLBot/sqlbot-web.sh" ;;
    *)
      echo "Unsupported service: $1" >&2
      exit 1
      ;;
  esac
}

service_port() {
  case "$1" in
    dataease-app) printf '%s\n' "8100" ;;
    dataease-web) printf '%s\n' "8080" ;;
    sqlbot-app) printf '%s\n' "8000" ;;
    sqlbot-web) printf '%s\n' "5173" ;;
    *)
      echo "Unsupported service: $1" >&2
      exit 1
      ;;
  esac
}

service_session() {
  case "$1" in
    dataease-app) printf '%s\n' "starbi-dataease-app" ;;
    dataease-web) printf '%s\n' "starbi-dataease-web" ;;
    sqlbot-app) printf '%s\n' "starbi-sqlbot-app" ;;
    sqlbot-web) printf '%s\n' "starbi-sqlbot-web" ;;
    *)
      echo "Unsupported service: $1" >&2
      exit 1
      ;;
  esac
}

wait_for_port() {
  local service="$1"
  local port="$2"
  local waited=0

  while (( waited < TIMEOUT_SECONDS )); do
    if port_open 127.0.0.1 "$port"; then
      echo "Ready: $service is listening on 127.0.0.1:$port"
      return 0
    fi
    sleep 2
    waited=$(( waited + 2 ))
  done

  echo "Timed out waiting for $service on 127.0.0.1:$port after ${TIMEOUT_SECONDS}s" >&2
  return 1
}

restart_service() {
  local service="$1"
  local script
  local script_dir
  local session
  local port

  script=$(service_script "$service")
  script_dir=$(dirname "$script")
  session=$(service_session "$service")
  port=$(service_port "$service")

  echo
  echo "==> Restarting $service"
  echo "    script: $script"
  echo "    tmux session: $session"
  echo "    port: $port"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "    dry-run: skip restart"
    return 0
  fi

  if tmux has-session -t "$session" 2>/dev/null; then
    tmux kill-session -t "$session"
  fi

  tmux new-session -d -s "$session" "cd '$script_dir' && exec '$script'"
  wait_for_port "$service" "$port"
}

if ! command_exists tmux; then
  echo "Missing required command: tmux" >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  usage
  exit 1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --timeout)
      TIMEOUT_SECONDS="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      classify_input "$1"
      shift
      ;;
  esac
done

if [[ ${#SERVICES[@]} -eq 0 ]]; then
  echo "No impacted restart targets were detected."
  if [[ ${#UNKNOWN_INPUTS[@]} -gt 0 ]]; then
    echo "Unmatched inputs:"
    printf '  - %s\n' "${UNKNOWN_INPUTS[@]}"
  fi
  exit 0
fi

echo "Impacted services:"
for service in "${ORDERED_SERVICES[@]}"; do
  if contains_service "$service"; then
    echo "  - $service"
  fi
done

if [[ ${#UNKNOWN_INPUTS[@]} -gt 0 ]]; then
  echo
  echo "Ignored unmatched inputs:"
  printf '  - %s\n' "${UNKNOWN_INPUTS[@]}"
fi

for service in "${ORDERED_SERVICES[@]}"; do
  if contains_service "$service"; then
    restart_service "$service"
  fi
done

if [[ "$DRY_RUN" == "false" ]]; then
  echo
  echo "Browser automation preflight is ready."
  echo "You can inspect live logs with:"
  for service in "${ORDERED_SERVICES[@]}"; do
    if contains_service "$service"; then
      echo "  tmux attach -t $(service_session "$service")"
    fi
  done
fi
