#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
JAVA_HOME=${JAVA_HOME:-$(/usr/libexec/java_home -v 21)}
APP_JAR="$ROOT_DIR/core/core-backend/target/CoreApplication.jar"
APP_PORT=8100
LOCAL_DIR="$ROOT_DIR/../tmp/dataease-local"
SPRING_CONFIG_DIR="$LOCAL_DIR/spring"
LOG_DIR="$LOCAL_DIR/logs/dataease"
DE_HOME_DIR="$LOCAL_DIR/home/opt/dataease2.0"
DE_CONFIG_DIR="$DE_HOME_DIR/config"
DE_DATA_DIR="$DE_HOME_DIR/data"

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
mkdir -p \
  "$LOCAL_DIR/home" \
  "$SPRING_CONFIG_DIR" \
  "$LOG_DIR" \
  "$DE_CONFIG_DIR" \
  "$DE_DATA_DIR/static-resource" \
  "$DE_DATA_DIR/exportData" \
  "$DE_DATA_DIR/excel" \
  "$DE_DATA_DIR/report" \
  "$DE_DATA_DIR/font" \
  "$DE_DATA_DIR/i18n/custom" \
  "$DE_DATA_DIR/appearance" \
  "$DE_DATA_DIR/plugin" \
  "$DE_DATA_DIR/map" \
  "$DE_DATA_DIR/geo" \
  "$DE_HOME_DIR/cache" \
  "$DE_HOME_DIR/custom-drivers"

cat > "$DE_CONFIG_DIR/application.yml" <<EOF
base-path: \${user.home}/opt/dataease2.0
dataease:
  path:
    data: \${base-path}/data
    static-resource: \${base-path}/data/static-resource/
    exportData: \${base-path}/data/exportData/
    excel: \${base-path}/data/excel/
    report: \${base-path}/data/report/
    font: \${base-path}/data/font/
    i18n: file:\${base-path}/data/i18n/custom
    ehcache: \${base-path}/cache
    driver: $ROOT_DIR/drivers
    custom-drivers: \${base-path}/custom-drivers/
starbi:
  sqlbot:
    domain: \${STARBI_SQLBOT_DOMAIN:http://127.0.0.1:8000}
    assistant-id: \${STARBI_SQLBOT_ASSISTANT_ID:1}
    assistant-secret: \${STARBI_SQLBOT_ASSISTANT_SECRET:starbi-inner-assistant-secret}
    enabled: \${STARBI_SQLBOT_ENABLED:true}
EOF
cp "$DE_CONFIG_DIR/application.yml" "$SPRING_CONFIG_DIR/application.yml"
# Build/install the backend-shared Java sdk modules that core-backend depends on.
# This is part of the backend build chain, not frontend work.
JAVA_HOME="$JAVA_HOME" mvn -f sdk/pom.xml -DskipTests install

kill_old_backend
ensure_port_free "$APP_PORT" "DataEase backend"

cd "$ROOT_DIR/core/core-backend"
rm -rf "$ROOT_DIR/core/core-backend/target"
JAVA_HOME="$JAVA_HOME" mvn -DskipTests -Dmaven.antrun.skip=true package

exec "$JAVA_HOME/bin/java" \
  -Duser.home="$LOCAL_DIR/home" \
  -jar "$APP_JAR" \
  --spring.profiles.active=standalone \
  --spring.config.additional-location="file:$SPRING_CONFIG_DIR/" \
  --logging.file.path="$LOG_DIR"
