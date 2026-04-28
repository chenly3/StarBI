# SQLBot 本地向量模型说明

## 当前默认配置

SQLBot 当前已经切到本地向量模型模式：

- `EMBEDDING_PROVIDER=local`
- `DEFAULT_EMBEDDING_MODEL=iic/nlp_gte_sentence-embedding_chinese-base`

配置文件：
[.env](/Users/chenliyong/AI/github/StarBI/SQLBot/.env)

## 本地模型目录

当前默认本地模型目录：

- `/Users/chenliyong/AI/github/StarBI/tmp/sqlbot-local/models/embedding/iic/nlp_gte_sentence-embedding_chinese-base`

SQLBot 启动时会自动从这里解析 embedding 模型。

## 启动方式

直接启动：

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot
./sqlbot-app.sh
```

现在启动脚本会自动：

1. 保留本地 embedding 依赖
2. 检查本地向量模型是否存在
3. 实际加载模型并跑一次向量化
4. 验证通过后再启动 SQLBot

## 手动自检

如果你只想单独验证本地向量模型，可执行：

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
./.venv/bin/python scripts/check_local_embedding.py
```

正常情况下会看到：

- `EMBEDDING_PROVIDER = local`
- `MODEL_DIR_EXISTS = True`
- `VECTOR_DIM = 768`

## 关键代码位置

- 启动脚本：
  [sqlbot-app.sh](/Users/chenliyong/AI/github/StarBI/SQLBot/sqlbot-app.sh)
- 本地模型解析：
  [backend/apps/ai_model/embedding.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/ai_model/embedding.py)
- 自检脚本：
  [backend/scripts/check_local_embedding.py](/Users/chenliyong/AI/github/StarBI/SQLBot/backend/scripts/check_local_embedding.py)

## 当前结论

当前本地向量模型已经：

- 下载完成
- 依赖安装完成
- 启动前自动校验完成
- 实际问数链路验证通过
