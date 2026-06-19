import type { Assignee, Subtask, TaskPayload } from './schema';

export const SCHEDULE_APP_CARD_OUTPUT_KEY = 'app_card';
export const SCHEDULE_TASK_CARD_COMPONENT = 'IPolloScheduleTaskCard';
export const SCHEDULE_LIST_CARD_COMPONENT = 'IPolloScheduleListCard';

type ScheduleTaskCardKind = 'confirm' | 'created' | 'updated' | 'detail';
type ScheduleCardTone = 'success' | 'query' | 'pending';

function resolveTaskCardDisplay(kind: ScheduleTaskCardKind) {
  if (kind === 'created') {
    return {
      operation: 'create',
      badgeLabel: '创建成功',
      tone: 'success' satisfies ScheduleCardTone
    };
  }
  if (kind === 'updated') {
    return {
      operation: 'update',
      badgeLabel: '已更新',
      tone: 'success' satisfies ScheduleCardTone
    };
  }
  if (kind === 'detail') {
    return { operation: 'query', badgeLabel: '查询结果', tone: 'query' satisfies ScheduleCardTone };
  }
  return { operation: 'confirm', badgeLabel: '待确认', tone: 'pending' satisfies ScheduleCardTone };
}

function receiverKey(receiver: Pick<Assignee, 'assigneeType' | 'assigneeId'>): string {
  return `${receiver.assigneeType}:${receiver.assigneeId}`;
}

function subtaskKey(subtask: Pick<Subtask, 'assigneeType' | 'assigneeId'>): string {
  if (!subtask.assigneeType || !subtask.assigneeId) return '';
  return `${subtask.assigneeType}:${subtask.assigneeId}`;
}

function summarizeSubtask(subtask: Subtask, index: number) {
  return {
    id: subtask.id || `subtask-${index + 1}`,
    title: subtask.title,
    assigneeType: subtask.assigneeType,
    assigneeId: subtask.assigneeId,
    assigneeName: subtask.assigneeName,
    visibility: subtask.visibility,
    note:
      subtask.visibility === 'shared'
        ? subtask.content
        : subtask.assigneeId
          ? '该子任务由对应执行人处理。'
          : '该子任务暂未指定执行人。'
  };
}

function buildTaskContext(task: TaskPayload) {
  return {
    title: task.title,
    content: task.content,
    goal: task.goal,
    schedule: task.schedule,
    creatorUserId: task.userId,
    attachments: task.attachments
  };
}

export function buildConfirmCard(task: TaskPayload) {
  const firstAssignee = task.assignees[0];
  return {
    type: 'ipollo_task_confirm',
    title: task.title,
    description: task.content || '确认后将在 iPollo App 创建任务。',
    schedule: task.schedule,
    assignees: task.assignees,
    subtasks: task.subtasks,
    attachments: task.attachments,
    primaryAction: { label: '确认创建', action: 'create_ipollo_task' },
    secondaryAction: { label: '继续修改', action: 'edit_task_draft' },
    summary: [
      task.schedule.mode === 'none' ? '未设置时间' : `时间类型：${task.schedule.mode}`,
      firstAssignee
        ? `执行人：${firstAssignee.assigneeName || firstAssignee.assigneeId}`
        : '未设置执行人',
      task.subtasks.length > 0 ? `子任务：${task.subtasks.length} 个` : '无子任务'
    ]
  };
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function firstBoolean(...values: unknown[]): boolean | undefined {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const text = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'done', 'completed', 'finished'].includes(text)) return true;
      if (['false', '0', 'no', 'pending', 'running', 'cancelled', 'canceled'].includes(text)) {
        return false;
      }
    }
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function buildTaskHref(taskId: string) {
  return taskId ? `/ai-task-detail?taskId=${encodeURIComponent(taskId)}` : '';
}

function compactIdPart(value: string, fallback = 'none') {
  const text = value.trim();
  if (!text) return fallback;
  return text.replace(/\s+/g, '_').slice(0, 160);
}

function normalizeAssigneesForAppCard(value: unknown) {
  return asArray(value)
    .map((item, index) => {
      const record = asRecord(item);
      const assigneeType = firstString(record.assigneeType, record.type) || 'user';
      const assigneeId = firstString(
        record.assigneeId,
        record.id,
        record.userId,
        record.user_id,
        record.agentId,
        record.agent_id,
        `assignee-${index + 1}`
      );
      const name =
        firstString(
          record.assigneeName,
          record.name,
          record.displayName,
          record.display_name,
          record.nickname,
          record.title
        ) || (assigneeType === 'user' ? '自己' : assigneeId || 'Agent');
      const avatarUrl = firstString(
        record.avatarUrl,
        record.avatar_url,
        record.imageUrl,
        record.image,
        record.picture,
        record.photoUrl,
        record.photo_url,
        record.headImg,
        record.head_img
      );

      return {
        id: assigneeId,
        assigneeId,
        assigneeType,
        name,
        assigneeName: name,
        avatarUrl,
        role: firstString(record.role)
      };
    })
    .slice(0, 8);
}

function normalizeSubtasksForAppCard(value: unknown) {
  return asArray(value)
    .map((item, index) => {
      const record = asRecord(item);
      const status = firstString(record.status, record.state);
      const completed =
        firstBoolean(
          record.completed,
          record.done,
          record.isDone,
          record.is_done,
          record.finished
        ) ?? ['completed', 'done', 'finished'].includes(status.toLowerCase());
      const title = firstString(record.title, record.name, record.content) || `子任务 ${index + 1}`;

      return {
        id: firstString(record.id, record.subtaskId, record.subtask_id, `subtask-${index + 1}`),
        title,
        completed,
        status,
        assigneeType: firstString(record.assigneeType, record.type),
        assigneeId: firstString(record.assigneeId, record.userId, record.agentId),
        assigneeName: firstString(record.assigneeName, record.name),
        visibility: firstString(record.visibility)
      };
    })
    .slice(0, 6);
}

function splitNumberedSubtaskItems(text: string): string[] {
  const normalized = text.replace(/\r/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const markerRegex = /(?:^|[\s;；])\d{1,2}[.、)]\s*/g;
  const markers = Array.from(normalized.matchAll(markerRegex)).map((match) => ({
    markerStart: match.index ?? 0,
    itemStart: (match.index ?? 0) + match[0].length
  }));

  if (markers.length > 0) {
    return markers
      .map((marker, index) => {
        const next = markers[index + 1];
        return normalized
          .slice(marker.itemStart, next ? next.markerStart : normalized.length)
          .replace(/^[;；\s]+|[;；\s]+$/g, '')
          .trim();
      })
      .filter(Boolean)
      .slice(0, 6);
  }

  return normalized
    .split(/[;；]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function extractSubtasksFromNoteForAppCard(note: string) {
  const match = note.match(/(?:子项目|子任务|子项|待办项)[:：]\s*([\s\S]+)/);
  if (!match || match.index === undefined) {
    return { note, subtasks: [] as ReturnType<typeof normalizeSubtasksForAppCard> };
  }

  const prefix = note.slice(0, match.index).trim();
  const titles = splitNumberedSubtaskItems(match[1] || '');

  return {
    note: prefix,
    subtasks: titles.map((title, index) => ({
      id: `note-subtask-${index + 1}`,
      title,
      completed: false,
      status: '',
      assigneeType: '',
      assigneeId: '',
      assigneeName: '',
      visibility: ''
    }))
  };
}

function normalizeTaskForAppCard(task: unknown, fallbackId = '') {
  const record = asRecord(task);
  const schedule = asRecord(record.schedule);
  const taskId = firstString(record.id, record.taskId, record.task_id, fallbackId);
  const title = firstString(record.title, record.name) || '日程';
  const rawNote = firstString(record.note, record.content, record.goal, record.description);
  const startAt = firstString(record.startAt, record.start_at, schedule.startAt);
  const endAt = firstString(record.endAt, record.end_at, schedule.endAt);
  const dueAt =
    firstString(
      record.dueAt,
      record.due_at,
      record.dueDate,
      record.due_date,
      record.scheduledAt,
      record.nextRunAt,
      schedule.dueAt
    ) || startAt;
  const status = firstString(record.status) || 'pending';
  const assignees = normalizeAssigneesForAppCard(
    record.assignees ?? record.agents ?? record.participants
  );
  const normalizedSubtasks = normalizeSubtasksForAppCard(
    record.subtasks ?? record.children ?? record.checklist
  );
  const noteSubtaskExtraction =
    normalizedSubtasks.length === 0
      ? extractSubtasksFromNoteForAppCard(rawNote)
      : { note: rawNote, subtasks: [] };
  const subtasks =
    normalizedSubtasks.length > 0 ? normalizedSubtasks : noteSubtaskExtraction.subtasks;
  const note = noteSubtaskExtraction.note;

  return {
    taskId,
    id: taskId,
    title,
    note,
    dueAt,
    startAt,
    endAt,
    status,
    assignees,
    subtasks,
    href: buildTaskHref(taskId)
  };
}

export function buildScheduleTaskAppCard(input: {
  kind: ScheduleTaskCardKind;
  task: unknown;
  taskId?: string;
  title?: string;
}) {
  const task = normalizeTaskForAppCard(input.task, input.taskId);
  const display = resolveTaskCardDisplay(input.kind);
  const cardId = [
    'ipollo-schedule-task',
    input.kind,
    compactIdPart(task.taskId || `${task.title}:${task.dueAt}`)
  ].join(':');
  return {
    id: cardId,
    componentName: SCHEDULE_TASK_CARD_COMPONENT,
    data: {
      kind: input.kind,
      operation: display.operation,
      badgeLabel: display.badgeLabel,
      tone: display.tone,
      title: input.title || task.title,
      task,
      actionLabel: task.taskId ? '查看日程详情' : '查看日程',
      href: task.href
    }
  };
}

export function buildScheduleListAppCard(input: {
  title?: string;
  items: unknown[];
  from?: string;
  to?: string;
}) {
  const items = input.items.map((item) => normalizeTaskForAppCard(item));
  const itemSignature = items
    .map((item) => compactIdPart(item.taskId || `${item.title}:${item.dueAt}`))
    .join('|')
    .slice(0, 320);
  const cardId = [
    'ipollo-schedule-list',
    compactIdPart(input.from || ''),
    compactIdPart(input.to || ''),
    items.length,
    itemSignature || 'empty'
  ].join(':');
  return {
    id: cardId,
    componentName: SCHEDULE_LIST_CARD_COMPONENT,
    data: {
      kind: 'query_list',
      operation: 'query',
      badgeLabel: '查询结果',
      tone: 'query',
      title: input.title || '日程查询结果',
      count: items.length,
      from: input.from || '',
      to: input.to || '',
      emptyText: '暂无日程',
      items
    }
  };
}

export function buildExecutionPackages(task: TaskPayload) {
  const packages = task.assignees.map((assignee) => {
    const key = receiverKey(assignee);
    const isCoordinator = assignee.role === 'owner' || assignee.role === 'coordinator';
    const assignedSubtasks = task.subtasks
      .map((subtask, index) => ({ subtask, index }))
      .filter(({ subtask }) => subtaskKey(subtask) === key);

    return {
      type: 'ipollo_task_execution_package',
      applicationId: task.applicationId,
      taskId: '',
      receiver: assignee,
      view:
        assignee.role === 'owner'
          ? 'owner_view'
          : assignee.role === 'coordinator'
            ? 'coordinator_view'
            : 'assignee_view',
      instruction: isCoordinator
        ? '你负责统筹这个任务。请跟踪全部子任务进展；只有明确分配给你的子任务才由你执行。'
        : '你只负责执行 assignment 中列出的子任务。其他子任务由其他协作者处理，不要代做。',
      taskContext: buildTaskContext(task),
      assignment: {
        subtasks: isCoordinator
          ? assignedSubtasks.map(({ subtask, index }) => ({
              ...subtask,
              id: subtask.id || `subtask-${index + 1}`
            }))
          : assignedSubtasks.map(({ subtask, index }) => ({
              ...subtask,
              id: subtask.id || `subtask-${index + 1}`
            })),
        canCompleteTask: assignee.role === 'owner',
        canUpdateAssignedSubtasks: true
      },
      collaboration: {
        hasOtherAssignees:
          task.assignees.length > 1 || task.subtasks.some((subtask) => subtaskKey(subtask) !== key),
        visibleAssignees: task.assignees.map((item) => ({
          assigneeType: item.assigneeType,
          assigneeId: item.assigneeId,
          assigneeName: item.assigneeName,
          role: item.role
        })),
        subtasks: isCoordinator
          ? task.subtasks.map((subtask, index) => ({
              ...subtask,
              id: subtask.id || `subtask-${index + 1}`,
              ownership:
                subtaskKey(subtask) === key
                  ? 'assigned_to_receiver'
                  : subtask.assigneeId
                    ? 'assigned_to_other'
                    : 'unassigned'
            }))
          : task.subtasks.map(summarizeSubtask)
      },
      permissions: {
        canViewFullTask: isCoordinator,
        canViewOtherSubtaskDetails: isCoordinator,
        canUpdateSubtask: true,
        canCompleteTask: assignee.role === 'owner'
      }
    };
  });

  const subtaskOnlyReceivers = Array.from(
    new Map(
      task.subtasks
        .filter((subtask) => subtask.assigneeType && subtask.assigneeId)
        .filter(
          (subtask) =>
            !task.assignees.some((assignee) => receiverKey(assignee) === subtaskKey(subtask))
        )
        .map((subtask) => [
          subtaskKey(subtask),
          {
            assigneeType: subtask.assigneeType!,
            assigneeId: subtask.assigneeId!,
            assigneeName: subtask.assigneeName,
            role: 'executor' as const
          }
        ])
    ).values()
  );

  return [
    ...packages,
    ...subtaskOnlyReceivers.map((assignee) => {
      const key = receiverKey(assignee);
      const assignedSubtasks = task.subtasks
        .map((subtask, index) => ({ subtask, index }))
        .filter(({ subtask }) => subtaskKey(subtask) === key);

      return {
        type: 'ipollo_task_execution_package',
        applicationId: task.applicationId,
        taskId: '',
        receiver: assignee,
        view: 'assignee_view',
        instruction:
          '你只负责执行 assignment 中列出的子任务。其他子任务由其他协作者处理，不要代做。',
        taskContext: buildTaskContext(task),
        assignment: {
          subtasks: assignedSubtasks.map(({ subtask, index }) => ({
            ...subtask,
            id: subtask.id || `subtask-${index + 1}`
          })),
          canCompleteTask: false,
          canUpdateAssignedSubtasks: true
        },
        collaboration: {
          hasOtherAssignees: true,
          visibleAssignees: task.assignees.map((item) => ({
            assigneeType: item.assigneeType,
            assigneeId: item.assigneeId,
            assigneeName: item.assigneeName,
            role: item.role
          })),
          subtasks: task.subtasks.map(summarizeSubtask)
        },
        permissions: {
          canViewFullTask: false,
          canViewOtherSubtaskDetails: false,
          canUpdateSubtask: true,
          canCompleteTask: false
        }
      };
    })
  ];
}

export function formatTasksMarkdown(tasks: unknown): string {
  if (!Array.isArray(tasks)) return '';
  if (tasks.length === 0) return '暂无任务。';
  return tasks
    .slice(0, 50)
    .map((item: any, index) => {
      const title = String(item?.title ?? item?.name ?? `任务 ${index + 1}`);
      const time = item?.dueAt || item?.nextRunAt || item?.scheduledAt || '';
      const status = item?.status ? ` · ${item.status}` : '';
      return `${index + 1}. ${title}${time ? ` · ${time}` : ''}${status}`;
    })
    .join('\n');
}

export function parseTasksFromResponse(text: string): unknown[] {
  if (!text.trim()) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
    if (Array.isArray(parsed?.list)) return parsed.list;
    if (Array.isArray(parsed?.data)) return parsed.data;
    if (Array.isArray(parsed?.tasks)) return parsed.tasks;
  } catch {
    return [];
  }
  return [];
}
