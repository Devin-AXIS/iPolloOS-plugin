import { afterEach, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { OutputType, tool as runImageToVideo } from '../src';

afterEach(() => {
  vi.restoreAllMocks();
});

test('creates and polls a HappyHorse image-to-video task', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'create-request',
          output: { task_status: 'PENDING', task_id: 'task-2' }
        }),
        { status: 200 }
      )
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'query-request',
          output: {
            task_id: 'task-2',
            task_status: 'SUCCEEDED',
            video_url: 'https://example.com/i2v.mp4'
          },
          usage: { duration: 5, SR: 1080 }
        }),
        { status: 200 }
      )
    );

  const result = await runImageToVideo({
    apiKey: 'sk-test',
    image_url: 'https://example.com/first-frame.png',
    prompt: 'A cat running on grass',
    region: 'beijing',
    resolution: '1080P',
    duration: 5,
    watermark: true,
    poll_interval_seconds: 0,
    max_poll_attempts: 1
  });

  expect(result.video_url).toBe('https://example.com/i2v.mp4');
  expect(result.task_id).toBe('task-2');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis'
  );
  expect(fetchMock.mock.calls[1][0]).toBe('https://dashscope.aliyuncs.com/api/v1/tasks/task-2');

  const createOptions = fetchMock.mock.calls[0][1] as RequestInit;
  expect(JSON.parse(createOptions.body as string)).toEqual({
    model: 'happyhorse-1.0-i2v',
    input: {
      prompt: 'A cat running on grass',
      media: [
        {
          type: 'first_frame',
          url: 'https://example.com/first-frame.png'
        }
      ]
    },
    parameters: {
      resolution: '1080P',
      duration: 5,
      watermark: true
    }
  });
});

test('exports an output schema that can be converted to JSON schema', () => {
  expect(() => z.toJSONSchema(OutputType)).not.toThrow();
});
