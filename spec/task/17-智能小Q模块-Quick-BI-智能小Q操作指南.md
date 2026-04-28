# 第1点：智能小Q模块 - Quick BI 智能小Q操作指南

## 点位定义
`Quick BI 智能小Q操作指南` 不是某一个单独分析能力的说明页，而是整个智能小Q的统一入口说明页。它定义的是“超级聊天框 + Agent 路由 + 统一交互配置”的产品使用总控台：用户从这里进入，再被分发到问数、解读、报告、搭建、搜索或自定义智能体等能力中。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)、[Quick BI 智能小Q概述](https://help.aliyun.com/zh/quick-bi/user-guide/smartq)

## 这个点解决什么业务问题
它主要解决 3 类问题：
- 智能分析入口分散：把问数、解读、报告、搭建、搜索聚合到一个入口，减少用户在多个模块间切换的成本。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 业务人员不会判断“该用哪个AI功能”：系统可先识别意图，再自动路由到合适 Agent，降低使用门槛。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 临时数据、内部数据、外部知识无法统一协同：超级框支持上传附件、调用企业内数据能力，部分场景还支持联网搜索，使“提问-分析-产出”链路更短。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)

## 核心功能能力
- 统一入口：从 Quick BI 顶部导航栏进入智能小Q，所有智能分析都从同一个对话页发起。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 超级聊天框：支持直接提问、快捷提问、上传附件、模型选择、查看历史对话。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 附件分析：可上传本地文件，也可选择仪表板图表作为上下文输入，这说明它不是纯文本问答，而是“带业务对象上下文”的分析入口。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 智能意图识别：用户不必先选模块，系统可自动判断是要问数、解读、报告、搭建，还是路由到自定义智能体。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 指定Agent回答：如果用户已经明确目标，也可手动切换到小Q问数、小Q解读、小Q报告、小Q搭建、小Q搜索或自定义智能体。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 模型调度：支持“自动选择模型”，也支持改为手动选择系统内置大模型或自定义大模型，体现了产品在大模型层的可配置性。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 配额与使用可视化：左侧导航展示组织级 Token 额度和使用次数，说明智能小Q已被做成可运营、可计量的企业级能力，而不只是一个演示型 AI 助手。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)

## 典型使用场景
- 业务会前快速生成周报/月报，用于汇报材料准备。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 看到异常后，直接对仪表板做一键解读，再把结果加入报告。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 会中收到 Excel/csv 临时数据，马上发起问数分析。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 需要查找历史仪表板、报告或工作空间时，通过小Q搜索定位资源。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 企业已有自定义智能体时，直接从统一入口切换到行业/岗位助手继续分析。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)

## 适用角色
- 业务人员：最适合用统一入口直接提问、找报表、生成报告。
- 数据分析师：可把问数、解读、报告、搭建串成一条完整分析链。
- 管理者：更关注快速获得总结、洞察、汇报材料。
- 组织管理员：负责席位分配、增值模块采购和额度管理。[Quick BI 智能小Q概述](https://help.aliyun.com/zh/quick-bi/user-guide/smartq)

## 关键使用路径
- 进入入口：顶部导航栏进入 `智能小Q`。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 发起交互：直接输入问题，或用快捷提问，或输入 `/` 唤起提示词模板。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 补充上下文：上传本地文件或选择仪表板图表作为附件。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 选择执行方式：要么让系统自动识别意图并路由，要么手动指定具体 Agent。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 获取结果后继续流转：例如把解读结果或问数结果加入小Q报告，形成从分析到汇报的闭环。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)

## 前置条件 / 权限要求 / 版本限制
- 智能小Q属于增值模块，需要额外购买相应 Agent。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)、[Quick BI 智能小Q概述](https://help.aliyun.com/zh/quick-bi/user-guide/smartq)
- 仅 `高级版` 和 `专业版` 支持增购，`个人版` 不支持。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)、[Quick BI 智能小Q概述](https://help.aliyun.com/zh/quick-bi/user-guide/smartq)
- 至少拥有一个 Agent 权限，顶部导航栏才会显示 `智能小Q` 入口。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 购买后还需要组织管理员在成员管理中分配席位，否则成员无法使用 Agent 能力。[Quick BI 智能小Q概述](https://help.aliyun.com/zh/quick-bi/user-guide/smartq)

## 与上下游点位的关系
- 上游依赖：增购 Agent、管理员分配席位、数据集/仪表板/知识库/模型配置等基础条件。
- 下游承接：该页本身不展开每个能力的细操作，而是把用户继续引导到 `小Q问数`、`小Q解读`、`小Q报告`、`小Q搭建`、`小Q搜索`、`我的智能体` 等具体页面。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 产品定位上，它相当于智能小Q模块的“总入口页”与“交互分发页”，后续所有点位都可视为它的子能力展开。

## 限制与边界
- 这页解决的是“如何进入与调度”，不是每个 Agent 的深度操作手册；真正的问数、报告、搭建、解读能力，需要分别进入对应子页面继续看。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 联网搜索目前仅明确支持 `小Q报告`，不是所有能力都能联网取外部信息。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- `小Q搜索` 仅在超级框界面可用，左侧导航没有独立入口。[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
- 文档存在版本表述差异：目录页和概述页已把 `小Q洞察` 纳入正式模块，且概述页写的是 `5个Agent`；但当前操作指南正文仍沿用 `4个Agent` 口径，且功能清单里未把 `小Q洞察` 单独列入。这更像是文档更新节奏不一致，而不是产品能力不存在。这个差异需要在售前或方案说明中提前标注。[Quick BI 智能小Q目录](https://help.aliyun.com/zh/quick-bi/user-guide/intelligent/)、[Quick BI 智能小Q概述](https://help.aliyun.com/zh/quick-bi/user-guide/smartq)、[Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)

## 售前 / 方案视角价值解读
- 这个点最适合被包装成“统一 AI 数据分析工作台”，因为它把多个零散智能能力整合成一个可演示、可学习、可运营的前台入口。
- 对客户来说，它的价值不只是“多了几个 AI 功能”，而是把“找入口、选工具、组织上下文、输出结果”这几个碎片动作收敛成一次会话。
- 对企业落地来说，它更像智能 BI 的门户层：前面接用户自然语言，后面接不同 Agent、模型、数据资产和知识资产。
- 对售前演示来说，这个页面是最容易讲清产品故事的页面：统一入口、自动路由、附件分析、模型选择、额度运营、自定义智能体，一页基本就能把智能小Q的产品框架讲完整。

## 官方引用清单
1. [Quick BI 智能小Q目录](https://help.aliyun.com/zh/quick-bi/user-guide/intelligent/)
2. [Quick BI 智能小Q概述](https://help.aliyun.com/zh/quick-bi/user-guide/smartq)
3. [Quick BI 智能小Q操作指南](https://help.aliyun.com/zh/quick-bi/user-guide/smart-q-home-page)
