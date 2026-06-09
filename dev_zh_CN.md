# iPolloOS-plugin 开发文档

## 常用命令

### 安装依赖

```bash
bun install
```

### 构建

```bash
bun run build
```

### 运行

- 开发模式
```bash
bun run dev
```

在开发模式下，每次保存文件时，worker 将会被重新构建（热重载）。

- 生产模式（构建后）
```bash
bun run prod
```

## 开发

将 SDK 链接到 iPolloOS：

在 iPolloOS/packages/service 目录下：

```
pnpm link xxxx/iPolloOS-plugin/sdk
```

此命令不会更新 package.json 文件。

### 开发习惯

#### 1. 使用英文注释
在代码中，使用英文注释来解释代码的用途。

#### 2. 使用英文变量名
在某些插件中，为了兼容性，变量名可能不是英文。

新插件应该使用英文变量名。

#### 3. 编写测试用例

为插件编写测试用例。

我们使用 [vitest](https://vitest.dev) 进行测试。

#### 4. 尽量不使用变量(let, var), 使用 const

“不可变”以提高代码的可读性，并且可以避免变量因错误赋值导致的问题，也对 TS 提示有所好处。

#### 5. 尽量不使用 any

#### 6. 变量作用域

尽量使用更小的变量作用域。通常可以用如下两种方式：

1. 使用“块作用域”语法

```typescript
const foo = () => {
  {
    const bar = 1;
    console.log(bar); // 1
  }
  console.log(bar); // ReferenceError: bar is not defined
};
```

2. 使用 IIFE (Immediately Invoked Function Expression, 立即执行函数表达式)
如果某个结果需要导出到更大的作用域中，可以使用 IIFE 语法。

```typescript
const foo = () => {
  const bar = (()=>{
    const a = 1;
    const b = 2;
    return a + b;
  })();
  console.log(bar); // 3
  console.log(a); // ReferenceError: a is not defined
};
```

## 系统工具

### 插件能力类型

iPolloOS 插件按运行方式分为两类：执行型插件和触发型插件。

#### 执行型插件

执行型插件适合一次性调用场景。用户、Agent 或工作流传入参数，插件完成查询、生成、发送、发布、更新或删除等操作，然后返回结构化结果。

常见场景：

- 搜索、网页读取、数据库查询。
- 文件解析、格式转换、内容生成。
- 发送消息、创建任务、发布内容。
- 更新或删除外部系统里的资源。

执行型插件默认不需要声明 `runtime`。如果希望平台识别风险等级，可以在 `config.ts` 中增加可选声明：

```typescript
export default defineTool({
  name: {
    'zh-CN': '发送消息',
    en: 'Send message'
  },
  description: {
    'zh-CN': '向外部系统发送消息。',
    en: 'Send a message to an external service.'
  },
  runtime: {
    kind: 'execute',
    execute: {
      riskLevel: 'write',
      requireUserConfirmDefault: true,
      idempotencyKeyInput: 'requestId'
    }
  },
  versionList: [
    {
      value: '1.0.0',
      inputs: [],
      outputs: []
    }
  ]
});
```

风险等级建议：

- `read`：只读查询，不改变外部状态。
- `write`：创建、发送、更新。
- `destructive`：删除、取关、撤销等破坏性动作。

#### 触发型插件

触发型插件适合长期监控、定时检查和外部事件接入。它描述“什么时候检查、如何保存状态、如何输出新增事件”，平台可以基于这些元数据创建监控实例并触发后续工作流。

常见场景：

- 定时检查某个账号、关键词、仓库或数据源是否有新内容。
- 保存 `lastPostId`、`cursor`、`etag` 等状态，只返回增量事件。
- 接收 Webhook 回调，把外部事件转换成工作流输入。
- 监控到事件后进入翻译、筛选、推送或审批流程。

触发型插件在 `config.ts` 中声明 `runtime.trigger`：

```typescript
export default defineTool({
  name: {
    'zh-CN': '检查账号新增内容',
    en: 'Check account updates'
  },
  description: {
    'zh-CN': '按状态检查账号新增内容并返回事件。',
    en: 'Check account updates by state and return events.'
  },
  runtime: {
    kind: 'trigger',
    trigger: {
      type: 'polling',
      minIntervalSeconds: 60,
      defaultIntervalSeconds: 300,
      maxBatchEvents: 50,
      outputEventKey: 'events_json',
      outputStateKey: 'next_state_json',
      allowManualRun: true,
      allowAutoRun: true
    }
  },
  versionList: [
    {
      value: '1.0.0',
      inputs: [],
      outputs: [
        {
          key: 'events_json',
          label: '事件 JSON',
          valueType: WorkflowIOValueTypeEnum.string
        },
        {
          key: 'next_state_json',
          label: '下一次状态 JSON',
          valueType: WorkflowIOValueTypeEnum.string
        }
      ]
    }
  ]
});
```

触发型插件推荐输出：

- `events_json`：新增事件数组，事件里应包含稳定的 `dedupeKey`。
- `next_state_json`：下次运行需要使用的状态。
- `summary_markdown`：本次检查摘要，可选。
- `system_error`：错误信息，可选。

平台型插件可以同时包含执行型和触发型子工具。例如一个 X 平台工具集可以包含账号查询、内容搜索、监控检查和发帖/关注等多个子工具。

### 平台型插件拆分

当一个外部平台有很多能力时，建议按用户工作流拆分，而不是按 API 端点机械拆分。认证、客户端、限流、共享解析、翻译辅助、状态存储放在插件包共享代码里。

推荐拆分：

- 公用/查询子工具：账号查询、内容详情、时间线/历史搜索、关键词搜索、统一格式化。
- 触发子工具：定时监控检查、Webhook 事件接入、游标/状态更新、去重、事件批量输出。
- 动作子工具：发帖、回复、删除、关注、取关、创建任务、发送消息等会改变外部状态的操作。
- 需要展示时再加展示子工具：HTML 报告、审核页面、交互表单、结果卡片。

以 X 平台插件为例，查询和历史检索属于执行型只读工具；监控属于触发型工具；发帖、回复、关注、删除属于执行型动作工具，并根据风险声明为 `write` 或 `destructive`。

### 页面输出和聊天卡片

插件如果会生成一个单页 HTML，可以返回 `page_html`。平台在自动发布或资源中心模式下会写入 `page_url`，聊天端会把它渲染成可打开的页面卡片。

如果希望卡片更像插件自己的能力，而不是普通链接，可以额外返回 `page_cover`。它是一个 JSON 字符串，由插件开发者自己定义展示内容；平台只负责统一解析和渲染。

展示型页面可以只提供封面：

```json
{
  "title": "大象主题网站",
  "description": "包含首页 Hero、物种介绍和保护行动",
  "eyebrow": "网页",
  "coverImageUrl": "https://example.com/cover.png",
  "accentColor": "#0ea5e9",
  "actionLabel": "打开"
}
```

交互型页面可以提供核心字段，聊天卡片会直接露出已填值或待填写项，用户不用点进去才知道要补什么：

```json
{
  "title": "反馈收集",
  "description": "请补充本次体验反馈",
  "variant": "form",
  "status": "待填写",
  "actionLabel": "填写",
  "fields": [
    { "label": "姓名", "value": "张三", "required": true },
    { "label": "手机号", "placeholder": "待填写", "required": true },
    { "label": "反馈内容", "placeholder": "待填写" }
  ],
  "chips": ["反馈", "表单"]
}
```

约定字段：

- `title`、`description`、`eyebrow`：卡片标题、摘要和类型提示。
- `coverImageUrl`：展示型页面封面图；没有封面时聊天端会回退为标题式卡片。
- `accentColor`：十六进制主题色。
- `variant`：建议使用 `cover`、`summary`、`data`、`form`。
- `status`：卡片状态文案，例如“待填写”“已提交”。
- `actionLabel`：右下角操作文案。
- `fields`：核心字段预览，支持 `label`、`value`、`placeholder`、`required`、`type`。
- `chips`：短标签，用于展示页面类别或关键状态。

### 新增系统工具类型

modules/tool/type/tool.ts 下修改 `ToolTypeMap` 字段来增加类型枚举。

### 工具集/工具声明规则

1. 名字和描述至少包含中英文
2. 工具还包含包含`toolDescription`字段，用于给`LLM`的工具调用提示，`description`是给使用者看到。
3. 工具输入字段里也可以声明`toolDescription`，表示该字段可以由模型生成。

### toolDescription 声明规则

1. 工具的`toolDescription`，包含2个主体：服务商和工具功能。
2. input 字段的`toolDescription`，只需包含字段功能描述即可。

### 内置的工具函数

系统内置了一些工具函数可供调用，其目录位于 `modules/tool/utils` 下。
在代码中可以使用 `import { xxx } from '@/tool/utils'` 的方式引入。

下面是工具函数的列表：

- delay: 延时
- getErrText: 错误处理
- htmlTable2Md: html表格转markdown
- retryFn: 重试函数
- replaceSensitiveText: 替换敏感文本
- request: 请求函数
- GET: GET请求
- POST: POST请求
- PUT: PUT请求
- DELETE: DELETE请求
- PATCH: PATCH请求
- createHttpClient: 创建自定义的http客户端
- getNanoid: 生成唯一id
- uploadFile: 上传文件到 Minio 中
