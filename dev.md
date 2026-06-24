# iPolloOS-plugin Development Guide / 开发指南

This file is the short daily workflow guide. The complete architecture and operation manual is in [docs/plugin-framework.md](./docs/plugin-framework.md).

本文是日常开发速查。完整架构和运行说明见 [docs/plugin-framework.md](./docs/plugin-framework.md)。

## Commands / 命令

```bash
bun install
bun run test
bun run build:runtime
bun run build:pkg
bun run dev
```

## Local Runtime / 本地运行时

`bun run dev` starts the standalone plugin runtime from `runtime/`. iPolloOS main service calls this runtime through the configured plugin base URL.

`bun run dev` 会启动 `runtime/` 下的独立插件运行时。iPolloOS 主服务通过配置的插件基础地址调用它。

## New Tool Pattern / 新工具开发范式

Create a package under `modules/tool/packages/{platformName}`. Keep shared API clients, schemas, formatters, and auth helpers under `lib/`, then expose user-facing capabilities as child tools under `children/`.

在 `modules/tool/packages/{platformName}` 下创建插件包。公共 API client、schema、格式化和鉴权逻辑放在 `lib/`，面向用户的能力放在 `children/` 子工具中。

Use stable IDs and version labels:

使用稳定 ID 和版本号：

- Keep parent `toolId` stable.
- Keep child tool IDs stable.
- Bump `versionList[0].value` when inputs, outputs, behavior, secrets, permissions, or published formats change.
- Keep output keys stable for existing workflows.

## Runtime Declarations / Runtime 声明

Use `runtime.kind = "execute"` for one-shot calls. Set `riskLevel` when the tool can write or destroy external state.

一次性调用使用 `runtime.kind = "execute"`。如果工具会写入或破坏外部状态，需要设置 `riskLevel`。

Use `runtime.kind = "trigger"` for polling or webhook event sources. Trigger tools perform one check or one normalization pass; iPolloOS OS owns scheduling, state, dedupe, and workflow dispatch.

轮询或 Webhook 事件源使用 `runtime.kind = "trigger"`。触发工具只执行“一次检查”或“一次标准化”；调度、状态、去重和工作流启动由 iPolloOS OS 负责。

Required trigger outputs:

触发工具标准输出：

- `events_json`
- `next_state_json`
- optional `summary_markdown`
- optional `system_error`

## Test Checklist / 测试清单

Before publishing:

发布前检查：

- Run `bun run test`.
- Run targeted package tests when a package has its own `test/` directory.
- Run `bun run build:runtime`.
- Run `bun run build:pkg`.
- For trigger tools, verify empty events do not imply downstream work and duplicate `dedupeKey` values are stable.

## iPolloOS Main Service Boundary / 主服务边界

The plugin runtime executes plugin code. The iPolloOS main service owns import, marketplace metadata, workflow node definitions, Trigger Runtime instances, state, event inbox, and workflow dispatch.

插件运行时只执行插件代码。iPolloOS 主服务负责插件导入、市场元数据、工作流节点定义、Trigger Runtime 实例、状态、事件收件箱和工作流启动。

When plugin metadata changes, rebuild packages and refresh/import them in iPolloOS. When OS-side trigger/runtime contracts change, deploy the iPolloOS main service too.

当插件元数据变化时，需要重新构建插件包并在 iPolloOS 中刷新或导入。当 OS 侧 trigger/runtime 协议变化时，也需要部署 iPolloOS 主服务。
