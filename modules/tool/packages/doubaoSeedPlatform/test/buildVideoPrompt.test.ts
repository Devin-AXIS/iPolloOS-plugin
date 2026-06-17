import { describe, expect, test } from 'vitest';
import {
  aspectToRatioFlag,
  buildArkVideoPromptSuffix,
  clampDurationSeconds
} from '../lib/buildVideoPrompt';
import { buildVideoGenerationTaskBody } from '../lib/videoTaskPayload';

describe('buildArkVideoPromptSuffix', () => {
  test('smart duration omits --dur', () => {
    const s = buildArkVideoPromptSuffix({
      aspect: '智能',
      resolution: '720p',
      duration_mode: 'smart'
    });
    expect(s).toContain('--ratio adaptive');
    expect(s).toContain('--resolution 720p');
    expect(s).not.toContain('--dur');
  });
  test('seconds appends --dur', () => {
    const s = buildArkVideoPromptSuffix({
      aspect: '16:9',
      resolution: '1080p',
      duration_mode: 'seconds',
      duration_seconds: 2
    });
    expect(s).toContain('--ratio 16:9');
    expect(s).toContain('--dur 4');
  });
});

describe('aspectToRatioFlag', () => {
  test('智能 -> adaptive', () => {
    expect(aspectToRatioFlag('智能')).toBe('adaptive');
  });
});

describe('clampDurationSeconds', () => {
  test('clamps to 4-15', () => {
    expect(clampDurationSeconds(1)).toBe(4);
    expect(clampDurationSeconds(99)).toBe(15);
  });
});

describe('buildVideoGenerationTaskBody', () => {
  test('text mode only text part', () => {
    const b = buildVideoGenerationTaskBody({
      model: 'ep-test',
      prompt: '日落海边',
      mode: 'text',
      aspect: '1:1',
      resolution: '480p',
      duration_mode: 'seconds',
      duration_seconds: 6
    });
    expect(b.model).toBe('ep-test');
    expect(b.content.length).toBe(1);
    expect(b.content[0].type).toBe('text');
    expect((b.content[0] as { text: string }).text).toContain('日落海边');
    expect((b.content[0] as { text: string }).text).toContain('--ratio 1:1');
  });
  test('reference adds image before text', () => {
    const b = buildVideoGenerationTaskBody({
      model: 'ep-v',
      prompt: '动起来',
      mode: 'reference',
      aspect: '9:16',
      resolution: '720p',
      duration_mode: 'smart',
      reference_image_url: 'https://example.com/a.jpg'
    });
    expect(b.content[0]).toEqual({
      type: 'image_url',
      image_url: { url: 'https://example.com/a.jpg' }
    });
    expect(b.content[1].type).toBe('text');
  });
});
