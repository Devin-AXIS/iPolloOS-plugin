<div align="center">
<a href="https://ipolloos.ai/"><img src="https://github.com/labring/iPolloOS/raw/main/.github/imgs/logo.svg" width="120" height="120" alt="ipolloos logo"></a>

# iPolloOS-plugin

<p align="center">
  <a href="./README_zh_CN.md">简体中文</a> |
  <a href="./README.md">English</a>
</p>

[iPolloOS](https://github.com/labring/iPolloOS) is a knowledge-based platform built on the LLMs, offers a comprehensive suite of out-of-the-box capabilities such as data processing, RAG retrieval, and visual AI workflow orchestration, letting you easily develop and deploy complex question-answering systems without the need for extensive setup or configuration.

iPolloOS-plugin is the plugin framework and plugin repository for iPolloOS. It connects external services, internal system capabilities, and long-running monitoring capabilities to iPolloOS Agents and workflows.

Deeply **modularize** iPolloOS to achieve maximum **extensibility**.
</div>

## Plugin Capability Model

iPolloOS plugins are organized into two capability types:

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

Trigger plugins are designed for long-running monitoring, scheduled checks, and external events. Instead of only running once, they describe capabilities that the platform can schedule or wake up from events:

- Scheduled polling: for example, checking an X account every 5 minutes for new posts.
- Stateful monitoring: for example, storing `lastPostId` or `cursor` and returning only new events.
- Webhook events: for example, receiving external callbacks and triggering workflows.
- Event dispatch: for example, sending new content into translation, filtering, and notification workflows.

Trigger plugins use `runtime.trigger` to declare polling/webhook type, default intervals, event output keys, and state output keys. The platform can use this metadata to create monitoring instances, persist state, deduplicate events, and trigger downstream workflows.

A platform plugin can include both execute and trigger child tools. For example, an X platform plugin can contain:

```text
xPlatform/lookupAccount        execute: look up accounts
xPlatform/searchContent        execute: search content
xPlatform/checkWatch           trigger: check new content
xPlatform/manageAccountAction  execute: post, reply, follow, unfollow
```

## Expansion Modules

- [x] System Tools
- [x] App templates
- [ ] RAG Algorithm
- [ ] Agent Strategy
- [ ] Third-party Integration

## System Tool Features

- [x] Independent tool execution
- [ ] Hot-swappable plugins
- [ ] Secure and elegant secret configuration
- [ ] Visual debugging support
- [ ] Reverse invocation of iPolloOS
- [ ] Plugin version management
- [ ] SSE streaming response support
- [x] Execute/trigger plugin capability metadata
- [ ] Enhanced security policies

## Documentation & Development Guides

- [Plugin design document](https://doc.ipolloos.ai/docs/introduction/development/design/design_plugin)
- [System tool development guide](https://doc.ipolloos.ai/docs/introduction/guide/plugins/dev_system_tool)
- [Development Specifications](./dev.md)
