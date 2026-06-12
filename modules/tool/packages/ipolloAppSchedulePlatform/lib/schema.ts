import { z } from 'zod';

export const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

export const DispatchChannelSchema = z.enum(['local', 'system']).default('system');

export const AssigneeSchema = z.object({
  assigneeType: z.enum(['user', 'agent']).default('user'),
  assigneeId: z.string().min(1),
  assigneeName: z.preprocess(emptyToUndefined, z.string().optional()),
  role: z.enum(['owner', 'coordinator', 'executor', 'watcher']).default('executor')
});

export const SubtaskSchema = z.object({
  id: z.preprocess(emptyToUndefined, z.string().optional()),
  title: z.string().min(1),
  content: z.string().default(''),
  expectedOutput: z.string().default(''),
  doneCriteria: z.string().default(''),
  assigneeType: z.enum(['user', 'agent']).optional(),
  assigneeId: z.preprocess(emptyToUndefined, z.string().optional()),
  assigneeName: z.preprocess(emptyToUndefined, z.string().optional()),
  visibility: z.enum(['private', 'summary', 'shared']).default('summary')
});

export const AttachmentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['file', 'link', 'tool']).default('file'),
  url: z.preprocess(emptyToUndefined, z.string().optional()),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const RepeatRuleSchema = z
  .object({
    frequency: z.enum(['once', 'daily', 'weekly']).optional(),
    time: z.preprocess(emptyToUndefined, z.string().optional()),
    dailyFilter: z.enum(['everyday', 'workdays', 'weekends']).optional(),
    weeklyDays: z.array(z.number().int().min(0).max(6)).optional()
  })
  .passthrough();

export const ScheduleSchema = z.object({
  mode: z.enum(['none', 'once', 'recurring', 'range']).default('none'),
  timezone: z.string().default('Asia/Shanghai'),
  dueAt: z.preprocess(emptyToUndefined, z.string().optional()),
  startAt: z.preprocess(emptyToUndefined, z.string().optional()),
  endAt: z.preprocess(emptyToUndefined, z.string().optional()),
  repeatRule: RepeatRuleSchema.default({})
});

export const TaskPayloadSchema = z.object({
  applicationId: z.string().min(1),
  userId: z.string().min(1),
  title: z.string().min(1),
  content: z.string().default(''),
  goal: z.string().default(''),
  schedule: ScheduleSchema.default({ mode: 'none', timezone: 'Asia/Shanghai', repeatRule: {} }),
  assignees: z.array(AssigneeSchema).default([]),
  subtasks: z.array(SubtaskSchema).default([]),
  attachments: z.array(AttachmentSchema).default([]),
  source: z.enum(['agent', 'user', 'workflow', 'planner']).default('agent'),
  requireUserConfirm: z.boolean().default(false)
});

export const TaskPatchSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  goal: z.string().optional(),
  schedule: ScheduleSchema.optional(),
  assignees: z.array(AssigneeSchema).optional(),
  subtasks: z.array(SubtaskSchema).optional(),
  attachments: z.array(AttachmentSchema).optional(),
  status: z.enum(['pending', 'running', 'completed', 'cancelled']).optional()
});

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export type TaskPayload = z.infer<typeof TaskPayloadSchema>;
export type Assignee = z.infer<typeof AssigneeSchema>;
export type Subtask = z.infer<typeof SubtaskSchema>;
