# StarBI 智能问数验收测试用例

> 使用 playwright-cli 执行，codex:rescue 执行。按顺序逐条执行，用截图记录结果。

## 环境准备

```bash
# 确认三个服务全部运行
lsof -iTCP:8080 -sTCP:LISTEN || echo 'FRONTEND NOT RUNNING'
lsof -iTCP:8100 -sTCP:LISTEN || echo 'BACKEND NOT RUNNING'
lsof -iTCP:8000 -sTCP:LISTEN || echo 'SQLBOT NOT RUNNING'
```

## 测试用例

### TC-01: 登录

```bash
playwright-cli open "http://127.0.0.1:8080"
# 填写登录表单
playwright-cli fill e28 "admin"
playwright-cli fill e33 "DataEase@123456"
playwright-cli click e35
sleep 4
# 验证登录成功 — 工作台可见
playwright-cli snapshot | grep -E "工作台|智能问数"
# 预期：看到"工作台"和"智能问数"菜单项
# 截图：playwright-cli screenshot --filename=/tmp/tc01-login.png
```

### TC-02: 通用配置 — AI 模型配置页

```bash
# 通过管理员菜单进入系统设置→通用配置
playwright-cli click "管理员"
sleep 1
playwright-cli click "系统设置"
sleep 1
playwright-cli click "通用配置"
sleep 3
# 截图：playwright-cli screenshot --filename=/tmp/tc02-model-config.png
# 验证：
# - 页面标题"通用配置"
# - tab "AI 模型配置" 为选中态
# - "系统默认模型" 按钮
# - "添加模型" 按钮
playwright-cli snapshot | grep -E "通用配置|AI 模型|系统默认|添加模型"
```

### TC-03: 通用配置 — 术语配置页

```bash
playwright-cli click "术语配置"
sleep 2
playwright-cli screenshot --filename=/tmp/tc03-terminology.png
# 验证：
# - tab "术语配置" 选中
# - "搜索术语" 输入框
# - "批量导入" 按钮
# - "新建术语" 按钮
# - 表格列: 术语名称 / 术语描述 / 生效数据源 / 状态 / 创建时间 / 操作
playwright-cli snapshot | grep -E "术语配置|搜索术语|批量导入|新建术语|术语名称"
```

### TC-04: 通用配置 — SQL 示例库页

```bash
playwright-cli click "SQL 示例库"
sleep 2
playwright-cli screenshot --filename=/tmp/tc04-sql-examples.png
# 验证：
# - tab "SQL 示例库" 选中
# - "搜索问题" 输入框
# - "批量导入" 按钮
# - "添加示例 SQL" 按钮
# - 表格列: 问题描述 / 示例 SQL / 数据源 / 状态 / 创建时间 / 操作
playwright-cli snapshot | grep -E "SQL 示例库|搜索问题|批量导入|添加示例|问题描述"
```

### TC-05: 智能问数页面 — 验证 ScopeBar 集成

```bash
playwright-cli click "智能问数"
sleep 4
playwright-cli screenshot --filename=/tmp/tc05-smartquery.png
# 验证：
# - 页面上有聊天输入框
# - ScopeBar 组件存在（需要先选择分析主题后可见）
# - 数据集选择按钮可见
# - "今天想分析什么？" 提示文案
playwright-cli snapshot | grep -E "输入你的问题|今天想分析|数据集|数据分析助手"
```

### TC-06: 推理显性化组件验证（LLM 模型就绪后执行）

> 需要先配置 LLM 模型并设置为默认模型后再执行此用例

```bash
# 在聊天框输入问题
playwright-cli fill "输入你的问题" "本月各区域销售额Top5"
playwright-cli press "Enter"
sleep 8
playwright-cli screenshot --filename=/tmp/tc06-reasoning.png
# 验证三层信息架构：
# - 💡 问题理解摘要（默认展开）：时间范围、指标、维度、数据源
# - 📈 执行摘要（默认展开）：返回行数、耗时
# - 🔧 技术详情（默认折叠，点击展开）：SQL、执行步骤、模型
playwright-cli snapshot | grep -E "问题理解|执行摘要|技术详情|时间范围|指标|维度|SQL"
```

### TC-07: 推荐问题验证（LLM 模型就绪后执行）

```bash
# 在 TC-06 完成后立即检查
sleep 3
playwright-cli screenshot --filename=/tmp/tc07-recommend.png
# 验证：
# - 推荐问题列表渲染
# - 每张卡片 hover 高亮、右移、箭头渐显
playwright-cli snapshot | grep -E "推荐|问题|分析"
```

### TC-08: 控制台错误检查

```bash
playwright-cli console error
# 预期：仅有 favicon.ico 404 或完全无错误
# 不应有 Vue 组件加载失败错误
```

## 验收通过标准

| 编号 | 用例 | 必须通过 | 备注 |
|------|------|---------|------|
| TC-01 | 登录 | ✅ | |
| TC-02 | AI 模型配置 | ✅ | |
| TC-03 | 术语配置 | ✅ | |
| TC-04 | SQL 示例库 | ✅ | |
| TC-05 | 智能问数入口 | ✅ | |
| TC-06 | 推理显性化 | ⚠️ | 需配置 LLM 模型 |
| TC-07 | 推荐问题 | ⚠️ | 需配置 LLM 模型 |
| TC-08 | 控制台错误 | ✅ | 仅允许 favicon 404 |

## 截图收集

所有截图保存在 `/tmp/tc*.png`，执行完成后检查截图确认页面渲染正确。
