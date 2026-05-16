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
