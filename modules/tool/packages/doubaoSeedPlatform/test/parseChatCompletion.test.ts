import { describe, expect, test } from 'bun:test';
import { normalizeArkBaseUrl, parseChatCompletionBody } from '../lib/parseChatCompletion';

describe('normalizeArkBaseUrl', () => {
  test('trims trailing slashes', () => {
    expect(normalizeArkBaseUrl('https://ark.cn-beijing.volces.com/api/v3/')).toBe(
      'https://ark.cn-beijing.volces.com/api/v3'
    );
  });
  test('falls back when empty', () => {
    expect(normalizeArkBaseUrl('   ')).toBe('https://ark.cn-beijing.volces.com/api/v3');
  });
});

describe('parseChatCompletionBody', () => {
  test('string content', () => {
    const r = parseChatCompletionBody({
      choices: [{ message: { content: 'hi' }, finish_reason: 'stop' }],
      usage: { total_tokens: 3 }
    });
    expect(r.reply).toBe('hi');
    expect(r.finish_reason).toBe('stop');
    expect(JSON.parse(r.usage_json).total_tokens).toBe(3);
  });

  test('multipart text array', () => {
    const r = parseChatCompletionBody({
      choices: [
        {
          message: {
            content: [
              { type: 'text', text: 'a' },
              { type: 'text', text: 'b' }
            ]
          },
          finish_reason: 'stop'
        }
      ],
      usage: {}
    });
    expect(r.reply).toBe('ab');
  });
});
