import { cidmsJsonRequest, safeJson } from './client';
import type { CidmsAuth } from './schemas';
import { extractVideoResultUrl } from './talkshowVideo';

export type VideoTaskQueryInput = CidmsAuth & {
  task_id: string;
};

export type VideoTaskQueryOut = {
  task_id: string;
  status: string;
  progress: number;
  result_url: string;
  completed: boolean;
  should_continue: boolean;
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
  const data = await request<Record<string, unknown>>({
    auth: input,
    method: 'GET',
    path: `/v1/video/generations/${encodeURIComponent(input.task_id)}`
  });
  const taskId = readString(data, 'task_id') || readString(data, 'id') || input.task_id;
  const status = readString(data, 'status');
  const progress = readNumber(data, 'progress');
  const resultUrl = extractVideoResultUrl(data);
  const failed = FAILED_STATUSES.has(status.toLowerCase());
  const completed = Boolean(resultUrl) || failed;

  return {
    task_id: taskId,
    status,
    progress,
    result_url: resultUrl,
    completed,
    should_continue: !completed,
    response_json: safeJson(data),
    system_error: failed ? `CIDMS video task failed: ${status || 'unknown'}` : undefined
  };
}

function readString(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === 'string' ? v : '';
}

function readNumber(data: Record<string, unknown>, key: string): number {
  const v = data[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}
