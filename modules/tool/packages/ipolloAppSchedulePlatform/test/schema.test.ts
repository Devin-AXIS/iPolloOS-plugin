import { describe, expect, it } from 'vitest';
import {
  buildConfirmCard,
  buildExecutionPackages,
  formatTasksMarkdown,
  parseTasksFromResponse
} from '../lib/format';
import { resolveRuntimeIdentity } from '../lib/runtime';
import { resolveScheduleApiBaseUrl, resolveScheduleApiBaseUrls } from '../lib/api';
import { TaskPayloadSchema } from '../lib/schema';
import { tool as createTaskTool } from '../children/create_ipollo_task/src';
import { tool as queryTaskTool } from '../children/query_ipollo_tasks/src';
import { tool as discoverAgentsTool } from '../children/discover_ipollo_published_agents/src';
import schedulePlatformConfig from '../config';
import createTaskConfig from '../children/create_ipollo_task/config';
import queryTaskConfig from '../children/query_ipollo_tasks/config';
import updateTaskConfig from '../children/update_ipollo_task/config';
import discoverAgentsConfig from '../children/discover_ipollo_published_agents/config';

describe('ipollo app schedule schema', () => {
  it('exposes natural-language fields to the Agent instead of treating them as static config', () => {
    const createInputs = createTaskConfig.versionList[0].inputs;
    const queryInputs = queryTaskConfig.versionList[0].inputs;
    const updateInputs = updateTaskConfig.versionList[0].inputs;
    const createTitle = createInputs.find((item) => item.key === 'title');
    const createConfirm = createInputs.find((item) => item.key === 'require_user_confirm');
    const queryFrom = queryInputs.find((item) => item.key === 'from');
    const queryTo = queryInputs.find((item) => item.key === 'to');
    const removedRuntimeKeys = [
      'application_id',
      'user_id',
      'schedule_api_base_url',
      'schedule_api_secret',
      'assignee_id',
      'dispatch_channel'
    ];
    const hiddenAssignmentKeys = ['assignees_json', 'subtasks_json', 'attachments_json'];

    expect(
      (schedulePlatformConfig as { secretInputConfig?: unknown[] }).secretInputConfig ?? []
    ).toHaveLength(0);
    expect(createInputs.some((item) => removedRuntimeKeys.includes(item.key))).toBe(false);
    expect(queryInputs.some((item) => removedRuntimeKeys.includes(item.key))).toBe(false);
    expect(updateInputs.some((item) => removedRuntimeKeys.includes(item.key))).toBe(false);
    expect(
      hiddenAssignmentKeys.every((key) => {
        const input = createInputs.find((item) => item.key === key);
        return input?.renderTypeList.includes('hidden' as any) && !!input.toolDescription;
      })
    ).toBe(true);
    expect(createTitle?.required).toBe(true);
    expect(createTitle?.toolDescription).toContain('任务标题');
    expect(createConfirm?.defaultValue).toBe(false);
    expect(queryFrom?.toolDescription).toContain('查询开始时间');
    expect(queryTo?.toolDescription).toContain('查询结束时间');
    expect(discoverAgentsConfig.versionList[0].inputs[0].key).toBe('task_text');
  });

  it('normalizes a task payload', () => {
    const task = TaskPayloadSchema.parse({
      applicationId: 'app-1',
      userId: 'user-1',
      title: '明天发 AI 新闻',
      schedule: {
        mode: 'once',
        dueAt: '2026-06-04T09:00:00+08:00'
      },
      assignees: [{ assigneeType: 'agent', assigneeId: 'agent-1', assigneeName: '研究助手' }]
    });

    expect(task.schedule.timezone).toBe('Asia/Shanghai');
    expect(task.assignees[0].role).toBe('executor');
    expect(task.requireUserConfirm).toBe(false);
  });

  it('builds a confirmation card', () => {
    const task = TaskPayloadSchema.parse({
      applicationId: 'app-1',
      userId: 'user-1',
      title: '整理会议材料',
      content: '会前生成客户资料',
      assignees: [{ assigneeType: 'agent', assigneeId: 'agent-1', assigneeName: '会议助手' }]
    });
    const card = buildConfirmCard(task);
    expect(card.type).toBe('ipollo_task_confirm');
    expect(card.summary.join(' ')).toContain('会议助手');
  });

  it('builds role based execution packages', () => {
    const task = TaskPayloadSchema.parse({
      applicationId: 'app-1',
      userId: 'user-1',
      title: '准备客户会议',
      content: '下午三点和客户确认合作方案。',
      goal: '让每个协作者明确自己负责的会议准备事项。',
      assignees: [
        {
          assigneeType: 'agent',
          assigneeId: 'coordinator-agent',
          assigneeName: '会议协调助手',
          role: 'coordinator'
        }
      ],
      subtasks: [
        {
          title: '整理客户背景',
          content: '查询客户公司、负责人和最近新闻。',
          expectedOutput: '一页客户背景摘要',
          assigneeType: 'agent',
          assigneeId: 'research-agent',
          assigneeName: '研究助手'
        },
        {
          title: '确认报价',
          content: '和销售确认本次报价边界。',
          assigneeType: 'user',
          assigneeId: 'sales-user',
          assigneeName: '销售同事',
          visibility: 'private'
        }
      ]
    });

    const packages = buildExecutionPackages(task);
    const coordinatorPackage = packages.find(
      (item) => item.receiver.assigneeId === 'coordinator-agent'
    );
    const researchPackage = packages.find((item) => item.receiver.assigneeId === 'research-agent');

    expect(packages).toHaveLength(3);
    expect(coordinatorPackage?.view).toBe('coordinator_view');
    expect(coordinatorPackage?.permissions.canViewFullTask).toBe(true);
    expect(coordinatorPackage?.collaboration.subtasks).toHaveLength(2);
    expect(researchPackage?.view).toBe('assignee_view');
    expect(researchPackage?.taskContext.title).toBe('准备客户会议');
    expect(researchPackage?.assignment.subtasks).toHaveLength(1);
    expect(researchPackage?.assignment.subtasks[0].title).toBe('整理客户背景');
    expect(researchPackage?.permissions.canViewOtherSubtaskDetails).toBe(false);
  });

  it('formats queried tasks', () => {
    const tasks = parseTasksFromResponse(
      JSON.stringify({ list: [{ title: '任务 A', dueAt: '2026-06-04' }] })
    );
    expect(tasks).toHaveLength(1);
    expect(formatTasksMarkdown(tasks)).toContain('任务 A');
  });

  it('uses runtime iPollo identity when tool args omit user fields', () => {
    const identity = resolveRuntimeIdentity(
      { dispatchChannel: 'system' },
      {
        user: {
          id: 'ipolloos-user',
          username: '',
          contact: '',
          membername: '',
          teamName: '',
          teamId: '',
          name: '',
          appUserId: 'ipollo-user-1',
          appAuthToken: 'ipollo-token-1'
        },
        app: { id: 'ipollo-app-1', name: '日程助手' },
        tool: { id: 'query_ipollo_tasks', version: '1.4.0' },
        time: '2026-06-06 12:00:00'
      }
    );

    expect(identity.applicationId).toBe('ipollo-app-1');
    expect(identity.userId).toBe('ipollo-user-1');
    expect(identity.authToken).toBe('ipollo-token-1');
    expect(identity.identitySource).toBe('runtime_app_user');
  });

  it('ignores removed application id environment and uses the runtime app id', () => {
    const oldRemovedApplicationId = process.env.AINO_APPLICATION_ID;
    process.env.AINO_APPLICATION_ID = 'removed-app-1';

    try {
      const identity = resolveRuntimeIdentity(
        { dispatchChannel: 'system' },
        {
          user: {
            id: 'ipolloos-user',
            username: '',
            contact: '',
            membername: '',
            teamName: '',
            teamId: '',
            name: '',
            appUserId: 'ipollo-user-1'
          },
          app: { id: 'ipolloos-app-1', name: '日程助手' },
          tool: { id: 'query_ipollo_tasks', version: '1.4.0' },
          time: '2026-06-06 12:00:00'
        }
      );

      expect(identity.applicationId).toBe('ipolloos-app-1');
      expect(identity.userId).toBe('ipollo-user-1');
    } finally {
      if (oldRemovedApplicationId === undefined) {
        delete process.env.AINO_APPLICATION_ID;
      } else {
        process.env.AINO_APPLICATION_ID = oldRemovedApplicationId;
      }
    }
  });

  it('rejects system channel calls without trusted iPollo user identity', () => {
    expect(() => resolveRuntimeIdentity({ dispatchChannel: 'system' }, undefined)).toThrow(
      '缺少运行时 iPollo App 信息'
    );
  });

  it('does not use the OS user id as a system channel iPollo user fallback', () => {
    expect(() =>
      resolveRuntimeIdentity(
        { applicationId: 'ipollo-app-1', dispatchChannel: 'system' },
        {
          user: {
            id: 'os-user-should-not-be-used',
            username: '',
            contact: '',
            membername: '',
            teamName: '',
            teamId: '',
            name: ''
          },
          app: { id: 'ipolloos-app-1', name: '日程助手' },
          tool: { id: 'query_ipollo_tasks', version: '1.4.0' },
          time: '2026-06-06 12:00:00'
        }
      )
    ).toThrow('缺少可信 iPollo 用户 ID');
  });

  it('uses systemVar.user.id for local test runs', () => {
    const identity = resolveRuntimeIdentity(
      { applicationId: 'ipollo-app-1', dispatchChannel: 'local' },
      {
        user: {
          id: 'ipollo-user-from-runtime-context',
          username: '',
          contact: '',
          membername: '',
          teamName: '',
          teamId: '',
          name: ''
        },
        app: { id: 'ipolloos-app-1', name: '日程助手' },
        tool: { id: 'query_ipollo_tasks', version: '1.4.0' },
        time: '2026-06-06 12:00:00'
      }
    );

    expect(identity).toEqual({
      applicationId: 'ipollo-app-1',
      userId: 'ipollo-user-from-runtime-context',
      authToken: undefined,
      identitySource: 'local_system_user'
    });
  });

  it('requires the explicit iPollo App task API base URL', () => {
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    try {
      delete process.env.IPOLLO_APP_TASK_API_BASE_URL;
      expect(resolveScheduleApiBaseUrl()).toBe('');
      expect(resolveScheduleApiBaseUrls()).toEqual([]);

      process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
      expect(resolveScheduleApiBaseUrl()).toBe('https://aino.example.com');
      expect(resolveScheduleApiBaseUrls()).toEqual(['https://aino.example.com']);
    } finally {
      if (originalBaseUrl === undefined) {
        delete process.env.IPOLLO_APP_TASK_API_BASE_URL;
      } else {
        process.env.IPOLLO_APP_TASK_API_BASE_URL = originalBaseUrl;
      }
    }
  });

  it('fails before fetch when task API secret is missing', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com';
    delete process.env.IPOLLO_APP_TASK_API_SECRET;

    try {
      const result = await queryTaskTool(
        { limit: 20 },
        {
          systemVar: {
            user: {
              id: 'ipolloos-user',
              username: '',
              contact: '',
              membername: '',
              teamName: '',
              teamId: '',
              name: '',
              appUserId: 'ipollo-user-1'
            },
            app: { id: 'ipollo-app-1', name: '日程助手' },
            tool: { id: 'query_ipollo_tasks', version: '1.4.0' },
            time: '2026-06-06 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      expect(result.ok).toBe(false);
      expect(result.system_error).toContain('IPOLLO_APP_TASK_API_SECRET');
      expect(called).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
      if (originalBaseUrl === undefined) {
        delete process.env.IPOLLO_APP_TASK_API_BASE_URL;
      } else {
        process.env.IPOLLO_APP_TASK_API_BASE_URL = originalBaseUrl;
      }
      if (originalSecret === undefined) {
        delete process.env.IPOLLO_APP_TASK_API_SECRET;
      } else {
        process.env.IPOLLO_APP_TASK_API_SECRET = originalSecret;
      }
    }
  });

  it('defaults empty create assignees to the current iPollo user', async () => {
    const result = await createTaskTool(
      {
        title: '明天上午 10 点开会',
        content: '',
        goal: '',
        schedule_json: JSON.stringify({
          mode: 'once',
          timezone: 'Asia/Shanghai',
          dueAt: '2026-06-07T10:00:00+08:00'
        }),
        assignees_json: '[]',
        subtasks_json: '[]',
        attachments_json: '[]',
        require_user_confirm: true
      },
      {
        systemVar: {
          user: {
            id: 'ipolloos-user',
            username: '',
            contact: '',
            membername: '',
            teamName: '',
            teamId: '',
            name: '',
            appUserId: 'ipollo-user-1'
          },
          app: { id: 'ipollo-app-1', name: '日程助手' },
          tool: { id: 'create_ipollo_task', version: '1.4.0' },
          time: '2026-06-06 12:00:00'
        },
        streamResponse: () => {}
      }
    );
    const task = JSON.parse(result.task_json);
    const confirmCard = JSON.parse(result.confirm_card_json);

    expect(task.assignees).toEqual([
      { assigneeType: 'user', assigneeId: 'ipollo-user-1', role: 'owner' }
    ]);
    expect(confirmCard.summary.join(' ')).toContain('ipollo-user-1');
  });

  it('defaults create calls to the system dispatch channel', async () => {
    const result = await createTaskTool(
      {
        title: '今天下午 3 点会议',
        schedule_json: JSON.stringify({
          mode: 'once',
          timezone: 'Asia/Shanghai',
          dueAt: '2026-06-06T15:00:00+08:00'
        }),
        require_user_confirm: true
      },
      {
        systemVar: {
          user: {
            id: 'ipolloos-user',
            username: '',
            contact: '',
            membername: '',
            teamName: '',
            teamId: '',
            name: '',
            appUserId: 'ipollo-user-1'
          },
          app: { id: 'ipollo-app-1', name: '日程助手' },
          tool: { id: 'create_ipollo_task', version: '1.4.0' },
          time: '2026-06-06 12:00:00'
        },
        streamResponse: () => {}
      }
    );
    const action = JSON.parse(result.action_json);

    expect(action.dispatchChannel).toBe('system');
    expect(action.submitMode).toBe('confirm_card');
  });

  it('queries tasks from the iPollo App schedule API', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(
        JSON.stringify({
          success: true,
          items: [
            {
              id: 'task-1',
              title: '今天 15:00 会议',
              dueAt: '2026-06-06T15:00:00+08:00',
              status: 'pending'
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';

    try {
      const result = await queryTaskTool(
        {
          from: '2026-06-06T00:00:00+08:00',
          to: '2026-06-06T23:59:59+08:00',
          include_completed: true,
          limit: 20
        },
        {
          systemVar: {
            user: {
              id: 'ipolloos-user',
              username: '',
              contact: '',
              membername: '',
              teamName: '',
              teamId: '',
              name: '',
              appUserId: 'ipollo-user-1',
              appAuthToken: 'ipollo-token-1'
            },
            app: { id: 'ipollo-app-1', name: '日程助手' },
            tool: { id: 'query_ipollo_tasks', version: '1.4.0' },
            time: '2026-06-06 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      const url = new URL(calls[0].url);
      const headers = calls[0].init?.headers as Record<string, string>;
      expect(result.ok).toBe(true);
      expect(result.count).toBe(1);
      expect(result.tasks_markdown).toContain('今天 15:00 会议');
      expect(url.origin).toBe('https://aino.example.com');
      expect(url.pathname).toBe('/api/ai/agent/tasks');
      expect(url.searchParams.get('applicationId')).toBe('ipollo-app-1');
      expect(url.searchParams.get('dueFrom')).toBe('2026-06-06T00:00:00+08:00');
      expect(headers.Authorization).toBe('Bearer secret-1');
      expect(headers['x-current-user-id']).toBe('ipollo-user-1');
    } finally {
      globalThis.fetch = originalFetch;
      if (originalBaseUrl === undefined) {
        delete process.env.IPOLLO_APP_TASK_API_BASE_URL;
      } else {
        process.env.IPOLLO_APP_TASK_API_BASE_URL = originalBaseUrl;
      }
      if (originalSecret === undefined) {
        delete process.env.IPOLLO_APP_TASK_API_SECRET;
      } else {
        process.env.IPOLLO_APP_TASK_API_SECRET = originalSecret;
      }
    }
  });

  it('creates a task through the iPollo App schedule API when confirmation is not required', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    let body: Record<string, unknown> = {};
    let headers: Record<string, string> = {};
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(String(init?.body ?? '{}'));
      headers = init?.headers as Record<string, string>;
      return new Response(
        JSON.stringify({ success: true, id: 'created-task-1', item: { id: 'created-task-1' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';

    try {
      const result = await createTaskTool(
        {
          title: '明天 15:00 会议',
          schedule_json: JSON.stringify({
            mode: 'once',
            timezone: 'Asia/Shanghai',
            dueAt: '2026-06-07T15:00:00+08:00'
          }),
          require_user_confirm: false
        },
        {
          systemVar: {
            user: {
              id: 'ipolloos-user',
              username: '',
              contact: '',
              membername: '',
              teamName: '',
              teamId: '',
              name: '',
              appUserId: 'ipollo-user-1',
              appAuthToken: 'ipollo-token-1'
            },
            app: { id: 'ipollo-app-1', name: '日程助手' },
            tool: { id: 'create_ipollo_task', version: '1.4.0' },
            time: '2026-06-06 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      expect(result.ok).toBe(true);
      expect(result.task_id).toBe('created-task-1');
      expect(result.confirm_card_json).toBe('');
      expect(body.title).toBe('明天 15:00 会议');
      expect((body.schedule as Record<string, unknown>).dueAt).toBe('2026-06-07T15:00:00+08:00');
      expect(headers.Authorization).toBe('Bearer secret-1');
      expect(headers['x-current-user-id']).toBe('ipollo-user-1');
    } finally {
      globalThis.fetch = originalFetch;
      if (originalBaseUrl === undefined) {
        delete process.env.IPOLLO_APP_TASK_API_BASE_URL;
      } else {
        process.env.IPOLLO_APP_TASK_API_BASE_URL = originalBaseUrl;
      }
      if (originalSecret === undefined) {
        delete process.env.IPOLLO_APP_TASK_API_SECRET;
      } else {
        process.env.IPOLLO_APP_TASK_API_SECRET = originalSecret;
      }
    }
  });

  it('returns schedule API diagnostics when actual task creation fetch fails', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    const originalTimeout = process.env.IPOLLO_APP_TASK_API_TIMEOUT_MS;
    globalThis.fetch = (async () => {
      const error = new Error('fetch failed') as Error & {
        cause?: Record<string, string>;
      };
      error.cause = {
        code: 'ENOTFOUND',
        hostname: 'aino.example.com',
        message: 'getaddrinfo ENOTFOUND aino.example.com'
      };
      throw error;
    }) as unknown as typeof fetch;
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';
    process.env.IPOLLO_APP_TASK_API_TIMEOUT_MS = '12345';

    try {
      const result = await createTaskTool(
        {
          title: '会议',
          schedule_json: JSON.stringify({
            mode: 'once',
            timezone: 'Asia/Shanghai',
            dueAt: '2026-06-09T15:00:00+08:00'
          }),
          require_user_confirm: false
        },
        {
          systemVar: {
            user: {
              id: 'ipolloos-user',
              username: '',
              contact: '',
              membername: '',
              teamName: '',
              teamId: '',
              name: '',
              appUserId: 'ipollo-user-1'
            },
            app: { id: 'ipollo-app-1', name: '日程助手' },
            tool: { id: 'create_ipollo_task', version: '1.4.0' },
            time: '2026-06-06 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      expect(result.ok).toBe(false);
      expect(result.system_error).toContain('iPollo App 日程请求失败');
      expect(result.system_error).toContain('"method":"POST"');
      expect(result.system_error).toContain('"endpoint_host":"aino.example.com"');
      expect(result.system_error).toContain('"endpoint_path":"/api/ai/agent/tasks"');
      expect(result.system_error).toContain('"timeout_ms":12345');
      expect(result.system_error).toContain('"cause_code":"ENOTFOUND"');
      expect(result.system_error).toContain('"cause_hostname":"aino.example.com"');
    } finally {
      globalThis.fetch = originalFetch;
      if (originalBaseUrl === undefined) {
        delete process.env.IPOLLO_APP_TASK_API_BASE_URL;
      } else {
        process.env.IPOLLO_APP_TASK_API_BASE_URL = originalBaseUrl;
      }
      if (originalSecret === undefined) {
        delete process.env.IPOLLO_APP_TASK_API_SECRET;
      } else {
        process.env.IPOLLO_APP_TASK_API_SECRET = originalSecret;
      }
      if (originalTimeout === undefined) {
        delete process.env.IPOLLO_APP_TASK_API_TIMEOUT_MS;
      } else {
        process.env.IPOLLO_APP_TASK_API_TIMEOUT_MS = originalTimeout;
      }
    }
  });

  it('discovers published agents and returns assignee json for task creation', async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/api/plugin/getAccessToken')) {
        return new Response(JSON.stringify({ data: { accessToken: 'plugin-access-token' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(
        JSON.stringify({
          data: {
            agents: [
              {
                appBotId: 'aino-bot-1',
                fastgptAppId: 'fastgpt-app-1',
                shareId: 'share-1',
                name: '研究助手',
                intro: '负责资料检索',
                channelName: '研究助手发布',
                score: 2,
                capabilities: ['检索', '摘要']
              }
            ],
            count: 1
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as unknown as typeof fetch;

    try {
      const result = await discoverAgentsTool(
        {
          task_text: '帮我查明天会议客户资料',
          limit: 5,
          exclude_current_agent: true
        },
        {
          systemVar: {
            user: {
              id: 'tmb-1',
              username: '',
              contact: '',
              membername: '',
              teamName: '',
              teamId: 'team-1',
              name: ''
            },
            app: {
              id: 'current-fastgpt-app',
              name: '日程助手',
              upstreamAppId: 'current-fastgpt-app'
            },
            tool: { id: 'discover_ipollo_published_agents', version: '1.4.0' },
            time: '2026-06-06 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      const invokeBody = JSON.parse(String(calls[1].init?.body ?? '{}'));
      expect(result.ok).toBe(true);
      expect(result.count).toBe(1);
      expect(result.recommended_agent_id).toBe('aino-bot-1');
      expect(result.agents_markdown).toContain('研究助手');
      expect(JSON.parse(result.recommended_assignees_json)).toEqual([
        {
          assigneeType: 'agent',
          assigneeId: 'aino-bot-1',
          assigneeName: '研究助手',
          role: 'executor'
        }
      ]);
      expect(calls[1].init?.headers).toMatchObject({
        authorization: 'Bearer plugin-access-token'
      });
      expect(invokeBody.excludeFastGPTAppId).toBe('current-fastgpt-app');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
