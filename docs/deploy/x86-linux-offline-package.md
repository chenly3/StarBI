# StarBI x86 Linux 离线部署命令

核心文件只有这几个：

- `Dockerfile.dataease`
- `Dockerfile.sqlbot`
- `docker-compose.yml`
- `.env`
- `config/`

脚本只是把下面这些命令串起来，不理解脚本也可以直接按命令执行。

## 1. 本地构建业务镜像

在本地 StarBI 工程目录执行：

```bash
cd /Users/chenliyong/AI/github/StarBI

docker buildx build --platform linux/amd64 --load \
  -f Dockerfile.dataease \
  -t starbi-dataease:latest .

docker buildx build --platform linux/amd64 --load \
  -f Dockerfile.sqlbot \
  -t starbi-sqlbot:latest .
```

如果本地是 Docker Desktop，并且构建日志显示使用 `docker-container:flamboyant_darwin` 后访问 Docker Hub 超时，可以指定本机 Docker builder：

```bash
BUILDX_BUILDER=desktop-linux docker buildx build --platform linux/amd64 --load \
  -f Dockerfile.dataease \
  -t starbi-dataease:latest .

BUILDX_BUILDER=desktop-linux docker buildx build --platform linux/amd64 --load \
  -f Dockerfile.sqlbot \
  -t starbi-sqlbot:latest .
```

`Dockerfile.dataease` 默认设置 `STARBI_VITE_LINT=false`，发布镜像构建时会跳过 Vite 打包阶段的 ESLint/Stylelint 扫描，只生成前端产物。需要强制打开 lint 时再加：

```bash
BUILDX_BUILDER=desktop-linux docker buildx build --platform linux/amd64 --load \
  --build-arg STARBI_VITE_LINT=true \
  -f Dockerfile.dataease \
  -t starbi-dataease:latest .
```

DataEase 镜像构建已经使用 Docker BuildKit Maven 缓存。前端小改后仍然需要重新执行 `npm run build:base` 和重新打 `CoreApplication.jar`，但 Maven 依赖不会每次都从远端重新拉，也不会再单独执行耗时的 `mvn dependency:go-offline` 预下载步骤。

SQLBot 镜像会把本地向量模型打进去，不需要远程服务器再下载模型：

```text
SQLBot/model/iic/nlp_gte_sentence-embedding_chinese-base
```

构建日志里如果看到下面这两层，说明正在复制并验证本地模型：

```text
COPY SQLBot/model/ /opt/sqlbot/models/embedding/
RUN test -f /opt/sqlbot/models/embedding/iic/nlp_gte_sentence-embedding_chinese-base/pytorch_model.bin ...
```

构建成功后先验证两个业务镜像和 SQLBot 本地向量模型：

```bash
docker images | grep -E 'starbi-dataease|starbi-sqlbot'

docker run --rm --entrypoint sh starbi-sqlbot:latest -c \
'ls -lh /opt/sqlbot/models/embedding/iic/nlp_gte_sentence-embedding_chinese-base/pytorch_model.bin && du -sh /opt/sqlbot/models'
```

这里应该能看到 `pytorch_model.bin`，大小约 `195M`。

## 2. 本地拉取运行依赖镜像

```bash
docker pull --platform linux/amd64 mysql:8.4
docker pull --platform linux/amd64 redis:7-alpine
docker pull --platform linux/amd64 pgvector/pgvector:pg17
docker pull --platform linux/amd64 bitnamilegacy/etcd:3.5.21-debian-12-r6
docker pull --platform linux/amd64 apache/apisix:3.14.1-debian
```

注意：不要使用 `bitnami/etcd:3.5`，这个 tag 不存在。这里统一使用：

```text
bitnamilegacy/etcd:3.5.21-debian-12-r6
```

如果你已经执行到这一步，并且这 5 个 `docker pull` 都成功了，下一步直接执行第 3 步。

## 3. 本地导出镜像包

```bash
mkdir -p docker-images

docker save --platform linux/amd64 \
  starbi-dataease:latest \
  starbi-sqlbot:latest \
  mysql:8.4 \
  redis:7-alpine \
  pgvector/pgvector:pg17 \
  bitnamilegacy/etcd:3.5.21-debian-12-r6 \
  apache/apisix:3.14.1-debian \
  | gzip > docker-images/starbi-images.tar.gz
```

导出后确认镜像包存在：

```bash
ls -lh docker-images/starbi-images.tar.gz
```

## 4. 本地准备远端部署文件包

```bash
mkdir -p releases/starbi-offline/images

cp docker-images/starbi-images.tar.gz releases/starbi-offline/images/
cp docker-compose.yml releases/starbi-offline/
cp .env releases/starbi-offline/
cp -R config releases/starbi-offline/

tar -czf releases/starbi-offline.tar.gz -C releases starbi-offline
```

确认最终离线包存在：

```bash
ls -lh releases/starbi-offline.tar.gz
```

## 5. 上传到远程服务器

```bash
ssh user@SERVER_IP 'mkdir -p /data/apps/starbi'
scp releases/starbi-offline.tar.gz user@SERVER_IP:/data/apps/starbi/
```

## 6. 远程服务器解压

```bash
ssh user@SERVER_IP

cd /data/apps/starbi
tar -xzf starbi-offline.tar.gz --strip-components=1
```

解压后 `/data/apps/starbi` 里应该有：

```text
docker-compose.yml
.env
config/
images/starbi-images.tar.gz
```

## 7. 远程服务器加载镜像

```bash
cd /data/apps/starbi
gunzip -c images/starbi-images.tar.gz | docker load
```

## 8. 远程服务器启动

先把 `.env` 里的访问地址改成服务器 IP：

```bash
sed -i 's|^STARBI_PUBLIC_URL=.*|STARBI_PUBLIC_URL=http://SERVER_IP:9080|' .env
sed -i 's|^SQLBOT_CORS_ORIGINS=.*|SQLBOT_CORS_ORIGINS=http://SERVER_IP:9080|' .env
grep -q '^STARBI_DATA_DIR=' .env || echo 'STARBI_DATA_DIR=/data/starbi' >> .env
```

然后启动：

```bash
docker compose up -d --no-build
```

确认服务状态：

```bash
docker compose ps
```

访问：

```text
http://SERVER_IP:9080
```

## 9. 常用命令

```bash
cd /data/apps/starbi

docker compose ps
docker compose logs -f starbi-dataease
docker compose logs -f starbi-sqlbot
docker compose stop
docker compose up -d --no-build
```

## 目录说明

离线包和 compose 文件放在：

```text
/data/apps/starbi
```

容器外持久化数据默认放在 `.env` 的 `STARBI_DATA_DIR`，默认值是：

```text
/data/starbi/mysql
/data/starbi/postgres
/data/starbi/redis
/data/starbi/etcd
/data/starbi/dataease
/data/starbi/sqlbot
/data/starbi/apisix
```

不要删除这些目录，删除就是清空运行数据。

## 可选一键脚本

如果不想手敲上面的命令，也可以执行：

```bash
./scripts/package-offline-release.sh
```

这个脚本做的事情就是：构建镜像、导出镜像、复制 `docker-compose.yml`、复制 `.env`、复制 `config/`、生成离线 tar 包。
