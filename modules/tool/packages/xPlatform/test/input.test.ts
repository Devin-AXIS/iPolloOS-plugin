import { describe, expect, test } from 'bun:test';
import { InputType as AccountOverviewInputType } from '../children/accountXOverview/src';
import { InputType as WatchInputType } from '../children/checkAccountUpdates/src';
import { InputType as TrendsInputType } from '../children/getXTrends/src';
import { InputType as FollowInputType } from '../children/manageXFollow/src';
import { InputType as PostManageInputType } from '../children/manageXPost/src';
import { InputType as PublishInputType } from '../children/publishXPost/src';
import { InputType as QueryInputType } from '../children/queryXContent/src';
import { InputType as ReplyInputType } from '../children/replyXPost/src';
import { InputType as SearchInputType } from '../children/searchXPosts/src';

const base = {
  bearerToken: 'test_bearer_token_123'
};

describe('X platform child inputs', () => {
  test('query and watch account inputs use username instead of visible user ids', () => {
    const queryInput = QueryInputType.parse({
      ...base,
      mode: 'user_posts',
      username: '@xdevelopers'
    });
    const watchInput = WatchInputType.parse({
      ...base,
      username: '@xdevelopers\n@openai'
    });

    expect(queryInput.username).toBe('@xdevelopers');
    expect('user_id' in queryInput).toBe(false);
    expect(watchInput.username).toBe('@xdevelopers\n@openai');
    expect('user_id' in watchInput).toBe(false);
  });

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

  test('action inputs only require visible business fields and user token', () => {
    const actionBase = {
      userAccessToken: 'xox_user_action_token'
    };

    expect(
      PublishInputType.parse({
        ...actionBase,
        text: 'hello'
      }).text
    ).toBe('hello');

    expect(
      ReplyInputType.parse({
        ...actionBase,
        reply_to_post_id: '100',
        text: 'reply'
      }).reply_to_post_id
    ).toBe('100');

    expect(
      PostManageInputType.parse({
        ...actionBase,
        action: 'like',
        post_id: '100'
      }).post_id
    ).toBe('100');

    const follow = FollowInputType.parse({
      ...actionBase,
      action: 'follow',
      target_username: '@xdevelopers'
    });
    expect(follow.target_username).toBe('@xdevelopers');
    expect('target_user_id' in follow).toBe(false);
  });

  test('scenario query inputs stay business-oriented', () => {
    const overview = AccountOverviewInputType.parse({
      ...base,
      username: '@xdevelopers @openai'
    });
    expect(overview.username).toBe('@xdevelopers @openai');

    const search = SearchInputType.parse({
      ...base,
      query: 'AI agent',
      view: 'hot',
      scope: 'recent'
    });
    expect(search.view).toBe('hot');
    expect(search.scope).toBe('recent');

    const trends = TrendsInputType.parse({
      ...base,
      region: 'worldwide',
      topic: 'ai'
    });
    expect(trends.region).toBe('worldwide');
    expect(trends.topic).toBe('ai');
  });
});
