#!/usr/bin/env bash
#
# StarBI 离线发布包脚本。
#
# 这个脚本没有隐藏逻辑，只是把手工命令串起来：
# 1. 调用 build.sh export 构建并导出 Docker 镜像
# 2. 复制 docker-compose.yml、.env、config/
# 3. 生成远端 deploy.sh
# 4. 打成 releases/starbi-offline-*.tar.gz
#
# 如果不想用脚本，可以直接看：
# docs/deploy/x86-linux-offline-package.md

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PLATFORM="${PLATFORM:-linux/amd64}"
VERSION="${VERSION:-$(date +%Y%m%d-%H%M%S)}"
PACKAGE_NAME="starbi-offline-${VERSION}"
RELEASE_DIR="$ROOT_DIR/releases"
PACKAGE_DIR="$RELEASE_DIR/$PACKAGE_NAME"
PACKAGE_TAR="$RELEASE_DIR/${PACKAGE_NAME}.tar.gz"
SKIP_BUILD="${SKIP_BUILD:-false}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1" >&2
    exit 1
  fi
}

require_file() {
  if [[ ! -f "$1" ]]; then
    echo "Missing required file: $1" >&2
    exit 1
  fi
}

require_dir() {
  if [[ ! -d "$1" ]]; then
    echo "Missing required directory: $1" >&2
    exit 1
  fi
}

latest_image_archive() {
  local latest
  latest="$(ls -t "$ROOT_DIR"/docker-images/starbi-images-*.tar.gz 2>/dev/null | head -n 1 || true)"
  if [[ -z "$latest" ]]; then
    echo "No image archive found under docker-images/." >&2
    exit 1
  fi
  printf '%s\n' "$latest"
}

require_cmd docker
require_cmd tar
require_file "$ROOT_DIR/docker-compose.yml"
require_file "$ROOT_DIR/.env"
require_file "$ROOT_DIR/config/apisix/config.yaml"
require_file "$ROOT_DIR/config/dataease/application.yml"
require_file "$ROOT_DIR/Dockerfile.dataease"
require_file "$ROOT_DIR/Dockerfile.sqlbot"
require_dir "$ROOT_DIR/SQLBot/model/iic/nlp_gte_sentence-embedding_chinese-base"
require_file "$ROOT_DIR/SQLBot/model/iic/nlp_gte_sentence-embedding_chinese-base/pytorch_model.bin"

if [[ "$SKIP_BUILD" != "true" ]]; then
  PLATFORM="$PLATFORM" "$ROOT_DIR/build.sh" export
fi

IMAGE_ARCHIVE="$(latest_image_archive)"

rm -rf "$PACKAGE_DIR" "$PACKAGE_TAR"
mkdir -p "$PACKAGE_DIR/images" "$PACKAGE_DIR/config"

cp "$IMAGE_ARCHIVE" "$PACKAGE_DIR/images/"
cp "$ROOT_DIR/docker-compose.yml" "$PACKAGE_DIR/"
cp "$ROOT_DIR/.env" "$PACKAGE_DIR/.env"
cp -R "$ROOT_DIR/config/"* "$PACKAGE_DIR/config/"

cat > "$PACKAGE_DIR/deploy.sh" <<'EOF'
#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Missing docker compose plugin or docker-compose." >&2
    exit 1
  fi
}

set_env_value() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${value}|" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

if [[ -n "${STARBI_PUBLIC_URL:-}" ]]; then
  set_env_value STARBI_PUBLIC_URL "$STARBI_PUBLIC_URL"
fi

if [[ -n "${SQLBOT_CORS_ORIGINS:-}" ]]; then
  set_env_value SQLBOT_CORS_ORIGINS "$SQLBOT_CORS_ORIGINS"
elif [[ -n "${STARBI_PUBLIC_URL:-}" ]]; then
  set_env_value SQLBOT_CORS_ORIGINS "$STARBI_PUBLIC_URL"
fi

mkdir -p \
  /data/starbi/mysql \
  /data/starbi/redis \
  /data/starbi/postgres \
  /data/starbi/etcd \
  /data/starbi/apisix/logs \
  /data/starbi/dataease/logs \
  /data/starbi/dataease/cache \
  /data/starbi/dataease/static-resource \
  /data/starbi/dataease/exportData \
  /data/starbi/dataease/appearance \
  /data/starbi/dataease/plugin \
  /data/starbi/sqlbot/excel \
  /data/starbi/sqlbot/file \
  /data/starbi/sqlbot/images \
  /data/starbi/sqlbot/logs

IMAGE_ARCHIVE="$(ls -t images/starbi-images-*.tar.gz | head -n 1)"
echo "Loading images from ${IMAGE_ARCHIVE} ..."
gunzip -c "$IMAGE_ARCHIVE" | docker load

echo "Starting StarBI ..."
compose up -d --no-build

echo
compose ps
echo
echo "StarBI deploy command finished."
echo "Access URL: $(grep '^STARBI_PUBLIC_URL=' .env | cut -d= -f2-)"
EOF

chmod +x "$PACKAGE_DIR/deploy.sh"

cat > "$PACKAGE_DIR/README.md" <<EOF
# StarBI Offline Deployment

This package targets x86 Linux servers. It contains:

- Docker images: \`images/$(basename "$IMAGE_ARCHIVE")\`
- Compose file: \`docker-compose.yml\`
- Runtime config: \`config/\`
- Environment file: \`.env\`
- Remote deploy script: \`deploy.sh\`

The SQLBot embedding model is baked into \`starbi-sqlbot:latest\` under
\`/opt/sqlbot/models/embedding/iic/nlp_gte_sentence-embedding_chinese-base\`.
Runtime data directories such as MySQL, PostgreSQL, Redis, uploads, logs, and
exported files are not included in the package. Host-side bind mount directories
are created under \`/data/starbi/\` on the target server.

## Deploy

\`\`\`bash
mkdir -p /data/starbi
tar -xzf /data/starbi/${PACKAGE_NAME}.tar.gz -C /data/starbi --strip-components=1
cd /data/starbi
STARBI_PUBLIC_URL=http://SERVER_IP:9080 ./deploy.sh
\`\`\`

Only port \`9080\` needs to be exposed publicly by default. APISIX admin is bound to \`127.0.0.1:9180\`; SQLBot internal ports are exposed only inside the Docker network.
EOF

tar -czf "$PACKAGE_TAR" -C "$RELEASE_DIR" "$PACKAGE_NAME"

echo
echo "Offline package created:"
ls -lh "$PACKAGE_TAR"
echo
echo "Transfer example:"
echo "  ssh user@server 'mkdir -p /data/starbi'"
echo "  scp $PACKAGE_TAR user@server:/data/starbi/"
echo "  ssh user@server 'tar -xzf /data/starbi/$(basename "$PACKAGE_TAR") -C /data/starbi --strip-components=1 && cd /data/starbi && STARBI_PUBLIC_URL=http://SERVER_IP:9080 ./deploy.sh'"
