#!/usr/bin/env bash
# ============================================================
# StarBI 镜像构建脚本
#
# 这个脚本只是按顺序执行这些命令：
# 1. docker buildx build -f Dockerfile.dataease ...
# 2. docker buildx build -f Dockerfile.sqlbot ...
# 3. export 时 docker pull 运行依赖镜像
# 4. export 时 docker save ... | gzip > docker-images/*.tar.gz
#
# 用法:
#   ./build.sh          # 构建镜像
#   ./build.sh export   # 构建并导出为 tar.gz，用于 SCP 传输
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

IMAGES=(
  "starbi-dataease:latest"
  "starbi-sqlbot:latest"
)
RUNTIME_IMAGES=(
  "mysql:8.4"
  "redis:7-alpine"
  "pgvector/pgvector:pg17"
  "bitnamilegacy/etcd:3.5.21-debian-12-r6"
  "apache/apisix:3.14.1-debian"
)
PLATFORM="${PLATFORM:-linux/amd64}"
EXPORT_DIR="./docker-images"
EXPORT_FILE="starbi-images-$(date +%Y%m%d-%H%M%S).tar.gz"

build_images() {
  echo "========================================="
  echo "  StarBI - 构建 DataEase 镜像 ($PLATFORM)"
  echo "========================================="
  docker buildx build --platform "$PLATFORM" --load -f Dockerfile.dataease -t starbi-dataease:latest .

  echo ""
  echo "========================================="
  echo "  StarBI - 构建 SQLBot 镜像 ($PLATFORM)"
  echo "========================================="
  docker buildx build --platform "$PLATFORM" --load -f Dockerfile.sqlbot -t starbi-sqlbot:latest .

  echo ""
  echo "构建完成!"
  docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep starbi
  echo ""
}

pull_runtime_images() {
  echo "========================================="
  echo "  StarBI - 拉取运行时依赖镜像 ($PLATFORM)"
  echo "========================================="
  for img in "${RUNTIME_IMAGES[@]}"; do
    echo "  拉取 $img ..."
    docker pull --platform "$PLATFORM" "$img"
  done
  echo ""
}

export_images() {
  mkdir -p "$EXPORT_DIR"
  pull_runtime_images

  echo "导出镜像到 $EXPORT_DIR/$EXPORT_FILE ..."
  for img in "${IMAGES[@]}" "${RUNTIME_IMAGES[@]}"; do
    echo "  保存 $img ..."
  done

  docker save --platform "$PLATFORM" "${IMAGES[@]}" "${RUNTIME_IMAGES[@]}" | gzip > "$EXPORT_DIR/$EXPORT_FILE"

  echo ""
  echo "导出完成: $EXPORT_DIR/$EXPORT_FILE"
  ls -lh "$EXPORT_DIR/$EXPORT_FILE"
  echo ""
  echo "========================================="
  echo "  传输到远程服务器:"
  echo "  ssh user@remote 'mkdir -p /data/app/starbi'"
  echo "  scp $EXPORT_DIR/$EXPORT_FILE user@remote:/data/app/starbi/"
  echo ""
  echo "  远程服务器部署:"
  echo "  ssh user@remote"
  echo "  cd /data/app/starbi"
  echo "  gunzip -c $EXPORT_FILE | docker load"
  echo "  docker compose up -d --no-build"
  echo "========================================="
}

build_images

if [[ "${1:-}" == "export" ]]; then
  export_images
fi
