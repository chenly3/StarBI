# 第10点：智能小Q问数 - Quick BI CLI 安装与使用指南

## 点位定义
- `Quick BI CLI` 是 Quick BI 的命令行工具，把 Quick BI OpenAPI 封装成可在 AI 原生平台或终端里直接调用的操作入口，定位是“自动化管理与治理层”，不是可视化页面替代品。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))

## 这个点解决什么业务问题
- 解决“组织/权限/资源操作都要点控制台，效率低”的问题，可通过自然语言或命令行批量执行。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))
- 解决“报表外嵌 Ticket 要人工维护”的问题，支持嵌入访问生命周期管理。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))
- 解决“审计和性能排查门槛高”的问题，把审计/分析能力下沉到 CLI 工作流。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))
- 解决“问数 Skill 与数据集授权衔接慢”的问题，可先用 CLI 快速完成问数权限管理，再衔接 Skill 问数。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))

## 核心功能能力
- 官方给出能力覆盖：组织管理、权限管理、资源管理、数据服务、嵌入分析、统计分析，共 `134` 个子命令。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))
- 命令参考页给出版本口径：`v0.1.0`，`20` 个命令、`134` 个子命令。([Quick BI CLI 命令参考手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-command-reference-manual))
- 支持在 Claude Code、OpenClaw、Qoderwork、QClaw、悟空等 AI 平台中调用。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))
- 安装后核心验证命令为 `quickbi --version` 与 `quickbi workspace list`。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide)、[AI 安装指南](https://quickbi-prod.oss-cn-beijing.aliyuncs.com/quickbi-cli/AI_INSTALLATION_GUIDE.md))

## 典型使用场景
- 报表快速外嵌并生成访问链接。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))
- 数据资产盘点、访问热度和性能审计。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))
- 新员工入职与批量成员权限管理。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))
- 问数数据集权限开通 + Skill 联动问数。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))

## 适用角色
- BI 平台管理员、数据治理管理员、组织权限管理员。
- 需要把 Quick BI 能力接入 AI Agent 工作流的方案/实施人员。

## 关键使用路径
- 第一步：在 AI 平台执行官方安装指令，按安装文档完成二进制安装。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide)、[AI 安装指南](https://quickbi-prod.oss-cn-beijing.aliyuncs.com/quickbi-cli/AI_INSTALLATION_GUIDE.md))
- 第二步：从 Quick BI 控制台头像入口获取“个人识别码/配置”，完成凭证配置。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))
- 第三步：按映射设置环境变量：`QUICKBI_ENDPOINT / QUICKBI_ACCESS_ID / QUICKBI_ACCESS_KEY`（可选 `QUICKBI_USER_ID`）。([AI 安装指南](https://quickbi-prod.oss-cn-beijing.aliyuncs.com/quickbi-cli/AI_INSTALLATION_GUIDE.md))
- 第四步：执行验证命令后，再进入具体业务命令或自然语言调用。([AI 安装指南](https://quickbi-prod.oss-cn-beijing.aliyuncs.com/quickbi-cli/AI_INSTALLATION_GUIDE.md)、[Quick BI CLI 命令参考手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-command-reference-manual))

## 前置条件 / 权限要求 / 版本限制
- 没有凭证不能正常调用 CLI（官方安装指南把凭证配置列为强制步骤）。([AI 安装指南](https://quickbi-prod.oss-cn-beijing.aliyuncs.com/quickbi-cli/AI_INSTALLATION_GUIDE.md))
- 问数类场景可用范围受 Quick BI 内已授权数据集权限约束。([智能小Q Skill操作手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-open-skill-manual))
- 当前公开文档版本口径为 `v0.1.0`。([Quick BI CLI 命令参考手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-command-reference-manual))

## 与上下游点位的关系
- 上游：承接上一点 `智能小Q Skill操作手册` 的外部调用能力。
- 下游：通过 `CLI 命令参考手册` 进入具体命令级落地。([Quick BI CLI 命令参考手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-command-reference-manual))
- 协同关系：CLI 负责“管理与授权自动化”，Skill 负责“对话式分析调用”，两者组合形成完整工作流。

## 限制与边界
- CLI 偏治理自动化，不替代可视化分析、报表设计本身。
- 凭证安全是硬边界，密钥泄露会直接带来权限风险。([智能小Q Skill操作手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-open-skill-manual))
- 文档中“典型应用”标题写“三大”，正文给了 4 个示例，属于文档口径小差异，实施时以实际可执行命令为准。([Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide))

## 售前 / 方案视角价值解读
- 这点的价值是把 Quick BI 从“可用”提升到“可自动化运营”：权限、资源、审计、嵌入都能进 Agent 工作流。
- 对企业客户最有价值的是“低代码自动化治理”，尤其适合多空间、多角色、频繁权限变更场景。
- 方案演示建议走闭环：`安装CLI -> 配凭证 -> 一条指令完成嵌入/审计/成员管理 -> 再用Skill问数`。

## 官方引用清单
1. [Quick BI CLI 安装与使用指南](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-installation-and-usage-guide)
2. [Quick BI CLI 命令参考手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-cli-command-reference-manual)
3. [AI 安装指南（官方链接）](https://quickbi-prod.oss-cn-beijing.aliyuncs.com/quickbi-cli/AI_INSTALLATION_GUIDE.md)
4. [智能小Q Skill操作手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-open-skill-manual)
