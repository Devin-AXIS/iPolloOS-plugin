import { describe, expect, it } from 'vitest';
import { buildVideoProjectPrompt } from '../lib/prompt';
import { InputType } from '../src/createVideoProject';

describe('hyperframes video project generation', () => {
  it('builds a prompt that asks AI to author the video project', () => {
    const prompt = buildVideoProjectPrompt({
      brief: '把产品 PPT 做成 60 秒解说视频',
      mode: 'html_to_video',
      sourcePageUrl: 'https://os.ipollo.net/demo.html',
      renderSize: 'landscape_1080p',
      durationSeconds: 60,
      language: 'zh-CN'
    });

    expect(prompt).toContain('HyperFrames 视频工程导演');
    expect(prompt).toContain('composition_html');
    expect(prompt).toContain('manifest_json');
    expect(prompt).toContain('字幕、配音、转场、剪辑点、H5 叠加');
    expect(prompt).toContain('https://os.ipollo.net/demo.html');
  });

  it('accepts project generation inputs with shared AI app auth', () => {
    const input = InputType.parse({
      ai_app_key: 'key',
      ai_app_url: 'https://example.com',
      brief: '做一个产品发布片头',
      mode: 'hyperframes_render'
    });

    expect(input.render_size).toBe('landscape_1080p');
    expect(input.duration_seconds).toBe(60);
  });
});
