# X Platform Plugin

Official X API plugin for iPolloOS. This package is intentionally split by user workflow, not by raw API endpoint.

## Children

| Child tool | Runtime | Purpose |
| --- | --- | --- |
| `queryXContent` | execute/read | Look up an X user, read a user timeline, or run recent search. |
| `checkAccountUpdates` | trigger/polling | Check one account for new posts using saved state and return events. |

## Credentials

Set `bearerToken` in the toolset secret config. The first version uses public read endpoints and app bearer-token style access.

Optional config:

- `baseUrl`: defaults to `https://api.x.com`.
- `timeoutMs`: defaults to `15000`.
- `defaultMaxResults`: defaults to `10`.

## Trigger state

`checkAccountUpdates` reads `state_json` and writes `next_state_json`.

The state stores:

- `userId`
- `username`
- `lastPostId`
- `newestPostId`
- `checkedAt`

Events use `dedupeKey = x:post:{id}` so the platform can deduplicate notifications.

## Next capabilities

Action tools such as post, reply, delete, follow, and unfollow should be added as separate execute tools with `write` or `destructive` risk levels. They should use user-context OAuth tokens rather than app bearer-token read access.

Official references:

- https://docs.x.com/x-api/users/lookup/introduction
- https://docs.x.com/x-api/posts/timelines/introduction
- https://docs.x.com/x-api/posts/search/introduction
- https://docs.x.com/x-api/posts/manage-tweets/introduction
