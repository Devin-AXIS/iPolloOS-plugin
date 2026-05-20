import { describe, expect, test } from 'bun:test';
import { AihotConfigSchema, ItemsResponseSchema } from '../lib/schemas';

describe('AI HOT schemas', () => {
  test('fills default config', () => {
    const config = AihotConfigSchema.parse({});

    expect(config.baseUrl).toBe('https://aihot.virxact.com');
    expect(config.timeoutMs).toBe(15000);
    expect(config.maxItems).toBe(20);
    expect(config.userAgent).toContain('Mozilla');
  });

  test('parses item response with missing optional fields', () => {
    const data = ItemsResponseSchema.parse({
      count: 1,
      items: [{ title: 'hello' }]
    });

    expect(data.items).toHaveLength(1);
    expect(data.items[0]?.title).toBe('hello');
  });
});
