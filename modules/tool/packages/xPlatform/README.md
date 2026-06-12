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
- `userAccessToken`: OAuth 2.0 user-context token for posting, replying, deleting, liking, reposting, following, and unfollowing.

Internal defaults such as `baseUrl`, request timeout, and default result limits are intentionally not exposed as user-facing inputs.

User-facing inputs should stay business-oriented. Account operations use usernames; X user ids are resolved internally and stored only where useful for runtime state.

## Query behavior

- `accountXOverview`: accepts one or more usernames and combines profile lookup plus recent account posts.
- `searchXPosts`: supports latest, relevant, and high-engagement views. High-engagement is a local ranking over returned posts using public metrics.
- `getXTrends`: uses official Trends by WOEID through a region selector, so users do not need to know WOEID values.
- `queryXContent`: remains as the low-level query tool for explicit profile, timeline, or recent-search modes.

Recent search covers the last 7 days. Full-archive search is exposed in `searchXPosts` as a paid/eligible X API capability.

## Trigger state

`checkAccountUpdates` accepts one username or a list of usernames separated by new lines, commas, semicolons, or spaces. It reads `state_json` and writes `next_state_json`.

The state stores per-account cursors:

- `accounts.{username}.userId`
- `accounts.{username}.username`
- `accounts.{username}.lastPostId`
- `accounts.{username}.newestPostId`
- `accounts.{username}.checkedAt`

Single-account legacy state is still accepted.

Events use `dedupeKey = x:post:{id}` so the platform can deduplicate notifications.

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
