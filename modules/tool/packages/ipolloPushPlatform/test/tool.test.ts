import { afterEach, describe, expect, it, vi } from 'vitest';
import { FlowNodeInputTypeEnum } from '@tool/type/ipolloos';
import parentConfig from '../config';
import config from '../children/send_ipollo_push/config';
import { tool as sendIPolloPush } from '../children/send_ipollo_push/src';

describe('ipolloPushPlatform', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('describes push delivery as subscription-layer delivery instead of chat delivery', () => {
    expect(parentConfig.description['zh-CN']).toContain('订阅层');
    expect(parentConfig.toolDescription).toContain('订阅/监控层');
    expect(parentConfig.toolDescription).not.toContain('聊天');
  });

  it('keeps hook_url hidden and exposes app_card_json as a hidden reference input', () => {
    const inputs = config.versionList[0].inputs;
    const hookUrl = inputs.find((item) => item.key === 'hook_url');
    const applicationId = inputs.find((item) => item.key === 'application_id');
    const text = inputs.find((item) => item.key === 'text');
    const pushContent = inputs.find((item) => item.key === 'push_content');
    const monitorObject = inputs.find((item) => item.key === 'monitor_object');
    const monitorObjectName = inputs.find((item) => item.key === 'monitor_object_name');
    const aiSummary = inputs.find((item) => item.key === 'ai_summary');
    const appCard = inputs.find((item) => item.key === 'app_card_json');

    expect(config.versionList[0].value).toBe('1.2.1');
    expect(hookUrl?.required).toBeUndefined();
    expect(hookUrl?.renderTypeList[0]).toBe(FlowNodeInputTypeEnum.hidden);
    expect(applicationId?.renderTypeList).toEqual([FlowNodeInputTypeEnum.hidden]);
    expect(text).toBeUndefined();
    expect(pushContent?.label).toBe('监控内容');
    expect(pushContent?.renderTypeList).toEqual([
      FlowNodeInputTypeEnum.reference,
      FlowNodeInputTypeEnum.textarea
    ]);
    expect(monitorObject?.renderTypeList).toEqual([
      FlowNodeInputTypeEnum.reference,
      FlowNodeInputTypeEnum.input
    ]);
    expect(monitorObject?.label).toBe('监控对象名称');
    expect(monitorObjectName?.renderTypeList).toEqual([
      FlowNodeInputTypeEnum.hidden,
      FlowNodeInputTypeEnum.reference
    ]);
    expect(aiSummary?.renderTypeList).toEqual([
      FlowNodeInputTypeEnum.reference,
      FlowNodeInputTypeEnum.textarea
    ]);
    expect(appCard?.renderTypeList).toEqual([
      FlowNodeInputTypeEnum.hidden,
      FlowNodeInputTypeEnum.reference
    ]);
  });

  it('sends native app card payload through the internal App push API', async () => {
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            eventId: 'evt-1',
            matchedUserCount: 1,
            deliveredCount: 1,
            skippedCount: 0
          }),
          { status: 200 }
        )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const card = {
      id: 'market-monitor-event:tsla',
      componentName: 'MarketMonitorEventCard',
      data: {
        kind: 'monitor_event',
        target: { targetType: 'ticker', targetKey: 'TSLA', name: 'Tesla' },
        changeSummary: '盘前波动放大',
        aiBlocks: [{ title: 'AI 判断', content: '需要跟踪成交量确认。' }],
        eventTime: '2026-06-29T00:00:00.000Z'
      }
    };

    const result = await sendIPolloPush(
      {
        title: 'Tesla 监控更新',
        summary: '盘前波动放大',
        text: 'Tesla 盘前波动放大，需要跟踪成交量确认。',
        app_card_json: JSON.stringify(card)
      },
      {
        systemVar: {
          app: {
            id: 'fastgpt-app-1',
            name: 'Market Agent',
            applicationId: 'aino-app-1',
            appBotId: 'aino-bot-1'
          },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User',
            appUserId: 'app-user-1'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      'https://aino.example.com/api/ai/agent/push-events?applicationId=aino-app-1'
    );
    expect((init?.headers as Record<string, string>)['x-current-user-id']).toBe('app-user-1');
    const body = JSON.parse(String(init?.body));
    expect(body.agentId).toBe('aino-bot-1');
    expect(body.text).toBe('本次监控内容已更新，查看卡片获取摘要和变化。');
    expect(body.deliveryMode).toBe('subscription_only');
    expect(body.delivery_mode).toBe('subscription_only');
    expect(body.appCard.componentName).toBe('MarketMonitorEventCard');
    expect(body.appCard.data.monitorObject).toBe('Tesla');
    expect(body.appCard.data.monitorObjectName).toBe('Tesla');
    expect(body.appCard.data.changeContent).toBe('Tesla 盘前波动放大，需要跟踪成交量确认。');
    expect(body.payload.deliveryMode).toBe('subscription_only');
    expect(body.payload.delivery_mode).toBe('subscription_only');
    expect(body.payload.app_card).toEqual(body.appCard);
  });

  it('marks legacy hook pushes as subscription-only delivery', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, eventId: 'evt-legacy' }), { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendIPolloPush(
      {
        hook_url: 'https://aino.example.com/api/app/agent-hooks/abh_test',
        title: 'X 监控更新',
        text: 'Legacy hook content'
      },
      {
        systemVar: {
          app: { id: 'fastgpt-app-1', name: 'Market Agent' },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://aino.example.com/api/app/agent-hooks/abh_test');
    const body = JSON.parse(String(init?.body));
    expect(body.text).toBe('Legacy hook content');
    expect(body.deliveryMode).toBe('subscription_only');
    expect(body.delivery_mode).toBe('subscription_only');
  });

  it('does not treat an agent hook URL in push_content as monitor content', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true, eventId: 'evt-url-content' }), {
          status: 200
        })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendIPolloPush(
      {
        push_content: 'https://aino.example.com/api/app/agent-hooks/abh_from_content',
        ai_summary: 'Saibo Jin 关注科技股与美元走势。'
      },
      {
        systemVar: {
          app: { id: 'fastgpt-app-1', name: 'Market Agent' },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://aino.example.com/api/app/agent-hooks/abh_from_content');
    const body = JSON.parse(String(init?.body));
    expect(body.text).toBe('Saibo Jin 关注科技股与美元走势。');
    expect(body.text).not.toContain('/api/app/agent-hooks/');
  });

  it('falls back to applicationId from the App register URL for scheduled system runs', async () => {
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';
    process.env.IPOLLO_APP_REGISTER_URL =
      'https://studio.ipollo.net/api/app-publish-callback?applicationId=aino-app-from-register';

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            eventId: 'evt-2',
            matchedUserCount: 1,
            deliveredCount: 1,
            skippedCount: 0
          }),
          { status: 200 }
        )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendIPolloPush(
      {
        agent_id: 'aino-bot-1',
        title: 'SpaceX 监控更新',
        text: 'SpaceX 发射节奏出现新变化。'
      },
      {
        systemVar: {
          app: {
            id: 'fastgpt-app-1',
            name: 'Market Agent'
          },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      'https://aino.example.com/api/ai/agent/push-events?applicationId=aino-app-from-register'
    );
    expect((init?.headers as Record<string, string>)['x-current-user-id']).toBeUndefined();
    const body = JSON.parse(String(init?.body));
    expect(body.applicationId).toBe('aino-app-from-register');
    expect(body.text).toBe('本次监控内容已更新，查看卡片获取摘要和变化。');
    expect(body.deliveryMode).toBe('subscription_only');
    expect(body.appCard.data.changeContent).toBe('SpaceX 发射节奏出现新变化。');
  });

  it('builds a native monitor card from structured push fields', async () => {
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';
    process.env.IPOLLO_APP_REGISTER_URL =
      'https://studio.ipollo.net/api/app-publish-callback?applicationId=aino-app-from-register';

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            eventId: 'evt-3',
            matchedUserCount: 1,
            deliveredCount: 1,
            skippedCount: 0
          }),
          { status: 200 }
        )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendIPolloPush(
      {
        agent_id: 'aino-bot-1',
        monitor_object: 'SpaceX',
        ai_summary: '发射节奏提升，商业航天供给侧变化需要关注。',
        event_time: '2026-06-29T10:30:00.000Z',
        push_content: 'SpaceX 发射节奏提升，可能影响商业航天产业链。'
      },
      {
        systemVar: {
          app: { id: 'fastgpt-app-1', name: 'Market Agent' },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.appCard.componentName).toBe('MarketMonitorEventCard');
    expect(body.appCard.data.monitorObject).toBe('SpaceX');
    expect(body.appCard.data.monitorObjectName).toBe('SpaceX');
    expect(body.appCard.data.summary).toBe('发射节奏提升，商业航天供给侧变化需要关注。');
    expect(body.appCard.data.metrics).toEqual(['SpaceX']);
    expect(body.appCard.data.changeContent).toBe('SpaceX 发射节奏提升，可能影响商业航天产业链。');
    expect(body.text).toBe('本次监控内容已更新，查看卡片获取摘要和变化。');
    expect(body.deliveryMode).toBe('subscription_only');
    expect(body.payload.monitor_object).toBe('SpaceX');
    expect(body.payload.monitor_object_name).toBe('SpaceX');
    expect(body.payload.monitorObjectName).toBe('SpaceX');
    expect(body.payload.ai_summary).toBe('发射节奏提升，商业航天供给侧变化需要关注。');
    expect(body.payload.event_time).toBe('2026-06-29T10:30:00.000Z');
    expect(body.payload.push_content).toBe('SpaceX 发射节奏提升，可能影响商业航天产业链。');
    expect(body.payload.deliveryMode).toBe('subscription_only');
    expect(body.payload.app_card).toEqual(body.appCard);
  });

  it('standardizes structured monitor arrays into item, object, time and summary tables', async () => {
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';
    process.env.IPOLLO_APP_REGISTER_URL =
      'https://studio.ipollo.net/api/app-publish-callback?applicationId=aino-app-from-register';

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            eventId: 'evt-structured',
            matchedUserCount: 1,
            deliveredCount: 1,
            skippedCount: 0
          }),
          { status: 200 }
        )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const structuredPayload = {
      items: [
        { id: 'c1', objectId: 'p1', timeId: 't1', content: '第一条内容' },
        { id: 'c2', objectId: 'p2', timeId: 't2', content: '第二条内容' }
      ],
      times: [
        { id: 't1', value: '2026-06-24 10:00:00 UTC' },
        { id: 't2', value: '2026-06-24 10:05:00 UTC' }
      ],
      monitorObjects: [
        { id: 'p1', name: 'OpenAI' },
        { id: 'p2', name: 'Sam Altman' }
      ],
      summaries: [
        { id: 's1', itemId: 'c1', objectId: 'p1', timeId: 't1', summary: '第一条内容的简短总结。' }
      ]
    };

    const result = await sendIPolloPush(
      {
        agent_id: 'aino-bot-1',
        payload_json: JSON.stringify(structuredPayload)
      },
      {
        systemVar: {
          app: { id: 'fastgpt-app-1', name: 'Market Agent' },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.appCard.data.items).toEqual(structuredPayload.items);
    expect(body.appCard.data.times).toEqual(structuredPayload.times);
    expect(body.appCard.data.monitorObjects).toEqual(structuredPayload.monitorObjects);
    expect(body.appCard.data.monitorObjectNames).toEqual(['OpenAI', 'Sam Altman']);
    expect(body.appCard.data.summaries).toEqual(structuredPayload.summaries);
    expect(body.payload.items).toEqual(structuredPayload.items);
    expect(body.payload.monitorObjects).toEqual(structuredPayload.monitorObjects);
    expect(body.payload.summaries).toEqual(structuredPayload.summaries);
  });

  it('does not create an AI summary when ai_summary is empty', async () => {
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';
    process.env.IPOLLO_APP_REGISTER_URL =
      'https://studio.ipollo.net/api/app-publish-callback?applicationId=aino-app-from-register';

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            eventId: 'evt-no-summary',
            matchedUserCount: 1,
            deliveredCount: 1,
            skippedCount: 0
          }),
          { status: 200 }
        )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendIPolloPush(
      {
        agent_id: 'aino-bot-1',
        monitor_object: 'SpaceX',
        push_content: 'SpaceX 发射节奏提升，可能影响商业航天产业链。'
      },
      {
        systemVar: {
          app: { id: 'fastgpt-app-1', name: 'Market Agent' },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.summary).toBeUndefined();
    expect(body.appCard.data.summary).toBeUndefined();
    expect(body.appCard.data.aiSummary).toBeUndefined();
    expect(body.appCard.data.aiBlocks).toBeUndefined();
    expect(body.payload.ai_summary).toBeUndefined();
    expect(body.payload.summaries).toEqual([]);
  });

  it('does not treat a date-only ai_summary value as an AI summary', async () => {
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';
    process.env.IPOLLO_APP_REGISTER_URL =
      'https://studio.ipollo.net/api/app-publish-callback?applicationId=aino-app-from-register';

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            eventId: 'evt-date-summary',
            matchedUserCount: 1,
            deliveredCount: 1,
            skippedCount: 0
          }),
          { status: 200 }
        )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendIPolloPush(
      {
        agent_id: 'aino-bot-1',
        monitor_object: '监控对象',
        ai_summary: '2026-07-03 11:13:47 Friday',
        push_content: '**lunnnnnnette** 2026-07-03 03:13\n（1）159'
      },
      {
        systemVar: {
          app: { id: 'fastgpt-app-1', name: 'Market Agent' },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.appCard.data.monitorObjectName).toBe('lunnnnnnette');
    expect(body.appCard.data.summary).toBeUndefined();
    expect(body.appCard.data.aiSummary).toBeUndefined();
    expect(body.payload.ai_summary).toBeUndefined();
    expect(body.payload.monitor_object_name).toBe('lunnnnnnette');
    expect(body.payload.summaries).toEqual([]);
  });

  it('keeps only the short chat text while preserving many monitor objects in the card', async () => {
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';
    process.env.IPOLLO_APP_REGISTER_URL =
      'https://studio.ipollo.net/api/app-publish-callback?applicationId=aino-app-from-register';

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            eventId: 'evt-4',
            matchedUserCount: 1,
            deliveredCount: 1,
            skippedCount: 0
          }),
          { status: 200 }
        )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendIPolloPush(
      {
        agent_id: 'aino-bot-1',
        monitor_object: '@elonmusk @sama @tim_cook @satyanadella',
        ai_summary: '重点账号密集更新，需要关注科技主线变化。',
        push_content:
          '1. @elonmusk 提到 Starship。\n2. @sama 更新 AI 产品。\n3. @tim_cook 发布供应链动态。'
      },
      {
        systemVar: {
          app: { id: 'fastgpt-app-1', name: 'Market Agent' },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.text).toBe('本次监控内容已更新，查看卡片获取摘要和变化。');
    expect(body.appCard.data.monitorObjectNames).toEqual([
      '@elonmusk',
      '@sama',
      '@tim_cook',
      '@satyanadella'
    ]);
    expect(body.appCard.data.changeContent).toContain('@elonmusk');
    expect(body.payload.monitor_objects).toEqual([
      '@elonmusk',
      '@sama',
      '@tim_cook',
      '@satyanadella'
    ]);
  });

  it('infers monitor object labels from line-based monitor content', async () => {
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';
    process.env.IPOLLO_APP_REGISTER_URL =
      'https://studio.ipollo.net/api/app-publish-callback?applicationId=aino-app-from-register';

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            eventId: 'evt-5',
            matchedUserCount: 1,
            deliveredCount: 1,
            skippedCount: 0
          }),
          { status: 200 }
        )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendIPolloPush(
      {
        agent_id: 'aino-bot-1',
        ai_summary: '重点账号更新密集，关注加密与 AI 主线变化。',
        push_content:
          'elonmusk Mon Jun 29 14:46:07 +0000 2026 发了：Interesting\n' +
          'saylor Mon Jun 29 12:03:17 +0000 2026 发了：Bitcoin update\n' +
          'brian_armstrong 2026-06-29 发了：Coinbase update\n' +
          'billackman Mon Jun 29 09:00:00 +0000 2026 发了：Market note'
      },
      {
        systemVar: {
          app: { id: 'fastgpt-app-1', name: 'Market Agent' },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.text).toBe('本次监控内容已更新，查看卡片获取摘要和变化。');
    expect(body.appCard.data.monitorObjectName).toBe('elonmusk');
    expect(body.appCard.data.monitorObjectNames).toEqual([
      'elonmusk',
      'saylor',
      'brian_armstrong',
      'billackman'
    ]);
    expect(body.payload.monitor_object_name).toBe('elonmusk');
    expect(body.payload.monitor_objects).toEqual([
      'elonmusk',
      'saylor',
      'brian_armstrong',
      'billackman'
    ]);
  });

  it('ignores placeholder monitor labels and infers the object from formatted content', async () => {
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';
    process.env.IPOLLO_APP_REGISTER_URL =
      'https://studio.ipollo.net/api/app-publish-callback?applicationId=aino-app-from-register';

    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            eventId: 'evt-6',
            matchedUserCount: 1,
            deliveredCount: 1,
            skippedCount: 0
          }),
          { status: 200 }
        )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendIPolloPush(
      {
        agent_id: 'aino-bot-1',
        monitor_object: '监控对象',
        push_content: '**Lunnnnnnette** 2026-07-03 02:32\n（1）转发 @FoxNews：突发事件更新。'
      },
      {
        systemVar: {
          app: { id: 'fastgpt-app-1', name: 'Market Agent' },
          user: {
            id: 'user-1',
            username: 'user',
            contact: '',
            membername: '',
            teamName: '',
            teamId: 'team-1',
            name: 'User'
          },
          tool: { id: 'ipolloPushPlatform/send_ipollo_push', version: '1.2.0' },
          time: '2026-06-29T00:00:00.000Z'
        }
      } as any
    );

    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.appCard.data.monitorObjectName).toBe('Lunnnnnnette');
    expect(body.payload.monitor_object_name).toBe('Lunnnnnnette');
    expect(body.payload.monitor_objects).toEqual(['Lunnnnnnette']);
    expect(body.appCard.data.items[0]).toEqual(
      expect.objectContaining({
        objectId: 'o1',
        timeId: 't1'
      })
    );
    expect(body.appCard.data.times[0].value).toBe('2026-07-03 02:32');
  });
});
