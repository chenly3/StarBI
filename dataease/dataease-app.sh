#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
JAVA_HOME=${JAVA_HOME:-$(/usr/libexec/java_home -v 21)}
APP_JAR="$ROOT_DIR/core/core-backend/target/CoreApplication.jar"
APP_PORT=8100

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

kill_old_backend() {
  local pids
  pids=$(ps ax -o pid=,command= -ww | grep "$APP_JAR\|CoreApplication.jar" | grep -v grep | awk '{print $1}' || true)
  if [[ -n "$pids" ]]; then
    echo "Stopping old DataEase backend process: $pids"
    kill $pids
    sleep 1
  fi
}

cd "$ROOT_DIR"
# Build/install the backend-shared Java sdk modules that core-backend depends on.
# This is part of the backend build chain, not frontend work.
JAVA_HOME="$JAVA_HOME" mvn -f sdk/pom.xml -DskipTests install

kill_old_backend
ensure_port_free "$APP_PORT" "DataEase backend"

cd "$ROOT_DIR/core/core-backend"
rm -rf "$ROOT_DIR/core/core-backend/target"
JAVA_HOME="$JAVA_HOME" mvn -DskipTests package

exec "$JAVA_HOME/bin/java" \
  -Duser.home="$ROOT_DIR/../tmp/dataease-local/home" \
  -jar "$APP_JAR" \
  --spring.profiles.active=standalone \
  --spring.config.additional-location="file:$ROOT_DIR/../tmp/dataease-local/spring/"
