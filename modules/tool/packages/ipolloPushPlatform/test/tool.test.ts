import { afterEach, describe, expect, it, vi } from 'vitest';
import { FlowNodeInputTypeEnum } from '@tool/type/ipolloos';
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

  it('keeps hook_url hidden and exposes app_card_json as a hidden reference input', () => {
    const inputs = config.versionList[0].inputs;
    const hookUrl = inputs.find((item) => item.key === 'hook_url');
    const appCard = inputs.find((item) => item.key === 'app_card_json');

    expect(config.versionList[0].value).toBe('1.2.0');
    expect(hookUrl?.required).toBeUndefined();
    expect(hookUrl?.renderTypeList[0]).toBe(FlowNodeInputTypeEnum.hidden);
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
    const body = JSON.parse(String(init?.body));
    expect(body.agentId).toBe('aino-bot-1');
    expect(body.appCard).toEqual(card);
    expect(body.payload.app_card).toEqual(card);
  });
});
