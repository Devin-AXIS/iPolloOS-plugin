import { cidmsJsonRequest, safeJson } from './client';
import type { CidmsAuth } from './schemas';
import { extractVideoResultUrl } from './talkshowVideo';

export type VideoTaskQueryInput = CidmsAuth & {
  task_id: string;
  max_wait_seconds?: number;
};

export type VideoTaskQueryOut = {
  task_id: string;
  status: string;
  progress: number;
  result_url: string;
  completed: boolean;
  should_continue: boolean;
  poll_count: number;
  elapsed_seconds: number;
  timed_out: boolean;
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
const POLL_INTERVAL_MS = 10_000;
const DEFAULT_MAX_WAIT_SECONDS = 600;

type Sleep = (ms: number) => Promise<void>;

export async function queryVideoTaskUntilDone(
  input: VideoTaskQueryInput,
  request: CidmsRequester = cidmsJsonRequest,
  sleep: Sleep = delay
): Promise<VideoTaskQueryOut> {
  const startedAt = Date.now();
  const maxWaitMs = Math.max(0, Math.floor(input.max_wait_seconds ?? DEFAULT_MAX_WAIT_SECONDS) * 1000);
  let pollCount = 0;
  let lastOut: VideoTaskQueryOut | undefined;

  while (true) {
    pollCount += 1;
    const out = await queryVideoTaskOnce(input, request, startedAt, pollCount);
    lastOut = out;
    logVideoPoll(out, Math.floor(maxWaitMs / 1000));

    if (out.result_url || FAILED_STATUSES.has(out.status.toLowerCase())) return out;

    if (Date.now() - startedAt >= maxWaitMs) {
      logVideoPollTimeout(out, Math.floor(maxWaitMs / 1000));
      return {
        ...out,
        timed_out: true,
        system_error: `CIDMS video task query timed out after ${Math.floor(maxWaitMs / 1000)} seconds`
      };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return lastOut as VideoTaskQueryOut;
}

export async function queryVideoTaskOnce(
  input: VideoTaskQueryInput,
  request: CidmsRequester = cidmsJsonRequest,
  startedAt = Date.now(),
  pollCount = 1
): Promise<VideoTaskQueryOut> {
  const inputTaskId = cleanString(input.task_id);
  if (!inputTaskId) throw new Error('task_id is required');

  const data = await request<Record<string, unknown>>({
    auth: input,
    method: 'GET',
    path: `/v1/video/generations/${encodeURIComponent(inputTaskId)}`
  });
  const taskId = readString(data, 'task_id') || readString(data, 'id') || inputTaskId;
  const status = readString(data, 'status');
  const progress = readNumber(data, 'progress');
  const resultUrl = extractVideoResultUrl(data);
  const failed = FAILED_STATUSES.has(status.toLowerCase());
  const completed = Boolean(resultUrl) || failed;
  const shouldContinue = !completed;

  return {
    task_id: taskId,
    status,
    progress,
    result_url: resultUrl,
    completed,
    should_continue: shouldContinue,
    poll_count: pollCount,
    elapsed_seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
    timed_out: false,
    response_json: safeJson(data),
    system_error: failed ? `CIDMS video task failed: ${status || 'unknown'}` : undefined
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logVideoPoll(out: VideoTaskQueryOut, maxWaitSeconds: number): void {
  console.info(
    safeJson({
      event: 'cidms_video_poll',
      task_id: out.task_id,
      poll_count: out.poll_count,
      status: out.status,
      progress: out.progress,
      progress_available: responseHasProgress(out.response_json),
      has_result_url: Boolean(out.result_url),
      elapsed_seconds: out.elapsed_seconds,
      max_wait_seconds: maxWaitSeconds,
      timed_out: false
    })
  );
}

function logVideoPollTimeout(out: VideoTaskQueryOut, maxWaitSeconds: number): void {
  console.info(
    safeJson({
      event: 'cidms_video_poll_timeout',
      task_id: out.task_id,
      poll_count: out.poll_count,
      status: out.status,
      progress: out.progress,
      progress_available: responseHasProgress(out.response_json),
      has_result_url: Boolean(out.result_url),
      elapsed_seconds: out.elapsed_seconds,
      max_wait_seconds: maxWaitSeconds,
      timed_out: true
    })
  );
}

function responseHasProgress(responseJson: string): boolean {
  try {
    const parsed = JSON.parse(responseJson);
    return Boolean(parsed && typeof parsed === 'object' && typeof parsed.progress === 'number');
  } catch {
    return false;
  }
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
