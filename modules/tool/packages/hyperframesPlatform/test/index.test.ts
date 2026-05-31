import { describe, expect, it } from 'vitest';
import { InputType, buildRenderOptions, buildRenderRequest, tool } from '../src';

describe('hyperframes platform', () => {
  it('builds a HyperFrames render request', () => {
    const input = InputType.parse({
      renderEndpointUrl: 'https://render.example.com/jobs',
      action: 'submit',
      page_url: 'https://os.ipollo.net/demo.html',
      manifest_json:
        '{"mode":"html_to_video","render_profile":"hyperframes","render_size":"landscape_1080p","duration_seconds":30,"fps":30,"timeline":[{"scene_id":"s01","start":0,"duration":30}]}',
      storyboard_json: '{"scenes":[{"scene_id":"s01","start":0,"duration":30}]}',
      voiceover_script: '这是 30 秒视频配音稿。',
      subtitle_srt: '1\n00:00:00,000 --> 00:00:30,000\n这是 30 秒视频字幕。',
      asset_plan_json: '{"required_assets":[]}',
      extra_payload: '{"oss_prefix":"renders/demo"}'
    });

    expect(buildRenderRequest(input)).toEqual({
      action: 'submit',
      job_id: undefined,
      source: {
        page_url: 'https://os.ipollo.net/demo.html',
        html: undefined
      },
      manifest: {
        mode: 'html_to_video',
        render_profile: 'hyperframes',
        render_size: 'landscape_1080p',
        duration_seconds: 30,
        fps: 30,
        timeline: [{ scene_id: 's01', start: 0, duration: 30 }]
      },
      artifacts: {
        storyboard: { scenes: [{ scene_id: 's01', start: 0, duration: 30 }] },
        voiceover_script: '这是 30 秒视频配音稿。',
        subtitle_srt: '1\n00:00:00,000 --> 00:00:30,000\n这是 30 秒视频字幕。',
        asset_plan: { required_assets: [] },
        validation_report: undefined
      },
      render_options: {
        performance_mode: false,
        disable_blur: false,
        disable_filter: false,
        disable_heavy_shadow: false,
        fps: 30,
        segment_duration_seconds: undefined,
        diagnostics_level: 'verbose',
        requested_diagnostics: [
          'stage',
          'exit_code',
          'signal',
          'stderr_tail',
          'duration_before_exit_sec',
          'memory_peak_mb',
          'tmp_usage_mb',
          'job_id',
          'trace_id'
        ]
      },
      extra: {
        oss_prefix: 'renders/demo',
        render_options: {
          performance_mode: false,
          disable_blur: false,
          disable_filter: false,
          disable_heavy_shadow: false,
          fps: 30,
          segment_duration_seconds: undefined,
          diagnostics_level: 'verbose',
          requested_diagnostics: [
            'stage',
            'exit_code',
            'signal',
            'stderr_tail',
            'duration_before_exit_sec',
            'memory_peak_mb',
            'tmp_usage_mb',
            'job_id',
            'trace_id'
          ]
        }
      }
    });
  });

  it('builds safer render options for long 1080p videos', () => {
    const input = InputType.parse({
      renderEndpointUrl: 'https://render.example.com/jobs',
      action: 'submit',
      page_url: 'https://os.ipollo.net/demo.html',
      manifest_json:
        '{"render_size":"landscape_1080p","duration_seconds":360,"fps":30,"timeline":[{"scene_id":"s01","start":0,"duration":360}]}'
    });

    expect(buildRenderOptions(input)).toMatchObject({
      performance_mode: true,
      disable_blur: true,
      disable_filter: true,
      disable_heavy_shadow: true,
      fps: 18,
      segment_duration_seconds: 60,
      diagnostics_level: 'verbose'
    });
  });

  it('allows overriding long-video safety options', () => {
    const input = InputType.parse({
      renderEndpointUrl: 'https://render.example.com/jobs',
      action: 'submit',
      page_url: 'https://os.ipollo.net/demo.html',
      manifest_json:
        '{"render_size":"landscape_1080p","duration_seconds":360,"fps":30,"timeline":[{"scene_id":"s01","start":0,"duration":360}]}',
      performance_mode: 'off',
      disable_heavy_effects: 'off',
      target_fps: 30,
      segment_duration_seconds: 120
    });

    expect(buildRenderOptions(input)).toMatchObject({
      performance_mode: false,
      disable_blur: false,
      fps: 30,
      segment_duration_seconds: 120
    });
  });

  it('accepts manifest-only render submissions', () => {
    const input = InputType.parse({
      renderEndpointUrl: 'https://render.example.com/jobs',
      action: 'submit',
      manifest_json:
        '{"composition_url":"https://os.ipollo.net/demo.html","render_size":"portrait_1080p","duration_seconds":90,"timeline":[{"scene_id":"s01","start":0,"duration":90}]}'
    });

    expect(buildRenderRequest(input).manifest).toMatchObject({
      composition_url: 'https://os.ipollo.net/demo.html',
      render_size: 'portrait_1080p',
      duration_seconds: 90
    });
  });

  it('requires a render project for submissions', () => {
    expect(() =>
      InputType.parse({
        renderEndpointUrl: 'https://render.example.com/jobs',
        action: 'submit'
      })
    ).toThrow();
  });

  it('allows platform default render endpoint configuration', () => {
    const input = InputType.parse({
      action: 'submit',
      page_url: 'https://os.ipollo.net/demo.html',
      manifest_json:
        '{"duration_seconds":30,"timeline":[{"scene_id":"s01","start":0,"duration":30}]}'
    });

    expect(input.renderEndpointUrl).toBeUndefined();
    expect(buildRenderRequest(input).source.page_url).toBe('https://os.ipollo.net/demo.html');
  });

  it('rejects invalid manifest JSON', () => {
    expect(() =>
      InputType.parse({
        renderEndpointUrl: 'https://render.example.com/jobs',
        action: 'submit',
        manifest_json: '{bad json'
      })
    ).toThrow();
  });

  it('rejects static page-only submissions that bypass the video timeline', () => {
    expect(() =>
      InputType.parse({
        renderEndpointUrl: 'https://render.example.com/jobs',
        action: 'submit',
        page_url: 'https://os.ipollo.net/static-page.html'
      })
    ).toThrow('manifest_json');
  });

  it('rejects manifests without duration or timeline information', () => {
    expect(() =>
      InputType.parse({
        renderEndpointUrl: 'https://render.example.com/jobs',
        action: 'submit',
        page_url: 'https://os.ipollo.net/static-page.html',
        manifest_json: '{"render_size":"landscape_1080p"}'
      })
    ).toThrow('duration_seconds');
  });

  it('requires job_id for status and cancel', () => {
    expect(() =>
      InputType.parse({
        renderEndpointUrl: 'https://render.example.com/jobs',
        action: 'status'
      })
    ).toThrow();
  });

  it('turns terminated render service responses into structured errors', async () => {
    const oldFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: 'terminated',
          stage: 'ffmpeg',
          signal: 'SIGKILL',
          stderr_tail: 'killed while encoding',
          memory_peak_mb: 2048,
          tmp_usage_mb: 9000,
          trace_id: 'trace-1'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )) as typeof fetch;

    try {
      const result = await tool({
        renderEndpointUrl: 'https://render.example.com/jobs',
        action: 'submit',
        page_url: 'https://os.ipollo.net/demo.html',
        manifest_json:
          '{"duration_seconds":30,"timeline":[{"scene_id":"s01","start":0,"duration":30}]}'
      });

      expect(result.status).toBe('error');
      expect(result.system_error).toBe('terminated');
      expect(result.error_detail_json).toContain('"stage": "ffmpeg"');
      expect(result.error_detail_json).toContain('"signal": "SIGKILL"');
    } finally {
      globalThis.fetch = oldFetch;
    }
  });
});
