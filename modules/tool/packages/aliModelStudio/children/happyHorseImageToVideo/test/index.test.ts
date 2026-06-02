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

test('omits duration when image-to-video uses AI auto settings', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'create-request',
          output: { task_status: 'PENDING', task_id: 'task-auto' }
        }),
        { status: 200 }
      )
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'query-request',
          output: {
            task_id: 'task-auto',
            task_status: 'SUCCEEDED',
            video_url: 'https://example.com/auto-i2v.mp4'
          }
        }),
        { status: 200 }
      )
    );

  await runImageToVideo({
    apiKey: 'sk-test',
    image_url: 'https://example.com/first-frame.png',
    duration: 'auto',
    poll_interval_seconds: 0,
    max_poll_attempts: 1
  });

  const createOptions = fetchMock.mock.calls[0][1] as RequestInit;
  expect(JSON.parse(createOptions.body as string)).toEqual({
    model: 'happyhorse-1.0-i2v',
    input: {
      media: [
        {
          type: 'first_frame',
          url: 'https://example.com/first-frame.png'
        }
      ]
    },
    parameters: {
      resolution: '1080P',
      watermark: true
    }
  });
});

test('uses the first image when image-to-video receives an upstream image array', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'create-request',
          output: { task_status: 'PENDING', task_id: 'task-array' }
        }),
        { status: 200 }
      )
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'query-request',
          output: {
            task_id: 'task-array',
            task_status: 'SUCCEEDED',
            video_url: 'https://example.com/array-i2v.mp4'
          }
        }),
        { status: 200 }
      )
    );

  await runImageToVideo({
    apiKey: 'sk-test',
    image_url: ['https://example.com/generated-1.png', 'https://example.com/generated-2.png'],
    poll_interval_seconds: 0,
    max_poll_attempts: 1
  });

  const createOptions = fetchMock.mock.calls[0][1] as RequestInit;
  expect(JSON.parse(createOptions.body as string).input.media).toEqual([
    {
      type: 'first_frame',
      url: 'https://example.com/generated-1.png'
    }
  ]);
});

test('extracts image URL from markdown or object inputs', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'create-request',
          output: { task_status: 'PENDING', task_id: 'task-object' }
        }),
        { status: 200 }
      )
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'query-request',
          output: {
            task_id: 'task-object',
            task_status: 'SUCCEEDED',
            video_url: 'https://example.com/object-i2v.mp4'
          }
        }),
        { status: 200 }
      )
    );

  await runImageToVideo({
    apiKey: 'sk-test',
    image_url: {
      image_url: {
        url: '![uploaded](https://example.com/uploaded.png)'
      }
    },
    poll_interval_seconds: 0,
    max_poll_attempts: 1
  });

  const createOptions = fetchMock.mock.calls[0][1] as RequestInit;
  expect(JSON.parse(createOptions.body as string).input.media).toEqual([
    {
      type: 'first_frame',
      url: 'https://example.com/uploaded.png'
    }
  ]);
});

test('exports an output schema that can be converted to JSON schema', () => {
  expect(() => z.toJSONSchema(OutputType)).not.toThrow();
});
