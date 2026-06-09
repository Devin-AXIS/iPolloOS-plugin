<div align="center">
<a href="https://ipolloos.ai/"><img src="https://github.com/labring/iPolloOS/raw/main/.github/imgs/logo.svg" width="120" height="120" alt="ipolloos logo"></a>

# iPolloOS-plugin

<p align="center">
  <a href="./README_zh_CN.md">简体中文</a> |
  <a href="./README.md">English</a>
</p>

[iPolloOS](https://github.com/labring/iPolloOS) 是一个 AI Agent 构建平台，提供开箱即用的数据处理、模型调用等能力，同时可以通过 Flow 可视化进行工作流编排，从而实现复杂的应用场景！这个仓库是 iPolloOS 的插件系统，负责插件的管理以及将插件集成到 iPolloOS 系统中。

iPolloOS-plugin 是 iPolloOS 的插件框架与插件仓库，用于把外部服务、内部系统能力和长期监控能力接入 iPolloOS Agent 与工作流。

深度**模块化** iPolloOS 以实现最大的**可扩展性**。
</div>

## 插件能力模型

iPolloOS 插件按能力形态分为两类：

### 执行型插件

执行型插件由用户、Agent 或工作流主动调用，调用一次、执行一次、返回一次。它适合绝大多数工具场景：

- 查询外部数据：搜索、网页读取、数据库查询、GitHub 仓库分析。
- 生成内容：图片、视频、文档、HTML 页面、结构化报告。
- 执行动作：发送消息、创建任务、发布内容、更新外部系统。
- 数据处理：格式转换、文件解析、Markdown/HTML 转换。

执行型插件可以声明风险等级，方便平台做确认、审计和权限治理：

- `read`：只读查询。
- `write`：创建、发送、更新。
- `destructive`：删除、取关、撤销等破坏性动作。

### 触发型插件

触发型插件用于长期监控、定时检查和外部事件接入。它不只是“执行一次”，而是描述一个可被平台调度或事件唤起的能力：

- 定时轮询：例如每 5 分钟检查某个 X 账号是否有新内容。
- 状态型监控：例如保存 `lastPostId`、`cursor`，只返回新增事件。
- Webhook 事件：例如外部系统主动回调后触发工作流。
- 事件分发：例如发现新内容后进入翻译、筛选、推送工作流。

触发型插件通过 `runtime.trigger` 声明轮询/Webhook 类型、默认间隔、事件输出字段和状态输出字段。平台可以基于这些元数据创建监控实例、保存状态、去重事件并触发后续工作流。

一个平台型插件可以同时包含执行型和触发型子工具。例如 X 平台插件可以包含：

```text
xPlatform/lookupAccount        执行型：查询账号
xPlatform/searchContent        执行型：搜索内容
xPlatform/checkWatch           触发型：检查新增内容
xPlatform/manageAccountAction  执行型：发帖、回复、关注、取关
```

## 扩展模块

- [x]  系统工具
- [ ]  RAG 算法
- [ ]  Agent 策略
- [ ]  第三方接入

## 系统工具基础设施

- [x]  工具独立运行
- [x]  热插拔
- [x]  工具版本管理
- [x]  SSE 流响应
- [x]  执行型/触发型插件能力声明
- [ ]  更优雅的 Secret 配置
- [ ]  可视化调试
- [ ]  反向调用 iPolloOS
- [ ]  更多安全策略

## 文档

- [系统工具开发指南](https://doc.ipolloos.ai/docs/introduction/guide/plugins/dev_system_tool)
- [设计文档](https://doc.ipolloos.ai/docs/introduction/development/design/design_plugin)
- [开发规范](./dev_zh_CN.md)
