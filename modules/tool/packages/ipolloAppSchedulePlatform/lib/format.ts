import type { Assignee, Subtask, TaskPayload } from './schema';

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
