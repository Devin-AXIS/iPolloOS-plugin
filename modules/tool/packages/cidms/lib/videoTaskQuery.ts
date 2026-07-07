import { cidmsJsonRequest, safeJson } from './client';
import type { CidmsAuth } from './schemas';
import { extractVideoResultUrl } from './talkshowVideo';

export type VideoTaskQueryInput = CidmsAuth & {
  task_id?: string;
  state_json?: string | Record<string, unknown>;
};

export type VideoTaskQueryOut = {
  task_id: string;
  status: string;
  progress: number;
  result_url: string;
  completed: boolean;
  should_continue: boolean;
  next_state_json: string;
  events_json: string;
  count: number;
  response_json: string;
  system_error?: string;
};

export type CidmsRequest = {
  auth: CidmsAuth;
  path: string;
  method: 'GET' | 'POST';
  body?: unknown;
  timeoutMs?: number;
};

export type CidmsRequester = <T = Record<string, unknown>>(req: CidmsRequest) => Promise<T>;

const FAILED_STATUSES = new Set(['failed', 'error', 'cancelled']);

export async function queryVideoTaskOnce(
  input: VideoTaskQueryInput,
  request: CidmsRequester = cidmsJsonRequest
): Promise<VideoTaskQueryOut> {
  const inputTaskId = cleanString(input.task_id);
  const stateTaskId = readString(parseState(input.state_json), 'task_id');
  const requestedTaskId = inputTaskId || stateTaskId;
  if (!requestedTaskId) {
    throw new Error('task_id is required for first run or state_json');
  }

  const data = await request<Record<string, unknown>>({
    auth: input,
    method: 'GET',
    path: `/v1/video/generations/${encodeURIComponent(requestedTaskId)}`
  });
  const taskId = readString(data, 'task_id') || readString(data, 'id') || requestedTaskId;
  const status = readString(data, 'status');
  const progress = readNumber(data, 'progress');
  const resultUrl = extractVideoResultUrl(data);
  const failed = FAILED_STATUSES.has(status.toLowerCase());
  const completed = Boolean(resultUrl) || failed;
  const shouldContinue = !completed;
  const checkedAt = new Date().toISOString();
  const events = resultUrl
    ? [
        {
          dedupeKey: `cidms-video:${taskId}`,
          eventType: 'cidms.video.completed',
          source: 'cidms',
          occurredAt: checkedAt,
          data: {
            task_id: taskId,
            status,
            progress,
            result_url: resultUrl
          }
        }
      ]
    : [];
  const nextState = {
    task_id: taskId,
    status,
    progress,
    result_url: resultUrl,
    completed,
    should_continue: shouldContinue,
    checkedAt
  };

  return {
    task_id: taskId,
    status,
    progress,
    result_url: resultUrl,
    completed,
    should_continue: shouldContinue,
    next_state_json: safeJson(nextState),
    events_json: safeJson(events),
    count: events.length,
    response_json: safeJson(data),
    system_error: failed ? `CIDMS video task failed: ${status || 'unknown'}` : undefined
  };
}

function parseState(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return {};
    try {
      const parsed = JSON.parse(text);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readString(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return cleanString(v);
}

function readNumber(data: Record<string, unknown>, key: string): number {
  const v = data[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
