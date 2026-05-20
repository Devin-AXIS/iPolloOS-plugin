import { describe, expect, it } from 'vitest';
import { parseChatContent, resolveChatCompletionsUrl } from '../lib/aiApp';

describe('aiApp helpers', () => {
  it('normalizes /api root to v1 chat completions', () => {
    expect(resolveChatCompletionsUrl('http://ai.wemoai.com/api')).toBe(
      'http://ai.wemoai.com/api/v1/chat/completions'
    );
  });

  it('keeps full chat completions url', () => {
    expect(resolveChatCompletionsUrl('https://example.com/api/v1/chat/completions')).toBe(
      'https://example.com/api/v1/chat/completions'
    );
  });

  it('parses OpenAI style content', () => {
    expect(
      parseChatContent({
        choices: [{ message: { content: '<!DOCTYPE html><html></html>' } }]
      })
    ).toContain('<html>');
  });

  it('parses array content', () => {
    expect(
      parseChatContent({
        choices: [{ message: { content: [{ text: { content: '<!DOCTYPE html><html></html>' } }] } }]
      })
    ).toContain('<html>');
  });

  it('parses direct page html output', () => {
    expect(parseChatContent({ page_html: '<!DOCTYPE html><html></html>' })).toContain('<html>');
  });

  it('parses responseData fallback from the latest useful item', () => {
    expect(
      parseChatContent({
        responseData: [
          { moduleName: 'Search', text: 'search result' },
          { moduleName: 'Plugin Output', page_html: '<!DOCTYPE html><html></html>' }
        ],
        choices: [{ message: { content: '' } }]
      })
    ).toContain('<html>');
  });

  it('parses plugin output from responseData', () => {
    expect(
      parseChatContent({
        responseData: [
          {
            moduleType: 'pluginOutput',
            pluginOutput: { result: '<!DOCTYPE html><html></html>' }
          }
        ]
      })
    ).toContain('<html>');
  });
});
