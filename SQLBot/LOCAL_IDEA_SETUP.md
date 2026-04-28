# SQLBot IDEA 本地启动说明

## 1. 本地环境

- Python: `3.11.x`
- uv: 建议安装，用来创建虚拟环境和安装依赖
- Node.js: 建议 `20+`
- npm: 建议 `10+`
- PostgreSQL: `16`，并启用 `pgvector`
- Redis: 可选，本地开发默认可以先用内存缓存
- Embedding: 支持本地模型和 `vLLM(OpenAI兼容)` 服务

当前本机已可复用的服务：

- PostgreSQL / pgvector: `127.0.0.1:5433`
  - database: `sqlbot`
  - username: `root`
  - password: `1q1w1e1r`
  - extension: `vector`

## 2. 已准备好的本地配置

仓库根目录已经补好本地 `.env`：

- [SQLBot/.env](/Users/chenliyong/AI/github/StarBI/SQLBot/.env)

本地运行目录统一落到：

- [tmp/sqlbot-local](/Users/chenliyong/AI/github/StarBI/tmp/sqlbot-local)

这样后端运行时不会写系统 `/opt/sqlbot`，日志、上传文件、Excel、图片、模型目录都在仓库内。

当前本地 `.env` 默认已经切到 `vLLM gte-zh-base`：

- `EMBEDDING_ENABLED=true`
- `TABLE_EMBEDDING_ENABLED=true`
- `EMBEDDING_PROVIDER=vllm`
- `DEFAULT_EMBEDDING_MODEL=gte-zh-base`
- `VLLM_EMBEDDING_API_BASE=http://127.0.0.1:8001/v1`

如果你的 vLLM 不是这个端口，改 `VLLM_EMBEDDING_API_BASE` 即可。

## 3. IDEA 导入方式

建议把 `SQLBot` 当成一个前后端混合项目打开：

- 后端根目录: [SQLBot/backend](/Users/chenliyong/AI/github/StarBI/SQLBot/backend)
- 前端根目录: [SQLBot/frontend](/Users/chenliyong/AI/github/StarBI/SQLBot/frontend)

推荐设置：

- Python SDK: `3.11`
- Python interpreter: `SQLBot/backend/.venv/bin/python`
- Node interpreter: 本机 Node
- Package manager: `npm`

共享运行配置也已经放到工作区：

- [SQLBot Backend.run.xml](/Users/chenliyong/AI/github/StarBI/.run/SQLBot%20Backend.run.xml)
- [SQLBot Frontend.run.xml](/Users/chenliyong/AI/github/StarBI/.run/SQLBot%20Frontend.run.xml)

## 4. 后端运行方式

第一次安装依赖：

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
UV_CACHE_DIR=.uv-cache uv sync --no-dev --no-install-project --no-install-package sentence-transformers --no-install-package langchain-huggingface --no-install-package torch
```

启动后端：

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
.venv/bin/python main.py
```

默认不会开启 uvicorn 热重载，避免本地文件监听权限问题。如果要热重载，可以额外加：

```bash
SQLBOT_RELOAD=true .venv/bin/python main.py
```

后端默认地址：

- `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

关键入口：

- 启动文件: [backend/main.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/main.py)
- 配置文件: [backend/common/core/config.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/common/core/config.py)

## 5. 前端运行方式

第一次安装依赖：

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/frontend
npm install
```

启动前端：

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/frontend
npm run dev
```

前端默认地址：

- `http://localhost:5173`

前端开发环境变量：

- [frontend/.env.development](/Users/chenliyong/AI/github/StarBI/SQLBot/frontend/.env.development)

## 6. 最小本地启动顺序

1. 先确认 PostgreSQL/pgvector 已启动
2. 在 `backend` 执行 `uv sync`
3. 启动后端 `main.py`
4. 在 `frontend` 执行 `npm install`
5. 启动前端 `npm run dev`
6. 浏览器打开 `http://localhost:5173`

## 7. 需要注意

- SQLBot 后端强依赖 PostgreSQL，不适合直接用 MySQL 替代
- 数据库里需要 `vector` 扩展，当前本机 `5433` 已验证存在
- 当前工作区实际使用的是独立容器 `starbi-sqlbot-pgvector`，端口 `5433`
- Redis 在当前代码里是可选的，默认 `CACHE_TYPE=memory` 可以先不接 Redis
- 当前默认走 vLLM embedding 服务，如果你要切回本地模型，把 `.env` 里的 `EMBEDDING_PROVIDER` 改成 `local`
- 切回本地模型后，把模型文件放到 `tmp/sqlbot-local/models`，并补齐 `sentence-transformers`、`langchain-huggingface`、CPU 版 `torch`
- `MCP` 服务默认代码里是 `8001`，本地常规前后端调试先不需要单独起它
