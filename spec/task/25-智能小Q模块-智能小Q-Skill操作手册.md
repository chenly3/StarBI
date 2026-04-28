# 第9点：智能小Q模块 - 智能小Q Skill操作手册

本点只聚焦官方手册页：`智能小Q Skill操作手册`（文档页显示发布时间 2026-03-27、最近修改 2026-04-03）。
[智能小Q Skill操作手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-open-skill-manual)

## 点位定义
`智能小Q Skill操作手册` 的定位是：把 Quick BI 的核心智能能力封装成可在外部 Agent 工具平台安装/调用的 Skill 包，形成“Quick BI 能力外接层”。它不是 BI 端操作教程，而是“跨工具接入与调用规范”。[智能小Q Skill操作手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-open-skill-manual)

## 这个点解决什么业务问题
- 解决“Quick BI 能力只能在 BI 内部使用”的问题，把问数/解读/报告/报表能力开放到外部 Agent 工作台。
- 解决“不同团队使用不同 AI 工具”的问题，手册给出多平台安装路径（悟空、QoderWork、ClaudeCode、OpenClaw）。
- 解决“外部 Agent 不理解企业报表结构”的问题，`小Q报表 Skill` 可基于仪表板 URL 自动生成专属查询 Skill。
- 解决“临时文件分析与企业沉淀数据分析割裂”的问题，手册把“直接上传文件可用”和“接入 Quick BI 数据资产需配置授权”分层写清。[智能小Q Skill操作手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-open-skill-manual)

## 核心功能能力
- 4 个核心 Skill：
- `quickbi-smartq-chat`（小Q问数）
- `quickbi-smartq-data-insight`（小Q解读）
- `quickbi-smartq-data-report`（小Q报告）
- `quickbi-smartq-dashboard`（小Q报表）
- 两类安装方式：`对话安装（推荐）` 与 `手动上传技能中心`。
- 多 Agent 平台安装指引：悟空、QoderWork、ClaudeCode、OpenClaw。
- 前置配置能力：支持在 Quick BI 控制台“一键复制 skill 配置”并发送到外部 Agent 工具完成接入。
- 各 Skill 的能力边界明确：
- 问数 Skill：自然语言问数据集，含推理、SQL、可视化输出。
- 解读 Skill：面向 Excel（`.xls/.xlsx`）深度解读。
- 报告 Skill：可结合文件与联网搜索生成分析报告并给在线链接。
- 报表 Skill：基于仪表板 URL 抽取组件与口径，生成专属查询 Skill。[智能小Q Skill操作手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-open-skill-manual)

## 典型使用场景
- 在外部 Agent 中直接调用 Quick BI 问数能力做即时数据问答。
- 上传 Excel/CSV/Word/PDF 文件做快速分析报告。
- 对指定仪表板生成专属 Skill，用于围绕该看板连续追问。
- 将 Quick BI 数据权限体系延伸到外部 Agent 的数据查询链路中。

## 适用角色
- 方案/售前：快速把 Quick BI 能力接到客户常用 Agent 工具里做演示。
- 数据平台管理员：负责安装、授权、配置复制与密钥治理。
- 业务分析人员：在外部 Agent 场景下直接消费问数/解读/报告能力。

## 关键使用路径
1. 从手册下载所需 Skill 包（或使用对话安装）。
2. 在目标 Agent 平台完成安装并验证“已启用/可用”。
3. 在 Quick BI 控制台执行“一键复制 skill 配置”并回填到 Agent 工具。
4. 按 Skill 类型发起调用：
- 问数/解读/报告：可先走上传文件路径快速起用。
- 报表 Skill：输入“生成该仪表板 skill + URL”创建专属 Skill 后再提问。

## 前置条件 / 权限要求 / 版本限制
- 重要安全前提：手册明确提示“不要分享含密钥信息的技能包”。
- 文件直传场景：手册写明“下载技能即可使用，7天内不限次数”。
- 若访问 Quick BI 沉淀数据资产：需先完成 Skill 配置，且可问数数据集范围受 Quick BI 已授权数据集约束。
- 报表 Skill 额外前提：需已购买 Quick BI 问数模块，且当前账号有问数数据集管理/授权能力。
- 首次调用报表 Skill 会提示填写配置信息（需先完成前置准备）。
以上均来自手册原文描述。[智能小Q Skill操作手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-open-skill-manual)

## 与上下游点位的关系
- 上游依赖：`通用配置`、权限授权、问数模块采购、数据集问数配置。
- 横向关系：该手册把我们前面拆过的 `小Q问数/解读/报告` 以 Skill 形式外化到第三方 Agent。
- 下游衔接：下一点 `Quick BI CLI 安装与使用指南` 是更偏命令行与自动化的接入方式；Skill 手册更偏“现成能力包安装与调用”。

## 限制与边界
- Skill 手册是“接入与调用规范”，不替代各模块的深度产品操作文档。
- 7天不限次数描述主要针对文件上传直用路径，不等同于所有企业数据接入场景都免配置或免权限。
- 报表 Skill 强依赖问数模块与授权条件，不满足前提会卡在可用性阶段。
- 多平台可安装不等于“零治理”，密钥与权限仍需组织侧统一管理。

## 售前 / 方案视角价值解读
- 这个点最大价值是“让 Quick BI 能力快速进入客户现有 AI 工具链”，显著降低试点门槛。
- 对 PoC 很友好：先用文件场景快速跑通，再逐步接入企业数据权限体系。
- 对企业落地的关键不是“会不会装”，而是“权限与密钥治理是否可控”；手册把这条红线写得很明确。
- 基于官方描述可推断：Skill 手册适合做“外部入口扩展”，而核心治理仍应留在 Quick BI 组织配置与权限体系内。

## 官方引用清单
1. [智能小Q Skill操作手册](https://help.aliyun.com/zh/quick-bi/user-guide/quick-bi-open-skill-manual)
