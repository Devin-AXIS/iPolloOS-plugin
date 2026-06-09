# iPolloOS-plugin

Plugin runtime for [iPolloOS](https://github.com/Devin-AXIS/iPolloOS). The main app calls this service over HTTP; plugins run here as versioned packages with typed inputs/outputs.

**Not** a prompt pack (Skill) or a thin protocol bridge (MCP). Plugins are **TypeScript + Zod + optional Worker threads**: call APIs and databases directly, return workflow fields the next node can use, or ship HTML pages the platform publishes.

## Why use a plugin instead of Skill or MCP

| | Skill | MCP | iPolloOS-plugin |
| --- | --- | --- | --- |
| Runs as | Model reads instructions each turn | Remote tool over MCP wire | **Your code** in this runtime |
| Speed | Extra tokens + interpretation | Network + schema round-trips | **Direct execution**; heavy work in `worker_threads` |
| I/O | None enforced | Tool-defined | **`config.ts` inputs/outputs** wired to workflow nodes |
| Delivery | Text in chat | Usually JSON | JSON **and** `page_html` → `page_url`, interactive form → JSON back |
| Ops | Edit markdown | Run MCP server | **Build, version, install** a package; isolate from main app |

Skill teaches *when* and *how* to think. MCP connects an existing tool. A plugin **does the work**: fewer model round-trips, predictable latency, access to Mongo/Redis/OSS helpers in `lib/`.

## Plugin Capability Model

iPolloOS plugins are organized into two runtime capability types:

### Execute Plugins

Execute plugins are invoked by users, Agents, or workflows. Each call runs once and returns once. They are suitable for most tool scenarios:

- Query external data: search, web reading, database queries, GitHub repository analysis.
- Generate content: images, videos, documents, HTML pages, and structured reports.
- Perform actions: send messages, create tasks, publish content, and update external systems.
- Process data: format conversion, file parsing, Markdown/HTML transformation.

Execute plugins can declare risk levels for confirmation, auditing, and permission governance:

- `read`: read-only queries.
- `write`: create, send, or update operations.
- `destructive`: delete, unfollow, revoke, or other destructive operations.

### Trigger Plugins

Trigger plugins are designed for long-running monitoring, scheduled checks, and external events. They describe capabilities that the platform can schedule or wake up from events:

- Scheduled polling: for example, checking an X account every 5 minutes for new posts.
- Stateful monitoring: for example, storing `lastPostId` or `cursor` and returning only new events.
- Webhook events: for example, receiving external callbacks and triggering workflows.
- Event dispatch: for example, sending new content into translation, filtering, and notification workflows.

Trigger plugins use `runtime.trigger` to declare polling/webhook type, schedule policy, state input/output, event output, dedupe keys, failure retry, and permissions. The platform can use this metadata to create monitoring instances, persist state, deduplicate events, and trigger downstream workflows.

The recommended trigger contract stays small:

- `schedule`: run interval, timeout, and jitter.
- `state`: where to read state and where to write next state.
- `event`: where to read events, how to dedupe, and max batch size.
- `delivery`: retry behavior, concurrency lock, and failure policy.
- `webhook`: path, auth, and signature metadata.
- `permissions`: whether manual and automatic runs are allowed.

A platform plugin can include both execute and trigger child tools. For example, an X platform plugin can contain:

```text
xPlatform/lookupAccount        execute: look up accounts
xPlatform/searchContent        execute: search content
xPlatform/checkWatch           trigger: check new content
xPlatform/manageAccountAction  execute: post, reply, follow, unfollow
```

## Capability scope

The runtime is designed for platform plugins that may include several child tools while sharing credentials, clients, state, and common parsers.

- Common/query tools: account lookup, historical search, content detail, user/profile lookup, and reusable normalization.
- Trigger tools: scheduled polling, cursor-based monitoring, webhook intake, dedupe, and event handoff to workflows.
- Action tools: post, reply, delete, follow, unfollow, create task, send message, and other write operations.
- Presentation tools: HTML page output, page cards, interactive forms, and workflow result pages.

For example, an X integration should not be one giant tool. It should expose user-friendly child tools for lookup/search, monitoring, and actions, while keeping OAuth/API clients, rate-limit handling, state storage, and translation/push handoff as shared package code.

## Configuration keys

### iPolloOS main app

| Key | Meaning |
| --- | --- |
| `PLUGIN_BASE_URL` | URL of this service (default dev: `http://127.0.0.1:3004`) |
| `PLUGIN_TOKEN` | Bearer token sent to the plugin runtime |

### Plugin runtime (`runtime/.env.local`, copy from `runtime/.env.template`)

| Key | Meaning |
| --- | --- |
| `PORT` | Listen port (default `3004`) |
| `HOSTNAME` | Bind address |
| `AUTH_TOKEN` | Must equal main app `PLUGIN_TOKEN` |
| `IPOLLOOS_BASE_URL` | Main app URL for callbacks from published pages |
| `MONGODB_URI` | Mongo when plugins need persistence |
| `REDIS_URL` | Redis cache prefix `ipolloos:` |
| `PAGE_RESOURCE_CENTER_PUBLISH_URL` | Page publish API (optional in local dev) |
| `PAGE_RESOURCE_CENTER_TOKEN` | Token for publish API |

### Plugin package (`config.ts` / tool outputs)

| Key | Where | Meaning |
| --- | --- | --- |
| `toolDescription` | `defineTool({...})` | What the Agent sees when choosing this tool |
| `runtime.kind` | `defineTool({...})` | Plugin capability type: `execute` or `trigger` |
| `runtime.execute.riskLevel` | `defineTool({...})` | Execute plugin risk level: `read`, `write`, or `destructive` |
| `runtime.trigger.type` | `defineTool({...})` | Trigger type: `polling` or `webhook` |
| `runtime.trigger.schedule` | `defineTool({...})` | Polling interval, timeout, and jitter |
| `runtime.trigger.state` | `defineTool({...})` | State input, state output, and state version |
| `runtime.trigger.event` | `defineTool({...})` | Event output, dedupe field, and event version |
| `runtime.trigger.delivery` | `defineTool({...})` | Retry, concurrency lock, and failure policy |
| `runtime.trigger.webhook` | `defineTool({...})` | Webhook path, auth, and signature metadata |
| `runtime.trigger.permissions` | `defineTool({...})` | Manual/automatic run permissions |
| `inputs[].key` | `versionList[].inputs` | Workflow input field names |
| `outputs[].key` | `versionList[].outputs` | Workflow output field names |
| `page_html` | Tool return / output | Full HTML; platform publishes it |
| `page_url` | Output (often empty from tool) | Filled by platform after publish |
| `page_cover` | Output optional | JSON string for chat card metadata |
| `interactive_html_result` | Interactive plugins | User form JSON returned to workflow |
| `system_error` | `FlowNodeOutputTypeEnum.error` | Structured error channel |

Workflow input types (`FlowNodeInputTypeEnum`) include `selectDataset`, `selectApp`, `selectLLMModel`, etc. — same contract as iPolloOS workflow nodes.

## Repo layout

| Path | Role |
| --- | --- |
| `runtime/` | HTTP service: auth, load plugins, execute |
| `lib/` | Mongo, Redis, S3/OSS, HTTP, logging |
| `sdk/` | Types for plugin authors |
| `modules/tool/` | Loader, builder, packager |
| `modules/tool/packages/` | Example plugins (`helloPage`, `htmlKitPlatform`, …) |
| `modules/tool/worker/` | CPU-heavy tasks off the main thread |

## Runtime features

- Independent tool execution
- Hot-swappable plugin packages
- Plugin version management
- SSE streaming responses
- Execute/trigger capability metadata
- HTML page publishing and chat cards
- Shared Mongo, Redis, object storage, HTTP, and logging helpers

## Quick start

```bash
bun install
cp runtime/.env.template runtime/.env.local
# set AUTH_TOKEN in runtime/.env.local
bun run dev
```

In iPolloOS:

```env
PLUGIN_BASE_URL=http://127.0.0.1:3004
PLUGIN_TOKEN=<same as runtime AUTH_TOKEN>
```

## First plugin

1. Copy `modules/tool/packages/helloPage`.
2. Edit `config.ts` — `name`, `description`, `inputs`, `outputs`, `toolDescription`.
3. Implement `src/index.ts`; validate with Zod.
4. Return `page_html` for pages; see `htmlKitPlatform` for interactive flows.

## Docs

- [中文 README](./README_zh_CN.md)
- [Development specifications](./dev.md)
- [中文开发规范](./dev_zh_CN.md)
- [System tool development guide](https://doc.ipolloos.ai/docs/introduction/guide/plugins/dev_system_tool)
- [Plugin design document](https://doc.ipolloos.ai/docs/introduction/development/design/design_plugin)
