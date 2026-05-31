import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildVideoProjectPrompt } from '../lib/prompt';
import { InputType, tool } from '../src/createVideoProject';

const validCompositionHtml = `
<!DOCTYPE html>
<html>
  <head><title>Video</title></head>
  <body>
    <div data-composition-id="main" data-width="1920" data-height="1080" data-start="0" data-duration="5" data-track-index="0">
      <section id="s01" data-start="0" data-duration="5" data-track-index="1">Video</section>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.from("#s01", { opacity: 0, y: 40, duration: 0.5 }, 0.2);
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

describe('hyperframes video project generation', () => {
  it('exposes the v0.3 engineering template controls and hides internal artifacts', () => {
    const configText = readFileSync(
      join(__dirname, '../children/create_video_project/config.ts'),
      'utf8'
    );

    expect(configText).toContain("value: '0.3.3'");
    expect(configText).toContain("label: '视频模板'");
    expect(configText).toContain("label: '视频用途'");
    expect(configText).toContain("label: '视觉风格'");
    expect(configText).toContain("label: '画幅方向'");

    for (const key of [
      'composition_html',
      'manifest_json',
      'storyboard_json',
      'voiceover_script',
      'subtitle_srt',
      'asset_plan_json'
    ]) {
      expect(configText).toContain(`key: '${key}'`);
      expect(configText).toContain('renderTypeList: [FlowNodeInputTypeEnum.hidden]');
      expect(configText).toContain('内部工程字段');
    }
  });

  it('builds a prompt that asks AI to author the video project', () => {
    const prompt = buildVideoProjectPrompt({
      brief: '把产品 PPT 做成 60 秒解说视频',
      mode: 'html_to_video',
      videoTemplateId: 'product-launch-landscape',
      purposeId: 'product-intro',
      styleId: 'tech-product',
      orientation: 'landscape',
      sourcePageUrl: 'https://os.ipollo.net/demo.html',
      renderSize: 'landscape_1080p',
      durationSeconds: 60,
      fps: 30,
      voiceoverMode: 'script_only',
      language: 'zh-CN'
    });

    expect(prompt).toContain('HyperFrames 视频工程导演');
    expect(prompt).toContain('模板中心');
    expect(prompt).toContain('video_template_id');
    expect(prompt).toContain('product-launch-landscape');
    expect(prompt).toContain('research-report-briefing');
    expect(prompt).toContain('purpose_id');
    expect(prompt).toContain('style_id');
    expect(prompt).toContain('magazine-editorial');
    expect(prompt).toContain('tech-product');
    expect(prompt).toContain('composition_html');
    expect(prompt).toContain('manifest_json');
    expect(prompt).toContain('storyboard_json');
    expect(prompt).toContain('subtitle_srt');
    expect(prompt).toContain('voiceover_script');
    expect(prompt).toContain('字幕、配音、转场、剪辑点、H5 叠加');
    expect(prompt).toContain('https://os.ipollo.net/demo.html');
  });

  it('accepts upstream AI authored project inputs without AI app auth', () => {
    const input = InputType.parse({
      brief: '做一个产品发布片头',
      video_template_id: 'keynote-product-story',
      purpose_id: 'product-intro',
      style_id: 'keynote-launch',
      orientation: 'landscape',
      mode: 'hyperframes_render',
      composition_html: validCompositionHtml,
      manifest_json:
        '{"schema_version":"hyperframes.video.v1","duration_seconds":5,"timeline":[{"scene_id":"s01","start":0,"duration":5,"track_index":1}]}'
    });

    expect(input.render_size).toBe('landscape_1080p');
    expect(input.duration_seconds).toBe(60);
    expect(input.fps).toBe(30);
    expect(input.voiceover_mode).toBe('script_only');
    expect(input.video_template_id).toBe('keynote-product-story');
  });

  it('accepts Chinese aliases for style, purpose and template ids', () => {
    const input = InputType.parse({
      brief: '做一个横屏 AI 资讯杂志视频',
      video_template_id: 'AI 资讯杂志片',
      purpose_id: '资讯解读',
      style_id: '杂志风',
      orientation: 'landscape',
      composition_html: validCompositionHtml,
      manifest_json:
        '{"schema_version":"hyperframes.video.v1","duration_seconds":5,"timeline":[{"scene_id":"s01","start":0,"duration":5,"track_index":1}]}'
    });

    expect(input.video_template_id).toBe('ai-news-magazine');
    expect(input.purpose_id).toBe('news-briefing');
    expect(input.style_id).toBe('magazine-editorial');
  });

  it('automatically resolves portrait news templates when landscape is requested', async () => {
    const result = await tool({
      brief: '做一个横屏 AI 新闻视频',
      video_template_id: 'news-reel-portrait',
      purpose_id: 'news-briefing',
      style_id: '杂志风',
      orientation: 'landscape',
      composition_html: validCompositionHtml,
      manifest_json: {
        schema_version: 'hyperframes.video.v1',
        duration_seconds: 5,
        timeline: [{ scene_id: 's01', start: 0, duration: 5, track_index: 1 }]
      },
      storyboard_json: { scenes: [{ scene_id: 's01', start: 0, duration: 5 }] }
    });

    expect(result.system_error).toBeUndefined();
    expect(result.manifest_json).toContain('"video_template_id": "ai-news-magazine"');
    expect(result.manifest_json).toContain('"style_id": "magazine-editorial"');
  });

  it('validates upstream AI authored project output', async () => {
    const result = await tool({
      brief: '做一个产品发布片头',
      purpose_id: 'product-intro',
      style_id: 'keynote-launch',
      composition_html: validCompositionHtml,
      manifest_json: {
        schema_version: 'hyperframes.video.v1',
        duration_seconds: 5,
        timeline: [{ scene_id: 's01', start: 0, duration: 5, track_index: 1 }]
      },
      storyboard_json: { scenes: [{ scene_id: 's01', start: 0, duration: 5 }] },
      voiceover_script: '这是一个产品发布片头。',
      subtitle_srt: '1\n00:00:00,000 --> 00:00:05,000\n这是一个产品发布片头。',
      asset_plan_json: { required_assets: [] }
    });

    expect(result.system_error).toBeUndefined();
    expect(result.composition_html).toContain('<html>');
    expect(result.manifest_json).toContain('timeline');
    expect(result.storyboard_json).toContain('s01');
    expect(result.voiceover_script).toContain('产品发布');
    expect(result.subtitle_srt).toContain('00:00:05,000');
    expect(result.asset_plan_json).toContain('required_assets');
    expect(result.validation_report_json).toContain('"ok": true');
    expect(result.summary).toContain('上游 AI 大脑');
  });

  it('builds fallback engineering fields when optional video artifacts are omitted', async () => {
    const result = await tool({
      brief: '做一个 AI 新闻周报视频',
      video_template_id: 'ai-news-magazine',
      purpose_id: 'news-briefing',
      style_id: 'magazine-editorial',
      orientation: 'portrait',
      render_size: 'portrait_1080p',
      duration_seconds: 45,
      composition_html: validCompositionHtml.replace('data-duration="5"', 'data-duration="45"')
    });

    expect(result.system_error).toBeUndefined();
    expect(result.manifest_json).toContain('hyperframes.video.v1');
    expect(result.manifest_json).toContain('"width": 1080');
    expect(result.manifest_json).toContain('"height": 1920');
    expect(result.storyboard_json).toContain('杂志风');
    expect(result.storyboard_json).toContain('竖屏资讯快讯');
    expect(result.voiceover_script).toContain('未提供配音稿');
    expect(result.subtitle_srt).toContain('未提供 SRT 字幕');
  });

  it('does not JSON.parse plain HTML, voiceover or requirement string fields', async () => {
    const htmlWithBraces = validCompositionHtml.replace(
      '</head>',
      '<style>body { color: #111; } .card::after { content: "{not-json}"; }</style></head>'
    );

    const result = await tool({
      brief: '做一个带 CSS 和脚本花括号的最小视频工程',
      video_template_id: 'ai-news-magazine',
      purpose_id: 'news-briefing',
      style_id: 'magazine-editorial',
      orientation: 'landscape',
      composition_html: htmlWithBraces,
      voiceover_script: '这里是普通配音稿，不是 JSON：{"text":"hello"}',
      extra_requirements: '普通字符串：不要解析 {foo: bar}',
      fps: 30,
      voiceover_mode: 'script_only'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.composition_html).toContain('{not-json}');
    expect(result.voiceover_script).toContain('普通配音稿');
    expect(result.manifest_json).toContain('hyperframes.video.v1');
  });

  it('extracts the first valid JSON artifact when model output has trailing text', async () => {
    const result = await tool({
      brief: '做一个产品发布片头',
      purpose_id: 'product-intro',
      style_id: 'keynote-launch',
      composition_html: validCompositionHtml,
      manifest_json:
        '{"schema_version":"hyperframes.video.v1","duration_seconds":5,"timeline":[{"scene_id":"s01","start":0,"duration":5,"track_index":1}]} 后续说明文字 {"ignored":true}',
      storyboard_json:
        '```json\n{"scenes":[{"scene_id":"s01","start":0,"duration":5}]}\n```\n补充说明'
    });

    expect(result.system_error).toBeUndefined();
    expect(result.manifest_json).toContain('"duration_seconds": 5');
    expect(result.manifest_json).not.toContain('ignored');
    expect(result.storyboard_json).toContain('"scene_id": "s01"');
  });

  it('rejects ordinary static HTML pages as video projects', async () => {
    const result = await tool({
      brief: '把一个静态页面渲染成视频',
      composition_html:
        '<!DOCTYPE html><html><head><title>Page</title></head><body><main>Static page</main></body></html>',
      manifest_json: {
        schema_version: 'hyperframes.video.v1',
        duration_seconds: 8,
        timeline: [{ scene_id: 's01', start: 0, duration: 8, track_index: 1 }]
      }
    });

    expect(result.system_error).toContain('data-composition-id');
  });
});
