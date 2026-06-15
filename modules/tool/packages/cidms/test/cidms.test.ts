import { describe, expect, it } from 'bun:test';
import { normalizeCidmsBaseUrl, formatCidmsError, cidmsApiKey } from '../lib/client';
import {
  buildGeminiImagePayload,
  buildOpenAiImagePayload,
  firstGeminiInlineImage,
  firstOpenAiImageBase64
} from '../lib/image';
import { assetModelForType, buildVideoGenerationPayload } from '../lib/video';

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

  it('uses Seedance API key as the only configured gateway credential', () => {
    expect(
      cidmsApiKey({
        seedance_api_key: ' seedance-key ',
        cidms_base_url: 'https://example.com'
      })
    ).toBe('seedance-key');
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
