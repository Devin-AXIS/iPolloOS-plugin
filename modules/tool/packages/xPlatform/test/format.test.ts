import { describe, expect, test } from 'vitest';
import {
  formatPostsMarkdown,
  formatSourceLinksFromPosts,
  latestPostId,
  normalizePostEvents,
  parseWatchState
} from '../lib/format';

const response = {
  data: [
    {
      id: '101',
      text: 'Second post',
      author_id: '1',
      created_at: '2026-06-09T00:01:00Z'
    },
    {
      id: '100',
      text: 'First post',
      author_id: '1',
      created_at: '2026-06-09T00:00:00Z'
    }
  ],
  includes: {
    users: [
      {
        id: '1',
        username: 'xdevelopers',
        name: 'X Developers'
      }
    ]
  },
  meta: {
    result_count: 2
  }
};

describe('X platform formatters', () => {
  test('normalizes events with stable dedupe keys and URLs', () => {
    const events = normalizePostEvents(response);

    expect(events).toHaveLength(2);
    expect(events[0]?.dedupeKey).toBe('x:post:100');
    expect(events[0]?.url).toBe('https://x.com/xdevelopers/status/100');
  });

  test('formats markdown and source links', () => {
    const markdown = formatPostsMarkdown('X 结果', response);
    const links = formatSourceLinksFromPosts(response);

    expect(markdown).toContain('Second post');
    expect(links).toContain('https://x.com/xdevelopers/status/101');
  });

  test('parses watch state and finds latest post id', () => {
    const state = parseWatchState(
      '{"lastPostId":"99","accounts":{"xdevelopers":{"lastPostId":"98"}}}'
    );

    expect(state.lastPostId).toBe('99');
    expect(state.accounts?.xdevelopers?.lastPostId).toBe('98');
    expect(latestPostId(response.data, state.lastPostId)).toBe('101');
  });
});
