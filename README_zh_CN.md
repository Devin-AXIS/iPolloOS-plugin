# iPolloOS-plugin

[iPolloOS](https://github.com/Devin-AXIS/iPolloOS) 的**插件运行时**。主系统通过 HTTP 调用本服务；插件以版本化包装载，输入输出与工作流节点对齐。

**不是** Skill（提示词包），**也不是** MCP（薄协议连接）。插件是 **TypeScript + Zod + 可选 Worker 线程**：直连 API/数据库，把工作流字段交给下一节点，或由平台发布 HTML 页面。

## 和 Skill、MCP 的差别

| | Skill | MCP | iPolloOS-plugin |
| --- | --- | --- | --- |
| 运行方式 | 每轮由模型读说明 | 远程 MCP 工具 | **本仓库里的你的代码** |
| 性能 | 多占 token、结果随模型波动 | 多一跳网络与协议 | **直接执行**；重活走 `worker_threads` |
| 输入输出 | 无强制契约 | 依 MCP 工具定义 | **`config.ts` 声明**，挂到工作流节点 |
| 交付物 | 对话文字 | 多为 JSON | JSON + **`page_html` → `page_url`**，交互页 JSON 回灌 |
| 运维 | 改文档 | 起 MCP 服务 | **构建、版本、安装** 插件包；与主应用隔离 |

Skill 管「怎么想、何时用」。MCP 管「连哪个外部工具」。插件**干活**：少绕模型、延迟可控，可用 `lib/` 里的 Mongo/Redis/OSS。

## 插件能力模型

iPolloOS 插件按运行方式分为两类：

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

触发型插件用于长期监控、定时检查和外部事件接入。它描述一个可被平台调度或事件唤起的能力：

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

## 能力范围

插件运行时适合做平台型插件：一个插件包可以拆成多个子工具，同时共用认证、客户端、状态、限流和通用解析逻辑。

- 公用/查询工具：账号查询、历史搜索、内容详情、用户资料、统一格式化。
- 触发工具：定时轮询、游标监控、Webhook 接入、事件去重、交给后续工作流。
- 动作工具：发帖、回复、删除、关注、取关、创建任务、发送消息等写入操作。
- 展示工具：HTML 页面输出、聊天卡片、交互表单、工作流结果页面。

例如 X 平台插件不应该做成一个巨大的工具，而应该拆成查询/搜索、监控、动作等更符合用户使用方式的子工具；OAuth/API 客户端、限流、状态保存、翻译和推送衔接逻辑放在插件包的共享代码里。

## 配置键说明

### iPolloOS 主系统

| 键 | 含义 |
| --- | --- |
| `PLUGIN_BASE_URL` | 本服务地址（本地默认 `http://127.0.0.1:3004`） |
| `PLUGIN_TOKEN` | 请求插件服务时的 Bearer Token |

### 插件运行时（`runtime/.env.local`，从 `runtime/.env.template` 复制）

| 键 | 含义 |
| --- | --- |
| `PORT` | 监听端口，默认 `3004` |
| `HOSTNAME` | 绑定地址 |
| `AUTH_TOKEN` | 须与主系统 `PLUGIN_TOKEN` 相同 |
| `IPOLLOOS_BASE_URL` | 主系统地址（页面回调等） |
| `MONGODB_URI` | 插件需持久化时使用 |
| `REDIS_URL` | 缓存，键前缀 `ipolloos:` |
| `PAGE_RESOURCE_CENTER_PUBLISH_URL` | 页面发布接口（本地可空） |
| `PAGE_RESOURCE_CENTER_TOKEN` | 发布接口 Token |

### 插件包（`config.ts` / 工具返回值）

| 键 | 位置 | 含义 |
| --- | --- | --- |
| `toolDescription` | `defineTool({...})` | Agent 选工具时看到的说明 |
| `runtime.kind` | `defineTool({...})` | 插件能力类型：`execute` 或 `trigger` |
| `runtime.execute.riskLevel` | `defineTool({...})` | 执行型插件风险等级：`read`、`write`、`destructive` |
| `runtime.trigger` | `defineTool({...})` | 触发型插件的轮询/Webhook 元数据 |
| `inputs[].key` | `versionList[].inputs` | 工作流入参字段名 |
| `outputs[].key` | `versionList[].outputs` | 工作流出参字段名 |
| `page_html` | 工具返回 | 完整 HTML，由平台发布 |
| `page_url` | 出参（工具常留空） | 发布后由平台写入 |
| `page_cover` | 出参可选 | 聊天卡片用 JSON 字符串 |
| `interactive_html_result` | 交互类插件 | 用户表单 JSON 回工作流 |
| `system_error` | `FlowNodeOutputTypeEnum.error` | 结构化错误 |

工作流输入类型（`FlowNodeInputTypeEnum`）含 `selectDataset`、`selectApp`、`selectLLMModel` 等，与 iPolloOS 工作流一致。

## 目录

| 路径 | 作用 |
| --- | --- |
| `runtime/` | HTTP 服务：鉴权、加载、执行插件 |
| `lib/` | Mongo、Redis、对象存储、HTTP、日志 |
| `sdk/` | 插件作者类型 |
| `modules/tool/` | 加载、构建、打包 |
| `modules/tool/packages/` | 示例（`helloPage`、`htmlKitPlatform` 等） |
| `modules/tool/worker/` | 重计算放独立线程 |

## 运行时能力

- 工具独立运行
- 插件热插拔
- 插件版本管理
- SSE 流响应
- 执行型/触发型插件能力声明
- HTML 页面发布和聊天卡片
- 共享 Mongo、Redis、对象存储、HTTP、日志工具

## 快速启动

```bash
bun install
cp runtime/.env.template runtime/.env.local
# 在 runtime/.env.local 设置 AUTH_TOKEN
bun run dev
```

主系统配置：

```env
PLUGIN_BASE_URL=http://127.0.0.1:3004
PLUGIN_TOKEN=<与 runtime 的 AUTH_TOKEN 相同>
```

## 第一个插件

1. 复制 `modules/tool/packages/helloPage`。
2. 改 `config.ts`：`name`、`description`、`inputs`、`outputs`、`toolDescription`。
3. 实现 `src/index.ts`，用 Zod 校验。
4. 页面类返回 `page_html`；交互见 `htmlKitPlatform`。

## 文档

- [English README](./README.md)
- [中文开发规范](./dev_zh_CN.md)
- [Development specifications](./dev.md)
- [系统工具开发指南](https://doc.ipolloos.ai/docs/introduction/guide/plugins/dev_system_tool)
- [插件设计文档](https://doc.ipolloos.ai/docs/introduction/development/design/design_plugin)
