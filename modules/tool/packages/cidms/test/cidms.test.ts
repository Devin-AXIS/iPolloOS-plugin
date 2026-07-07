import { describe, expect, it } from 'vitest';
import cidmsConfig from '../config';
import { normalizeCidmsBaseUrl, formatCidmsError, cidmsApiKey } from '../lib/client';
import {
  buildGeminiImagePayload,
  buildOpenAiImagePayload,
  firstGeminiInlineImage,
  firstOpenAiImageBase64
} from '../lib/image';
import { assetModelForType, buildVideoGenerationPayload } from '../lib/video';
import {
  buildContinuityPrompt,
  buildTalkshowFirstPayload,
  mapTalkshowRatio,
  runTalkshowVideoGeneration,
  splitTalkshowDialogue
} from '../lib/talkshowVideo';

describe('cidms client helpers', () => {
  it('normalizes CIDMS base url', () => {
    expect(normalizeCidmsBaseUrl('https://example.com///')).toBe('https://example.com');
  });

  it('formats upstream error without exposing credentials', () => {
    expect(
      formatCidmsError(
        401,
        { error: { code: 'unauthorized', message: 'API Key 缺失或无效', param: 'Authorization' } },
        ''
      )
    ).toBe('CIDMS HTTP 401 unauthorized: API Key 缺失或无效 (Authorization)');
  });

  it('includes request id in upstream errors', () => {
    expect(
      formatCidmsError(
        502,
        {
          error: {
            code: 'async_task_response_rewrite_failed',
            message: 'async task response rewrite failed'
          }
        },
        '',
        'req-1'
      )
    ).toBe(
      'CIDMS HTTP 502 async_task_response_rewrite_failed: async task response rewrite failed requestId=req-1'
    );
  });

  it('uses Seedance API key as the only configured gateway credential', () => {
    expect(
      cidmsApiKey({
        seedance_api_key: ' seedance-key ',
        cidms_base_url: 'https://example.com'
      })
    ).toBe('seedance-key');
  });
});

describe('cidms toolset config', () => {
  it('exports explicit child tool IDs for package parsing', () => {
    expect(cidmsConfig.toolId).toBe('cidms');
    expect(cidmsConfig.children?.map((child) => child.toolId)).toEqual([
      'cidms/cidmsImageGenerate',
      'cidms/cidmsTalkshowVideoCreate'
    ]);
  });

  it('uses string values in talkshow duration select options', () => {
    const talkshow = cidmsConfig.children?.find(
      (child) => child.toolId === 'cidms/cidmsTalkshowVideoCreate'
    );
    const durationInput = talkshow?.versionList?.[0]?.inputs.find((input) => input.key === 'duration');

    expect(durationInput?.defaultValue).toBe('15');
    expect(durationInput?.list?.map((item) => item.value)).toEqual(['15', '30']);
    expect(durationInput?.list?.map((item) => item.label)).toEqual(['15s', '30s']);
  });

  it('hides internal callback and business reference fields from talkshow form', () => {
    const talkshow = cidmsConfig.children?.find(
      (child) => child.toolId === 'cidms/cidmsTalkshowVideoCreate'
    );
    const inputKeys = talkshow?.versionList?.[0]?.inputs.map((input) => input.key);

    expect(inputKeys).not.toContain('callback_url');
    expect(inputKeys).not.toContain('client_reference_id');
  });

  it('publishes talkshow video tool as version 1.1.0', () => {
    const talkshow = cidmsConfig.children?.find(
      (child) => child.toolId === 'cidms/cidmsTalkshowVideoCreate'
    );

    expect(talkshow?.versionList?.[0]?.value).toBe('1.1.0');
  });
});

describe('cidms image helpers', () => {
  it('builds OpenAI compatible image payload', () => {
    expect(
      buildOpenAiImagePayload({
        model: 'gpt-image-2',
        prompt: 'star',
        size: '2048x2048',
        quality: 'low',
        output_format: 'png'
      })
    ).toEqual({
      model: 'gpt-image-2',
      prompt: 'star',
      n: 1,
      size: '2048x2048',
      quality: 'low',
      output_format: 'png'
    });
  });

  it('extracts OpenAI compatible base64 image', () => {
    expect(firstOpenAiImageBase64({ data: [{ b64_json: 'abc' }] })).toEqual({
      base64: 'abc',
      mimeType: 'image/png'
    });
  });

  it('builds Gemini image payload and extracts inline image', () => {
    expect(
      buildGeminiImagePayload({ prompt: 'star', aspect_ratio: '1:1', image_size: '2K' })
    ).toMatchObject({
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '1:1', imageSize: '2K' }
      }
    });

    expect(
      firstGeminiInlineImage({
        candidates: [
          {
            content: {
              parts: [{ text: 'done' }, { inlineData: { mimeType: 'image/jpeg', data: 'xyz' } }]
            }
          }
        ]
      })
    ).toEqual({ base64: 'xyz', mimeType: 'image/jpeg', text: 'done' });
  });
});

describe('cidms video helpers', () => {
  it('builds video payload with asset reference', () => {
    expect(
      buildVideoGenerationPayload({
        model: 'seedance-2.0-asset-fast',
        prompt: '@图1 中的人物走在街上',
        reference_url: 'asset://asset-1',
        reference_role: 'reference_image',
        ratio: '16:9',
        resolution: '720p',
        duration: 5,
        generate_audio: true
      })
    ).toEqual({
      model: 'seedance-2.0-asset-fast',
      content: [
        { type: 'text', text: '@图1 中的人物走在街上' },
        {
          type: 'image_url',
          image_url: { url: 'asset://asset-1' },
          role: 'reference_image'
        }
      ],
      generate_audio: true,
      ratio: '16:9',
      resolution: '720p',
      duration: 5
    });
  });

  it('maps asset type to upstream model', () => {
    expect(assetModelForType('Image')).toBe('volc-asset');
    expect(assetModelForType('Video')).toBe('volc-asset-video');
    expect(assetModelForType('Audio')).toBe('volc-asset-audio');
  });
});

describe('cidms talkshow video helpers', () => {
  it('builds 15s talkshow payload with Seedance asset model', () => {
    const payload = buildTalkshowFirstPayload({
      description: 'AI 创业者分享一天的工作节奏',
      dialogue: '大家好，今天聊聊创业团队如何把复杂事情讲清楚。',
      orientation: 'vertical',
      characterReferenceUrl: 'asset://character-1',
      backgroundReferenceUrl: '',
      resolution: '720p',
      generateAudio: true
    });

    expect(payload).toMatchObject({
      model: 'seedance-2.0-asset',
      duration: 15,
      ratio: '9:16',
      resolution: '720p',
      generate_audio: true
    });
    expect(payload.content).toEqual([
      {
        type: 'text',
        text: expect.stringContaining('生成一段脱口秀/口播视频')
      },
      {
        type: 'image_url',
        image_url: { url: 'asset://character-1' },
        role: 'reference_image'
      }
    ]);
  });

  it('splits 30s dialogue near punctuation around the midpoint', () => {
    expect(
      splitTalkshowDialogue('第一段先提出问题，解释为什么重要。第二段给出方法，最后总结行动建议。')
    ).toEqual({
      first: '第一段先提出问题，解释为什么重要。',
      second: '第二段给出方法，最后总结行动建议。'
    });
  });

  it('maps vertical and horizontal orientations to Seedance ratios', () => {
    expect(mapTalkshowRatio('vertical')).toBe('9:16');
    expect(mapTalkshowRatio('horizontal')).toBe('16:9');
  });

  it('builds continuity prompt that requires continuing the previous segment', () => {
    const prompt = buildContinuityPrompt({
      description: '解释一款矿机管理工具的价值',
      dialogue: '继续说明如何查看设备状态和处理异常。',
      orientation: 'horizontal'
    });

    expect(prompt).toContain('保持同一个人物');
    expect(prompt).toContain('同一背景');
    expect(prompt).toContain('同一镜头角度');
    expect(prompt).toContain('从上一段结尾状态继续');
  });

  it('returns two 30s segments without fabricating a final merged url', async () => {
    const requests: Array<{ method: 'GET' | 'POST'; path: string; body?: unknown }> = [];
    const dataByPath: Record<string, Record<string, unknown>> = {
      '/volc/asset/CreateAssetGroup': { Id: 'group-1' },
      '/volc/asset/CreateAsset': { Id: 'video-asset-1' },
      '/v1/video/generations/task-first': {
        task_id: 'task-first',
        status: 'succeeded',
        progress: 100,
        result_url: 'https://example.com/first.mp4'
      }
    };

    const out = await runTalkshowVideoGeneration(
      {
        seedance_api_key: 'key',
        cidms_base_url: 'https://example.com',
        description: '介绍 CIDMS 视频生成工作流',
        dialogue: '先讲前半段内容。再讲后半段内容。',
        duration: 30,
        orientation: 'vertical',
        character_reference_url: '',
        background_reference_url: '',
        resolution: '720p',
        generate_audio: true,
        callback_url: '',
        client_reference_id: ''
      },
      async (req) => {
        requests.push({ method: req.method, path: req.path, body: req.body });
        if (req.path === '/v1/video/generations' && requests.filter((r) => r.path === req.path).length === 1) {
          return {
            task_id: 'task-first',
            status: 'running',
            progress: 0,
            result_url: ''
          };
        }
        if (req.path === '/v1/video/generations' && requests.filter((r) => r.path === req.path).length === 2) {
          return {
            task_id: 'task-second',
            status: 'succeeded',
            progress: 100,
            result_url: 'https://example.com/second.mp4'
          };
        }
        return dataByPath[req.path] ?? {};
      },
      { pollIntervalMs: 0, maxPolls: 1 }
    );

    expect(out.result_url).toBe('');
    expect(out.first_task_id).toBe('task-first');
    expect(out.second_task_id).toBe('task-second');
    expect(out.first_video_url).toBe('https://example.com/first.mp4');
    expect(out.second_video_url).toBe('https://example.com/second.mp4');
    expect(JSON.parse(out.response_json)).toMatchObject({ needs_external_merge: true });
  });

  it('continues 30s generation when first segment url is nested in output.video_url', async () => {
    const requests: Array<{ method: 'GET' | 'POST'; path: string; body?: unknown }> = [];
    const out = await runTalkshowVideoGeneration(
      {
        seedance_api_key: 'key',
        cidms_base_url: 'https://example.com',
        description: 'AI fixed-camera talkshow',
        dialogue: 'First half. Second half.',
        duration: 30,
        orientation: 'vertical',
        character_reference_url: '',
        background_reference_url: '',
        resolution: '720p',
        generate_audio: true,
        callback_url: '',
        client_reference_id: ''
      },
      async (req) => {
        requests.push({ method: req.method, path: req.path, body: req.body });
        if (req.path === '/v1/video/generations' && requests.filter((r) => r.path === req.path).length === 1) {
          return { task_id: 'task-first', status: 'running', progress: 0 };
        }
        if (req.path === '/v1/video/generations/task-first') {
          return {
            task_id: 'task-first',
            status: 'succeeded',
            progress: 100,
            output: { video_url: 'https://example.com/nested-first.mp4' }
          };
        }
        if (req.path === '/volc/asset/CreateAssetGroup') {
          return { Id: 'group-1' };
        }
        if (req.path === '/volc/asset/CreateAsset') {
          expect(req.body).toMatchObject({
            AssetType: 'Video',
            URL: 'https://example.com/nested-first.mp4'
          });
          return { Id: 'video-asset-1' };
        }
        if (req.path === '/v1/video/generations' && requests.filter((r) => r.path === req.path).length === 2) {
          return {
            task_id: 'task-second',
            status: 'succeeded',
            progress: 100,
            output: { url: 'https://example.com/second.mp4' }
          };
        }
        return {};
      },
      { pollIntervalMs: 0, maxPolls: 1 }
    );

    expect(out.first_video_url).toBe('https://example.com/nested-first.mp4');
    expect(out.second_video_url).toBe('https://example.com/second.mp4');
    expect(out.second_task_id).toBe('task-second');
  });

  it('keeps polling when first segment succeeds before result url is available', async () => {
    let firstQueryCount = 0;
    const out = await runTalkshowVideoGeneration(
      {
        seedance_api_key: 'key',
        cidms_base_url: 'https://example.com',
        description: 'AI fixed-camera talkshow',
        dialogue: 'First half. Second half.',
        duration: 30,
        orientation: 'vertical',
        character_reference_url: '',
        background_reference_url: '',
        resolution: '720p',
        generate_audio: true,
        callback_url: '',
        client_reference_id: ''
      },
      async (req) => {
        if (req.path === '/v1/video/generations') {
          return req.body && JSON.stringify(req.body).includes('reference_video')
            ? { task_id: 'task-second', status: 'succeeded', result_url: 'https://example.com/second.mp4' }
            : { task_id: 'task-first', status: 'running' };
        }
        if (req.path === '/v1/video/generations/task-first') {
          firstQueryCount += 1;
          return firstQueryCount === 1
            ? { task_id: 'task-first', status: 'succeeded', progress: 100 }
            : {
                task_id: 'task-first',
                status: 'succeeded',
                progress: 100,
                result: { url: 'https://example.com/delayed-first.mp4' }
              };
        }
        if (req.path === '/volc/asset/CreateAssetGroup') return { Id: 'group-1' };
        if (req.path === '/volc/asset/CreateAsset') return { Id: 'video-asset-1' };
        return {};
      },
      { pollIntervalMs: 0, maxPolls: 2 }
    );

    expect(firstQueryCount).toBe(2);
    expect(out.first_video_url).toBe('https://example.com/delayed-first.mp4');
    expect(out.second_task_id).toBe('task-second');
  });
});
