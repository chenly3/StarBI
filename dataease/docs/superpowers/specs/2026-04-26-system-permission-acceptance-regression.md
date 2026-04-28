# 系统权限链路验收回归说明

## 目标

固化当前 DataEase 二开项目中系统设置权限链路的验收方法，覆盖用户、组织、菜单/路由、资源、行列权限以及智能问数最终取数效果。

本说明用于后续回归，不替代完整自动化测试框架。

## 覆盖范围

- 系统设置菜单与路由权限。
- 组织树上下文隔离。
- 数据集 `9001` 数据预览行列权限。
- SQLBot datasource 下发权限字段与行过滤 SQL。
- 智能问数 `admin` 与 `docs_demo` 真实取数对比。

## 测试账号

| 账号 | 密码 | 用户 ID | 组织 ID | 说明 |
| --- | --- | --- | --- | --- |
| `admin` | `DataEase@123456` | `1` | `1` | 系统管理员，全量可见。 |
| `docs_demo` | `DataEase@123456` | `102` | `210` | 文档演示用户，组织与行列权限受限。 |

## 测试数据

数据集：`9001`，名称：`公有云账单集合`。

SQLBot 真实执行表：`dataease10.substitute_dataset_9001`。

字段：

| 字段 | 说明 | admin | docs_demo |
| --- | --- | --- | --- |
| `cloud_type` | 云类型 | 可见 | 不可见 |
| `account` | 账号 | 可见 | 可见，预览脱敏 |
| `billing_period` | 账期 | 可见 | 不可见 |
| `product` | 产品 | 可见 | 可见 |
| `official_price` | 官网价 | 可见 | 可见 |
| `payable_amount` | 应付金额 | 可见 | 可见 |

当前种子数据共 24 行，账号汇总基准：

| 账号 | 行数 | 应付金额合计 |
| --- | ---: | ---: |
| `analyst_01` | 5 | 7090 |
| `docs_admin` | 5 | 11820 |
| `docs_demo` | 6 | 5540 |
| `finance_user` | 3 | 3800 |
| `ops_user` | 5 | 4860 |

## 接口回归脚本

执行命令：

```bash
bash tmp/system_permission_acceptance_regression.sh
```

脚本输出：

- `tmp/org-tree-admin.json`
- `tmp/org-tree-docs-demo.json`
- `tmp/dataset-9001-details-admin.json`
- `tmp/dataset-9001-details-docs-demo.json`
- `tmp/dataset-9001-preview-admin.json`
- `tmp/dataset-9001-preview-docs-demo.json`
- `tmp/sqlbot-datasource-9001-admin.json`
- `tmp/sqlbot-datasource-9001-docs-demo.json`
- `tmp/system-permission-acceptance-summary.json`
- `tmp/system-permission-acceptance-summary.md`

核心断言：

| 检查项 | 预期 |
| --- | --- |
| `admin` 组织树 | 多个根组织可见。 |
| `docs_demo` 组织树 | 只返回 `上海分公司(210)` 及子组织。 |
| `admin` 数据预览 | 24 行，6 字段。 |
| `docs_demo` 数据预览 | 6 行，4 字段：`账号 / 产品 / 官网价 / 应付金额`。 |
| `docs_demo` 数据预览脱敏 | 账号显示为 `d***o`。 |
| `admin` SQLBot datasource | 6 字段，无 `where account` 行过滤。 |
| `docs_demo` SQLBot datasource | 4 字段，SQL 包含 `where `account` = 'docs_demo'`。 |
| `docs_demo` SQLBot datasource | SQL 不包含隐藏字段 `cloud_type`、`billing_period`。 |

## 浏览器验收步骤

每次浏览器自动化验证前按工程习惯执行：

```bash
agent-browser close --all
```

如果改了 DataEase 后端：

```bash
./dataease-app.sh
```

如果改了 DataEase 前端：

```bash
./dataease-web.sh
```

如果 SQLBot 服务异常：

```bash
cd ../SQLBot && ./sqlbot-app.sh
```

验收路径：

1. 登录 `admin`。
2. 打开 `http://localhost:8080/#/sqlbotnew?datasetId=9001`。
3. 选择 `公有云账单集合`。
4. 输入 `按账号统计应付金额`。
5. 预期 `admin` 可看到全量数据结果，当前截图证据为 `tmp/sqlbot-admin-9001-expanded-result.png`。
6. 关闭浏览器会话，登录 `docs_demo`。
7. 同样打开 9001 并提交相同问题。
8. 预期 `docs_demo` 结果只出现 `docs_demo = 5540`，当前截图证据为 `tmp/sqlbot-docs-demo-9001-expanded-result.png`。

## 已验证结论

- 系统设置行列权限路由对普通用户生效，`docs_demo` 直接访问会被打回工作台。
- 组织树按当前组织上下文隔离。
- 数据预览层行列权限生效。
- SQLBot datasource 下发层字段过滤与行过滤 SQL 生效。
- 智能问数最终取数层行权限生效。
- 智能问数前端字段展示已改为使用 SQLBot runtime datasource 权限字段，避免非管理员看到隐藏字段后生成不可执行 SQL。

## 已知边界

- 当前脚本是本地验收脚本，不是 CI 级并发自动化测试。
- 浏览器截图依赖本地 `agent-browser`、DataEase 前端、DataEase 后端和 SQLBot 后端同时可用。
- `tmp/` 下截图是当前工程本地证据，重新验证会覆盖部分 JSON 输出。
