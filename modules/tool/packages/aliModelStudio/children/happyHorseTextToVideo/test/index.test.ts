import { afterEach, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { OutputType, tool as runTextToVideo } from '../src';

afterEach(() => {
  vi.restoreAllMocks();
});

test('creates and polls a HappyHorse text-to-video task', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'create-request',
          output: { task_status: 'PENDING', task_id: 'task-1' }
        }),
        { status: 200 }
      )
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'query-request',
          output: {
            task_id: 'task-1',
            task_status: 'SUCCEEDED',
            video_url: 'https://example.com/video.mp4'
          },
          usage: { duration: 5, SR: 720, ratio: '16:9' }
        }),
        { status: 200 }
      )
    );

  const result = await runTextToVideo({
    apiKey: 'sk-test',
    prompt: 'A paper city at night',
    region: 'singapore',
    resolution: '720P',
    ratio: '16:9',
    duration: 5,
    watermark: false,
    poll_interval_seconds: 0,
    max_poll_attempts: 1
  });

  expect(result.video_url).toBe('https://example.com/video.mp4');
  expect(result.task_id).toBe('task-1');
  expect(result.request_id).toBe('query-request');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis'
  );
  expect(fetchMock.mock.calls[1][0]).toBe(
    'https://dashscope-intl.aliyuncs.com/api/v1/tasks/task-1'
  );

  const createOptions = fetchMock.mock.calls[0][1] as RequestInit;
  expect(createOptions.headers).toMatchObject({
    Authorization: 'Bearer sk-test',
    'X-DashScope-Async': 'enable',
    'Content-Type': 'application/json'
  });
  expect(JSON.parse(createOptions.body as string)).toEqual({
    model: 'happyhorse-1.0-t2v',
    input: { prompt: 'A paper city at night' },
    parameters: {
      resolution: '720P',
      ratio: '16:9',
      duration: 5,
      watermark: false
    }
  });
});

test('exports an output schema that can be converted to JSON schema', () => {
  expect(() => z.toJSONSchema(OutputType)).not.toThrow();
});
