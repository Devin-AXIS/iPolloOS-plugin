import { describe, expect, test } from 'bun:test';
import { InputType as WatchInputType } from '../children/checkAccountUpdates/src';
import { InputType as QueryInputType } from '../children/queryXContent/src';

const base = {
  bearerToken: 'test_bearer_token_123'
};

describe('X platform child inputs', () => {
  test('parses query boolean switches from strings', () => {
    const input = QueryInputType.parse({
      ...base,
      mode: 'user_posts',
      username: 'xdevelopers',
      include_replies: 'false',
      include_retweets: 'false'
    });

    expect(input.include_replies).toBe(false);
    expect(input.include_retweets).toBe(false);
  });

  test('parses watch boolean switches from strings', () => {
    const input = WatchInputType.parse({
      ...base,
      username: 'xdevelopers',
      include_replies: 'true',
      include_retweets: 'false'
    });

    expect(input.include_replies).toBe(true);
    expect(input.include_retweets).toBe(false);
  });
});
