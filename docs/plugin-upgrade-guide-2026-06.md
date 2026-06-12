# Plugin Upgrade Guide

This guide is for plugin developers upgrading existing iPolloOS plugins to the June 2026 plugin protocol.

## What changed

The plugin system now separates the internal build digest from the version shown to users.

- `version` is internal. It is generated from package content and is used for cache, equality checks, and update detection.
- `versionLabel` is user-facing. It comes from `versionList[0].value` in each plugin config.
- Toolsets aggregate child version labels. If child tools use `1.3.0`, `1.0.0`, and `1.2.0`, the parent toolset can show `1.3.0/1.0.0/1.2.0`.

## Required plugin checks

For every plugin package, check the following before publishing:

- Keep `toolId` stable. Changing it creates a new plugin identity.
- Keep child tool IDs stable inside toolsets.
- Set a clear `versionList[0].value`, such as `1.0.0`.
- Bump `versionList[0].value` whenever inputs, outputs, behavior, permissions, secrets, or published output format changes.
- Keep `name`, `description`, and `toolDescription` business-facing.
- Put API keys and service URLs in `secretInputConfig`; do not hardcode developer credentials.
- Keep output keys stable for running workflows.

## Import protocol

Import clients should support both protocols during migration.

Legacy:

```json
{
  "toolIds": ["examplePlatform"]
}
```

Preferred:

```json
{
  "toolIds": [
    {
      "pluginId": "examplePlatform",
      "version": "internal-digest",
      "versionLabel": "1.0.0",
      "etag": "optional-storage-etag"
    }
  ]
}
```

After confirmation, read the returned `tools` array and show `versionLabel` to users.

## Trigger plugins

Trigger plugins should declare trigger metadata instead of relying on hidden conventions.

Use `runtime.trigger` to describe:

- trigger type, such as polling or webhook
- default interval for polling
- event output keys
- state output keys
- deduplication cursor fields

The platform can then create monitor instances, persist state, deduplicate events, and dispatch downstream workflows.

## System secrets

Use `secretInputConfig` for resource-level secrets.

Recommended fields:

- API key
- API endpoint or base URL
- model or provider selector
- timeout and retry settings when needed

Do not require ordinary users to fill engineering-only values. Prefer safe defaults and only expose business-facing fields in the tool input schema.

## H5 and page publishing

For tools that publish HTML or H5 pages:

- return a complete single-file HTML document through `page_html` when the platform should publish it
- return `page_url` after publication when available
- avoid returning large HTML in chat-facing fields unless explicitly requested
- keep published assets on the configured OSS-compatible storage path
- keep fallback output non-empty so workflows do not fail silently

## Test checklist

Before publishing a plugin update:

```bash
bunx vitest run modules/tool/type/tool-runtime.test.ts
bun run build:runtime
```

For packages with their own tests, also run the package test files directly.

After import, verify:

- the plugin appears in the plugin list
- the version column shows `v1.0.0` style labels, not internal digests
- existing workflows can still open and run the plugin
- system secrets are still present after re-import
- H5 publishing returns a reachable page URL when the tool supports publishing
