# X Platform Plugin

Official X API plugin for iPolloOS. This package is intentionally split by user workflow, not by raw API endpoint.

## Children

| Child tool | Runtime | Purpose |
| --- | --- | --- |
| `accountXOverview` | execute/read | Query one or more accounts and return profile, recent posts, metrics, and links in one result. |
| `searchXPosts` | execute/read | Search latest, relevant, or high-engagement posts by keyword/topic/query syntax. |
| `getXTrends` | execute/read | Fetch official X trending topics by region. |
| `queryXContent` | execute/read | Look up an X user, read a user timeline, or run recent search. |
| `checkAccountUpdates` | trigger/polling | Check one or more accounts for new posts using saved per-account state and return events. |
| `publishXPost` | execute/write | Publish a new post or quote an existing post. |
| `replyXPost` | execute/write | Reply to a specific post. |
| `manageXPost` | execute/write | Delete, like, unlike, repost, or undo repost for a post. |
| `manageXFollow` | execute/write | Follow or unfollow a user by username. |

## Credentials

Set credentials in the toolset secret config:

- `bearerToken`: read token for lookup, search, timelines, and account monitors.
- `userAccessToken`: OAuth 2.0 user-context token, or OAuth 1.0a Access Token, for posting, replying, deleting, liking, reposting, following, and unfollowing.
- `userAccessTokenSecret`: OAuth 1.0a Access Token Secret. Leave empty when using OAuth 2.0.
- `consumerKey` and `consumerSecret`: OAuth 1.0a app credentials used to sign user-context write requests.

Internal defaults such as `baseUrl`, request timeout, and default result limits are intentionally not exposed as user-facing inputs.

User-facing inputs should stay business-oriented. Account operations use usernames; X user ids are resolved internally and stored only where useful for runtime state.

## Query behavior

- `accountXOverview`: accepts one or more usernames and combines profile lookup plus recent account posts.
- `searchXPosts`: supports latest, relevant, and high-engagement views. High-engagement is a local ranking over returned posts using public metrics.
- `getXTrends`: uses official Trends by WOEID through a region selector, so users do not need to know WOEID values.
- `queryXContent`: remains as the low-level query tool for explicit profile, timeline, or recent-search modes.

Recent search covers the last 7 days. Full-archive search is exposed in `searchXPosts` as a paid/eligible X API capability.

## Standard polling trigger

`checkAccountUpdates` is a standard iPolloOS polling trigger. The plugin declares the polling rule, but the main system owns scheduling, state persistence, event deduplication, and workflow dispatch.

Runtime flow:

1. Install or import this plugin.
2. The main system discovers `checkAccountUpdates` as `runtime.kind = trigger` and `trigger.type = polling`.
3. A user creates a Trigger Instance and sets `username`.
4. The default interval is 60 seconds. The minimum interval is also `60` seconds; users may increase it up to `86400` seconds.
5. For every run, the main system calls this tool once and passes the previously saved `state_json`.
6. The plugin checks xapi.to once, returns `events_json` and `next_state_json`, then exits.
7. The main system transparently stores `next_state_json`, deduplicates by `dedupeKey`, and dispatches downstream workflows.

Minimal trigger inputs:

- `username`: one X username, with or without `@`.
- `state_json`: previous state saved by the main system. Empty state initializes the baseline.
- `max_results`: defaults to `20`.
- `include_replies`: defaults to `false`.
- `include_retweets`: defaults to `false`.
- `initial_mode`: defaults to `baseline`.

State shape:

- `version`
- `userId`
- `username`
- `lastPostId`
- `newestPostId`
- `seenPostIds`
- `checkedAt`
- `lastSuccessAt`
- `lastError`

Events use `dedupeKey = x:{userId}:{postId}` and `eventType = x.post.created`.

Deprecated legacy internals:

- Runtime internal `XPollingService`
- Local `data/xPlatform_xapito/polling-state.json` as the official state source
- Pending outbox
- Active `X_HOOK_URL` delivery
- `X_POLLING_ENABLED`
- `X_POLLING_ACCOUNTS`
- `X_HOOK_ENABLED`
- `X_HOOK_URL`
- `X_HOOK_SECRET`

Only `X_BEARER_TOKEN`/`X_READ_TOKEN` and `X_API_BASE_URL=https://x.p.xapi.to` are needed for standard trigger execution when credentials are supplied through runtime environment instead of tool secret inputs.

## Action behavior

- `publishXPost`: requires post text; quote id is optional.
- `replyXPost`: requires target post id and reply text.
- `manageXPost`: requires action and target post id. The actor user id is resolved by `/2/users/me`.
- `manageXFollow`: requires action and target username. The target user id is resolved from the username.

These tools require X API user-context OAuth scopes appropriate to the selected action, such as `tweet.write`, `like.write`, `follows.write`, and `users.read`.

Official references:

- https://docs.x.com/x-api/users/lookup/introduction
- https://docs.x.com/x-api/posts/timelines/introduction
- https://docs.x.com/x-api/posts/search/introduction
- https://docs.x.com/x-api/posts/search-all-posts
- https://docs.x.com/x-api/posts/manage-tweets/introduction
- https://docs.x.com/x-api/posts/likes/introduction
- https://docs.x.com/x-api/posts/retweets/introduction
- https://docs.x.com/x-api/users/follows/introduction
- https://docs.x.com/x-api/trends/trends
