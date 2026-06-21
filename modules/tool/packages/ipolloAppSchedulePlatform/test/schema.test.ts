import { describe, expect, it } from 'vitest';
import {
  SCHEDULE_LIST_CARD_COMPONENT,
  SCHEDULE_TASK_CARD_COMPONENT,
  buildConfirmCard,
  buildExecutionPackages,
  formatTasksMarkdown,
  parseTasksFromResponse
} from '../lib/format';
import { resolveRuntimeIdentity } from '../lib/runtime';
import {
  filterScheduleTasksForQuery,
  resolveScheduleApiBaseUrl,
  resolveScheduleApiBaseUrls
} from '../lib/api';
import { TaskPayloadSchema } from '../lib/schema';
import { tool as createTaskTool } from '../children/create_ipollo_task/src';
import { tool as queryTaskTool } from '../children/query_ipollo_tasks/src';
import { tool as updateTaskTool } from '../children/update_ipollo_task/src';
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
    const createOutputs = createTaskConfig.versionList[0].outputs;
    const queryOutputs = queryTaskConfig.versionList[0].outputs;
    const updateOutputs = updateTaskConfig.versionList[0].outputs;
    const queryFrom = queryInputs.find((item) => item.key === 'from');
    const queryTo = queryInputs.find((item) => item.key === 'to');
    const queryKeyword = queryInputs.find((item) => item.key === 'keyword');
    const queryAssigneeName = queryInputs.find((item) => item.key === 'assignee_name');
    const queryOnlyCurrentUserAssignee = queryInputs.find(
      (item) => item.key === 'only_current_user_assignee'
    );
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
    expect(schedulePlatformConfig.toolDescription).toContain('任务规划');
    expect(createTaskConfig.toolDescription).toContain('discover_ipollo_published_agents');
    expect(updateTaskConfig.toolDescription).toContain('discover_ipollo_published_agents');
    expect(updateTaskConfig.toolDescription).toContain('顶层 assignees');
    expect(createInputs.find((item) => item.key === 'assignees_json')?.toolDescription).toContain(
      '用户总负责人 + AI'
    );
    expect(createInputs.find((item) => item.key === 'subtasks_json')?.toolDescription).toContain(
      '会前收集'
    );
    expect(discoverAgentsConfig.toolDescription).toContain('纯个人日程时不用调用');
    expect(discoverAgentsConfig.versionList[0].inputs[0].toolDescription).toContain(
      'AI 可辅助事项'
    );
    expect(createOutputs.some((item) => item.key === 'app_card')).toBe(true);
    expect(queryOutputs.some((item) => item.key === 'app_card')).toBe(true);
    expect(updateOutputs.some((item) => item.key === 'app_card')).toBe(true);
    expect(queryFrom?.toolDescription).toContain('查询开始时间');
    expect(queryTo?.toolDescription).toContain('查询结束时间');
    expect(queryKeyword?.toolDescription).toContain('自然语言');
    expect(queryAssigneeName?.toolDescription).toContain('默认只返回当前用户参与');
    expect(queryOnlyCurrentUserAssignee?.toolDescription).toContain('不要只在最终文本里筛选');
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

  it('defaults task queries to tasks involving the current app user', () => {
    const tasks = [
      {
        title: '我的会议',
        assignees: [{ assigneeType: 'user', assigneeId: 'user-1', assigneeName: '我' }]
      },
      {
        title: 'AI 研究',
        assignees: [
          { assigneeType: 'user', assigneeId: 'user-1', assigneeName: '我', role: 'owner' },
          { assigneeType: 'agent', assigneeId: 'market-agent', assigneeName: '美股智能体' }
        ]
      },
      {
        title: '别人负责的任务',
        assignees: [{ assigneeType: 'user', assigneeId: 'user-2', assigneeName: '张三' }]
      },
      {
        title: '我参与的评审',
        participants: [{ assigneeType: 'user', assigneeId: 'user-1', assigneeName: '我' }]
      },
      {
        title: '子任务分给我',
        assignees: [
          { assigneeType: 'agent', assigneeId: 'future-agent', assigneeName: '未来洞察' }
        ],
        subtasks: [
          { title: '人工确认', assigneeType: 'user', assigneeId: 'user-1', assigneeName: '我' }
        ]
      }
    ];

    expect(
      filterScheduleTasksForQuery(tasks, {
        applicationId: 'app-1',
        userId: 'user-1'
      }).map((item: any) => item.title)
    ).toEqual(['我的会议', 'AI 研究', '我参与的评审', '子任务分给我']);
  });

  it('can narrow task queries to tasks primarily assigned to the current user', () => {
    const tasks = [
      {
        title: '我自己负责的面试',
        assignees: [
          { assigneeType: 'user', assigneeId: 'user-1', assigneeName: '我', role: 'owner' }
        ]
      },
      {
        title: '美股智能体日报',
        assignees: [
          { assigneeType: 'user', assigneeId: 'user-1', assigneeName: '我', role: 'owner' },
          {
            assigneeType: 'agent',
            assigneeId: 'market-agent',
            assigneeName: '美股智能体',
            role: 'executor'
          }
        ]
      },
      {
        title: '未来洞察监控',
        assignees: [
          { assigneeType: 'agent', assigneeId: 'future-agent', assigneeName: '未来洞察' }
        ],
        subtasks: [
          { title: '人工确认', assigneeType: 'user', assigneeId: 'user-1', assigneeName: '我' }
        ]
      },
      {
        title: '张三负责',
        assignees: [{ assigneeType: 'user', assigneeId: 'user-2', assigneeName: '张三' }]
      }
    ];

    expect(
      filterScheduleTasksForQuery(tasks, {
        applicationId: 'app-1',
        userId: 'user-1',
        onlyCurrentUserAssignee: true
      }).map((item: any) => item.title)
    ).toEqual(['我自己负责的面试']);

    expect(
      filterScheduleTasksForQuery(tasks, {
        applicationId: 'app-1',
        userId: 'user-1',
        keyword: '只需要执行人我自己的任务'
      }).map((item: any) => item.title)
    ).toEqual(['我自己负责的面试']);
  });

  it('queries another assignee only when the user names that person or agent', () => {
    const tasks = [
      {
        title: '默认不该展示',
        assignees: [{ assigneeType: 'agent', assigneeId: 'future-agent', assigneeName: '未来洞察' }]
      },
      {
        title: '张三推进',
        assignees: [{ assigneeType: 'user', assigneeId: 'user-2', assigneeName: '张三' }]
      },
      {
        title: '李四参与的任务',
        participants: [{ assigneeType: 'user', assigneeId: 'user-3', assigneeName: '李四' }]
      }
    ];

    expect(
      filterScheduleTasksForQuery(tasks, {
        applicationId: 'app-1',
        userId: 'user-1',
        assigneeName: '未来洞察'
      }).map((item: any) => item.title)
    ).toEqual(['默认不该展示']);

    expect(
      filterScheduleTasksForQuery(tasks, {
        applicationId: 'app-1',
        userId: 'user-1',
        keyword: '查一下张三的任务'
      }).map((item: any) => item.title)
    ).toEqual(['张三推进']);

    expect(
      filterScheduleTasksForQuery(tasks, {
        applicationId: 'app-1',
        userId: 'user-1',
        keyword: '李四有哪些任务'
      }).map((item: any) => item.title)
    ).toEqual(['李四参与的任务']);
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
        tool: { id: 'query_ipollo_tasks', version: '1.4.6' },
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
          tool: { id: 'query_ipollo_tasks', version: '1.4.6' },
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
          tool: { id: 'query_ipollo_tasks', version: '1.4.6' },
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
        tool: { id: 'query_ipollo_tasks', version: '1.4.6' },
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
            tool: { id: 'query_ipollo_tasks', version: '1.4.6' },
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
          tool: { id: 'create_ipollo_task', version: '1.4.6' },
          time: '2026-06-06 12:00:00'
        },
        streamResponse: () => {}
      }
    );
    const task = JSON.parse(result.task_json);
    const confirmCard = JSON.parse(result.confirm_card_json);
    const appCard = JSON.parse(result.app_card);

    expect(task.assignees).toEqual([
      { assigneeType: 'user', assigneeId: 'ipollo-user-1', role: 'owner' }
    ]);
    expect(confirmCard.summary.join(' ')).toContain('ipollo-user-1');
    expect(appCard.id).toContain('ipollo-schedule-task:confirm:');
    expect(appCard.componentName).toBe(SCHEDULE_TASK_CARD_COMPONENT);
    expect(appCard.data.kind).toBe('confirm');
    expect(appCard.data.operation).toBe('confirm');
    expect(appCard.data.badgeLabel).toBe('待确认');
    expect(appCard.data.tone).toBe('pending');
    expect(appCard.data.task.title).toBe('明天上午 10 点开会');
    expect(appCard.data.task.assignees[0]).toMatchObject({
      assigneeId: 'ipollo-user-1',
      assigneeType: 'user',
      name: '自己'
    });
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
          tool: { id: 'create_ipollo_task', version: '1.4.6' },
          time: '2026-06-06 12:00:00'
        },
        streamResponse: () => {}
      }
    );
    const action = JSON.parse(result.action_json);

    expect(action.dispatchChannel).toBe('system');
    expect(action.submitMode).toBe('confirm_card');
  });

  it('keeps the current iPollo user as owner when assigning AI executors', async () => {
    const result = await createTaskTool(
      {
        title: '见张三聊合作',
        content: '明天下午 3 点见张三，提前准备背景资料。',
        goal: '准时参会，并提前拿到对方背景资料和问题清单。',
        schedule_json: JSON.stringify({
          mode: 'once',
          timezone: 'Asia/Shanghai',
          dueAt: '2026-06-07T15:00:00+08:00'
        }),
        assignees_json: JSON.stringify([
          {
            assigneeType: 'agent',
            assigneeId: 'agent-research-1',
            assigneeName: '资料研究助手',
            role: 'executor'
          }
        ]),
        subtasks_json: JSON.stringify([
          {
            title: '会前收集张三背景资料',
            content: '整理张三和所在机构的公开背景、近期动态和可沟通议题。',
            assigneeType: 'agent',
            assigneeId: 'agent-research-1',
            assigneeName: '资料研究助手'
          }
        ]),
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
          tool: { id: 'create_ipollo_task', version: '1.4.6' },
          time: '2026-06-06 12:00:00'
        },
        streamResponse: () => {}
      }
    );

    const task = JSON.parse(result.task_json);
    const appCard = JSON.parse(result.app_card);
    expect(task.assignees).toEqual([
      { assigneeType: 'user', assigneeId: 'ipollo-user-1', role: 'owner' },
      {
        assigneeType: 'agent',
        assigneeId: 'agent-research-1',
        assigneeName: '资料研究助手',
        role: 'executor'
      }
    ]);
    expect(task.subtasks[0]).toMatchObject({
      title: '会前收集张三背景资料',
      assigneeId: 'agent-research-1'
    });
    expect(appCard.data.task.assignees).toHaveLength(2);
    expect(appCard.data.task.subtasks[0].title).toBe('会前收集张三背景资料');
  });

  it('promotes agent subtasks to task executors when creating tasks', async () => {
    const result = await createTaskTool(
      {
        title: '早餐时看 AI 美股动态',
        content: '吃早饭时了解 AI 与美股相关的重要事情。',
        schedule_json: JSON.stringify({
          mode: 'once',
          timezone: 'Asia/Shanghai',
          dueAt: '2026-06-20T09:00:00+08:00'
        }),
        assignees_json: '[]',
        subtasks_json: JSON.stringify([
          {
            title: '整理 AI 美股动态',
            content: '整理隔夜美股 AI 板块动态、重点公司消息和风险点。',
            assigneeType: 'agent',
            assigneeId: 'market-agent-1',
            assigneeName: 'AI Market Intelligence Agent'
          }
        ]),
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
          tool: { id: 'create_ipollo_task', version: '1.4.6' },
          time: '2026-06-06 12:00:00'
        },
        streamResponse: () => {}
      }
    );

    const task = JSON.parse(result.task_json);
    expect(task.assignees).toEqual([
      { assigneeType: 'user', assigneeId: 'ipollo-user-1', role: 'owner' },
      {
        assigneeType: 'agent',
        assigneeId: 'market-agent-1',
        assigneeName: 'AI Market Intelligence Agent',
        role: 'executor'
      }
    ]);
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
              status: 'pending',
              assignees: [
                {
                  assigneeType: 'user',
                  assigneeId: 'ipollo-user-1',
                  assigneeName: '我',
                  role: 'owner'
                },
                {
                  assigneeType: 'agent',
                  assigneeId: 'agent-1',
                  assigneeName: '会议助手',
                  avatarUrl: 'https://static.example.com/agent.png'
                }
              ],
              subtasks: [
                {
                  id: 'subtask-1',
                  title: '整理会议材料',
                  status: 'pending',
                  assigneeName: '会议助手'
                },
                {
                  id: 'subtask-2',
                  title: '发送会议提醒',
                  completed: true
                }
              ]
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
            tool: { id: 'query_ipollo_tasks', version: '1.4.6' },
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
      const appCard = JSON.parse(result.app_card);
      expect(appCard.id).toContain('ipollo-schedule-list:2026-06-06T00:00:00+08:00');
      expect(appCard.componentName).toBe(SCHEDULE_LIST_CARD_COMPONENT);
      expect(appCard.data.kind).toBe('query_list');
      expect(appCard.data.operation).toBe('query');
      expect(appCard.data.badgeLabel).toBe('查询结果');
      expect(appCard.data.tone).toBe('query');
      expect(appCard.data.count).toBe(1);
      expect(appCard.data.items[0].taskId).toBe('task-1');
      expect(appCard.data.items[0].href).toBe('/ai-task-detail?taskId=task-1');
      expect(appCard.data.items[0].assignees).toEqual([
        {
          id: 'ipollo-user-1',
          assigneeId: 'ipollo-user-1',
          assigneeType: 'user',
          name: '我',
          assigneeName: '我',
          avatarUrl: '',
          role: 'owner'
        },
        {
          id: 'agent-1',
          assigneeId: 'agent-1',
          assigneeType: 'agent',
          name: '会议助手',
          assigneeName: '会议助手',
          avatarUrl: 'https://static.example.com/agent.png',
          role: ''
        }
      ]);
      expect(appCard.data.items[0].subtasks).toEqual([
        {
          id: 'subtask-1',
          title: '整理会议材料',
          completed: false,
          status: 'pending',
          assigneeType: '',
          assigneeId: '',
          assigneeName: '会议助手',
          visibility: ''
        },
        {
          id: 'subtask-2',
          title: '发送会议提醒',
          completed: true,
          status: '',
          assigneeType: '',
          assigneeId: '',
          assigneeName: '',
          visibility: ''
        }
      ]);
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

  it('filters the returned app card when querying only tasks assigned to the current user', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          items: [
            {
              id: 'self-task',
              title: '我自己负责的面试',
              dueAt: '2026-06-21T10:00:00+08:00',
              status: 'pending',
              assignees: [
                {
                  assigneeType: 'user',
                  assigneeId: 'ipollo-user-1',
                  assigneeName: '我',
                  role: 'owner'
                }
              ]
            },
            {
              id: 'market-agent-task',
              title: '监控设置',
              dueAt: '2026-06-21T08:30:00+08:00',
              status: 'pending',
              assignees: [
                {
                  assigneeType: 'user',
                  assigneeId: 'ipollo-user-1',
                  assigneeName: '我',
                  role: 'owner'
                },
                {
                  assigneeType: 'agent',
                  assigneeId: 'market-agent-1',
                  assigneeName: 'AI Market Intelligence Agent',
                  role: 'executor'
                }
              ]
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as unknown as typeof fetch;
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';

    try {
      const result = await queryTaskTool(
        {
          from: '2026-06-21T00:00:00+08:00',
          to: '2026-06-21T23:59:59+08:00',
          only_current_user_assignee: true,
          include_completed: false,
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
              appUserId: 'ipollo-user-1'
            },
            app: { id: 'ipollo-app-1', name: '日程助手' },
            tool: { id: 'query_ipollo_tasks', version: '1.4.8' },
            time: '2026-06-20 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      const appCard = JSON.parse(result.app_card);
      const tasks = JSON.parse(result.tasks_json);
      expect(result.count).toBe(1);
      expect(tasks.map((item: any) => item.id)).toEqual(['self-task']);
      expect(appCard.data.count).toBe(1);
      expect(appCard.data.items.map((item: any) => item.taskId)).toEqual(['self-task']);
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

  it('derives app-card subtasks from legacy note text when structured subtasks are missing', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          items: [
            {
              id: 'legacy-note-task',
              title: '见百度的人一起开会',
              dueAt: '2026-06-20T17:00:00+08:00',
              status: 'pending',
              assignees: [
                {
                  assigneeType: 'user',
                  assigneeId: 'ipollo-user-1',
                  assigneeName: '我',
                  role: 'owner'
                }
              ],
              note: '子项目： 1. 提前确认参会人员、会议地点/链接和会议主题。 2. 准备会议材料、需求清单、问题清单和预期结论。'
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as unknown as typeof fetch;
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';

    try {
      const result = await queryTaskTool(
        {
          from: '2026-06-20T00:00:00+08:00',
          to: '2026-06-20T23:59:59+08:00',
          include_completed: false,
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
              appUserId: 'ipollo-user-1'
            },
            app: { id: 'ipollo-app-1', name: '日程助手' },
            tool: { id: 'query_ipollo_tasks', version: '1.4.6' },
            time: '2026-06-19 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      const appCard = JSON.parse(result.app_card);
      const task = appCard.data.items[0];
      expect(task.note).toBe('');
      expect(task.subtasks).toEqual([
        {
          id: 'note-subtask-1',
          title: '提前确认参会人员、会议地点/链接和会议主题。',
          completed: false,
          status: '',
          assigneeType: '',
          assigneeId: '',
          assigneeName: '',
          visibility: ''
        },
        {
          id: 'note-subtask-2',
          title: '准备会议材料、需求清单、问题清单和预期结论。',
          completed: false,
          status: '',
          assigneeType: '',
          assigneeId: '',
          assigneeName: '',
          visibility: ''
        }
      ]);
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

  it('returns a single task app card for focused time-window queries', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          items: [
            {
              id: 'task-no-time',
              title: '明天全天没有具体时间的任务',
              status: 'pending',
              assignees: [
                {
                  assigneeType: 'user',
                  assigneeId: 'ipollo-user-1',
                  assigneeName: '我',
                  role: 'owner'
                }
              ]
            },
            {
              id: 'task-8am',
              title: '起床看书',
              dueAt: '2026-06-20T08:00:00+08:00',
              status: 'pending',
              assignees: [
                {
                  assigneeType: 'user',
                  assigneeId: 'ipollo-user-1',
                  assigneeName: '我',
                  role: 'owner'
                }
              ]
            },
            {
              id: 'task-830am',
              title: '8 点半喝水',
              dueAt: '2026-06-20T08:30:00+08:00',
              status: 'pending',
              assignees: [
                {
                  assigneeType: 'user',
                  assigneeId: 'ipollo-user-1',
                  assigneeName: '我',
                  role: 'owner'
                }
              ]
            }
          ]
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as unknown as typeof fetch;
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com/api';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';

    try {
      const result = await queryTaskTool(
        {
          from: '2026-06-20T08:00:00+08:00',
          to: '2026-06-20T08:59:59+08:00',
          include_completed: false,
          limit: 5
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
            tool: { id: 'query_ipollo_tasks', version: '1.4.6' },
            time: '2026-06-19 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      const appCard = JSON.parse(result.app_card);
      expect(result.count).toBe(1);
      expect(JSON.parse(result.tasks_json)).toHaveLength(1);
      expect(appCard.id).toBe('ipollo-schedule-task:detail:task-8am');
      expect(appCard.componentName).toBe(SCHEDULE_TASK_CARD_COMPONENT);
      expect(appCard.data.kind).toBe('detail');
      expect(appCard.data.operation).toBe('query');
      expect(appCard.data.badgeLabel).toBe('查询结果');
      expect(appCard.data.tone).toBe('query');
      expect(appCard.data.task.taskId).toBe('task-8am');
      expect(appCard.data.task.title).toBe('起床看书');
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

  it('returns a single task app card when a natural-language keyword identifies the task', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    const urls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      const href = String(url);
      urls.push(href);
      const parsed = new URL(href);
      const hasTimeWindow = parsed.searchParams.has('dueFrom') || parsed.searchParams.has('dueTo');
      return new Response(
        JSON.stringify({
          success: true,
          items: hasTimeWindow
            ? []
            : [
                {
                  id: 'ai-speech-1',
                  title: '人工智能主题演讲',
                  dueAt: '2026-06-21T13:00:00+08:00',
                  status: 'pending',
                  note: '地点：北京中关村',
                  assignees: [
                    {
                      assigneeType: 'user',
                      assigneeId: 'ipollo-user-1',
                      assigneeName: '我',
                      role: 'owner'
                    }
                  ],
                  subtasks: [
                    { id: 'subtask-1', title: '确认演讲材料', completed: true },
                    { id: 'subtask-2', title: '规划前往中关村路线', completed: false }
                  ]
                },
                {
                  id: 'other-task',
                  title: '跟美国 BBS 公司开会',
                  dueAt: '2026-06-20T23:00:00+08:00',
                  status: 'pending',
                  assignees: [
                    {
                      assigneeType: 'user',
                      assigneeId: 'ipollo-user-1',
                      assigneeName: '我',
                      role: 'owner'
                    }
                  ]
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
          from: '2026-06-21T13:00:00+08:00',
          to: '2026-06-21T13:05:00+08:00',
          keyword: '单独给我人工智能主题演讲',
          include_completed: false,
          limit: 1
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
            tool: { id: 'query_ipollo_tasks', version: '1.4.6' },
            time: '2026-06-19 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      const appCard = JSON.parse(result.app_card);
      expect(urls).toHaveLength(2);
      expect(new URL(urls[0]).searchParams.get('dueFrom')).toBe('2026-06-21T13:00:00+08:00');
      expect(new URL(urls[1]).searchParams.get('dueFrom')).toBeNull();
      expect(result.count).toBe(1);
      expect(JSON.parse(result.tasks_json)[0].id).toBe('ai-speech-1');
      expect(appCard.componentName).toBe(SCHEDULE_TASK_CARD_COMPONENT);
      expect(appCard.data.kind).toBe('detail');
      expect(appCard.data.operation).toBe('query');
      expect(appCard.data.task.taskId).toBe('ai-speech-1');
      expect(appCard.data.task.title).toBe('人工智能主题演讲');
      expect(appCard.data.task.subtasks).toHaveLength(2);
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
            tool: { id: 'create_ipollo_task', version: '1.4.6' },
            time: '2026-06-06 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      expect(result.ok).toBe(true);
      expect(result.task_id).toBe('created-task-1');
      expect(result.confirm_card_json).toBe('');
      const appCard = JSON.parse(result.app_card);
      expect(appCard.id).toBe('ipollo-schedule-task:created:created-task-1');
      expect(appCard.componentName).toBe(SCHEDULE_TASK_CARD_COMPONENT);
      expect(appCard.data.kind).toBe('created');
      expect(appCard.data.operation).toBe('create');
      expect(appCard.data.badgeLabel).toBe('创建成功');
      expect(appCard.data.tone).toBe('success');
      expect(appCard.data.task.taskId).toBe('created-task-1');
      expect(appCard.data.href).toBe('/ai-task-detail?taskId=created-task-1');
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

  it('returns an update app card when updating a task through the schedule API', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    let body: Record<string, unknown> = {};
    let url = '';
    let headers: Record<string, string> = {};
    globalThis.fetch = (async (requestUrl: string | URL | Request, init?: RequestInit) => {
      url = String(requestUrl);
      body = JSON.parse(String(init?.body ?? '{}'));
      headers = init?.headers as Record<string, string>;
      return new Response(JSON.stringify({ success: true, id: 'task-update-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as unknown as typeof fetch;
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';

    try {
      const result = await updateTaskTool(
        {
          task_id: 'task-update-1',
          patch_json: JSON.stringify({
            title: '更新后的任务',
            schedule: {
              mode: 'once',
              timezone: 'Asia/Shanghai',
              dueAt: '2026-06-20T14:00:00+08:00'
            }
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
            tool: { id: 'update_ipollo_task', version: '1.4.6' },
            time: '2026-06-06 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      const appCard = JSON.parse(result.app_card);
      expect(result.ok).toBe(true);
      expect(url).toBe(
        'https://aino.example.com/api/ai/agent/tasks/task-update-1?applicationId=ipollo-app-1'
      );
      expect(body.title).toBe('更新后的任务');
      expect(headers.Authorization).toBe('Bearer secret-1');
      expect(headers['x-current-user-id']).toBe('ipollo-user-1');
      expect(appCard.id).toBe('ipollo-schedule-task:updated:task-update-1');
      expect(appCard.componentName).toBe(SCHEDULE_TASK_CARD_COMPONENT);
      expect(appCard.data.kind).toBe('updated');
      expect(appCard.data.operation).toBe('update');
      expect(appCard.data.badgeLabel).toBe('已更新');
      expect(appCard.data.tone).toBe('success');
      expect(appCard.data.task.taskId).toBe('task-update-1');
      expect(appCard.data.title).toBe('日程已更新');
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

  it('promotes updated agent subtasks to task executors for dispatch', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    let body: Record<string, unknown> = {};
    globalThis.fetch = (async (requestUrl: string | URL | Request, init?: RequestInit) => {
      body = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify({ success: true, id: 'task-update-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as unknown as typeof fetch;
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';

    try {
      const result = await updateTaskTool(
        {
          task_id: 'task-update-1',
          patch_json: JSON.stringify({
            subtasks: [
              {
                title: '吃饭时了解 AI 美股动态',
                content: '整理隔夜美股 AI 板块动态、重点公司消息、市场情绪和风险点。',
                assigneeType: 'agent',
                assigneeId: 'market-agent-1',
                assigneeName: 'AI Market Intelligence Agent'
              }
            ]
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
            tool: { id: 'update_ipollo_task', version: '1.4.6' },
            time: '2026-06-06 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      expect(result.ok).toBe(true);
      expect(body.subtasks).toEqual([
        expect.objectContaining({
          title: '吃饭时了解 AI 美股动态',
          assigneeType: 'agent',
          assigneeId: 'market-agent-1',
          assigneeName: 'AI Market Intelligence Agent'
        })
      ]);
      expect(body.assignees).toEqual([
        {
          assigneeType: 'agent',
          assigneeId: 'market-agent-1',
          assigneeName: 'AI Market Intelligence Agent',
          role: 'executor'
        }
      ]);
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
            tool: { id: 'create_ipollo_task', version: '1.4.6' },
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
                matchReasons: ['简介:资料/检索'],
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
              iPolloApplicationId: 'ipollo-app-main',
              upstreamAppId: 'current-fastgpt-app'
            },
            tool: { id: 'discover_ipollo_published_agents', version: '1.4.6' },
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
      expect(result.agents_markdown).toContain('简介:资料/检索');
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
      expect(invokeBody.iPolloApplicationId).toBe('ipollo-app-main');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('falls back to current App published agents when FastGPT discovery has no positive match', async () => {
    const originalFetch = globalThis.fetch;
    const originalBaseUrl = process.env.IPOLLO_APP_TASK_API_BASE_URL;
    const originalSecret = process.env.IPOLLO_APP_TASK_API_SECRET;
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const requestUrl = String(url);
      calls.push({ url: requestUrl, init });
      if (requestUrl.endsWith('/api/plugin/getAccessToken')) {
        return new Response(JSON.stringify({ data: { accessToken: 'plugin-access-token' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (requestUrl.includes('/api/invoke/publishedAgents')) {
        return new Response(
          JSON.stringify({
            data: {
              agents: [
                {
                  appBotId: 'health-bot',
                  fastgptAppId: 'health-app',
                  shareId: 'share-health',
                  name: '健康管理助手',
                  intro: '记录饮食和运动',
                  channelName: '健康管理助手',
                  score: 0,
                  capabilities: ['饮食', '运动']
                }
              ],
              count: 1
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (requestUrl.includes('/api/ai/agent/published-agents')) {
        return new Response(
          JSON.stringify({
            success: true,
            agents: [
              {
                appBotId: 'market-agent-1',
                botUserId: 'market-user-1',
                fastgptAppId: 'market-fastgpt-app',
                shareId: '',
                name: 'AI Market Intelligence Agent',
                intro: '持续监控美股股票异动、财报、新闻、SEC 披露和资金流。',
                channelName: 'AI Market Intelligence Agent',
                score: 42,
                matchReasons: ['简介:美股/股票/新闻'],
                capabilities: ['market news', 'stock monitoring']
              }
            ],
            count: 1
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ success: false, error: 'unexpected url' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as unknown as typeof fetch;
    process.env.IPOLLO_APP_TASK_API_BASE_URL = 'https://aino.example.com';
    process.env.IPOLLO_APP_TASK_API_SECRET = 'secret-1';

    try {
      const result = await discoverAgentsTool(
        {
          task_text: '吃饭时了解 AI 美股动态',
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
              name: '',
              appUserId: 'ipollo-user-1'
            },
            app: {
              id: 'current-fastgpt-app',
              name: '日程助手',
              iPolloApplicationId: 'ipollo-app-main',
              upstreamAppId: 'current-fastgpt-app'
            },
            tool: { id: 'discover_ipollo_published_agents', version: '1.4.6' },
            time: '2026-06-06 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      const appAgentCall = calls.find((call) =>
        call.url.includes('/api/ai/agent/published-agents')
      );
      expect(result.ok).toBe(true);
      expect(result.recommended_agent_id).toBe('market-agent-1');
      expect(result.recommended_agent_name).toBe('AI Market Intelligence Agent');
      expect(result.agents_markdown).toContain('简介:美股/股票/新闻');
      expect(JSON.parse(result.recommended_assignees_json)).toEqual([
        {
          assigneeType: 'agent',
          assigneeId: 'market-agent-1',
          assigneeName: 'AI Market Intelligence Agent',
          role: 'executor'
        }
      ]);
      expect(appAgentCall?.init?.headers).toMatchObject({
        Authorization: 'Bearer secret-1',
        'x-current-user-id': 'ipollo-user-1'
      });
      expect(appAgentCall?.url).toContain('taskText=');
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

  it('does not recommend a random published agent when discovery has no positive match', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
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
                appBotId: 'aino-bot-health',
                fastgptAppId: 'fastgpt-app-health',
                shareId: 'share-health',
                name: '健康管理助手',
                intro: '记录饮食和运动',
                channelName: '健康管理助手发布',
                score: 0,
                capabilities: ['饮食', '运动']
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
          task_text: '修改首页代码并补测试',
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
              applicationId: 'ipollo-app-main',
              upstreamAppId: 'current-fastgpt-app'
            },
            tool: { id: 'discover_ipollo_published_agents', version: '1.4.6' },
            time: '2026-06-06 12:00:00'
          },
          streamResponse: () => {}
        }
      );

      expect(result.ok).toBe(true);
      expect(result.count).toBe(1);
      expect(result.recommended_agent_id).toBe('');
      expect(result.recommended_agent_name).toBe('');
      expect(JSON.parse(result.recommended_assignees_json)).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
