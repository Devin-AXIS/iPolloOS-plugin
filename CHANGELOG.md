# Changelog

## 2026-06-13

### Plugin registry and import flow

- Added user-facing plugin version labels through `versionLabel`.
- Kept `version` as an internal build digest for cache and equality checks.
- Toolsets now expose a combined version label from their child tools, for example `1.3.0/1.0.0/1.2.0`.
- Upload confirmation now accepts both the legacy string list and the structured form:

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

- Upload confirmation returns confirmed plugin metadata so the caller can show the imported version immediately.
- Re-importing a package is now idempotent when the final entry file already exists but the temporary entry file has already been moved.
- Plugin list responses include version labels from package metadata instead of exposing internal digests to users.

### Runtime and security

- Added request-body redaction for token, secret, and authorization fields in tool-run logs.
- Cache rebuild after plugin mutation now waits longer and returns the rebuilt tool map when available.
- Storage now exposes an existence check used by the safe re-import path.

### Mobile AI service app

- `mobileAiServicePlatform` now supports configurable iPolloOS/OpenAI-compatible app endpoints.
- Resource settings can provide `ai_app_key` and `ai_app_url`; built-in defaults remain available.
- The mobile HTML app tool now accepts business-facing inputs and generates the complete single-file mobile HTML through the configured app endpoint.
- If the upstream app returns an empty or failed response, the tool returns a local fallback page so the publish output is not empty.

### Publishing and storage

- HTML publishing keeps returning `page_html` for platform publishing and `page_url` after publication.
- Existing OSS-compatible storage configuration remains the preferred production path for published H5 pages and plugin package files.

### Compatibility

- Existing plugin packages that only send `toolIds: string[]` still import.
- Existing system-key resource settings continue to work.
- Existing plugin IDs remain stable; no package needs to be renamed for this update.
