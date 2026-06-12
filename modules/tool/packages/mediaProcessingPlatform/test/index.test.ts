import { afterEach, describe, expect, it } from 'vitest';
import { InputType, buildMediaProcessingRequest, tool } from '../children/compose_media/src';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

describe('media processing platform', () => {
  it('builds a media processing request for audio-video merge', () => {
    const input = InputType.parse({
      renderEndpointUrl: 'https://fc-intl.example.com/media',
      action: 'submit',
      operation: 'merge_audio_video',
      video_urls: 'https://cdn.example.com/video.mp4',
      audio_urls: 'https://cdn.example.com/voice.mp3',
      output_format: 'mp4',
      output_profile: 'web_1080p',
      output_fps: 30,
      extra_payload: '{"oss_prefix":"media/demo"}'
    });

    expect(buildMediaProcessingRequest(input)).toEqual({
      task_type: 'media_processing',
      action: 'submit',
      operation: 'merge_audio_video',
      job_id: undefined,
      inputs: {
        video_urls: ['https://cdn.example.com/video.mp4'],
        audio_urls: ['https://cdn.example.com/voice.mp3'],
        media_items: undefined,
        timeline: undefined,
        subtitle_srt: undefined
      },
      output: {
        format: 'mp4',
        profile: 'web_1080p',
        fps: 30,
        filename: undefined
      },
      extra: {
        oss_prefix: 'media/demo',
        output: {
          format: 'mp4',
          profile: 'web_1080p',
          fps: 30,
          filename: undefined
        }
      }
    });
  });

  it('submits to HyperFrames international FC config when media config is not set', async () => {
    process.env.HYPERFRAMES_RENDER_ENDPOINT_URL = 'https://fc-intl.example.com/media';
    process.env.HYPERFRAMES_RENDER_API_TOKEN = 'token-1';
    process.env.HYPERFRAMES_RENDER_AUTH_HEADER_NAME = 'Authorization';

    let receivedUrl = '';
    let receivedHeaders: HeadersInit | undefined;
    let receivedBody: Record<string, unknown> | undefined;

    globalThis.fetch = (async (url, init) => {
      receivedUrl = String(url);
      receivedHeaders = init?.headers;
      receivedBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({
          job_id: 'job-1',
          status: 'submitted',
          output_url: 'https://cdn.example.com/out.mp4'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const result = await tool({
      action: 'submit',
      operation: 'concat_videos',
      video_urls: 'https://cdn.example.com/a.mp4\nhttps://cdn.example.com/b.mp4'
    });

    expect(receivedUrl).toBe('https://fc-intl.example.com/media');
    expect(receivedHeaders).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'token-1'
    });
    expect(receivedBody).toMatchObject({
      task_type: 'media_processing',
      action: 'submit',
      operation: 'concat_videos'
    });
    expect(result).toMatchObject({
      job_id: 'job-1',
      status: 'submitted',
      output_url: 'https://cdn.example.com/out.mp4'
    });
  });

  it('prefers dedicated media processing config over HyperFrames fallback', async () => {
    process.env.MEDIA_PROCESSING_RENDER_ENDPOINT_URL = 'https://media-fc.example.com/jobs';
    process.env.HYPERFRAMES_RENDER_ENDPOINT_URL = 'https://hyperframes-fc.example.com/jobs';

    let receivedUrl = '';
    globalThis.fetch = (async (url) => {
      receivedUrl = String(url);
      return new Response(JSON.stringify({ job_id: 'job-2', status: 'submitted' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }) as typeof fetch;

    await tool({
      action: 'submit',
      operation: 'extract_audio',
      video_urls: 'https://cdn.example.com/video.mp4',
      output_format: 'mp3',
      output_profile: 'audio_only'
    });

    expect(receivedUrl).toBe('https://media-fc.example.com/jobs');
  });

  it('requires enough media for common operations', () => {
    expect(() =>
      InputType.parse({
        action: 'submit',
        operation: 'concat_videos',
        video_urls: 'https://cdn.example.com/a.mp4'
      })
    ).toThrow('concat_videos');

    expect(() =>
      InputType.parse({
        action: 'submit',
        operation: 'merge_audio_video',
        video_urls: 'https://cdn.example.com/a.mp4'
      })
    ).toThrow('merge_audio_video');

    expect(() =>
      InputType.parse({
        action: 'submit',
        operation: 'auto',
        media_items_json: '{}'
      })
    ).toThrow('提交合成任务');
  });

  it('allows full timeline plans without simple URL counts', () => {
    const input = InputType.parse({
      action: 'submit',
      operation: 'timeline_compose',
      timeline_json:
        '{"tracks":[{"id":"v1","type":"video","clips":[{"url":"https://cdn.example.com/a.mp4","start":0}]}]}',
      output_format: 'mp4'
    });

    expect(buildMediaProcessingRequest(input).inputs.timeline).toMatchObject({
      tracks: [
        {
          id: 'v1',
          type: 'video',
          clips: [{ url: 'https://cdn.example.com/a.mp4', start: 0 }]
        }
      ]
    });
  });

  it('requires job_id for status and cancel', () => {
    expect(() =>
      InputType.parse({
        action: 'status'
      })
    ).toThrow('job_id');
  });

  it('turns failed function responses into structured errors', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          status: 'failed',
          error: 'ffmpeg concat failed',
          stage: 'ffmpeg',
          stderr_tail: 'Invalid data found when processing input',
          trace_id: 'trace-1'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch;

    const result = await tool({
      renderEndpointUrl: 'https://fc-intl.example.com/media',
      action: 'submit',
      operation: 'concat_videos',
      video_urls: 'https://cdn.example.com/a.mp4\nhttps://cdn.example.com/b.mp4'
    });

    expect(result.status).toBe('error');
    expect(result.system_error).toBe('ffmpeg concat failed');
    expect(result.error_detail_json).toContain('"stage": "ffmpeg"');
    expect(result.error_detail_json).toContain('"trace_id": "trace-1"');
  });

  it('maps output_url to audio_url for audio-only outputs', async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          job_id: 'job-audio',
          status: 'completed',
          output_url: 'https://cdn.example.com/out.mp3'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch;

    const result = await tool({
      renderEndpointUrl: 'https://fc-intl.example.com/media',
      action: 'submit',
      operation: 'mix_audio_tracks',
      audio_urls: 'https://cdn.example.com/a.mp3\nhttps://cdn.example.com/b.mp3',
      output_format: 'mp3',
      output_profile: 'audio_only'
    });

    expect(result.output_url).toBe('https://cdn.example.com/out.mp3');
    expect(result.audio_url).toBe('https://cdn.example.com/out.mp3');
    expect(result.video_url).toBeUndefined();
  });
});
