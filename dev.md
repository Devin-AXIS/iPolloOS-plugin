# iPolloOS-plugin Devlopment Document


## Common Commands

### install dependencies

```bash
bun install
```

### build

```bash
bun run build
```

### run

- dev mode
```bash
bun run dev
```

In dev mode, the worker will be rebuilt every time you save the file (hot reload).

- prod mode (after build)
```bash
bun run prod
```

## Development

Link the sdk to ipolloos:

under the iPolloOS/packages/service directory:

```
pnpm link xxxx/iPolloOS-plugin/sdk
```

This command will not update the package.json file.

## Plugin Capability Types

iPolloOS plugins are organized by runtime behavior into two types: execute plugins and trigger plugins.

### Execute Plugins

Execute plugins are suitable for one-shot calls. A user, Agent, or workflow passes inputs to the plugin; the plugin performs a query, generation, send, publish, update, or delete operation; then it returns structured outputs.

Common scenarios:

- Search, web reading, and database queries.
- File parsing, format conversion, and content generation.
- Message sending, task creation, and content publishing.
- Updating or deleting resources in external systems.

Execute plugins do not need to declare `runtime` by default. To let the platform understand risk level, add optional metadata in `config.ts`:

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

Recommended risk levels:

- `read`: read-only, does not change external state.
- `write`: creates, sends, or updates.
- `destructive`: deletes, unfollows, revokes, or performs other destructive actions.

### Trigger Plugins

Trigger plugins are suitable for long-running monitoring, scheduled checks, and external event intake. They describe when to check, how to persist state, and how to output new events. The platform can use this metadata to create monitoring instances and trigger downstream workflows.

Common scenarios:

- Periodically check whether an account, keyword, repository, or data source has new content.
- Persist `lastPostId`, `cursor`, `etag`, or similar state and return only incremental events.
- Receive webhook callbacks and convert external events into workflow inputs.
- Send monitored events into translation, filtering, notification, or approval workflows.

Trigger plugins declare `runtime.trigger` in `config.ts`:

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
          label: 'Events JSON',
          valueType: WorkflowIOValueTypeEnum.string
        },
        {
          key: 'next_state_json',
          label: 'Next state JSON',
          valueType: WorkflowIOValueTypeEnum.string
        }
      ]
    }
  ]
});
```

Recommended trigger outputs:

- `events_json`: an array of new events. Each event should include a stable `dedupeKey`.
- `next_state_json`: state for the next run.
- `summary_markdown`: optional run summary.
- `system_error`: optional error output.

A platform plugin can contain both execute and trigger child tools. For example, an X platform toolset can include account lookup, content search, watch checking, and post/follow actions.

### Platform Plugin Split

When one external platform has many capabilities, split it by user workflow instead of by API endpoint. Keep credentials, clients, rate-limit handling, shared parsers, translation helpers, and state storage in shared package code.

Recommended split:

- Common/query child tools: account lookup, content detail, timeline/history search, keyword search, and reusable normalization.
- Trigger child tools: scheduled watch checks, webhook event intake, cursor/state updates, dedupe, and event batch output.
- Action child tools: post, reply, delete, follow, unfollow, create task, send message, and other operations that change external state.
- Presentation child tools when needed: HTML reports, review pages, interactive forms, and result cards.

For an X platform plugin, this keeps the user-facing surface clear: search and historical lookup are execute/read tools, monitoring is a trigger tool, and post/reply/follow/delete are execute tools with `write` or `destructive` risk levels.

### Page Outputs and Chat Cards

If a plugin generates a single-page HTML result, return `page_html`. In auto-publish or resource-center mode, the platform writes `page_url`, and the chat client renders it as an openable page card.

To make the card feel like the plugin's own surface instead of a plain link, also return `page_cover`. It is a JSON string owned by the plugin developer. The platform only parses it and renders it with the common chat card style.

Display-only pages can provide just a cover:

```json
{
  "title": "Elephant Website",
  "description": "Hero section, species overview, and conservation actions",
  "eyebrow": "Web page",
  "coverImageUrl": "https://example.com/cover.png",
  "accentColor": "#0ea5e9",
  "actionLabel": "Open"
}
```

Interactive pages can expose core fields. The chat card will show filled values and missing fields before the user opens the page:

```json
{
  "title": "Feedback Form",
  "description": "Collect feedback for this session",
  "variant": "form",
  "status": "Needs input",
  "actionLabel": "Fill",
  "fields": [
    { "label": "Name", "value": "Alex", "required": true },
    { "label": "Phone", "placeholder": "To fill", "required": true },
    { "label": "Feedback", "placeholder": "To fill" }
  ],
  "chips": ["Feedback", "Form"]
}
```

Supported fields:

- `title`, `description`, `eyebrow`: title, summary, and type label.
- `coverImageUrl`: cover image for display pages. Without it, the chat client falls back to a title card.
- `accentColor`: hex theme color.
- `variant`: recommended values are `cover`, `summary`, `data`, and `form`.
- `status`: short card status, such as `Needs input` or `Submitted`.
- `actionLabel`: bottom-right action text.
- `fields`: field preview items with `label`, `value`, `placeholder`, `required`, and `type`.
- `chips`: short tags for category or state.

### Development Practices

#### 1. Use English comments
In the code, use English comments to explain the purpose of the code.

#### 2. Use English variable names
In some plugins, the variable names are not English for compatibility.

The new plugins should use English variable names.

#### 3. Wrtie Test Cases

Write test cases for the plugin.

We use [vitest](https://vitest.dev) for testing.

#### 4. Avoid Using Variables (let, var) as Much as Possible, Use const
"Immutable" variables improve code readability, help avoid issues caused by incorrect assignments, and are beneficial for TypeScript hints.

#### 5. Avoid Using any as Much as Possible

#### 6. Variable Scope
Try to use smaller variable scopes. Usually this can be done in two ways:

1. Use "block scope" syntax

```typescript
const foo = () => {
  {
    const bar = 1;
    console.log(bar); // 1
  }
  console.log(bar); // ReferenceError: bar is not defined
};
```

2. Use IIFE (Immediately Invoked Function Expression)
If a result needs to be exported to a larger scope, you can use IIFE syntax.

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

### System Built-in Utility Functions

The system has some built-in utility functions available under the directory `modules/tool/utils`.
You can import them in code using `import { xxx } from '@/tool/utils'`.

The list of utility functions includes:

- delay: delay
- getErrText: error handling
- htmlTable2Md: convert html table to markdown
- retryFn: retry function
- replaceSensitiveText: replace sensitive text
- request: request function
- GET: GET request
- POST: POST request
- PUT: PUT request
- DELETE: DELETE request
- PATCH: PATCH request
- createHttpClient: create custom http client
- getNanoid: generate unique id
- uploadFile: upload file to Minio
