import { afterEach, expect, test, vi } from 'vitest';
import { z } from 'zod';
import { OutputType, tool as runVideoEdit } from '../src';

afterEach(() => {
  vi.restoreAllMocks();
});

test('creates and polls a HappyHorse video-edit task', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'create-request',
          output: { task_status: 'PENDING', task_id: 'task-3' }
        }),
        { status: 200 }
      )
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'query-request',
          output: {
            task_id: 'task-3',
            task_status: 'SUCCEEDED',
            video_url: 'https://example.com/edited.mp4'
          },
          usage: { duration: 5, SR: 720 }
        }),
        { status: 200 }
      )
    );

  const result = await runVideoEdit({
    apiKey: 'sk-test',
    video_url: 'https://example.com/source.mp4',
    prompt: 'Replace the jacket with the reference hoodie',
    reference_image_urls: 'https://example.com/hoodie.png\nhttps://example.com/style.webp',
    region: 'us',
    resolution: '720P',
    watermark: false,
    audio_setting: 'origin',
    poll_interval_seconds: 0,
    max_poll_attempts: 1
  });

  expect(result.video_url).toBe('https://example.com/edited.mp4');
  expect(result.task_id).toBe('task-3');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[0][0]).toBe(
    'https://dashscope-us.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis'
  );
  expect(fetchMock.mock.calls[1][0]).toBe('https://dashscope-us.aliyuncs.com/api/v1/tasks/task-3');

  const createOptions = fetchMock.mock.calls[0][1] as RequestInit;
  expect(JSON.parse(createOptions.body as string)).toEqual({
    model: 'happyhorse-1.0-video-edit',
    input: {
      prompt: 'Replace the jacket with the reference hoodie',
      media: [
        {
          type: 'video',
          url: 'https://example.com/source.mp4'
        },
        {
          type: 'reference_image',
          url: 'https://example.com/hoodie.png'
        },
        {
          type: 'reference_image',
          url: 'https://example.com/style.webp'
        }
      ]
    },
    parameters: {
      resolution: '720P',
      watermark: false,
      audio_setting: 'origin'
    }
  });
});

test('exports an output schema that can be converted to JSON schema', () => {
  expect(() => z.toJSONSchema(OutputType)).not.toThrow();
});
